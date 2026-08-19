import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import Partner from "../models/Partner.model";
import PartnerStaff from "../models/PartnerStaff.model";
import PartnerStaffLoginActivity from "../models/PartnerStaffLoginActivity.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { successResponse, errorResponse } from "../utils/response";
import { ROLES } from "../config/roles";
import { applyPartnerSuspensionLift } from "../utils/suspension.util";

export const MAX_PARTNER_STAFF = 1;
const SHARED_STAFF_LABEL = "Kitchen team";
const USERNAME_REGEX = /^[a-z][a-z0-9_]{3,31}$/;
const BCRYPT_ROUNDS = 10;

export type StaffPlatform = "web" | "app" | "unknown";

export const isPartnerStaffActor = (user?: AuthRequest["user"]) =>
  Boolean(user?.actorType === "staff" || user?.staffId);

export const normalizeStaffUsername = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

export const normalizeStaffPlatform = (value: unknown): StaffPlatform => {
  const platform = String(value || "").trim().toLowerCase();
  if (platform === "web" || platform === "app") return platform;
  return "unknown";
};

export const getRequestClientMeta = (req: Request) => {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || "").split(",")[0];
  const ip = String(forwardedIp || req.ip || req.socket?.remoteAddress || "").trim();
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 400);
  const platform = normalizeStaffPlatform((req.body as { platform?: unknown })?.platform);
  return { ip, userAgent, platform: platform === "unknown" && /mobile|android|iphone/i.test(userAgent) ? "app" as StaffPlatform : platform };
};

export const validateStaffUsername = (username: string) => {
  if (!USERNAME_REGEX.test(username)) {
    return "Username must be 4-32 characters, start with a letter, and use only lowercase letters, numbers, or underscore.";
  }
  if (/^\d+$/.test(username)) {
    return "Username cannot be only numbers.";
  }
  return null;
};

export const validateStaffPassword = (password: string) => {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password.length > 72) {
    return "Password is too long.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
};

export const normalizeOperatorName = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);

export const validateOperatorName = (name: string) => {
  if (name.length < 2) {
    return "Enter your name so the owner can see who is handling orders.";
  }
  if (!/[A-Za-z\u00C0-\u024F\u0900-\u097F]/.test(name)) {
    return "Enter a name with letters.";
  }
  return null;
};

const publicStaff = (staff: any) => ({
  _id: staff._id,
  username: staff.username,
  displayName: staff.displayName || SHARED_STAFF_LABEL,
  isActive: staff.isActive !== false,
  lastLoginAt: staff.lastLoginAt || null,
  lastLoginPlatform: staff.lastLoginPlatform || "unknown",
  lastOperatorName: staff.lastOperatorName || "",
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt
});

export const buildStaffTokens = (staff: any, partner: any, operatorName = "") => {
  const sessionVersion = staff.sessionVersion || 0;
  const staffId = staff._id.toString();
  const partnerId = partner._id.toString();
  const name = operatorName || staff.lastOperatorName || staff.displayName || SHARED_STAFF_LABEL;
  const payload = {
    id: staffId,
    phone: partner.phone,
    role: ROLES.PARTNER,
    name,
    partnerId,
    deliveryPartnerId: null as string | null,
    staffId,
    actorType: "staff" as const,
    operatorName: name,
    sessionVersion
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken({
      id: staffId,
      role: ROLES.PARTNER,
      sessionVersion,
      staffId,
      actorType: "staff",
      operatorName: name
    }),
    partnerId,
    staffId
  };
};

export const recordStaffActivity = async (input: {
  partnerId: Types.ObjectId | string;
  staffId: Types.ObjectId | string;
  username: string;
  displayName?: string;
  event: "login" | "logout" | "failed_login";
  success: boolean;
  ip?: string;
  userAgent?: string;
  platform?: StaffPlatform;
  message?: string;
}) => {
  try {
    await PartnerStaffLoginActivity.create({
      partnerId: input.partnerId,
      staffId: input.staffId,
      username: input.username,
      displayName: input.displayName || "",
      event: input.event,
      success: input.success,
      ip: input.ip || "",
      userAgent: input.userAgent || "",
      platform: input.platform || "unknown",
      message: input.message || ""
    });
  } catch (error) {
    console.error("Failed to record staff login activity:", error);
  }
};

const resolveOwnerPartner = async (req: AuthRequest) => {
  if (isPartnerStaffActor(req.user)) return null;
  if (req.user?.partnerId) {
    const byToken = await Partner.findById(req.user.partnerId);
    if (byToken) return byToken;
  }
  if (req.user?.id) {
    return Partner.findOne({ userId: req.user.id });
  }
  return null;
};

export const createPartnerStaff = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await resolveOwnerPartner(req);
    if (!partner) {
      return errorResponse(res, "Partner not found", 404);
    }
    if (partner.status !== "APPROVED") {
      return errorResponse(res, "Staff accounts are available after your shop is approved", 403);
    }

    const username = normalizeStaffUsername(req.body?.username);
    const password = String(req.body?.password || "");
    const confirmPassword = req.body?.confirmPassword;
    if (typeof confirmPassword === "string" && confirmPassword !== password) {
      return errorResponse(res, "Password and confirm password do not match.", 400);
    }

    const usernameError = validateStaffUsername(username);
    if (usernameError) return errorResponse(res, usernameError, 400);
    const passwordError = validateStaffPassword(password);
    if (passwordError) return errorResponse(res, passwordError, 400);

    const existing = await PartnerStaff.find({ partnerId: partner._id }).sort({ createdAt: 1 });
    if (existing.length > 0) {
      return errorResponse(
        res,
        "This shop already has a shared kitchen login. Reset the password below if you need to change it.",
        409
      );
    }

    const taken = await PartnerStaff.findOne({ username }).select("_id").lean();
    if (taken) {
      return errorResponse(res, "This username is already taken. Choose another one.", 409);
    }

    const staff = await PartnerStaff.create({
      partnerId: partner._id,
      createdBy: req.user!.id,
      username,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      displayName: SHARED_STAFF_LABEL,
      isActive: true
    });

    return successResponse(res, publicStaff(staff), "Kitchen login created", 201);
  } catch (error: any) {
    if (error?.code === 11000) {
      return errorResponse(res, "This username is already taken. Choose another one.", 409);
    }
    return errorResponse(res, error.message || "Failed to create staff login", 500);
  }
};

export const listPartnerStaff = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await resolveOwnerPartner(req);
    if (!partner) {
      return errorResponse(res, "Partner not found", 404);
    }

    const staff = await PartnerStaff.find({ partnerId: partner._id }).sort({ createdAt: 1 });
    return successResponse(res, staff.map(publicStaff), "Staff accounts");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to load staff accounts", 500);
  }
};

export const updatePartnerStaff = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await resolveOwnerPartner(req);
    if (!partner) {
      return errorResponse(res, "Partner not found", 404);
    }

    const staff = await PartnerStaff.findOne({ _id: req.params.staffId, partnerId: partner._id }).select(
      "+passwordHash"
    );
    if (!staff) {
      return errorResponse(res, "Staff account not found", 404);
    }

    if (typeof req.body?.isActive === "boolean") {
      staff.isActive = req.body.isActive;
      if (!req.body.isActive) {
        staff.sessionVersion = (staff.sessionVersion || 0) + 1;
      }
    }

    if (typeof req.body?.password === "string" && req.body.password.length > 0) {
      if (typeof req.body?.confirmPassword === "string" && req.body.confirmPassword !== req.body.password) {
        return errorResponse(res, "Password and confirm password do not match.", 400);
      }
      const passwordError = validateStaffPassword(req.body.password);
      if (passwordError) return errorResponse(res, passwordError, 400);
      staff.passwordHash = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);
      staff.sessionVersion = (staff.sessionVersion || 0) + 1;
    }

    await staff.save();
    return successResponse(res, publicStaff(staff), "Staff account updated");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to update staff account", 500);
  }
};

export const deletePartnerStaff = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await resolveOwnerPartner(req);
    if (!partner) {
      return errorResponse(res, "Partner not found", 404);
    }

    const staff = await PartnerStaff.findOne({ _id: req.params.staffId, partnerId: partner._id });
    if (!staff) {
      return errorResponse(res, "Staff account not found", 404);
    }

    staff.isActive = false;
    staff.sessionVersion = (staff.sessionVersion || 0) + 1;
    await staff.save();

    return successResponse(res, publicStaff(staff), "Staff login disabled");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to disable staff account", 500);
  }
};

export const signOutPartnerStaff = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await resolveOwnerPartner(req);
    if (!partner) {
      return errorResponse(res, "Partner not found", 404);
    }

    const operatorName = String(req.body?.operatorName || "").trim();
    if (!operatorName) {
      return errorResponse(res, "Operator name is required", 400);
    }

    const staff = await PartnerStaff.findOne({ _id: req.params.staffId, partnerId: partner._id });
    if (!staff) {
      return errorResponse(res, "Staff account not found", 404);
    }

    const revoked: string[] = Array.isArray(staff.revokedOperators) ? staff.revokedOperators : [];
    if (!revoked.includes(operatorName)) {
      revoked.push(operatorName);
      staff.revokedOperators = revoked;
    }
    await staff.save();

    return successResponse(res, publicStaff(staff), `${operatorName} has been signed out`);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to sign out staff", 500);
  }
};

export const getPartnerStaffLoginActivity = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await resolveOwnerPartner(req);
    if (!partner) {
      return errorResponse(res, "Partner not found", 404);
    }

    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || "20"), 10) || 20));
    const staffId = typeof req.query.staffId === "string" ? req.query.staffId.trim() : "";
    const filter: Record<string, unknown> = { partnerId: partner._id };
    if (staffId) filter.staffId = staffId;

    const [items, total] = await Promise.all([
      PartnerStaffLoginActivity.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PartnerStaffLoginActivity.countDocuments(filter)
    ]);

    return successResponse(
      res,
      items,
      "Login activity",
      200,
      {
        page,
        limit,
        total,
        hasMore: page * limit < total
      }
    );
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to load login activity", 500);
  }
};

export const partnerStaffLogin = async (req: Request, res: Response) => {
  const meta = getRequestClientMeta(req);
  const username = normalizeStaffUsername(req.body?.username);
  const password = String(req.body?.password || "");
  const operatorName = normalizeOperatorName(req.body?.operatorName || req.body?.displayName);

  try {
    if (!username || !password) {
      return errorResponse(res, "Username and password are required", 400);
    }
    const operatorError = validateOperatorName(operatorName);
    if (operatorError) return errorResponse(res, operatorError, 400);

    const staff = await PartnerStaff.findOne({ username }).select("+passwordHash");
    if (!staff) {
      return errorResponse(res, "Invalid username or password", 401);
    }

    const passwordOk = await bcrypt.compare(password, staff.passwordHash);
    if (!passwordOk) {
      await recordStaffActivity({
        partnerId: staff.partnerId,
        staffId: staff._id,
        username: staff.username,
        displayName: operatorName,
        event: "failed_login",
        success: false,
        ...meta,
        message: "Incorrect password"
      });
      return errorResponse(res, "Invalid username or password", 401);
    }

    if (staff.isActive === false) {
      await recordStaffActivity({
        partnerId: staff.partnerId,
        staffId: staff._id,
        username: staff.username,
        displayName: operatorName,
        event: "failed_login",
        success: false,
        ...meta,
        message: "Account disabled"
      });
      return errorResponse(res, "This staff login has been disabled by the restaurant owner", 403);
    }

    const partner = await Partner.findById(staff.partnerId);
    if (!partner) {
      return errorResponse(res, "Restaurant not found for this staff login", 404);
    }

    const lifted = await applyPartnerSuspensionLift(partner);
    if (lifted) {
      await partner.save();
    }

    if (partner.status === "SUSPENDED") {
      return errorResponse(res, "This restaurant is currently suspended", 403);
    }
    if (partner.status !== "APPROVED") {
      return errorResponse(res, "This restaurant is not active yet", 403);
    }

    staff.lastLoginAt = new Date();
    staff.lastLoginIp = meta.ip;
    staff.lastLoginPlatform = meta.platform;
    staff.lastOperatorName = operatorName;
    if (Array.isArray(staff.revokedOperators) && staff.revokedOperators.includes(operatorName)) {
      staff.revokedOperators = staff.revokedOperators.filter((n: string) => n !== operatorName);
    }
    await staff.save();

    const tokens = buildStaffTokens(staff, partner, operatorName);
    await recordStaffActivity({
      partnerId: partner._id,
      staffId: staff._id,
      username: staff.username,
      displayName: operatorName,
      event: "login",
      success: true,
      ...meta,
      message: `${operatorName} signed in`
    });

    return successResponse(
      res,
      {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: staff._id.toString(),
          phone: partner.phone,
          name: operatorName,
          role: ROLES.PARTNER,
          partnerId: partner._id.toString(),
          staffId: staff._id.toString(),
          actorType: "staff",
          operatorName,
          username: staff.username,
          restaurantName: partner.restaurantName || partner.shopName || ""
        }
      },
      "Staff login successful"
    );
  } catch (error: any) {
    return errorResponse(res, error.message || "Staff login failed", 500);
  }
};

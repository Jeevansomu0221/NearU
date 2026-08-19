import { Response } from "express";
import User from "../models/User.model";
import PartnerStaff from "../models/PartnerStaff.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { successResponse, errorResponse } from "../utils/response";
import { NotificationApp } from "../services/notification.service";
import { isPartnerStaffActor } from "../middlewares/partnerStaff.middleware";

const VALID_APPS = new Set<NotificationApp>(["customer", "partner", "delivery"]);
const VALID_PLATFORMS = new Set(["ios", "android", "web", "unknown"]);

const normalizeApp = (value: unknown): NotificationApp | null => {
  const app = String(value || "").trim().toLowerCase() as NotificationApp;
  return VALID_APPS.has(app) ? app : null;
};

const normalizePlatform = (value: unknown) => {
  const platform = String(value || "").trim().toLowerCase();
  return VALID_PLATFORMS.has(platform) ? platform : "unknown";
};

export const registerNotificationToken = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const app = normalizeApp(req.body?.app);
    const platform = normalizePlatform(req.body?.platform);
    const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId.trim() : "";

    if (!token) {
      return errorResponse(res, "Notification token is required", 400);
    }

    if (!app) {
      return errorResponse(res, "Valid app is required", 400);
    }

    if (isPartnerStaffActor(req.user)) {
      await PartnerStaff.updateMany(
        { "notificationTokens.token": token },
        { $pull: { notificationTokens: { token } } }
      );
      await User.updateMany(
        { "notificationTokens.token": token },
        { $pull: { notificationTokens: { token } } }
      );

      const staffId = req.user.staffId || req.user.id;
      const tokenUpdate: Record<string, unknown> = {
        "notificationTokens.$.enabled": true,
        "notificationTokens.$.platform": platform,
        "notificationTokens.$.lastSeenAt": new Date(),
        "notificationTokens.$.disabledAt": null
      };
      if (deviceId) {
        tokenUpdate["notificationTokens.$.deviceId"] = deviceId;
      }

      const updateExisting = await PartnerStaff.updateOne(
        { _id: staffId, notificationTokens: { $elemMatch: { token, app } } },
        { $set: tokenUpdate }
      );

      if (updateExisting.matchedCount === 0) {
        await PartnerStaff.findByIdAndUpdate(staffId, {
          $push: {
            notificationTokens: {
              token,
              app: "partner",
              platform,
              deviceId,
              enabled: true,
              lastSeenAt: new Date()
            }
          }
        });
      }

      return successResponse(res, { app, platform }, "Notification token registered");
    }

    await User.updateMany(
      { "notificationTokens.token": token },
      { $pull: { notificationTokens: { token } } }
    );

    const tokenUpdate: Record<string, unknown> = {
      fcmToken: token,
      "notificationTokens.$.enabled": true,
      "notificationTokens.$.platform": platform,
      "notificationTokens.$.lastSeenAt": new Date(),
      "notificationTokens.$.disabledAt": null
    };
    if (deviceId) {
      tokenUpdate["notificationTokens.$.deviceId"] = deviceId;
    }

    const updateExisting = await User.updateOne(
      { _id: req.user.id, notificationTokens: { $elemMatch: { token, app } } },
      { $set: tokenUpdate }
    );

    if (updateExisting.matchedCount === 0) {
      await User.findByIdAndUpdate(req.user.id, {
        $set: { fcmToken: token },
        $push: {
          notificationTokens: {
            token,
            app,
            platform,
            deviceId,
            enabled: true,
            lastSeenAt: new Date()
          }
        }
      });
    }

    return successResponse(res, { app, platform }, "Notification token registered");
  } catch (error) {
    console.error("registerNotificationToken error:", error);
    return errorResponse(res, "Failed to register notification token");
  }
};

export const unregisterNotificationToken = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const app = normalizeApp(req.body?.app);
    const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId.trim() : "";

    if (!token && !app && !deviceId) {
      return errorResponse(res, "Token, app, or deviceId is required", 400);
    }

    const pullFilter: Record<string, unknown> = {};
    if (token) pullFilter.token = token;
    if (app) pullFilter.app = app;
    if (deviceId) pullFilter.deviceId = deviceId;

    if (isPartnerStaffActor(req.user)) {
      await PartnerStaff.findByIdAndUpdate(req.user.staffId || req.user.id, {
        $pull: { notificationTokens: pullFilter }
      });
      return successResponse(res, null, "Notification token unregistered");
    }

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { notificationTokens: pullFilter },
      ...(token ? { $unset: { fcmToken: "" } } : {})
    });

    return successResponse(res, null, "Notification token unregistered");
  } catch (error) {
    console.error("unregisterNotificationToken error:", error);
    return errorResponse(res, "Failed to unregister notification token");
  }
};

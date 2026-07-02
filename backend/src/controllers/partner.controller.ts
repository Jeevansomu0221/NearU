import { Request, Response } from "express";
import { Types } from "mongoose";
import Partner from "../models/Partner.model";
import User from "../models/User.model";
import DeliveryPartner from "../models/DeliveryPartner.model";
import Order from "../models/Order.model";
import Payout from "../models/Payout.model";
import { parseGoogleMapsLink } from "../utils/mapsParser";
import { notifyPartnerApplicationStatus } from "../services/notification.service";
import { applyPartnerSuspensionLift } from "../utils/suspension.util";

// Define AuthRequest interface
interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
    role: string;
    partnerId?: string;
  };
}

// Helper function to safely convert to ObjectId
const toObjectId = (id: any): Types.ObjectId | null => {
  try {
    if (!id) return null;
    
    if (Array.isArray(id)) {
      id = id[0];
    }
    
    if (typeof id !== 'string') {
      id = String(id);
    }
    
    if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
      return new Types.ObjectId(id);
    }
    
    return null;
  } catch (error) {
    console.error("Error converting to ObjectId:", error);
    return null;
  }
};

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const aadhaarRegex = /^[0-9]{12}$/;
const fssaiRegex = /^[0-9]{14}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const firstString = (...values: any[]) =>
  values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() || "";

const isGstRegisteredValue = (value: any) => value === true || value === "true" || value === "yes";

const hasCompleteProfileDocuments = (documents: Record<string, any>) =>
  Boolean(
    firstString(documents?.fssaiNumber) &&
      firstString(documents?.fssaiUrl) &&
      firstString(documents?.panNumber) &&
      firstString(documents?.panFrontUrl, documents?.ownerPanUrl) &&
      firstString(documents?.aadhaarNumber) &&
      firstString(documents?.aadhaarFrontUrl, documents?.ownerIdProofUrl) &&
      (!isGstRegisteredValue(documents?.gstRegistered) || (firstString(documents?.gstNumber) && firstString(documents?.gstUrl)))
  );

const selfDeliveryEligibleStatuses = ["VERIFIED", "ACTIVE"];

const validationError = (message: string) => Object.assign(new Error(message), { statusCode: 400 });

const lockedProfileError = () =>
  Object.assign(
    new Error("Verified profile details are locked. Submit a support request with the reason for change."),
    { statusCode: 403 }
  );

const comparableDocumentValue = (key: string, value: any) => {
  if (key === "bankAccountNumber" || key === "aadhaarNumber" || key === "fssaiNumber") {
    return firstString(value).replace(/\D/g, "");
  }
  if (key === "bankIfsc" || key === "panNumber" || key === "gstNumber") {
    return firstString(value).toUpperCase();
  }
  if (key === "gstRegistered") {
    return isGstRegisteredValue(value) ? "true" : "false";
  }
  return firstString(value);
};

const phoneLookupCandidates = (value: unknown) => {
  const raw = String(value || "").trim();
  const compact = raw.replace(/[\s().-]/g, "");
  const digits = compact.replace(/\D/g, "");
  const candidates = new Set<string>();

  [raw, compact, digits].filter(Boolean).forEach((candidate) => candidates.add(candidate));
  if (digits.length === 10) {
    candidates.add(`+91${digits}`);
    candidates.add(`91${digits}`);
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    candidates.add(digits.slice(2));
    candidates.add(`+${digits}`);
  }

  return Array.from(candidates);
};

const normalizeSelfDeliveryPartners = async (value: unknown) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw validationError("Self delivery partners must be a list of phone numbers");
  }
  if (value.length > 5) {
    throw validationError("A shop can add maximum 5 self delivery partners");
  }

  const normalized: any[] = [];
  const seenUserIds = new Set<string>();
  const seenPhones = new Set<string>();

  for (const entry of value) {
    const phoneInput = typeof entry === "string" ? entry : entry?.phone;
    const phone = String(phoneInput || "").trim();
    if (!phone) {
      throw validationError("Each self delivery partner must have a phone number");
    }

    const lookupCandidates = phoneLookupCandidates(phone);
    const lookupKey = lookupCandidates[0];
    if (lookupKey && seenPhones.has(lookupKey)) {
      continue;
    }
    if (lookupKey) seenPhones.add(lookupKey);

    const deliveryPartner = await DeliveryPartner.findOne({
      phone: { $in: lookupCandidates }
    })
      .select("_id userId phone name status")
      .lean();

    if (!deliveryPartner) {
      throw validationError(`No delivery-app rider found for ${phone}. Ask this rider to sign in to the delivery app first.`);
    }

    if (!selfDeliveryEligibleStatuses.includes(deliveryPartner.status)) {
      throw validationError(`Delivery rider ${deliveryPartner.phone} is not verified yet`);
    }

    const userId = String(deliveryPartner.userId);
    if (seenUserIds.has(userId)) {
      continue;
    }
    seenUserIds.add(userId);

    normalized.push({
      deliveryPartnerId: deliveryPartner._id,
      userId: deliveryPartner.userId,
      phone: deliveryPartner.phone,
      name: deliveryPartner.name || "",
      addedAt: new Date(),
      isActive: true
    });
  }

  return normalized;
};

const resolvePartnerForAuth = async (authReq: AuthRequest) => {
  const objectId = toObjectId(authReq.user?.id);
  if (!objectId) return null;

  let partner = await Partner.findOne({ userId: objectId });
  if (!partner && authReq.user?.phone) {
    partner = await Partner.findOne({ phone: authReq.user.phone });
    if (partner && !partner.userId) {
      partner.userId = objectId;
      await partner.save();
    }
  }

  return partner;
};

const getOrderEarningDate = (order: any) => new Date(order.deliveredAt || order.createdAt);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getNextWeeklyPayoutDate = (referenceDate = new Date()) => {
  const next = new Date(referenceDate);
  next.setHours(10, 0, 0, 0);
  const day = next.getDay();
  const daysUntilMonday = day === 1 && referenceDate < next ? 0 : (8 - day) % 7 || 7;
  next.setDate(next.getDate() + daysUntilMonday);
  return next;
};

const maskAccountNumber = (value?: string) => {
  const accountNumber = String(value || "").trim();
  if (!accountNumber) return "";
  return `${"*".repeat(Math.max(accountNumber.length - 4, 4))}${accountNumber.slice(-4)}`;
};

const buildPartnerBankSummary = (partner: any) => {
  const documents = partner?.documents || {};
  const accountHolderName = firstString(documents.bankAccountHolderName);
  const accountNumber = firstString(documents.bankAccountNumber);
  const ifsc = firstString(documents.bankIfsc);
  const upiId = firstString(partner?.settings?.upiId);

  return {
    accountHolderName,
    maskedAccountNumber: maskAccountNumber(accountNumber),
    ifsc,
    upiId,
    hasBankDetails: Boolean(accountHolderName && accountNumber && ifsc)
  };
};

const sanitizeOnboardingDraft = (draft: any) => {
  if (!draft || typeof draft !== "object") return null;

  const safeForm = typeof draft.form === "object" && draft.form ? draft.form : {};
  const safeAddress = typeof draft.address === "object" && draft.address ? draft.address : {};
  const safeDocuments = typeof draft.documents === "object" && draft.documents ? draft.documents : {};
  const safeLocation = typeof draft.shopLocation === "object" && draft.shopLocation ? draft.shopLocation : null;

  return {
    activeStep: Number.isFinite(Number(draft.activeStep)) ? Math.max(0, Math.min(4, Number(draft.activeStep))) : 0,
    form: {
      ownerName: String(safeForm.ownerName || ""),
      restaurantName: String(safeForm.restaurantName || ""),
      phone: String(safeForm.phone || safeForm.ownerPhone || ""),
      restaurantPhone: String(safeForm.restaurantPhone || "")
    },
    address: {
      state: String(safeAddress.state || ""),
      city: String(safeAddress.city || ""),
      pincode: String(safeAddress.pincode || ""),
      area: String(safeAddress.area || ""),
      colony: String(safeAddress.colony || ""),
      roadStreet: String(safeAddress.roadStreet || ""),
      nearbyPlaces: String(safeAddress.nearbyPlaces || ""),
      googleMapsLink: String(safeAddress.googleMapsLink || "")
    },
    documents: {
      fssaiNumber: String(safeDocuments.fssaiNumber || ""),
      fssaiUrl: String(safeDocuments.fssaiUrl || ""),
      panNumber: String(safeDocuments.panNumber || ""),
      panFrontUrl: String(safeDocuments.panFrontUrl || ""),
      aadhaarNumber: String(safeDocuments.aadhaarNumber || ""),
      aadhaarFrontUrl: String(safeDocuments.aadhaarFrontUrl || ""),
      aadhaarBackUrl: String(safeDocuments.aadhaarBackUrl || ""),
      gstRegistered: isGstRegisteredValue(safeDocuments.gstRegistered),
      gstNumber: String(safeDocuments.gstNumber || ""),
      bankDocumentType: String(safeDocuments.bankDocumentType || ""),
      bankAccountHolderName: String(safeDocuments.bankAccountHolderName || ""),
      cancelledChequeUrl: String(safeDocuments.cancelledChequeUrl || ""),
      bankPassbookUrl: String(safeDocuments.bankPassbookUrl || ""),
      bankStatementUrl: String(safeDocuments.bankStatementUrl || ""),
      bankAccountNumber: String(safeDocuments.bankAccountNumber || ""),
      bankIfsc: String(safeDocuments.bankIfsc || ""),
      addressProofUrl: String(safeDocuments.addressProofUrl || ""),
      gstUrl: String(safeDocuments.gstUrl || ""),
      shopLicenseUrl: String(safeDocuments.shopLicenseUrl || ""),
      ownerPanUrl: String(safeDocuments.ownerPanUrl || ""),
      menuProofUrl: String(safeDocuments.menuProofUrl || "")
    },
    selectedCategory: String(draft.selectedCategory || ""),
    shopLocation: safeLocation && Number.isFinite(Number(safeLocation.latitude)) && Number.isFinite(Number(safeLocation.longitude))
      ? {
          latitude: Number(safeLocation.latitude),
          longitude: Number(safeLocation.longitude)
        }
      : null,
    updatedAt: new Date().toISOString()
  };
};

export const getPartnerOnboardingDraft = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = toObjectId(authReq.user?.id);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId).select("partnerOnboardingDraft").lean();
    return res.json({
      success: true,
      data: sanitizeOnboardingDraft(user?.partnerOnboardingDraft)
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to load onboarding draft",
      error: error.message
    });
  }
};

export const savePartnerOnboardingDraft = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = toObjectId(authReq.user?.id);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const draft = sanitizeOnboardingDraft(req.body?.draft ?? req.body);
    if (!draft) {
      return res.status(400).json({ success: false, message: "Invalid draft payload" });
    }

    await User.findByIdAndUpdate(userId, {
      $set: {
        partnerOnboardingDraft: draft
      }
    });

    return res.json({
      success: true,
      data: draft,
      message: "Draft saved"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to save onboarding draft",
      error: error.message
    });
  }
};

export const clearPartnerOnboardingDraft = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = toObjectId(authReq.user?.id);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await User.findByIdAndUpdate(userId, {
      $set: {
        partnerOnboardingDraft: null
      }
    });

    return res.json({
      success: true,
      message: "Draft cleared"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to clear onboarding draft",
      error: error.message
    });
  }
};

/**
 * CREATE / UPDATE PARTNER PROFILE
 */
export const submitPartnerProfile = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const tokenUserId = authReq.user?.id;
    const {
      ownerName,
      restaurantName,
      phone,
      ownerPhone,
      restaurantPhone,
    } = req.body;

    const {
      address: addressData,
      category,
      documents,
      userId,
      location: incomingLocation
    } = req.body;

    console.log("📝 Submitting partner profile for phone:", phone);

    // Validate required address fields
    if (!addressData) {
      return res.status(400).json({
        success: false,
        message: "Address details are required"
      });
    }

    const {
      state,
      city,
      pincode,
      area,
      colony,
      roadStreet,
      nearbyPlaces,
      googleMapsLink
    } = addressData;

    // Validate required fields (googleMapsLink is no longer required: partners
    // can capture shop location via GPS in the app instead).
    if (!state || !city || !pincode || !area || !colony || !roadStreet) {
      return res.status(400).json({
        success: false,
        message: "Address fields (state, city, pincode, area, colony, roadStreet) are required"
      });
    }

    // Validate pincode format
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Pincode must be 6 digits"
      });
    }

    // Resolve shop coordinates from either direct payload, an address-level
    // coords field, or by parsing the Google Maps share link.
    const rawLat = Number(
      incomingLocation?.latitude ?? addressData?.latitude ?? addressData?.coordinates?.latitude
    );
    const rawLng = Number(
      incomingLocation?.longitude ?? addressData?.longitude ?? addressData?.coordinates?.longitude
    );

    let resolvedCoordinates: [number, number] | null = null;
    if (
      Number.isFinite(rawLat) &&
      Number.isFinite(rawLng) &&
      rawLat >= -90 &&
      rawLat <= 90 &&
      rawLng >= -180 &&
      rawLng <= 180 &&
      !(rawLat === 0 && rawLng === 0)
    ) {
      resolvedCoordinates = [rawLng, rawLat];
    }

    const trimmedMapsLink = typeof googleMapsLink === "string" ? googleMapsLink.trim() : "";
    if (!resolvedCoordinates && trimmedMapsLink) {
      const parsed = parseGoogleMapsLink(trimmedMapsLink);
      if (parsed) {
        resolvedCoordinates = [parsed.longitude, parsed.latitude];
      }
    }

    const normalizedDocs = {
      fssaiNumber: firstString(documents?.fssaiNumber, documents?.fssai_number),
      fssaiUrl: firstString(documents?.fssaiUrl, documents?.fssai_url),
      panNumber: firstString(documents?.panNumber, documents?.pan_number).toUpperCase(),
      panFrontUrl: firstString(documents?.panFrontUrl, documents?.pan_front_url, documents?.ownerPanUrl),
      aadhaarNumber: firstString(documents?.aadhaarNumber, documents?.aadhaar_number),
      aadhaarFrontUrl: firstString(documents?.aadhaarFrontUrl, documents?.aadhaar_front_url, documents?.ownerIdProofUrl),
      aadhaarBackUrl: firstString(documents?.aadhaarBackUrl, documents?.aadhaar_back_url),
      bankAccountHolderName: firstString(documents?.bankAccountHolderName, documents?.bank_account_holder_name),
      bankAccountNumber: firstString(documents?.bankAccountNumber, documents?.bank_account_number),
      bankIfsc: firstString(documents?.bankIfsc, documents?.bank_ifsc).toUpperCase(),
      bankDocumentType: firstString(documents?.bankDocumentType, documents?.bank_document_type, documents?.bankProofType),
      bankProofUrl: firstString(documents?.bankProofUrl, documents?.cancelledChequeUrl, documents?.bankPassbookUrl, documents?.bankStatementUrl),
      addressProofUrl: firstString(documents?.addressProofUrl, documents?.address_proof_url),
      gstRegistered: isGstRegisteredValue(documents?.gstRegistered),
      gstNumber: firstString(documents?.gstNumber, documents?.gstin, documents?.gst_number).toUpperCase(),
      gstUrl: firstString(documents?.gstUrl),
      shopLicenseUrl: firstString(documents?.shopLicenseUrl),
      menuProofUrl: firstString(documents?.menuProofUrl),
      operatingHoursNote: firstString(documents?.operatingHoursNote)
    };

    const hasAnyBankInput = Boolean(
      normalizedDocs.bankAccountHolderName ||
      normalizedDocs.bankAccountNumber ||
      normalizedDocs.bankIfsc
    );
    const normalizedBankDocumentType = "";

    if (!fssaiRegex.test(normalizedDocs.fssaiNumber)) {
      return res.status(400).json({ success: false, message: "FSSAI number must be 14 digits" });
    }
    if (!panRegex.test(normalizedDocs.panNumber)) {
      return res.status(400).json({ success: false, message: "PAN number must match AAAAA9999A format" });
    }
    if (!aadhaarRegex.test(normalizedDocs.aadhaarNumber)) {
      return res.status(400).json({ success: false, message: "Aadhaar number must be 12 digits" });
    }
    if (normalizedDocs.gstRegistered) {
      if (!gstRegex.test(normalizedDocs.gstNumber)) {
        return res.status(400).json({ success: false, message: "GSTIN must be a valid 15-character GST number" });
      }
      if (!normalizedDocs.gstUrl) {
        return res.status(400).json({ success: false, message: "GST certificate is required when GST registered is yes" });
      }
    }

    if (hasAnyBankInput) {
      if (!normalizedDocs.bankAccountHolderName) {
        return res.status(400).json({ success: false, message: "Bank account holder name is required when bank details are added" });
      }
      if (!/^[0-9]+$/.test(normalizedDocs.bankAccountNumber)) {
        return res.status(400).json({ success: false, message: "Bank account number must be numeric" });
      }
      if (!ifscRegex.test(normalizedDocs.bankIfsc)) {
        return res.status(400).json({ success: false, message: "IFSC code format is invalid" });
      }
    }

    const hasMandatoryDocuments = Boolean(
      normalizedDocs.fssaiUrl &&
      normalizedDocs.panFrontUrl &&
      normalizedDocs.aadhaarFrontUrl &&
      (!normalizedDocs.gstRegistered || (normalizedDocs.gstNumber && normalizedDocs.gstUrl))
    );

    if (!hasMandatoryDocuments) {
      return res.status(400).json({
        success: false,
        message: "FSSAI, PAN, Aadhaar front, and GST details when registered are mandatory"
      });
    }

    const normalizedBankProofUrl = "";
    const normalizedBankAccountHolderName = hasAnyBankInput ? normalizedDocs.bankAccountHolderName : "";
    const normalizedBankAccountNumber = hasAnyBankInput ? normalizedDocs.bankAccountNumber : "";
    const normalizedBankIfsc = hasAnyBankInput ? normalizedDocs.bankIfsc : "";
    const documentsForCompletion = {
      ...normalizedDocs,
      bankProofUrl: normalizedBankProofUrl,
      bankDocumentType: normalizedBankDocumentType,
      bankAccountHolderName: normalizedBankAccountHolderName,
      bankAccountNumber: normalizedBankAccountNumber,
      bankIfsc: normalizedBankIfsc,
      panFrontUrl: normalizedDocs.panFrontUrl,
      aadhaarFrontUrl: normalizedDocs.aadhaarFrontUrl
    };

    let partner = await Partner.findOne({ phone });

    // Prepare partner data
    const partnerData: any = {
      ownerName,
      restaurantName,
      shopName: restaurantName,
      phone,
      ownerPhone: firstString(ownerPhone, phone),
      restaurantPhone: firstString(restaurantPhone),
      address: {
        state: state.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        area: area.trim(),
        colony: colony.trim(),
        roadStreet: roadStreet.trim(),
        nearbyPlaces: Array.isArray(nearbyPlaces) ? nearbyPlaces.map(p => p.trim()) : [],
        googleMapsLink: trimmedMapsLink
      },
      location: {
        type: "Point",
        coordinates: resolvedCoordinates || [0, 0]
      },
      category: category || "other",
      documents: {
        fssaiNumber: normalizedDocs.fssaiNumber,
        fssaiUrl: normalizedDocs.fssaiUrl,
        panNumber: normalizedDocs.panNumber,
        panFrontUrl: normalizedDocs.panFrontUrl,
        aadhaarNumber: normalizedDocs.aadhaarNumber,
        aadhaarFrontUrl: normalizedDocs.aadhaarFrontUrl,
        aadhaarBackUrl: "",
        gstRegistered: normalizedDocs.gstRegistered,
        gstNumber: normalizedDocs.gstRegistered ? normalizedDocs.gstNumber : "",
        gstUrl: normalizedDocs.gstRegistered ? normalizedDocs.gstUrl : "",
        shopLicenseUrl: documents?.shopLicenseUrl || "",
        ownerIdProofUrl: normalizedDocs.aadhaarFrontUrl,
        ownerPanUrl: normalizedDocs.panFrontUrl,
        bankProofUrl: normalizedBankProofUrl,
        bankDocumentType: normalizedBankDocumentType,
        bankAccountHolderName: normalizedBankAccountHolderName,
        bankAccountNumber: normalizedBankAccountNumber,
        bankIfsc: normalizedBankIfsc,
        addressProofUrl: "",
        menuProofUrl: normalizedDocs.menuProofUrl,
        restaurantPhotosUrls: Array.isArray(documents?.restaurantPhotosUrls) ? documents.restaurantPhotosUrls : [],
        operatingHoursNote: normalizedDocs.operatingHoursNote,
        submittedAt: hasMandatoryDocuments ? new Date() : null,
        isComplete: hasCompleteProfileDocuments(documentsForCompletion)
      },
      status: "PENDING",
      isOpen: true,
      openingTime: "08:00",
      closingTime: "22:00",
      rating: 4,
      menuItemsCount: 0,
      hasCompletedSetup: false,
      shopImageUrl: "" // Initialize empty
    };

    // Prefer authenticated user id; fallback to body userId only if present.
    const resolvedUserId = tokenUserId || userId;
    const objectId = toObjectId(resolvedUserId);
    if (objectId) {
      partnerData.userId = objectId;
    }

    if (!partner) {
      try {
        partner = await Partner.create(partnerData);
        console.log("✅ Created new partner:", partner._id);
        
      } catch (createError: any) {
        if (createError.code === 11000) {
          partner = await Partner.findOne({ phone });
          if (partner) {
            Object.assign(partner, partnerData);
            await partner.save();
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      }
    } else {
      Object.assign(partner, partnerData);
      await partner.save();
    }

    if (objectId) {
      await User.findByIdAndUpdate(objectId, {
        $set: {
          partnerOnboardingDraft: null
        }
      });
    }

    return res.json({
      success: true,
      data: partner,
      message: "Partner profile submitted successfully"
    });
  } catch (error: any) {
    console.error("❌ Error submitting partner profile:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered.",
        error: error.message
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: messages
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to submit profile",
      error: error.message
    });
  }
};

/**
 * GET PARTNER STATUS (removed public phone lookup — use getMyStatus)
 */
export const getPartnerStatus = async (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message: "This endpoint has been removed. Use GET /api/partners/my-status with authentication."
  });
};

/**
 * GET PENDING PARTNERS (FOR ADMIN)
 */
export const getPendingPartners = async (req: Request, res: Response) => {
  try {
    const partners = await Partner.find({ status: "PENDING" })
      .sort({ createdAt: -1 })
      .select("ownerName restaurantName phone address category createdAt documents");

    return res.json({
      success: true,
      data: partners
    });
  } catch (error: any) {
    console.error("Error in getPendingPartners:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending partners",
      error: error.message
    });
  }
};

/**
 * APPROVE/REJECT PARTNER (FOR ADMIN)
 */
export const updatePartnerStatus = async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const { status, rejectionReason } = req.body;
    const adminId = (req as any).user.id;

    if (!["APPROVED", "REJECTED", "SUSPENDED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    const partnerIdObject = toObjectId(partnerId);
    if (!partnerIdObject) {
      return res.status(400).json({
        success: false,
        message: "Invalid partner ID"
      });
    }

    const partner = await Partner.findById(partnerIdObject);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    partner.status = status;
    if (status === "APPROVED") {
      partner.approvedBy = adminId;
      partner.approvedAt = new Date();
    } else if (status === "REJECTED") {
      partner.rejectionReason = rejectionReason;
    }

    await partner.save();

    void notifyPartnerApplicationStatus(partner).catch((error) => {
      console.error("Failed to notify partner status update:", error);
    });

    return res.json({
      success: true,
      message: `Partner ${status.toLowerCase()} successfully`,
      data: partner
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update partner status",
      error: error.message
    });
  }
};

/**
 * GET ALL PARTNERS (FOR ADMIN)
 */
export const getAllPartners = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }

    const partners = await Partner.find(filter)
      .sort({ createdAt: -1 })
      .select("ownerName restaurantName phone address category status approvedAt menuItemsCount");

    return res.json({
      success: true,
      data: partners
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch partners",
      error: error.message
    });
  }
};

/**
 * GET PARTNER BY USER ID
 */
export const getPartnerByUserId = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const objectId = toObjectId(userId);
    if (!objectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const partner = await Partner.findOne({ userId: objectId });

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found for this user"
      });
    }

    return res.json({
      success: true,
      data: partner
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch partner",
      error: error.message
    });
  }
};

export const getMyStatus = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const userPhone = authReq.user?.phone;
    
    if (!userId || !userPhone) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - missing user info"
      });
    }
    
    let partner = null;
    
    const objectId = toObjectId(userId);
    if (objectId) {
      partner = await Partner.findOne({ userId: objectId })
        .select("status hasCompletedSetup menuItemsCount _id restaurantName ownerName phone shopName isOpen rejectionReason suspensionType suspendedUntil suspendedAt userId category createdAt documents.submittedAt");
    }
    
    if (!partner && userPhone) {
      partner = await Partner.findOne({ phone: userPhone })
        .select("status hasCompletedSetup menuItemsCount _id restaurantName ownerName phone shopName isOpen rejectionReason suspensionType suspendedUntil suspendedAt userId category createdAt documents.submittedAt");
    }
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    const lifted = await applyPartnerSuspensionLift(partner);
    if (lifted) {
      void notifyPartnerApplicationStatus(partner).catch((error) => {
        console.error("Failed to notify partner reinstatement:", error);
      });
    }
    
    if (objectId && !partner.userId) {
      partner.userId = objectId;
      await partner.save();
    }
    
    res.json({
      success: true,
      data: partner
    });
  } catch (error: any) {
    console.error("Get partner status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * MARK SETUP AS COMPLETE
 */
export const completeSetup = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }
    
    const partner = await resolvePartnerForAuth(authReq);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    partner.hasCompletedSetup = true;
    partner.setupCompletedAt = new Date();
    await partner.save();
    
    res.json({
      success: true,
      message: "Setup marked as complete",
      data: partner
    });
  } catch (error: any) {
    console.error("Complete setup error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * UPDATE SHOP STATUS (OPEN/CLOSE)
 */
export const updateShopStatus = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { isOpen } = req.body;

    if (typeof isOpen !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "isOpen must be a boolean"
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const partner = await resolvePartnerForAuth(authReq);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    partner.isOpen = isOpen;
    await partner.save();

    return res.json({
      success: true,
      data: partner,
      message: `Shop is now ${isOpen ? 'OPEN' : 'CLOSED'}`
    });
  } catch (error: any) {
    console.error("Error updating shop status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update shop status",
      error: error.message
    });
  }
};

/**
 * GET PARTNER STATS
 */
export const getPartnerStats = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const partner = await resolvePartnerForAuth(authReq);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const partnerOrderFilter = { partnerId: partner._id };
    const deliveredOrderFilter = { ...partnerOrderFilter, status: "DELIVERED", paymentStatus: "PAID" };
    const todayEarningDateFilter = {
      $or: [
        { deliveredAt: { $gte: todayStart, $lt: tomorrowStart } },
        { deliveredAt: { $exists: false }, createdAt: { $gte: todayStart, $lt: tomorrowStart } },
        { deliveredAt: null, createdAt: { $gte: todayStart, $lt: tomorrowStart } }
      ]
    };
    const [todayOrders, totalOrders, pendingOrders, totalEarningsResult, todayEarningsResult] =
      await Promise.all([
        Order.countDocuments({
          ...partnerOrderFilter,
          createdAt: { $gte: todayStart, $lt: tomorrowStart }
        }),
        Order.countDocuments(partnerOrderFilter),
        Order.countDocuments({
          ...partnerOrderFilter,
          status: "CONFIRMED"
        }),
        Order.aggregate([
          { $match: deliveredOrderFilter },
          { $group: { _id: null, total: { $sum: "$itemTotal" } } }
        ]),
        Order.aggregate([
          {
            $match: {
              ...deliveredOrderFilter,
              ...todayEarningDateFilter
            }
          },
          { $group: { _id: null, total: { $sum: "$itemTotal" } } }
        ])
      ]);

    const stats = {
      todayOrders,
      totalOrders,
      pendingOrders,
      todayEarnings: todayEarningsResult[0]?.total || 0,
      totalEarnings: totalEarningsResult[0]?.total || 0,
      menuItemsCount: partner.menuItemsCount || 0,
      shopStatus: partner.isOpen ? "OPEN" : "CLOSED",
      rating: partner.rating || 4.0,
      joinedDate: partner.createdAt,
      ownerName: partner.ownerName,
      restaurantName: partner.restaurantName,
      phone: partner.phone,
      address: partner.address,
      category: partner.category,
      status: partner.status
    };

    return res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error("Error getting partner stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get stats",
      error: error.message
    });
  }
};

export const getMyPartnerReviews = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const partner = await resolvePartnerForAuth(authReq);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

    const reviewFilter = {
      partnerId: partner._id,
      status: "DELIVERED",
      ratingSubmittedAt: { $ne: null },
      "restaurantRating.overallExperience": { $gte: 1, $lte: 5 }
    };

    const [orders, total] = await Promise.all([
      Order.find(reviewFilter)
        .sort({ ratingSubmittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("customerId", "name")
        .select("restaurantRating ratingSubmittedAt createdAt items grandTotal")
        .lean(),
      Order.countDocuments(reviewFilter)
    ]);

    const reviews = orders.map((order: any) => {
      const itemNames = Array.isArray(order.items)
        ? order.items.map((item: any) => item?.name).filter(Boolean)
        : [];

      return {
        _id: order._id,
        orderId: order._id,
        orderNumber: order._id?.toString().slice(-6).toUpperCase(),
        rating: order.restaurantRating?.overallExperience || 0,
        comment: order.restaurantRating?.comment || "",
        submittedAt: order.ratingSubmittedAt,
        orderedAt: order.createdAt,
        customerName: order.customerId?.name || "Customer",
        grandTotal: order.grandTotal || 0,
        itemsSummary: itemNames.slice(0, 3).join(", ") + (itemNames.length > 3 ? ` +${itemNames.length - 3} more` : "")
      };
    });

    return res.json({
      success: true,
      data: {
        reviews,
        total,
        rating: partner.rating || 4,
        ratingCount: partner.ratingCount || total,
        page,
        limit,
        hasMore: page * limit < total
      }
    });
  } catch (error: any) {
    console.error("getMyPartnerReviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews"
    });
  }
};

export const getPartnerWallet = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const partner = await resolvePartnerForAuth(authReq);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const pendingPayoutOrderFilter = {
      partnerId: partner._id,
      status: "DELIVERED",
      paymentStatus: "PAID",
      "partnerPayout.status": { $ne: "PAID" }
    };
    const deliveredPaidOrderFilter = {
      partnerId: partner._id,
      status: "DELIVERED",
      paymentStatus: "PAID"
    };
    const todayEarningDateFilter = {
      $or: [
        { deliveredAt: { $gte: todayStart, $lt: tomorrowStart } },
        { deliveredAt: { $exists: false }, createdAt: { $gte: todayStart, $lt: tomorrowStart } },
        { deliveredAt: null, createdAt: { $gte: todayStart, $lt: tomorrowStart } }
      ]
    };

    const [
      pendingPayoutSummary,
      todaySummary,
      lifetimeSummary,
      payouts,
      recentPendingPayoutOrders,
      oldestPendingPayoutOrder
    ] = await Promise.all([
      Order.aggregate([
        { $match: pendingPayoutOrderFilter },
        { $group: { _id: null, amount: { $sum: "$itemTotal" }, orderCount: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { ...deliveredPaidOrderFilter, ...todayEarningDateFilter } },
        { $group: { _id: null, amount: { $sum: "$itemTotal" }, orderCount: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: deliveredPaidOrderFilter },
        { $group: { _id: null, amount: { $sum: "$itemTotal" }, orderCount: { $sum: 1 } } }
      ]),
      Payout.find({ recipientType: "PARTNER", recipientId: partner._id })
        .sort({ paidAt: -1 })
        .limit(50)
        .lean(),
      Order.find(pendingPayoutOrderFilter)
        .sort({ deliveredAt: -1, updatedAt: -1 })
        .limit(10)
        .select("_id itemTotal grandTotal createdAt updatedAt deliveredAt partnerPayout")
        .lean(),
      Order.findOne(pendingPayoutOrderFilter)
        .sort({ deliveredAt: 1, updatedAt: 1 })
        .select("_id createdAt updatedAt deliveredAt")
        .lean()
    ]);

    const paidTotal = payouts.reduce((sum: number, payout: any) => sum + Number(payout.amount || 0), 0);
    const oldestPendingPayoutDate = oldestPendingPayoutOrder ? getOrderEarningDate(oldestPendingPayoutOrder) : null;
    const nextPayoutDate =
      oldestPendingPayoutDate && !Number.isNaN(oldestPendingPayoutDate.getTime())
        ? addDays(oldestPendingPayoutDate, 7)
        : getNextWeeklyPayoutDate();

    return res.json({
      success: true,
      data: {
        todayEarnings: Number(todaySummary[0]?.amount || 0),
        todayOrderCount: Number(todaySummary[0]?.orderCount || 0),
        walletBalance: Number(pendingPayoutSummary[0]?.amount || 0),
        pendingPayoutOrderCount: Number(pendingPayoutSummary[0]?.orderCount || 0),
        lifetimeEarnings: Number(lifetimeSummary[0]?.amount || 0),
        lifetimeOrderCount: Number(lifetimeSummary[0]?.orderCount || 0),
        paidTotal,
        payoutCycle: "WEEKLY",
        nextPayoutDate: nextPayoutDate.toISOString(),
        payoutNote: "Vyaha schedules partner payouts 7 days after the first paid delivered order in the wallet.",
        bankDetails: buildPartnerBankSummary(partner),
        recentPendingPayoutOrders: recentPendingPayoutOrders.map((order: any) => ({
          _id: String(order._id),
          amount: Number(order.itemTotal || 0),
          grandTotal: Number(order.grandTotal || 0),
          createdAt: order.createdAt,
          deliveredAt: getOrderEarningDate(order).toISOString(),
          payoutStatus: order.partnerPayout?.status || "PENDING"
        })),
        payouts: payouts.map((payout: any) => ({
          _id: String(payout._id),
          amount: Number(payout.amount || 0),
          orderCount: Number(payout.orderCount || 0),
          periodType: payout.periodType,
          periodStart: payout.periodStart,
          periodEnd: payout.periodEnd,
          status: payout.status,
          paidAt: payout.paidAt,
          paidReference: payout.paidReference || "",
          paidNotes: payout.paidNotes || "",
          bankSnapshot: {
            accountHolderName: payout.bankSnapshot?.accountHolderName || "",
            maskedAccountNumber: maskAccountNumber(payout.bankSnapshot?.accountNumber),
            ifsc: payout.bankSnapshot?.ifsc || "",
            upiId: payout.bankSnapshot?.upiId || ""
          }
        }))
      }
    });
  } catch (error: any) {
    console.error("Error getting partner wallet:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get wallet details",
      error: error.message
    });
  }
};

/**
 * GET PARTNER PROFILE (for partner app)
 */
export const getPartnerProfile = async (req: Request, res: Response) => {
  try {
    console.log("📋 Getting partner profile");
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const partner = await resolvePartnerForAuth(authReq);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found"
      });
    }
    
    console.log("✅ Found partner profile:", partner._id);
    
    return res.json({
      success: true,
      data: partner.toObject()
    });
  } catch (error: any) {
    console.error("❌ Error getting partner profile:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message
    });
  }
};

/**
 * UPDATE PARTNER PROFILE (for shop image, etc.)
 */
/**
 * UPDATE PARTNER PROFILE (for shop image, etc.)
 * RESTRICTION: Cannot change restaurant name after registration
 */
export const updatePartnerProfile = async (req: Request, res: Response) => {
  try {
    console.log("📝 Updating partner profile");
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const objectId = toObjectId(userId);
    if (!objectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    const {
      ownerName,
      email,
      shopDescription,
      shopImageUrl,
      bannerImageUrl,
      openingTime,
      closingTime,
      weeklyHolidays,
      isOpen,
      address,
      location: incomingLocation,
      documents,
      settings,
      notifications,
      language
    } = req.body;
    
    const partner = await resolvePartnerForAuth(authReq);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found"
      });
    }

    const updates: any = {};
    const verificationLocked =
      partner.status === "APPROVED" && hasCompleteProfileDocuments((partner.documents || {}) as Record<string, any>);

    if (ownerName !== undefined) {
      if (verificationLocked && firstString(ownerName) !== firstString(partner.ownerName)) {
        throw lockedProfileError();
      }
      updates.ownerName = String(ownerName).trim();
    }

    if (email !== undefined) {
      if (verificationLocked && firstString(email).toLowerCase() !== firstString(partner.email).toLowerCase()) {
        throw lockedProfileError();
      }
      updates.email = String(email || "").trim().toLowerCase();
    }

    if (shopDescription !== undefined) {
      updates.shopDescription = String(shopDescription || "").trim();
    }
    
    // Update shop image if provided
    if (shopImageUrl !== undefined) {
      updates.shopImageUrl = shopImageUrl;
    }

    if (bannerImageUrl !== undefined) {
      updates.bannerImageUrl = bannerImageUrl;
    }
    
    // DO NOT ALLOW restaurant name change - remove this
    // if (restaurantName !== undefined) {
    //   updates.restaurantName = restaurantName;
    //   updates.shopName = restaurantName;
    // }
    
    // Allow timing changes
    if (openingTime !== undefined) {
      updates.openingTime = openingTime;
    }
    
    if (closingTime !== undefined) {
      updates.closingTime = closingTime;
    }

    if (Array.isArray(weeklyHolidays)) {
      updates.weeklyHolidays = weeklyHolidays;
    }
    
    if (isOpen !== undefined) {
      updates.isOpen = isOpen;
    }

    if (address && typeof address === "object") {
      if (verificationLocked) {
        throw lockedProfileError();
      }
      updates.address = {
        ...partner.address,
        ...address
      };

      const currentAddress = (partner.address || {}) as any;
      const mapsLink = updates.address.googleMapsLink || currentAddress.googleMapsLink;
      const parsedCoordinates = parseGoogleMapsLink(mapsLink || "");
      if (parsedCoordinates) {
        updates.location = {
          type: "Point",
          coordinates: [parsedCoordinates.longitude, parsedCoordinates.latitude]
        };
      }
    }

    // Direct GPS pin (from "Use my shop location" button) always wins.
    if (incomingLocation && typeof incomingLocation === "object") {
      if (verificationLocked) {
        throw lockedProfileError();
      }
      const lat = Number(incomingLocation.latitude);
      const lng = Number(incomingLocation.longitude);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        !(lat === 0 && lng === 0)
      ) {
        updates.location = {
          type: "Point",
          coordinates: [lng, lat]
        };
      }
    }

    if (documents && typeof documents === "object") {
      const existingDocs = (partner.documents || {}) as Record<string, any>;
      const incomingDocs = documents as Record<string, any>;
      if (verificationLocked) {
        const protectedDocKeys = [
          "fssaiNumber",
          "panNumber",
          "aadhaarNumber",
          "gstRegistered",
          "gstNumber",
          "fssaiUrl",
          "panFrontUrl",
          "aadhaarFrontUrl",
          "aadhaarBackUrl",
          "gstUrl",
          "shopLicenseUrl",
          "ownerPanUrl",
          "bankAccountHolderName",
          "bankAccountNumber",
          "bankIfsc",
          "bankDocumentType",
          "bankProofUrl",
          "addressProofUrl",
          "menuProofUrl"
        ];
        const reuploadFlags = (existingDocs.reuploadFlags || {}) as Record<string, boolean>;
        const hasProtectedChange = protectedDocKeys.some((key) => {
          if (!Object.prototype.hasOwnProperty.call(incomingDocs, key)) return false;
          const docUrlReuploadAllowed = key.endsWith("Url") && reuploadFlags[key] === true;
          if (docUrlReuploadAllowed) return false;
          return comparableDocumentValue(key, incomingDocs[key]) !== comparableDocumentValue(key, existingDocs[key]);
        });

        if (hasProtectedChange) {
          throw lockedProfileError();
        }
      }
      const mergedDocs: Record<string, any> = { ...existingDocs, ...incomingDocs };

      const bankFieldsChanged = ["bankAccountHolderName", "bankAccountNumber", "bankIfsc"].some((key) =>
        Object.prototype.hasOwnProperty.call(incomingDocs, key)
          && firstString(incomingDocs[key]) !== firstString(existingDocs[key])
      );
      if (bankFieldsChanged) {
        mergedDocs.bankAccountHolderName = firstString(mergedDocs.bankAccountHolderName);
        mergedDocs.bankAccountNumber = firstString(mergedDocs.bankAccountNumber).replace(/\D/g, "");
        mergedDocs.bankIfsc = firstString(mergedDocs.bankIfsc).toUpperCase();

        const hasAnyBankDetail = Boolean(
          mergedDocs.bankAccountHolderName ||
            mergedDocs.bankAccountNumber ||
            mergedDocs.bankIfsc
        );

        if (hasAnyBankDetail) {
          if (!mergedDocs.bankAccountHolderName) {
            throw validationError("Bank account holder name is required");
          }
          if (!/^[0-9]{6,20}$/.test(mergedDocs.bankAccountNumber)) {
            throw validationError("Bank account number must be 6 to 20 digits");
          }
          if (!ifscRegex.test(mergedDocs.bankIfsc)) {
            throw validationError("IFSC code format is invalid");
          }
        }
      }

      // Auto-clear any re-upload flags for keys whose URL changed in this update.
      const reuploadFlags = { ...(existingDocs.reuploadFlags || {}) } as Record<string, boolean>;
      const docUrlKeys = [
        "fssaiUrl",
        "panFrontUrl",
        "aadhaarFrontUrl",
        "aadhaarBackUrl",
        "bankProofUrl",
        "addressProofUrl",
        "gstUrl",
        "shopLicenseUrl",
        "ownerPanUrl",
        "menuProofUrl"
      ];
      let flagsChanged = false;
      docUrlKeys.forEach((key) => {
        const newUrl = incomingDocs[key];
        if (typeof newUrl === "string" && newUrl && newUrl !== existingDocs[key] && reuploadFlags[key]) {
          reuploadFlags[key] = false;
          flagsChanged = true;
        }
      });
      if (flagsChanged) {
        mergedDocs.reuploadFlags = reuploadFlags;
      }

      mergedDocs.isComplete = hasCompleteProfileDocuments(mergedDocs);
      updates.documents = mergedDocs;
    }

    if (settings && typeof settings === "object") {
      const currentSettings = ((partner as any).settings || {}) as Record<string, any>;
      const merged: Record<string, any> = { ...currentSettings };

      if (settings.autoAcceptOrders !== undefined) {
        merged.autoAcceptOrders = Boolean(settings.autoAcceptOrders);
      }
      if (settings.estimatedPrepTime !== undefined) {
        const value = Number(settings.estimatedPrepTime);
        if (Number.isFinite(value) && value > 0) merged.estimatedPrepTime = Math.round(value);
      }
      if (settings.deliveryMode !== undefined && ["self", "platform"].includes(settings.deliveryMode)) {
        merged.deliveryMode = settings.deliveryMode;
      }
      if (settings.selfDeliveryPartners !== undefined) {
        merged.selfDeliveryPartners = await normalizeSelfDeliveryPartners(settings.selfDeliveryPartners);
      }
      if (settings.deliveryRadiusKm !== undefined) {
        const value = Number(settings.deliveryRadiusKm);
        if (Number.isFinite(value) && value > 0) merged.deliveryRadiusKm = value;
      }
      if (settings.minimumOrderAmount !== undefined) {
        const value = Number(settings.minimumOrderAmount);
        if (Number.isFinite(value) && value >= 0) merged.minimumOrderAmount = value;
      }
      if (settings.upiId !== undefined) {
        merged.upiId = String(settings.upiId || "").trim();
      }

      if (merged.deliveryMode === "self") {
        const activeSelfDeliveryPartners = Array.isArray(merged.selfDeliveryPartners)
          ? merged.selfDeliveryPartners.filter((entry: any) => entry?.isActive !== false)
          : [];
        if (activeSelfDeliveryPartners.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Add at least one verified delivery-app rider before enabling self delivery"
          });
        }
      }

      updates.settings = merged;
    }

    if (notifications && typeof notifications === "object") {
      const currentNotifications = ((partner as any).notifications || {}) as Record<string, any>;
      updates.notifications = {
        ...currentNotifications,
        ...(notifications.newOrderAlerts !== undefined && { newOrderAlerts: Boolean(notifications.newOrderAlerts) }),
        ...(notifications.paymentAlerts !== undefined && { paymentAlerts: Boolean(notifications.paymentAlerts) }),
        ...(notifications.promotionalNotifications !== undefined && {
          promotionalNotifications: Boolean(notifications.promotionalNotifications)
        })
      };
    }

    if (language !== undefined) {
      const allowed = ["en", "hi", "ta", "te", "kn", "ml", "mr"];
      if (allowed.includes(language)) {
        updates.language = language;
      }
    }

    Object.assign(partner, updates);
    await partner.save();
    
    console.log("✅ Partner profile updated:", {
      id: partner._id,
      shopImageUrl: partner.shopImageUrl ? "Has image" : "No image"
    });
    
    return res.json({
      success: true,
      data: partner,
      message: "Profile updated successfully"
    });
  } catch (error: any) {
    console.error("❌ Error updating partner profile:", error);
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message
    });
  }
};

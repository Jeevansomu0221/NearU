import { Request, Response } from "express";
import { Types } from "mongoose";
import Partner from "../models/Partner.model";
import User from "../models/User.model";
import DeliveryPartner from "../models/DeliveryPartner.model";
import Order from "../models/Order.model";
import { parseGoogleMapsLink } from "../utils/mapsParser";

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

const firstString = (...values: any[]) =>
  values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() || "";

const hasCompleteProfileDocuments = (documents: Record<string, any>) =>
  Boolean(
    firstString(documents?.fssaiNumber) &&
      firstString(documents?.fssaiUrl) &&
      firstString(documents?.panNumber) &&
      firstString(documents?.panFrontUrl, documents?.ownerPanUrl) &&
      firstString(documents?.aadhaarNumber) &&
      firstString(documents?.aadhaarFrontUrl, documents?.ownerIdProofUrl) &&
      firstString(documents?.aadhaarBackUrl) &&
      firstString(documents?.addressProofUrl) &&
      firstString(documents?.bankAccountHolderName) &&
      firstString(documents?.bankAccountNumber) &&
      firstString(documents?.bankIfsc) &&
      firstString(documents?.bankProofUrl, documents?.cancelledChequeUrl, documents?.bankPassbookUrl, documents?.bankStatementUrl)
  );

const selfDeliveryEligibleStatuses = ["VERIFIED", "ACTIVE"];

const validationError = (message: string) => Object.assign(new Error(message), { statusCode: 400 });

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

const sanitizeOnboardingDraft = (draft: any) => {
  if (!draft || typeof draft !== "object") return null;

  const safeForm = typeof draft.form === "object" && draft.form ? draft.form : {};
  const safeAddress = typeof draft.address === "object" && draft.address ? draft.address : {};
  const safeDocuments = typeof draft.documents === "object" && draft.documents ? draft.documents : {};
  const safeLocation = typeof draft.shopLocation === "object" && draft.shopLocation ? draft.shopLocation : null;

  return {
    activeStep: Number.isFinite(Number(draft.activeStep)) ? Math.max(0, Math.min(5, Number(draft.activeStep))) : 0,
    form: {
      ownerName: String(safeForm.ownerName || ""),
      restaurantName: String(safeForm.restaurantName || ""),
      phone: String(safeForm.phone || "")
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

    if (!resolvedCoordinates) {
      return res.status(400).json({
        success: false,
        message: "Shop location is required. Tap 'Use my shop location' or paste a Google Maps share link that includes coordinates."
      });
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
      gstUrl: firstString(documents?.gstUrl),
      shopLicenseUrl: firstString(documents?.shopLicenseUrl),
      menuProofUrl: firstString(documents?.menuProofUrl),
      operatingHoursNote: firstString(documents?.operatingHoursNote)
    };

    const hasAnyBankInput = Boolean(
      normalizedDocs.bankAccountHolderName ||
      normalizedDocs.bankAccountNumber ||
      normalizedDocs.bankIfsc ||
      normalizedDocs.bankDocumentType ||
      normalizedDocs.bankProofUrl
    );

    if (!fssaiRegex.test(normalizedDocs.fssaiNumber)) {
      return res.status(400).json({ success: false, message: "FSSAI number must be 14 digits" });
    }
    if (!panRegex.test(normalizedDocs.panNumber)) {
      return res.status(400).json({ success: false, message: "PAN number must match AAAAA9999A format" });
    }
    if (!aadhaarRegex.test(normalizedDocs.aadhaarNumber)) {
      return res.status(400).json({ success: false, message: "Aadhaar number must be 12 digits" });
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
      if (!normalizedDocs.bankDocumentType || !normalizedDocs.bankProofUrl) {
        return res.status(400).json({ success: false, message: "Add one bank proof if you enter bank details" });
      }
    }

    const hasMandatoryDocuments = Boolean(
      normalizedDocs.fssaiUrl &&
      normalizedDocs.panFrontUrl &&
      normalizedDocs.aadhaarFrontUrl &&
      normalizedDocs.aadhaarBackUrl &&
      normalizedDocs.addressProofUrl
    );

    if (!hasMandatoryDocuments) {
      return res.status(400).json({
        success: false,
        message: "FSSAI, PAN front, Aadhaar front/back, and restaurant address proof are mandatory"
      });
    }

    const normalizedBankProofUrl = hasAnyBankInput ? normalizedDocs.bankProofUrl : "";
    const normalizedBankDocumentType = hasAnyBankInput ? normalizedDocs.bankDocumentType : "";
    const normalizedBankAccountHolderName = hasAnyBankInput ? normalizedDocs.bankAccountHolderName : "";
    const normalizedBankAccountNumber = hasAnyBankInput ? normalizedDocs.bankAccountNumber : "";
    const normalizedBankIfsc = hasAnyBankInput ? normalizedDocs.bankIfsc : "";
    const documentsForCompletion = {
      ...normalizedDocs,
      bankProofUrl: normalizedBankProofUrl,
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
        coordinates: resolvedCoordinates
      },
      category: category || "other",
      documents: {
        fssaiNumber: normalizedDocs.fssaiNumber,
        fssaiUrl: normalizedDocs.fssaiUrl,
        panNumber: normalizedDocs.panNumber,
        panFrontUrl: normalizedDocs.panFrontUrl,
        aadhaarNumber: normalizedDocs.aadhaarNumber,
        aadhaarFrontUrl: normalizedDocs.aadhaarFrontUrl,
        aadhaarBackUrl: normalizedDocs.aadhaarBackUrl,
        gstUrl: documents?.gstUrl || "",
        shopLicenseUrl: documents?.shopLicenseUrl || "",
        ownerIdProofUrl: normalizedDocs.aadhaarFrontUrl,
        ownerPanUrl: normalizedDocs.panFrontUrl,
        bankProofUrl: normalizedBankProofUrl,
        bankDocumentType: normalizedBankDocumentType,
        bankAccountHolderName: normalizedBankAccountHolderName,
        bankAccountNumber: normalizedBankAccountNumber,
        bankIfsc: normalizedBankIfsc,
        addressProofUrl: normalizedDocs.addressProofUrl,
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
 * GET PARTNER STATUS
 */
export const getPartnerStatus = async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    console.log("🔍 Checking partner status for phone:", phone);

    const partner = await Partner.findOne({ phone });

    if (!partner) {
      return res.json({
        success: false,
        message: "No partner profile found"
      });
    }
    
    return res.json({
      success: true,
      data: partner
    });
  } catch (error: any) {
    console.error("❌ Partner status check error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
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
        .select("status hasCompletedSetup menuItemsCount _id restaurantName ownerName phone shopName isOpen rejectionReason userId category createdAt documents.submittedAt");
    }
    
    if (!partner && userPhone) {
      partner = await Partner.findOne({ phone: userPhone })
        .select("status hasCompletedSetup menuItemsCount _id restaurantName ownerName phone shopName isOpen rejectionReason userId category createdAt documents.submittedAt");
    }
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
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
    const deliveredOrderFilter = { ...partnerOrderFilter, status: "DELIVERED" };
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
          { $group: { _id: null, total: { $sum: "$grandTotal" } } }
        ]),
        Order.aggregate([
          {
            $match: {
              ...deliveredOrderFilter,
              createdAt: { $gte: todayStart, $lt: tomorrowStart }
            }
          },
          { $group: { _id: null, total: { $sum: "$grandTotal" } } }
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

    if (ownerName !== undefined) {
      updates.ownerName = String(ownerName).trim();
    }

    if (email !== undefined) {
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
      const mergedDocs: Record<string, any> = { ...existingDocs, ...incomingDocs };

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

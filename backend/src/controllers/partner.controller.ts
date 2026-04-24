import { Request, Response } from "express";
import { Types } from "mongoose";
import Partner from "../models/Partner.model";
import User from "../models/User.model";

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

/**
 * CREATE / UPDATE PARTNER PROFILE
 */
export const submitPartnerProfile = async (req: Request, res: Response) => {
  try {
    const {
      ownerName,
      restaurantName,
      phone,
    } = req.body;

    const {
      address: addressData,
      category,
      documents,
      userId
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

    // Validate required fields
    if (!state || !city || !pincode || !area || !colony || !roadStreet || !googleMapsLink) {
      return res.status(400).json({
        success: false,
        message: "All address fields (state, city, pincode, area, colony, roadStreet, googleMapsLink) are required"
      });
    }

    // Validate pincode format
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Pincode must be 6 digits"
      });
    }

    // Validate Google Maps link
    if (!googleMapsLink.startsWith('https://maps.app.goo.gl/') && 
        !googleMapsLink.startsWith('https://goo.gl/maps/') &&
        !googleMapsLink.startsWith('https://www.google.com/maps/') &&
        !googleMapsLink.startsWith('https://www.google.co.in/maps/')) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid Google Maps link"
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

    if (!fssaiRegex.test(normalizedDocs.fssaiNumber)) {
      return res.status(400).json({ success: false, message: "FSSAI number must be 14 digits" });
    }
    if (!panRegex.test(normalizedDocs.panNumber)) {
      return res.status(400).json({ success: false, message: "PAN number must match AAAAA9999A format" });
    }
    if (!aadhaarRegex.test(normalizedDocs.aadhaarNumber)) {
      return res.status(400).json({ success: false, message: "Aadhaar number must be 12 digits" });
    }
    if (!/^[0-9]+$/.test(normalizedDocs.bankAccountNumber)) {
      return res.status(400).json({ success: false, message: "Bank account number must be numeric" });
    }
    if (!ifscRegex.test(normalizedDocs.bankIfsc)) {
      return res.status(400).json({ success: false, message: "IFSC code format is invalid" });
    }

    const hasMandatoryDocuments = Boolean(
      normalizedDocs.fssaiUrl &&
      normalizedDocs.panFrontUrl &&
      normalizedDocs.aadhaarFrontUrl &&
      normalizedDocs.aadhaarBackUrl &&
      normalizedDocs.bankAccountHolderName &&
      normalizedDocs.bankAccountNumber &&
      normalizedDocs.bankIfsc &&
      normalizedDocs.bankDocumentType &&
      normalizedDocs.bankProofUrl &&
      normalizedDocs.addressProofUrl
    );

    if (!hasMandatoryDocuments) {
      return res.status(400).json({
        success: false,
        message: "FSSAI, PAN front, Aadhaar front/back, bank details with one proof, and restaurant address proof are mandatory"
      });
    }

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
        googleMapsLink: googleMapsLink.trim()
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
        bankProofUrl: normalizedDocs.bankProofUrl,
        bankDocumentType: normalizedDocs.bankDocumentType,
        bankAccountHolderName: normalizedDocs.bankAccountHolderName,
        bankAccountNumber: normalizedDocs.bankAccountNumber,
        bankIfsc: normalizedDocs.bankIfsc,
        addressProofUrl: normalizedDocs.addressProofUrl,
        menuProofUrl: normalizedDocs.menuProofUrl,
        restaurantPhotosUrls: Array.isArray(documents?.restaurantPhotosUrls) ? documents.restaurantPhotosUrls : [],
        operatingHoursNote: normalizedDocs.operatingHoursNote,
        submittedAt: hasMandatoryDocuments ? new Date() : null,
        isComplete: hasMandatoryDocuments
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

    // Only add userId if it's valid
    const objectId = toObjectId(userId);
    if (objectId) {
      partnerData.userId = objectId;
    }

    if (!partner) {
      try {
        partner = await Partner.create(partnerData);
        console.log("✅ Created new partner:", partner._id);
        
        // Update user role to partner
        if (objectId) {
          await User.findByIdAndUpdate(objectId, { role: "partner" });
        }
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
      
      if (partner.userId) {
        await User.findByIdAndUpdate(partner.userId, { role: "partner" });
      }
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
        .select("status hasCompletedSetup menuItemsCount _id restaurantName ownerName phone shopName isOpen rejectionReason");
    }
    
    if (!partner && userPhone) {
      partner = await Partner.findOne({ phone: userPhone })
        .select("status hasCompletedSetup menuItemsCount _id restaurantName ownerName phone shopName isOpen rejectionReason");
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
    
    const objectId = toObjectId(userId);
    if (!objectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }
    
    const partner = await Partner.findOneAndUpdate(
      { userId: objectId },
      { 
        hasCompletedSetup: true,
        setupCompletedAt: new Date()
      },
      { new: true }
    ).select("_id restaurantName hasCompletedSetup menuItemsCount");
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }
    
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

    const objectId = toObjectId(userId);
    if (!objectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    const partner = await Partner.findOneAndUpdate(
      { userId: objectId },
      { isOpen },
      { new: true }
    );

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

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

    const objectId = toObjectId(userId);
    if (!objectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    const partner = await Partner.findOne({ userId: objectId });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    const stats = {
      todayOrders: 0,
      totalOrders: 0,
      pendingOrders: 0,
      todayEarnings: 0,
      totalEarnings: 0,
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

    const objectId = toObjectId(userId);
    if (!objectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }

    const partner = await Partner.findOne({ userId: objectId })
      .select('-documents')
      .lean();
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found"
      });
    }
    
    console.log("✅ Found partner profile:", partner._id);
    
    return res.json({
      success: true,
      data: partner
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

    const { shopImageUrl, restaurantName, openingTime, closingTime, isOpen, address } = req.body;
    
    // Find partner by userId
    const partner = await Partner.findOne({ userId: objectId });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner profile not found"
      });
    }

    const updates: any = {};
    
    // Update shop image if provided
    if (shopImageUrl !== undefined) {
      updates.shopImageUrl = shopImageUrl;
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
    
    if (isOpen !== undefined) {
      updates.isOpen = isOpen;
    }

    if (address && typeof address === "object") {
      updates.address = {
        ...partner.address,
        ...address
      };
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
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message
    });
  }
};

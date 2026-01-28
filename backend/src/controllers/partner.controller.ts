// backend/src/controllers/partner.controller.ts
import { Request, Response } from "express";
import Partner from "../models/Partner.model";
import User from "../models/User.model";

/**
 * CREATE / UPDATE PARTNER PROFILE
 */
export const submitPartnerProfile = async (req: Request, res: Response) => {
  try {
    const {
      ownerName,
      restaurantName,
      phone,
      address,
      googleMapsLink,
      category,
      documents,
      userId // Get userId from auth
    } = req.body;

    console.log("📝 Submitting partner profile for phone:", phone);
    console.log("📝 UserId received:", userId);

    let partner = await Partner.findOne({ phone });

    // Prepare partner data - CAREFULLY handle userId
    const partnerData: any = {
      ownerName,
      restaurantName,
      shopName: restaurantName,
      phone,
      address,
      googleMapsLink: googleMapsLink || "",
      category: category || "other",
      documents: {
        fssaiUrl: documents?.fssaiUrl || "",
        shopLicenseUrl: documents?.shopLicenseUrl || "",
        idProofUrl: documents?.idProofUrl || "",
        submittedAt: (documents?.fssaiUrl || documents?.shopLicenseUrl || documents?.idProofUrl) ? new Date() : null,
        isComplete: !!(documents?.fssaiUrl && documents?.shopLicenseUrl && documents?.idProofUrl)
      },
      status: "PENDING",
      isOpen: true,
      openingTime: "08:00",
      closingTime: "22:00",
      rating: 4,
      menuItemsCount: 0
    };

    // IMPORTANT: Only add userId if it's a valid ObjectId string
    if (userId && typeof userId === 'string' && userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(userId)) {
      partnerData.userId = userId;
      console.log("✅ Valid userId added:", userId);
    } else {
      console.log("⚠️ Invalid or missing userId:", userId);
      // Don't set userId at all if it's invalid
    }

    if (!partner) {
      try {
        partner = await Partner.create(partnerData);
        console.log("✅ Created new partner:", partner._id);
        
        // Update user role to partner
        if (userId && /^[0-9a-fA-F]{24}$/.test(userId)) {
          await User.findByIdAndUpdate(userId, { role: "partner" });
          console.log("✅ Updated user role to partner");
        }
      } catch (createError: any) {
        console.error("❌ Error creating partner:", createError);
        
        // If it's a duplicate key error, try to find and update
        if (createError.code === 11000) {
          console.log("🔄 Duplicate key error, trying to find existing partner");
          partner = await Partner.findOne({ phone });
          if (partner) {
            console.log("🔄 Found existing partner, updating...");
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
      // Update existing partner
      console.log("🔄 Updating existing partner:", partner._id);
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
      console.log("📝 No partner profile found - user needs to onboard");
      return res.json({
        success: false,
        message: "No partner profile found"
      });
    }

    console.log("✅ Partner found:", partner.status);
    
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
    console.log("getPendingPartners called");
    
    const partners = await Partner.find({ status: "PENDING" })
      .sort({ createdAt: -1 })
      .select("ownerName restaurantName phone address category createdAt documents");

    console.log(`Found ${partners.length} pending partners`);
    
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

    const partner = await Partner.findById(partnerId);
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
      
      // Update user role if userId exists
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

    const partner = await Partner.findOne({ userId });

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

/**
 * UPDATE SHOP STATUS (OPEN/CLOSE)
 */
export const updateShopStatus = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.partnerId;
    const { isOpen } = req.body;

    if (typeof isOpen !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "isOpen must be a boolean"
      });
    }

    const partner = await Partner.findByIdAndUpdate(
      partnerId,
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
      message: "Failed to update shop status"
    });
  }
};

/**
 * GET PARTNER STATS
 */
export const getPartnerStats = async (req: Request, res: Response) => {
  try {
    const partnerId = (req as any).user.partnerId;

    // Find the partner
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found"
      });
    }

    // For now, return basic stats
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
      phone: partner.phone
    };

    return res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error("Error getting partner stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get stats"
    });
  }
};
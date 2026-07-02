// NEARU/backend/src/controllers/user.controller.ts
import { Response } from "express";
import User from "../models/User.model";
import Order from "../models/Order.model";
import Partner from "../models/Partner.model";
import DeliveryPartner from "../models/DeliveryPartner.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { successResponse, errorResponse } from "../utils/response";
import { ROLES } from "../config/roles";

const hasAddressContent = (address: any) =>
  Boolean(
    address &&
      (address.houseFlatDoorNo ||
        address.street ||
        address.streetRoadName ||
        address.city ||
        address.cityTownVillage ||
        address.state ||
        address.pincode ||
        address.area ||
        address.areaLocality)
  );

const normalizeAddressPayload = (body: any) => {
  const {
    label,
    recipientName,
    houseFlatDoorNo,
    buildingApartmentName,
    streetRoadName,
    street,
    city,
    cityTownVillage,
    state,
    pincode,
    area,
    areaLocality,
    landmark,
    district,
    country,
    latitude,
    longitude,
    isDefault
  } = body;

  const normalizedStreet =
    street ||
    [houseFlatDoorNo, buildingApartmentName, streetRoadName]
      .filter(Boolean)
      .join(", ");
  const normalizedArea = area || areaLocality || "";
  const normalizedCity = city || cityTownVillage || "";
  const normalizedLatitude = Number(latitude);
  const normalizedLongitude = Number(longitude);
  const hasValidCoordinates =
    Number.isFinite(normalizedLatitude) &&
    Number.isFinite(normalizedLongitude) &&
    normalizedLatitude >= -90 &&
    normalizedLatitude <= 90 &&
    normalizedLongitude >= -180 &&
    normalizedLongitude <= 180 &&
    !(normalizedLatitude === 0 && normalizedLongitude === 0);

  return {
    label: (label || "Home").trim(),
    recipientName: recipientName || "",
    houseFlatDoorNo: houseFlatDoorNo || "",
    buildingApartmentName: buildingApartmentName || "",
    streetRoadName: streetRoadName || "",
    street: normalizedStreet,
    city: normalizedCity,
    cityTownVillage: normalizedCity,
    state: state || "",
    pincode: pincode || "",
    area: normalizedArea,
    areaLocality: normalizedArea,
    landmark: landmark || "",
    district: district || "",
    country: country || "India",
    latitude: hasValidCoordinates ? normalizedLatitude : undefined,
    longitude: hasValidCoordinates ? normalizedLongitude : undefined,
    isDefault: Boolean(isDefault)
  };
};

const legacyAddressFromSaved = (address: any) => ({
  recipientName: address?.recipientName || "",
  houseFlatDoorNo: address?.houseFlatDoorNo || "",
  buildingApartmentName: address?.buildingApartmentName || "",
  streetRoadName: address?.streetRoadName || "",
  street: address?.street || "",
  city: address?.city || address?.cityTownVillage || "",
  cityTownVillage: address?.cityTownVillage || address?.city || "",
  state: address?.state || "",
  pincode: address?.pincode || "",
  area: address?.area || address?.areaLocality || "",
  areaLocality: address?.areaLocality || address?.area || "",
  landmark: address?.landmark || "",
  district: address?.district || "",
  country: address?.country || "India",
  latitude: address?.latitude,
  longitude: address?.longitude
});

/**
 * GET USER PROFILE
 */
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Find user by ID
    const userData = await User.findById(user.id)
      .select("-__v -updatedAt")
      .lean();

    if (!userData) {
      return errorResponse(res, "User not found", 404);
    }

    const addresses = Array.isArray((userData as any).addresses) ? (userData as any).addresses : [];
    if (addresses.length === 0 && hasAddressContent((userData as any).address)) {
      (userData as any).addresses = [{
        ...(userData as any).address,
        label: "Home",
        isDefault: true
      }];
    }

    return successResponse(res, userData, "Profile retrieved successfully");
  } catch (err: any) {
    console.error("getUserProfile error:", err);
    return errorResponse(res, "Failed to get profile");
  }
};

/**
 * UPDATE USER PROFILE
 */
export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { name, email } = req.body;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-__v -updatedAt");

    if (!updatedUser) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, updatedUser, "Profile updated successfully");
  } catch (err: any) {
    console.error("updateUserProfile error:", err);
    
    if (err.code === 11000) {
      return errorResponse(res, "Email already exists", 400);
    }
    
    if (err.name === 'ValidationError') {
      return errorResponse(res, err.message, 400);
    }
    
    return errorResponse(res, "Failed to update profile");
  }
};

/**
 * UPDATE USER ADDRESS
 */
export const updateUserAddress = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { addressId, pincode } = req.body;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Validate pincode if provided
    if (pincode && !/^\d{6}$/.test(pincode)) {
      return errorResponse(res, "Pincode must be 6 digits", 400);
    }

    const address = normalizeAddressPayload(req.body);
    const userDoc = await User.findById(user.id);

    if (!userDoc) {
      return errorResponse(res, "User not found", 404);
    }

    const addresses = (userDoc as any).addresses || [];
    const requestedDefault = address.isDefault || addresses.length === 0;
    const existingIndex = addressId
      ? addresses.findIndex((entry: any) => entry._id?.toString() === addressId)
      : addresses.findIndex((entry: any) => entry.isDefault);
    let savedAddressId: string | undefined;

    if (existingIndex >= 0) {
      const existing = addresses[existingIndex];
      addresses[existingIndex] = {
        ...(existing.toObject?.() || existing),
        ...address,
        _id: existing._id,
        isDefault: requestedDefault || existing.isDefault
      };
      savedAddressId = existing._id?.toString();
    } else {
      addresses.push({
        ...address,
        isDefault: requestedDefault
      });
      savedAddressId = addresses[addresses.length - 1]?._id?.toString();
    }

    if (requestedDefault || !addresses.some((entry: any) => entry.isDefault)) {
      const defaultId = addressId || savedAddressId;
      addresses.forEach((entry: any) => {
        entry.isDefault = defaultId ? entry._id?.toString() === defaultId : entry === addresses[addresses.length - 1];
      });
    }

    const defaultAddress = addresses.find((entry: any) => entry.isDefault) || addresses[0];
    (userDoc as any).address = legacyAddressFromSaved(defaultAddress);
    (userDoc as any).addresses = addresses;
    await userDoc.save();

    const updatedUser = await User.findById(user.id).select("-__v -updatedAt");
    return successResponse(res, updatedUser, "Address updated successfully");
  } catch (err: any) {
    console.error("updateUserAddress error:", err);
    
    if (err.name === 'ValidationError') {
      return errorResponse(res, err.message, 400);
    }
    
    return errorResponse(res, "Failed to update address");
  }
};

export const getSavedAddresses = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const userData = await User.findById(req.user.id).select("address addresses").lean();
    if (!userData) {
      return errorResponse(res, "User not found", 404);
    }

    const addresses = Array.isArray((userData as any).addresses) && (userData as any).addresses.length > 0
      ? (userData as any).addresses
      : hasAddressContent((userData as any).address)
        ? [{ ...(userData as any).address, label: "Home", isDefault: true }]
        : [];

    return successResponse(res, addresses, "Addresses retrieved successfully");
  } catch (err: any) {
    console.error("getSavedAddresses error:", err);
    return errorResponse(res, "Failed to get addresses");
  }
};

export const getMyFavorites = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const userData = await User.findById(req.user.id)
      .select("favoriteRestaurants favoriteFoodItems")
      .populate("favoriteRestaurants", "restaurantName shopName category address isOpen rating shopImageUrl openingTime closingTime")
      .populate("favoriteFoodItems", "name price imageUrl category partnerId rating")
      .lean();

    if (!userData) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(
      res,
      {
        restaurants: (userData as any).favoriteRestaurants || [],
        foodItems: (userData as any).favoriteFoodItems || []
      },
      "Favorites retrieved successfully"
    );
  } catch (err: any) {
    console.error("getMyFavorites error:", err);
    return errorResponse(res, "Failed to get favorites");
  }
};

export const addFavoriteRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const partner = await Partner.findById(req.params.partnerId).select("_id");
    if (!partner) {
      return errorResponse(res, "Restaurant not found", 404);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { favoriteRestaurants: partner._id } },
      { new: true }
    )
      .select("favoriteRestaurants favoriteFoodItems")
      .populate("favoriteRestaurants", "restaurantName shopName category address isOpen rating shopImageUrl openingTime closingTime")
      .populate("favoriteFoodItems", "name price imageUrl category partnerId rating");

    if (!updatedUser) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(
      res,
      {
        restaurants: (updatedUser as any).favoriteRestaurants || [],
        foodItems: (updatedUser as any).favoriteFoodItems || []
      },
      "Restaurant added to favorites"
    );
  } catch (err: any) {
    console.error("addFavoriteRestaurant error:", err);
    return errorResponse(res, "Failed to add favorite restaurant");
  }
};

export const removeFavoriteRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { favoriteRestaurants: req.params.partnerId } },
      { new: true }
    )
      .select("favoriteRestaurants favoriteFoodItems")
      .populate("favoriteRestaurants", "restaurantName shopName category address isOpen rating shopImageUrl openingTime closingTime")
      .populate("favoriteFoodItems", "name price imageUrl category partnerId rating");

    if (!updatedUser) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(
      res,
      {
        restaurants: (updatedUser as any).favoriteRestaurants || [],
        foodItems: (updatedUser as any).favoriteFoodItems || []
      },
      "Restaurant removed from favorites"
    );
  } catch (err: any) {
    console.error("removeFavoriteRestaurant error:", err);
    return errorResponse(res, "Failed to remove favorite restaurant");
  }
};

export const addUserAddress = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    if (req.body.pincode && !/^\d{6}$/.test(req.body.pincode)) {
      return errorResponse(res, "Pincode must be 6 digits", 400);
    }

    const userDoc = await User.findById(req.user.id);
    if (!userDoc) {
      return errorResponse(res, "User not found", 404);
    }

    const addresses = (userDoc as any).addresses || [];
    const address = normalizeAddressPayload({
      ...req.body,
      isDefault: req.body.isDefault || addresses.length === 0
    });

    if (address.isDefault) {
      addresses.forEach((entry: any) => {
        entry.isDefault = false;
      });
    }

    addresses.push(address);
    const defaultAddress = address.isDefault ? address : addresses.find((entry: any) => entry.isDefault) || addresses[0];
    (userDoc as any).address = legacyAddressFromSaved(defaultAddress);
    (userDoc as any).addresses = addresses;
    await userDoc.save();

    const updatedUser = await User.findById(req.user.id).select("-__v -updatedAt");
    return successResponse(res, updatedUser, "Address added successfully");
  } catch (err: any) {
    console.error("addUserAddress error:", err);
    return errorResponse(res, "Failed to add address");
  }
};

export const setDefaultAddress = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const userDoc = await User.findById(req.user.id);
    if (!userDoc) {
      return errorResponse(res, "User not found", 404);
    }

    const addresses = (userDoc as any).addresses || [];
    const selected = addresses.find((entry: any) => entry._id?.toString() === req.params.addressId);
    if (!selected) {
      return errorResponse(res, "Address not found", 404);
    }

    addresses.forEach((entry: any) => {
      entry.isDefault = entry._id?.toString() === req.params.addressId;
    });

    (userDoc as any).address = legacyAddressFromSaved(selected);
    await userDoc.save();

    const updatedUser = await User.findById(req.user.id).select("-__v -updatedAt");
    return successResponse(res, updatedUser, "Default address updated successfully");
  } catch (err: any) {
    console.error("setDefaultAddress error:", err);
    return errorResponse(res, "Failed to set default address");
  }
};

export const deleteUserAddress = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const userDoc = await User.findById(req.user.id);
    if (!userDoc) {
      return errorResponse(res, "User not found", 404);
    }

    const addresses = ((userDoc as any).addresses || []).filter(
      (entry: any) => entry._id?.toString() !== req.params.addressId
    );

    if (addresses.length === ((userDoc as any).addresses || []).length) {
      return errorResponse(res, "Address not found", 404);
    }

    if (addresses.length > 0 && !addresses.some((entry: any) => entry.isDefault)) {
      addresses[0].isDefault = true;
    }

    const defaultAddress = addresses.find((entry: any) => entry.isDefault);
    (userDoc as any).addresses = addresses;
    (userDoc as any).address = defaultAddress
      ? legacyAddressFromSaved(defaultAddress)
      : legacyAddressFromSaved(null);
    await userDoc.save();

    const updatedUser = await User.findById(req.user.id).select("-__v -updatedAt");
    return successResponse(res, updatedUser, "Address deleted successfully");
  } catch (err: any) {
    console.error("deleteUserAddress error:", err);
    return errorResponse(res, "Failed to delete address");
  }
};

/**
 * GET USER'S ORDERS
 */
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Find paginated orders for this customer
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || "30"), 10) || 30));
    const skip = (page - 1) * limit;
    const filter = { customerId: user.id };
    const total = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .populate("partnerId", "restaurantName shopName phone")
      .populate("deliveryPartnerId", "name phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return successResponse(res, orders, "Orders retrieved successfully", 200, {
      page,
      limit,
      total,
      hasMore: skip + orders.length < total
    });
  } catch (err: any) {
    console.error("getMyOrders error:", err);
    return errorResponse(res, "Failed to get orders");
  }
};

/**
 * DELETE CURRENT ACCOUNT (scoped to the app role in the JWT)
 */
const emptyAddress = {
  recipientName: "",
  houseFlatDoorNo: "",
  buildingApartmentName: "",
  streetRoadName: "",
  street: "",
  city: "",
  cityTownVillage: "",
  state: "",
  pincode: "",
  area: "",
  landmark: "",
  district: "",
  country: "India"
};

const buildDeletionMarker = (userId: string) => `deleted_${userId}_${Date.now()}`;

const deleteCustomerAccount = async (userId: string, deletionMarker: string) => {
  const [partner, deliveryPartner] = await Promise.all([
    Partner.findOne({ userId }).select("_id").lean(),
    DeliveryPartner.findOne({ userId }).select("_id").lean()
  ]);
  const hasOtherAppProfiles = Boolean(partner || deliveryPartner);

  await User.findByIdAndUpdate(userId, {
    $set: {
      address: emptyAddress,
      addresses: [],
      favoriteRestaurants: [],
      favoriteFoodItems: [],
      fcmToken: "",
      notificationTokens: [],
      ...(hasOtherAppProfiles ? { name: "" } : { phone: deletionMarker, name: "Deleted User", isActive: false })
    },
    $addToSet: { deletedRoles: "customer" },
    $unset: { email: "" },
    $inc: { sessionVersion: 1 }
  });

  await Order.updateMany(
    { customerId: userId },
    {
      $set: {
        deliveryAddress: "Deleted by user",
        note: ""
      }
    }
  );
};

const deletePartnerAccount = async (userId: string, deletionMarker: string) => {
  await Partner.updateOne(
    { userId },
    {
      $set: {
        phone: deletionMarker,
        ownerName: "Deleted Partner",
        restaurantName: "Deleted Partner",
        shopName: "Deleted Partner",
        shopImageUrl: "",
        isOpen: false,
        status: "SUSPENDED",
        documents: {},
        rejectionReason: "Account deleted by user"
      }
    }
  );

  await User.findByIdAndUpdate(userId, {
    $addToSet: { deletedRoles: "partner" },
    $inc: { sessionVersion: 1 }
  });
};

const deleteDeliveryAccount = async (userId: string, deletionMarker: string) => {
  await DeliveryPartner.updateOne(
    { userId },
    {
      $set: {
        phone: deletionMarker,
        name: "Deleted Delivery Partner",
        email: "",
        address: "",
        vehicleNumber: "",
        licenseNumber: "",
        profilePhotoUrl: "",
        documents: {},
        isAvailable: false,
        status: "INACTIVE",
        reviewComment: "Account deleted by user"
      }
    }
  );

  await User.findByIdAndUpdate(userId, {
    $addToSet: { deletedRoles: "delivery" },
    $inc: { sessionVersion: 1 }
  });
};

export const deleteMyAccount = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const appRole = user.role;
    const deletionMarker = buildDeletionMarker(user.id);

    if (appRole === ROLES.CUSTOMER) {
      await deleteCustomerAccount(user.id, deletionMarker);
    } else if (appRole === ROLES.PARTNER) {
      await deletePartnerAccount(user.id, deletionMarker);
    } else if (appRole === ROLES.DELIVERY) {
      await deleteDeliveryAccount(user.id, deletionMarker);
    } else {
      return errorResponse(res, "Account deletion is not supported for this role", 403);
    }

    return successResponse(res, null, "Account deleted successfully");
  } catch (err: any) {
    console.error("deleteMyAccount error:", err);
    return errorResponse(res, "Failed to delete account");
  }
};

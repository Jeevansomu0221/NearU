import mongoose from "mongoose";
import Order from "../models/Order.model";
import Partner from "../models/Partner.model";
import DeliveryPartner from "../models/DeliveryPartner.model";
import WithdrawalRequest from "../models/WithdrawalRequest.model";
import { getRiderWalletSummary } from "./payout.service";
import { ROLES } from "../config/roles";

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

export const buildDeletionMarker = (userId: string) => `deleted_${userId}_${Date.now()}`;

export const deleteCustomerAccount = async (userId: string, deletionMarker: string) => {
  const [partner, deliveryPartner] = await Promise.all([
    Partner.findOne({ userId }).select("_id").lean(),
    DeliveryPartner.findOne({ userId }).select("_id").lean()
  ]);
  const hasOtherAppProfiles = Boolean(partner || deliveryPartner);

  const User = (await import("../models/User.model")).default;
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
    $addToSet: { deletedRoles: ROLES.CUSTOMER },
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

export const deletePartnerAccount = async (userId: string, deletionMarker: string) => {
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

  const User = (await import("../models/User.model")).default;
  await User.findByIdAndUpdate(userId, {
    $addToSet: { deletedRoles: ROLES.PARTNER },
    $inc: { sessionVersion: 1 }
  });
};

export const deleteDeliveryAccount = async (userId: string, deletionMarker: string) => {
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

  const User = (await import("../models/User.model")).default;
  await User.findByIdAndUpdate(userId, {
    $addToSet: { deletedRoles: ROLES.DELIVERY },
    $inc: { sessionVersion: 1 }
  });
};

export const executeAccountDeletion = async (userId: string, appRole: string) => {
  const deletionMarker = buildDeletionMarker(userId);

  if (appRole === ROLES.CUSTOMER) {
    await deleteCustomerAccount(userId, deletionMarker);
  } else if (appRole === ROLES.PARTNER) {
    await deletePartnerAccount(userId, deletionMarker);
  } else if (appRole === ROLES.DELIVERY) {
    await deleteDeliveryAccount(userId, deletionMarker);
  } else {
    throw new Error("Account deletion is not supported for this role");
  }
};

const getPartnerPayoutCheck = async (partnerId: mongoose.Types.ObjectId | string, userId?: string) => {
  const pendingPayoutOrderFilter = {
    partnerId,
    status: "DELIVERED",
    paymentStatus: "PAID",
    "partnerPayout.status": { $ne: "PAID" }
  };

  const [summary, activeOrders] = await Promise.all([
    Order.aggregate([
      { $match: pendingPayoutOrderFilter },
      { $group: { _id: null, amount: { $sum: "$itemTotal" }, orderCount: { $sum: 1 } } }
    ]),
    userId
      ? Order.countDocuments({
          partnerId,
          status: { $in: ["PENDING", "ACCEPTED", "PREPARING", "READY", "ASSIGNED", "PICKED_UP"] }
        })
      : Promise.resolve(0)
  ]);

  const pendingPayoutAmount = Number(summary[0]?.amount || 0);
  const pendingPayoutOrderCount = Number(summary[0]?.orderCount || 0);

  return {
    pendingPayoutAmount,
    pendingPayoutOrderCount,
    pendingWithdrawals: 0,
    cashBalance: 0,
    pendingDepositAmount: 0,
    activeOrders,
    hasOutstandingPayouts: pendingPayoutAmount > 0 || activeOrders > 0,
    checkedAt: new Date()
  };
};

const getDeliveryPayoutCheck = async (deliveryPartner: any) => {
  const walletSummary = await getRiderWalletSummary(deliveryPartner, String(deliveryPartner.userId || ""));

  const [pendingWithdrawals, activeOrders] = await Promise.all([
    WithdrawalRequest.countDocuments({
      deliveryPartnerId: deliveryPartner._id,
      status: "PENDING"
    }),
    Order.countDocuments({
      deliveryPartnerId: deliveryPartner.userId,
      status: { $in: ["ASSIGNED", "PICKED_UP"] }
    })
  ]);

  const pendingPayoutAmount = Number(walletSummary.walletBalance || 0);
  const cashBalance = Number(deliveryPartner.cashBalance || 0);
  const pendingDepositAmount = Number(deliveryPartner.pendingDepositAmount || 0);

  return {
    pendingPayoutAmount,
    pendingPayoutOrderCount: Number(walletSummary.pendingPayoutOrderCount || 0),
    pendingWithdrawals,
    cashBalance,
    pendingDepositAmount,
    activeOrders,
    hasOutstandingPayouts:
      pendingPayoutAmount > 0 ||
      pendingWithdrawals > 0 ||
      cashBalance > 0 ||
      pendingDepositAmount > 0 ||
      activeOrders > 0,
    checkedAt: new Date()
  };
};

export const buildPayoutCheck = async (appRole: "partner" | "delivery", profileId: string, userId?: string) => {
  if (appRole === "partner") {
    return getPartnerPayoutCheck(profileId, userId);
  }

  const deliveryPartner = await DeliveryPartner.findById(profileId).lean();
  if (!deliveryPartner) {
    throw new Error("Delivery partner profile not found");
  }

  return getDeliveryPayoutCheck(deliveryPartner);
};

export const refreshDeletionRequestPayoutCheck = async (request: any) => {
  const payoutCheck = await buildPayoutCheck(
    request.appRole,
    String(request.profileId),
    String(request.userId)
  );
  request.payoutCheck = payoutCheck;
  await request.save();
  return request;
};

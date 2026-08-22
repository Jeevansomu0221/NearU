/**
 * Hard-delete all partner & delivery mock data before go-live.
 * Requires ALLOW_DESTRUCTIVE_CLEAR=true and non-production NODE_ENV, OR
 * ALLOW_PRODUCTION_WIPE=true for production runs.
 */
import "dotenv/config";
import mongoose from "mongoose";
import Partner from "../src/models/Partner.model";
import DeliveryPartner from "../src/models/DeliveryPartner.model";
import User from "../src/models/User.model";
import MenuItem from "../src/models/MenuItem.model";
import Order from "../src/models/Order.model";
import SubOrder from "../src/models/SubOrder.model";
import DeliveryJob from "../src/models/DeliveryJob.model";
import CashLedgerEntry from "../src/models/CashLedgerEntry.model";
import WithdrawalRequest from "../src/models/WithdrawalRequest.model";
import Payout from "../src/models/Payout.model";
import PartnerStaff from "../src/models/PartnerStaff.model";
import PartnerStaffLoginActivity from "../src/models/PartnerStaffLoginActivity.model";
import AccountDeletionRequest from "../src/models/AccountDeletionRequest.model";
import { ROLES } from "../src/config/roles";

const ADMIN_PHONE = (process.env.ADMIN_PANEL_PHONE || "").trim();

async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  const allowed =
    process.env.ALLOW_PRODUCTION_WIPE === "true" ||
    (!isProduction && process.env.ALLOW_DESTRUCTIVE_CLEAR === "true");

  if (!allowed) {
    throw new Error(
      "Refusing to wipe data. Set ALLOW_PRODUCTION_WIPE=true (production) or ALLOW_DESTRUCTIVE_CLEAR=true (non-production).",
    );
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  await mongoose.connect(uri);
  console.log("Connected to MongoDB\n");

  const before = {
    partners: await Partner.countDocuments(),
    delivery: await DeliveryPartner.countDocuments(),
    orders: await Order.countDocuments(),
    menuItems: await MenuItem.countDocuments(),
    staff: await PartnerStaff.countDocuments(),
  };
  console.log("Before:", before);

  const adminUser = ADMIN_PHONE ? await User.findOne({ phone: ADMIN_PHONE }).select("_id role").lean() : null;
  const adminUserId = adminUser?._id;

  const results: Record<string, number> = {};

  results.cashLedger = (await CashLedgerEntry.deleteMany({})).deletedCount ?? 0;
  results.withdrawals = (await WithdrawalRequest.deleteMany({})).deletedCount ?? 0;
  results.payouts = (await Payout.deleteMany({ recipientType: { $in: ["PARTNER", "DELIVERY_PARTNER"] } })).deletedCount ?? 0;
  results.deliveryJobs = (await DeliveryJob.deleteMany({})).deletedCount ?? 0;
  results.subOrders = (await SubOrder.deleteMany({})).deletedCount ?? 0;
  results.orders = (await Order.deleteMany({})).deletedCount ?? 0;
  results.menuItems = (await MenuItem.deleteMany({})).deletedCount ?? 0;
  results.staffLoginActivity = (await PartnerStaffLoginActivity.deleteMany({})).deletedCount ?? 0;
  results.staff = (await PartnerStaff.deleteMany({})).deletedCount ?? 0;
  results.accountDeletions = (
    await AccountDeletionRequest.deleteMany({ appRole: { $in: ["partner", "delivery"] } })
  ).deletedCount ?? 0;
  results.partners = (await Partner.deleteMany({})).deletedCount ?? 0;
  results.deliveryPartners = (await DeliveryPartner.deleteMany({})).deletedCount ?? 0;

  const userFilter: Record<string, unknown> = {
    role: { $in: [ROLES.PARTNER, ROLES.DELIVERY] },
  };
  if (ADMIN_PHONE) {
    userFilter.phone = { $ne: ADMIN_PHONE };
  }
  results.users = (await User.deleteMany(userFilter)).deletedCount ?? 0;

  if (adminUserId) {
    await User.findByIdAndUpdate(adminUserId, {
      $set: { role: ROLES.ADMIN, isActive: true },
      $pull: { deletedRoles: { $in: [ROLES.PARTNER, ROLES.DELIVERY] } },
      $inc: { sessionVersion: 1 },
    });
    console.log(`Preserved admin user (${ADMIN_PHONE}), reset role to admin`);
  }

  const after = {
    partners: await Partner.countDocuments(),
    delivery: await DeliveryPartner.countDocuments(),
    orders: await Order.countDocuments(),
    menuItems: await MenuItem.countDocuments(),
    staff: await PartnerStaff.countDocuments(),
  };

  console.log("\nDeleted:", results);
  console.log("After:", after);

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

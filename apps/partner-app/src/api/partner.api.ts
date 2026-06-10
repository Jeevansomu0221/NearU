import api from "./client";

export type PartnerPayoutHistoryItem = {
  _id: string;
  amount: number;
  orderCount: number;
  periodType: "WEEKLY" | "MONTHLY";
  periodStart: string;
  periodEnd: string;
  status: "PAID";
  paidAt: string;
  paidReference?: string;
  paidNotes?: string;
  bankSnapshot?: {
    accountHolderName?: string;
    maskedAccountNumber?: string;
    ifsc?: string;
    upiId?: string;
  };
};

export type PartnerWalletOrder = {
  _id: string;
  amount: number;
  grandTotal: number;
  createdAt: string;
  deliveredAt: string;
  payoutStatus: "PENDING" | "PAID";
};

export type PartnerWallet = {
  todayEarnings: number;
  todayOrderCount: number;
  walletBalance: number;
  unpaidOrderCount: number;
  lifetimeEarnings: number;
  lifetimeOrderCount: number;
  paidTotal: number;
  payoutCycle: "WEEKLY";
  nextPayoutDate: string;
  payoutNote: string;
  bankDetails: {
    accountHolderName: string;
    maskedAccountNumber: string;
    ifsc: string;
    upiId: string;
    hasBankDetails: boolean;
  };
  recentUnpaidOrders: PartnerWalletOrder[];
  payouts: PartnerPayoutHistoryItem[];
};

export const getMySubOrders = () => {
  return api.get("/partners/suborders");
};
export const completeSetup = () => 
  api.post("/partners/complete-setup");

export const getMyStatus = () => 
  api.get("/partners/my-status");

export const getPartnerWallet = () =>
  api.get<{ success: boolean; data?: PartnerWallet; message?: string }>("/partners/wallet");

export const acceptSubOrder = (subOrderId: string, price: number) => {
  return api.post(`/partners/suborders/${subOrderId}/accept`, {
    price
  });
};

export const rejectSubOrder = (subOrderId: string) => {
  return api.post(`/partners/suborders/${subOrderId}/reject`);
};

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
  pendingPayoutOrderCount: number;
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
  recentPendingPayoutOrders: PartnerWalletOrder[];
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

export type PartnerStaffAccount = {
  _id: string;
  username: string;
  displayName: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  lastLoginPlatform?: "web" | "app" | "unknown";
  lastOperatorName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PartnerStaffLoginActivity = {
  _id: string;
  staffId: string;
  username: string;
  displayName?: string;
  event: "login" | "logout" | "failed_login";
  success: boolean;
  ip?: string;
  userAgent?: string;
  platform?: "web" | "app" | "unknown";
  message?: string;
  createdAt: string;
};

export const listPartnerStaff = () =>
  api.get<{ success: boolean; data?: PartnerStaffAccount[]; message?: string }>("/partner-staff");

export const createPartnerStaff = (payload: {
  username: string;
  password: string;
  confirmPassword?: string;
  displayName?: string;
}) => api.post<{ success: boolean; data?: PartnerStaffAccount; message?: string }>("/partner-staff", payload);

export const updatePartnerStaff = (
  staffId: string,
  payload: { isActive?: boolean; password?: string; confirmPassword?: string }
) => api.put<{ success: boolean; data?: PartnerStaffAccount; message?: string }>(`/partner-staff/${staffId}`, payload);

export const disablePartnerStaff = (staffId: string) =>
  api.delete<{ success: boolean; data?: PartnerStaffAccount; message?: string }>(`/partner-staff/${staffId}`);

export const signOutPartnerStaff = (staffId: string) =>
  api.post<{ success: boolean; data?: PartnerStaffAccount; message?: string }>(`/partner-staff/${staffId}/sign-out`);

export const getPartnerStaffLoginActivity = (params?: { staffId?: string; page?: number; limit?: number }) =>
  api.get<{
    success: boolean;
    data?: PartnerStaffLoginActivity[];
    message?: string;
    pagination?: { page: number; limit: number; total: number; hasMore: boolean };
  }>("/partner-staff/login-activity", { params });

export type PartnerOrderReview = {
  _id: string;
  orderId: string;
  orderNumber: string;
  rating: number;
  foodQuality?: number;
  packaging?: number;
  overallExperience?: number;
  comment: string;
  submittedAt?: string;
  orderedAt?: string;
  customerName: string;
  grandTotal?: number;
  itemsSummary?: string;
};

export type PartnerReviewsResponse = {
  reviews: PartnerOrderReview[];
  total: number;
  rating: number;
  ratingCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export const getPartnerReviews = (params?: { page?: number; limit?: number }) =>
  api.get<{ success: boolean; data?: PartnerReviewsResponse; message?: string }>("/partners/reviews", { params });

export const acceptSubOrder = (subOrderId: string, price: number) => {
  return api.post(`/partners/suborders/${subOrderId}/accept`, {
    price
  });
};

export const rejectSubOrder = (subOrderId: string) => {
  return api.post(`/partners/suborders/${subOrderId}/reject`);
};

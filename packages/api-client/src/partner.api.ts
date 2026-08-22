import { apiGet, apiPost, apiPut, apiPatch, apiDelete, uploadMultipart } from "./client.js";
import type { ApiResponse, PartnerStatusData } from "./types.js";

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

export const getMyStatus = () => apiGet<PartnerStatusData>("/partners/my-status");

export const getPartnerProfile = () => apiGet<Record<string, unknown>>("/partners/profile");

export const updatePartnerProfile = (payload: Record<string, unknown>) =>
  apiPut<Record<string, unknown>>("/partners/profile", payload);

export const getOnboardingDraft = () => apiGet<Record<string, unknown>>("/partners/onboarding-draft");

export const saveOnboardingDraft = (draft: Record<string, unknown>) =>
  apiPut("/partners/onboarding-draft", { draft });

export const submitOnboarding = (data: Record<string, unknown>) => apiPost("/partners/onboard", data);

export type ResolvedShopPin = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

export const resolveShopAddressPin = (address: Record<string, unknown>) =>
  apiPost<ResolvedShopPin>("/partners/geocode/resolve", address);

export type ReverseGeocodedAddress = {
  formattedAddress: string;
  houseFlatDoorNo?: string;
  buildingApartmentName?: string;
  streetRoadName?: string;
  colony?: string;
  area?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

export const reverseGeocodeLocation = (latitude: number, longitude: number) =>
  apiPost<ReverseGeocodedAddress>("/partners/geocode/reverse", { latitude, longitude });

export const completeSetup = () => apiPost("/partners/complete-setup");

export const getPartnerMenuItems = () => apiGet<unknown[]>("/partners/menu");

export const createMenuItem = (data: Record<string, unknown>) => apiPost("/partners/menu", data);

export const updateMenuItem = (id: string, data: Record<string, unknown>) =>
  apiPut(`/partners/menu/${id}`, data);

export const toggleMenuAvailability = (id: string, isAvailable: boolean) =>
  apiPatch(`/partners/menu/${id}/availability`, { isAvailable });

export const deleteMenuItem = (id: string) => apiDelete(`/partners/menu/${id}`);

export const updateShopStatus = (isOpen: boolean) => apiPut("/partners/shop-status", { isOpen });

export const getPartnerStats = () => apiGet<Record<string, unknown>>("/partners/stats");

export const getPartnerWallet = () => apiGet<PartnerWallet>("/partners/wallet");

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

export const listPartnerStaff = () => apiGet<PartnerStaffAccount[]>("/partner-staff");

export const createPartnerStaff = (payload: {
  username: string;
  password: string;
  confirmPassword?: string;
  displayName?: string;
}) => apiPost<PartnerStaffAccount>("/partner-staff", payload);

export const updatePartnerStaff = (
  staffId: string,
  payload: { isActive?: boolean; password?: string; confirmPassword?: string }
) => apiPut<PartnerStaffAccount>(`/partner-staff/${staffId}`, payload);

export const disablePartnerStaff = (staffId: string) =>
  apiDelete<PartnerStaffAccount>(`/partner-staff/${staffId}`);

export const signOutPartnerStaff = (staffId: string, operatorName: string) =>
  apiPost<PartnerStaffAccount>(`/partner-staff/${staffId}/sign-out`, { operatorName });

export const getPartnerStaffLoginActivity = (params?: {
  staffId?: string;
  page?: number;
  limit?: number;
}) =>
  apiGet<PartnerStaffLoginActivity[]>("/partner-staff/login-activity", { params });

export const getMySubOrders = () => apiGet("/partners/suborders");

export const acceptSubOrder = (subOrderId: string, price: number) =>
  apiPost(`/partners/suborders/${subOrderId}/accept`, { price });

export const rejectSubOrder = (subOrderId: string) => apiPost(`/partners/suborders/${subOrderId}/reject`);

export const uploadImage = (file: File, folder = "nearu-app") => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("folder", folder);
  return uploadMultipart<{ url: string }>("/upload/image", formData);
};

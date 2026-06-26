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
export declare const getMyStatus: () => Promise<ApiResponse<PartnerStatusData>>;
export declare const getPartnerProfile: () => Promise<ApiResponse<Record<string, unknown>>>;
export declare const updatePartnerProfile: (payload: Record<string, unknown>) => Promise<ApiResponse<Record<string, unknown>>>;
export declare const getOnboardingDraft: () => Promise<ApiResponse<Record<string, unknown>>>;
export declare const saveOnboardingDraft: (draft: Record<string, unknown>) => Promise<ApiResponse<unknown>>;
export declare const submitOnboarding: (data: Record<string, unknown>) => Promise<ApiResponse<unknown>>;
export declare const completeSetup: () => Promise<ApiResponse<unknown>>;
export declare const getPartnerMenuItems: () => Promise<ApiResponse<unknown[]>>;
export declare const createMenuItem: (data: Record<string, unknown>) => Promise<ApiResponse<unknown>>;
export declare const updateMenuItem: (id: string, data: Record<string, unknown>) => Promise<ApiResponse<unknown>>;
export declare const toggleMenuAvailability: (id: string, isAvailable: boolean) => Promise<ApiResponse<unknown>>;
export declare const deleteMenuItem: (id: string) => Promise<ApiResponse<unknown>>;
export declare const updateShopStatus: (isOpen: boolean) => Promise<ApiResponse<unknown>>;
export declare const getPartnerStats: () => Promise<ApiResponse<Record<string, unknown>>>;
export declare const getPartnerWallet: () => Promise<ApiResponse<PartnerWallet>>;
export declare const getMySubOrders: () => Promise<ApiResponse<unknown>>;
export declare const acceptSubOrder: (subOrderId: string, price: number) => Promise<ApiResponse<unknown>>;
export declare const rejectSubOrder: (subOrderId: string) => Promise<ApiResponse<unknown>>;
export declare const uploadImage: (file: File, folder?: string) => Promise<ApiResponse<{
    url: string;
}>>;
//# sourceMappingURL=partner.api.d.ts.map
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
export type ResolvedShopPin = {
    latitude: number;
    longitude: number;
    formattedAddress: string;
};
export declare const resolveShopAddressPin: (address: Record<string, unknown>) => Promise<ApiResponse<ResolvedShopPin>>;
export declare const partnerAddressToGeocodePayload: (address: {
    shopName?: string;
    restaurantName?: string;
    roadStreet?: string;
    colony?: string;
    area?: string;
    city?: string;
    state?: string;
    pincode?: string;
    nearbyPlaces?: string | string[];
    landmark?: string;
}) => {
    shopName: string;
    restaurantName: string;
    streetRoadName: string;
    buildingApartmentName: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    landmark: string;
};
export declare const shopPlaceSearchQuery: (address: {
    shopName?: string;
    restaurantName?: string;
    colony?: string;
    area?: string;
    city?: string;
    pincode?: string;
    state?: string;
}) => string;
export declare const scoreShopPlaceSuggestion: (suggestion: {
    description?: string;
    mainText?: string;
    secondaryText?: string;
}, shopName: string, area?: string, city?: string) => number;
export type ReverseGeocodedAddress = {
    formattedAddress: string;
    houseFlatDoorNo?: string;
    buildingApartmentName?: string;
    streetRoadName?: string;
    area?: string;
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
    country?: string;
    latitude: number;
    longitude: number;
};
export declare const reverseGeocodeLocation: (latitude: number, longitude: number) => Promise<ApiResponse<ReverseGeocodedAddress>>;
export type ShopPlaceAddress = ReverseGeocodedAddress & {
    placeId?: string;
    placeName?: string;
};
export type ShopPlaceSuggestion = {
    description: string;
    placeId: string;
    mainText?: string;
    secondaryText?: string;
    address?: ShopPlaceAddress;
};
export declare const suggestShopPlaces: (query: string) => Promise<ApiResponse<ShopPlaceSuggestion[]>>;
export declare const getShopPlaceAddress: (placeId: string) => Promise<ApiResponse<ShopPlaceAddress>>;
export declare const addressFieldsFromShopPlace: (place: ShopPlaceAddress, fallbackShopName?: string) => {
    shopName: string;
    address: {
        state: string;
        city: string;
        pincode: string;
        area: string;
        colony: string;
        roadStreet: string;
        nearbyPlaces: string;
    };
    pin: {
        latitude: number;
        longitude: number;
        formattedAddress: string;
    };
};
export declare const resolveExactGoogleShopPin: (address: {
    shopName?: string;
    restaurantName?: string;
    roadStreet?: string;
    colony?: string;
    area?: string;
    city?: string;
    state?: string;
    pincode?: string;
    nearbyPlaces?: string | string[];
}) => Promise<ResolvedShopPin>;
export declare const completeSetup: () => Promise<ApiResponse<unknown>>;
export declare const getPartnerMenuItems: () => Promise<ApiResponse<unknown[]>>;
export declare const createMenuItem: (data: Record<string, unknown>) => Promise<ApiResponse<unknown>>;
export declare const updateMenuItem: (id: string, data: Record<string, unknown>) => Promise<ApiResponse<unknown>>;
export declare const toggleMenuAvailability: (id: string, isAvailable: boolean) => Promise<ApiResponse<unknown>>;
export declare const deleteMenuItem: (id: string) => Promise<ApiResponse<unknown>>;
export declare const updateShopStatus: (isOpen: boolean) => Promise<ApiResponse<unknown>>;
export declare const getPartnerStats: () => Promise<ApiResponse<Record<string, unknown>>>;
export declare const getPartnerWallet: () => Promise<ApiResponse<PartnerWallet>>;
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
export declare const listPartnerStaff: () => Promise<ApiResponse<PartnerStaffAccount[]>>;
export declare const createPartnerStaff: (payload: {
    username: string;
    password: string;
    confirmPassword?: string;
    displayName?: string;
}) => Promise<ApiResponse<PartnerStaffAccount>>;
export declare const updatePartnerStaff: (staffId: string, payload: {
    isActive?: boolean;
    password?: string;
    confirmPassword?: string;
}) => Promise<ApiResponse<PartnerStaffAccount>>;
export declare const disablePartnerStaff: (staffId: string) => Promise<ApiResponse<PartnerStaffAccount>>;
export declare const getPartnerStaffLoginActivity: (params?: {
    staffId?: string;
    page?: number;
    limit?: number;
}) => Promise<ApiResponse<PartnerStaffLoginActivity[]>>;
export declare const getMySubOrders: () => Promise<ApiResponse<unknown>>;
export declare const acceptSubOrder: (subOrderId: string, price: number) => Promise<ApiResponse<unknown>>;
export declare const rejectSubOrder: (subOrderId: string) => Promise<ApiResponse<unknown>>;
export declare const uploadImage: (file: File, folder?: string) => Promise<ApiResponse<{
    url: string;
}>>;
//# sourceMappingURL=partner.api.d.ts.map
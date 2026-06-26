import type { SavedAddress } from "./types.js";
export declare const isCustomerProfileComplete: (profile: {
    name?: string;
    address?: SavedAddress;
    addresses?: SavedAddress[];
}) => boolean;
export declare const formatAddressText: (address?: SavedAddress) => string;
export declare const getShopName: (shop: {
    shopName?: string;
    restaurantName?: string;
}) => string;
//# sourceMappingURL=profile.d.ts.map
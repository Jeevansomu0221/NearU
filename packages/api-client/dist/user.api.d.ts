import type { ApiResponse, SavedAddress, UserProfile } from "./types.js";
export interface FavoriteRestaurant {
    _id: string;
    shopName?: string;
    restaurantName?: string;
    category?: string;
    isOpen?: boolean;
    rating?: number;
    shopImageUrl?: string;
}
export interface FavoritesResponse {
    restaurants: FavoriteRestaurant[];
    foodItems: Array<{
        _id: string;
        name: string;
        price?: number;
        imageUrl?: string;
    }>;
}
export declare const getUserProfile: () => Promise<ApiResponse<UserProfile>>;
export declare const updateUserProfile: (profileData: {
    name?: string;
    email?: string;
}) => Promise<ApiResponse<UserProfile>>;
export declare const updateUserAddress: (addressData: Partial<SavedAddress>) => Promise<ApiResponse<UserProfile>>;
export declare const getSavedAddresses: () => Promise<ApiResponse<SavedAddress[]>>;
export declare const addAddress: (addressData: SavedAddress) => Promise<ApiResponse<UserProfile>>;
export declare const setDefaultAddress: (addressId: string) => Promise<ApiResponse<UserProfile>>;
export declare const deleteAddress: (addressId: string) => Promise<ApiResponse<UserProfile>>;
export declare const getMyFavorites: () => Promise<ApiResponse<FavoritesResponse>>;
export declare const addFavoriteRestaurant: (partnerId: string) => Promise<ApiResponse<FavoritesResponse>>;
export declare const removeFavoriteRestaurant: (partnerId: string) => Promise<ApiResponse<FavoritesResponse>>;
export declare const deleteMyAccount: () => Promise<ApiResponse<null>>;
//# sourceMappingURL=user.api.d.ts.map
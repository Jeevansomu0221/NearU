import { apiGet, apiPut, apiPost, apiDelete } from "./client.js";
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

export const getUserProfile = (): Promise<ApiResponse<UserProfile>> => apiGet<UserProfile>("/users/profile");

export const updateUserProfile = (profileData: {
  name?: string;
  email?: string;
}): Promise<ApiResponse<UserProfile>> => apiPut<UserProfile>("/users/profile", profileData);

export const updateUserAddress = (addressData: Partial<SavedAddress>): Promise<ApiResponse<UserProfile>> =>
  apiPut<UserProfile>("/users/address", addressData);

export const getSavedAddresses = (): Promise<ApiResponse<SavedAddress[]>> =>
  apiGet<SavedAddress[]>("/users/addresses");

export const addAddress = (addressData: SavedAddress): Promise<ApiResponse<UserProfile>> =>
  apiPost<UserProfile>("/users/addresses", addressData);

export const setDefaultAddress = (addressId: string): Promise<ApiResponse<UserProfile>> =>
  apiPut<UserProfile>(`/users/address/${addressId}/default`);

export const deleteAddress = (addressId: string): Promise<ApiResponse<UserProfile>> =>
  apiDelete<UserProfile>(`/users/address/${addressId}`);

export const getMyFavorites = (): Promise<ApiResponse<FavoritesResponse>> =>
  apiGet<FavoritesResponse>("/users/favorites");

export const addFavoriteRestaurant = (partnerId: string): Promise<ApiResponse<FavoritesResponse>> =>
  apiPost<FavoritesResponse>(`/users/favorites/restaurants/${partnerId}`);

export const removeFavoriteRestaurant = (partnerId: string): Promise<ApiResponse<FavoritesResponse>> =>
  apiDelete<FavoritesResponse>(`/users/favorites/restaurants/${partnerId}`);

export const deleteMyAccount = (): Promise<ApiResponse<null>> => apiDelete<null>("/users/me");

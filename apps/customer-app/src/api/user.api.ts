// apps/customer-app/src/api/user.api.ts
import { apiGet, apiPut, apiPost, apiDelete, ApiResponse } from "./client";

export interface SavedAddress {
  _id?: string;
  label?: string;
  recipientName?: string;
  houseFlatDoorNo?: string;
  buildingApartmentName?: string;
  streetRoadName?: string;
  street?: string;
  city?: string;
  cityTownVillage?: string;
  state?: string;
  pincode?: string;
  area?: string;
  areaLocality?: string;
  landmark?: string;
  district?: string;
  country?: string;
  isDefault?: boolean;
}

// Define UserProfile interface here - MAKE IT EXPORTED
export interface UserProfile {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: SavedAddress;
  addresses?: SavedAddress[];
  createdAt: string;
}

/**
 * GET USER PROFILE
 */
export const getUserProfile = (): Promise<ApiResponse<UserProfile>> => {
  return apiGet<UserProfile>("/users/profile");
};

/**
 * UPDATE USER PROFILE
 */
export const updateUserProfile = (profileData: {
  name?: string;
  email?: string;
}): Promise<ApiResponse<UserProfile>> => {
  return apiPut<UserProfile>("/users/profile", profileData);
};

/**
 * UPDATE USER ADDRESS
 */
export const updateUserAddress = (addressData: {
  addressId?: string;
  label?: string;
  recipientName?: string;
  houseFlatDoorNo?: string;
  buildingApartmentName?: string;
  streetRoadName?: string;
  street?: string;
  city?: string;
  cityTownVillage?: string;
  state?: string;
  pincode?: string;
  area?: string;
  areaLocality?: string;
  landmark?: string;
  district?: string;
  country?: string;
  isDefault?: boolean;
}): Promise<ApiResponse<UserProfile>> => {
  return apiPut<UserProfile>("/users/address", addressData);
};

/**
 * GET SAVED ADDRESSES
 */
export const getSavedAddresses = (): Promise<ApiResponse<SavedAddress[]>> => {
  return apiGet<SavedAddress[]>("/users/addresses");
};

/**
 * ADD NEW ADDRESS
 */
export const addAddress = (addressData: SavedAddress): Promise<ApiResponse<UserProfile>> => {
  return apiPost<UserProfile>("/users/addresses", addressData);
};

/**
 * SET DEFAULT ADDRESS
 */
export const setDefaultAddress = (addressId: string): Promise<ApiResponse<UserProfile>> => {
  return apiPut<UserProfile>(`/users/address/${addressId}/default`);
};

/**
 * DELETE ADDRESS
 */
export const deleteAddress = (addressId: string): Promise<ApiResponse<UserProfile>> => {
  return apiDelete<UserProfile>(`/users/address/${addressId}`);
};

export const deleteMyAccount = (): Promise<ApiResponse<null>> => {
  return apiDelete<null>("/users/me");
};

// apps/customer-app/src/api/user.api.ts
import { apiGet, apiPut, apiDelete, ApiResponse } from "./client";

// Define UserProfile interface here - MAKE IT EXPORTED
export interface UserProfile {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    area: string;
    landmark?: string;
  };
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
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  area?: string;
  landmark?: string;
}): Promise<ApiResponse<UserProfile>> => {
  return apiPut<UserProfile>("/users/address", addressData);
};

/**
 * GET SAVED ADDRESSES
 */
export const getSavedAddresses = (): Promise<ApiResponse<any>> => {
  return apiGet<any>("/users/addresses");
};

/**
 * ADD NEW ADDRESS
 */
export const addAddress = (addressData: any): Promise<ApiResponse<any>> => {
  return apiPut<any>("/users/address", addressData);
};

/**
 * SET DEFAULT ADDRESS
 */
export const setDefaultAddress = (addressId: string): Promise<ApiResponse<any>> => {
  return apiPut<any>(`/users/address/${addressId}/default`);
};

/**
 * DELETE ADDRESS
 */
export const deleteAddress = (addressId: string): Promise<ApiResponse<any>> => {
  return apiDelete<any>(`/users/address/${addressId}`);
};
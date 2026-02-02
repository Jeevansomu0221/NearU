// apps/customer-app/src/api/user.api.ts
import api from "./client";

/**
 * GET USER PROFILE
 */
export const getUserProfile = () => {
  return api.get("/users/profile");
};

/**
 * UPDATE USER PROFILE
 */
export const updateUserProfile = (profileData: {
  name?: string;
  email?: string;
}) => {
  return api.put("/users/profile", profileData);
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
}) => {
  return api.put("/users/address", addressData);
};

/**
 * GET SAVED ADDRESSES
 */
export const getSavedAddresses = () => {
  return api.get("/users/addresses");
};

/**
 * ADD NEW ADDRESS
 */
export const addAddress = (addressData: any) => {
  return api.post("/users/address", addressData);
};

/**
 * SET DEFAULT ADDRESS
 */
export const setDefaultAddress = (addressId: string) => {
  return api.post(`/users/address/${addressId}/default`);
};

/**
 * DELETE ADDRESS
 */
export const deleteAddress = (addressId: string) => {
  return api.delete(`/users/address/${addressId}`);
};
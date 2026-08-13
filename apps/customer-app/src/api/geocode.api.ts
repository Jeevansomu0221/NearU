import { apiGet, apiPost, ApiResponse } from "./client";

export type GeocodedAddress = {
  formattedAddress: string;
  placeId: string;
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

export type AddressSuggestion = {
  description: string;
  placeId: string;
  address?: GeocodedAddress;
};

export const suggestAddresses = (query: string): Promise<ApiResponse<AddressSuggestion[]>> => {
  return apiGet<AddressSuggestion[]>(`/users/geocode/suggest?q=${encodeURIComponent(query)}`);
};

export const geocodeAddressQuery = (query: string): Promise<ApiResponse<GeocodedAddress[]>> => {
  return apiGet<GeocodedAddress[]>(`/users/geocode?q=${encodeURIComponent(query)}`);
};

export const getGeocodedPlace = (placeId: string): Promise<ApiResponse<GeocodedAddress>> => {
  return apiGet<GeocodedAddress>(`/users/geocode/place?placeId=${encodeURIComponent(placeId)}`);
};

export type ResolvedAddressPin = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

export const resolveAddressPin = (address: Record<string, unknown>): Promise<ApiResponse<ResolvedAddressPin>> => {
  return apiPost<ResolvedAddressPin>("/users/geocode/resolve", address);
};

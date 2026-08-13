import api, { ApiResponse } from "./client";

export type ResolvedAddressPin = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

export const partnerAddressToGeocodePayload = (address: {
  roadStreet?: string;
  colony?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  nearbyPlaces?: string | string[];
  landmark?: string;
}) => ({
  streetRoadName: String(address.roadStreet || "").trim(),
  buildingApartmentName: String(address.colony || "").trim(),
  area: String(address.area || "").trim(),
  city: String(address.city || "").trim(),
  state: String(address.state || "").trim(),
  pincode: String(address.pincode || "").trim(),
  landmark: Array.isArray(address.nearbyPlaces)
    ? address.nearbyPlaces.filter(Boolean).join(", ")
    : String(address.nearbyPlaces || address.landmark || "").trim()
});

export const resolveAddressPin = async (
  address: Record<string, unknown>
): Promise<ApiResponse<ResolvedAddressPin>> => {
  const response = await api.post<ApiResponse<ResolvedAddressPin>>("/partners/geocode/resolve", address);
  return response.data;
};

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

export const reverseGeocodeLocation = async (
  latitude: number,
  longitude: number
): Promise<ApiResponse<ReverseGeocodedAddress>> => {
  const response = await api.post<ApiResponse<ReverseGeocodedAddress>>("/partners/geocode/reverse", {
    latitude,
    longitude
  });
  return response.data;
};

import api, { ApiResponse } from "./client";

export type ResolvedAddressPin = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

export const partnerAddressToGeocodePayload = (
  address: {
    shopHouseName?: string;
    roadStreet?: string;
    colony?: string;
    area?: string;
    city?: string;
    state?: string;
    pincode?: string;
    nearbyPlaces?: string | string[];
    landmark?: string;
  },
  restaurantName = ""
) => ({
  shopName: String(restaurantName || "").trim(),
  restaurantName: String(restaurantName || "").trim(),
  shopHouseName: String(address.shopHouseName || "").trim(),
  streetRoadName: String(address.roadStreet || "").trim(),
  buildingApartmentName: String(address.shopHouseName || "").trim(),
  colony: String(address.colony || "").trim(),
  area: String(address.area || "").trim(),
  city: String(address.city || "").trim(),
  state: String(address.state || "").trim(),
  pincode: String(address.pincode || "").trim(),
  landmark: Array.isArray(address.nearbyPlaces)
    ? address.nearbyPlaces.filter(Boolean).join(", ")
    : String(address.nearbyPlaces || address.landmark || "").trim()
});

const GENERIC_STREET_RE = /^(rd|road|st|street|lane|ln|cross|nh|highway)\s*\.?\s*\d*$/i;

export const partnerShopAddressLines = (address: {
  shopHouseName?: string;
  floor?: string;
  roadStreet?: string;
  colony?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
}) =>
  [
    [address.shopHouseName, address.floor].filter(Boolean).join(", "),
    address.roadStreet && !GENERIC_STREET_RE.test(address.roadStreet.trim()) ? address.roadStreet : "",
    address.colony,
    address.area,
    [address.city, address.state, address.pincode].filter(Boolean).join(", ")
  ].filter(Boolean);

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

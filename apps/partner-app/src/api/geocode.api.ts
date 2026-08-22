import api, { ApiResponse } from "./client";

export type ResolvedAddressPin = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

const GENERIC_STREET_RE = /^(rd|road|st|street|lane|ln|cross|nh|highway)\s*\.?\s*\d*$/i;
const LANDMARK_RE = /\b(beside|besides|near|opp\.?|opposite|next to|behind|in front of|landmark|community hall)\b/i;

const usablePlaceName = (value?: string) => {
  const text = String(value || "").trim();
  if (!text || LANDMARK_RE.test(text) || GENERIC_STREET_RE.test(text)) return "";
  return text;
};

const parseShopHouse = (value?: string) => {
  const text = String(value || "").trim();
  const match = text.match(/^(\d+[a-zA-Z\-\/]*)\s+(.+)$/);
  if (!match) return { houseFlatDoorNo: "", building: text };
  return { houseFlatDoorNo: match[1], building: match[2].trim() };
};

export type ReverseGeocodedAddress = {
  formattedAddress: string;
  houseFlatDoorNo?: string;
  buildingApartmentName?: string;
  streetRoadName?: string;
  colony?: string;
  area?: string;
  town?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

export const partnerAddressToGeocodePayload = (
  address: {
    shopHouseName?: string;
    roadStreet?: string;
    colony?: string;
    area?: string;
    town?: string;
    city?: string;
    state?: string;
    pincode?: string;
    nearbyPlaces?: string | string[];
    landmark?: string;
  },
  restaurantName = ""
) => {
  const parsed = parseShopHouse(address.shopHouseName);
  const area = String(address.area || "").trim();
  const colony = usablePlaceName(address.colony);
  const landmark = Array.isArray(address.nearbyPlaces)
    ? address.nearbyPlaces.filter(Boolean).join(", ")
    : String(address.nearbyPlaces || address.landmark || "").trim();

  return {
    shopName: String(restaurantName || "").trim(),
    restaurantName: String(restaurantName || "").trim(),
    houseFlatDoorNo: parsed.houseFlatDoorNo,
    shopHouseName: parsed.building || String(address.shopHouseName || "").trim(),
    streetRoadName: usablePlaceName(address.roadStreet),
    buildingApartmentName: parsed.building || String(address.shopHouseName || "").trim(),
    colony: colony && colony.toLowerCase() !== area.toLowerCase() ? colony : "",
    area,
    town: String(address.town || "").trim(),
    city: String(address.city || "").trim(),
    state: String(address.state || "").trim(),
    pincode: String(address.pincode || "").trim(),
    landmark: LANDMARK_RE.test(landmark) ? landmark : landmark
  };
};

export const partnerShopAddressLines = (address: {
  shopHouseName?: string;
  floor?: string;
  roadStreet?: string;
  colony?: string;
  area?: string;
  town?: string;
  city?: string;
  state?: string;
  pincode?: string;
}) => {
  const lines: string[] = [];
  const seen = new Set<string>();
  [
    [address.shopHouseName, address.floor].filter(Boolean).join(", "),
    address.roadStreet && !GENERIC_STREET_RE.test(String(address.roadStreet).trim()) ? address.roadStreet : "",
    address.colony,
    address.area,
    address.town,
    [address.city, address.state, address.pincode].filter(Boolean).join(", ")
  ]
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .forEach((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      lines.push(line);
    });
  return lines;
};

export const resolveAddressPin = async (
  address: Record<string, unknown>
): Promise<ApiResponse<ResolvedAddressPin>> => {
  const response = await api.post<ApiResponse<ResolvedAddressPin>>("/partners/geocode/resolve", address);
  return response.data;
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

export const mergeReverseGeocodedAddress = <T extends Record<string, any>>(current: T, geo: ReverseGeocodedAddress): T => ({
  ...current,
  shopHouseName: current.shopHouseName || geo.buildingApartmentName || geo.houseFlatDoorNo || "",
  roadStreet: geo.streetRoadName || current.roadStreet,
  colony: geo.colony || current.colony,
  area: geo.area || current.area,
  town: geo.town || current.town || "",
  city: geo.city || current.city,
  state: geo.state || current.state,
  pincode: geo.pincode || current.pincode
});

import api, { ApiResponse } from "./client";

export type ResolvedAddressPin = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

const nearbyText = (value?: string | string[]) =>
  Array.isArray(value) ? value.filter(Boolean).join(", ") : String(value || "").trim();

export const partnerAddressToGeocodePayload = (address: {
  shopName?: string;
  restaurantName?: string;
  roadStreet?: string;
  colony?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  nearbyPlaces?: string | string[];
  landmark?: string;
}) => {
  const shopName = String(address.shopName || address.restaurantName || "").trim();
  const street = String(address.roadStreet || "").trim();
  const colony = String(address.colony || "").trim();
  const genericStreet = /^(rd|road|st|street|lane|ln)\s*\.?\s*\d+$/i.test(street);
  return {
    shopName,
    restaurantName: String(address.restaurantName || address.shopName || "").trim(),
    streetRoadName: genericStreet ? "" : street,
    buildingApartmentName: colony,
    area: String(address.area || "").trim(),
    city: String(address.city || "").trim(),
    state: String(address.state || "").trim(),
    pincode: String(address.pincode || "").trim(),
    landmark: [colony, nearbyText(address.nearbyPlaces), String(address.landmark || "").trim()]
      .filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index)
      .join(", ")
  };
};

const placeTokens = (value?: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length > 2 && !/^\d+$/.test(word));

export const shopPlaceSearchQuery = (address: {
  shopName?: string;
  restaurantName?: string;
  colony?: string;
  area?: string;
  city?: string;
  pincode?: string;
  state?: string;
}) =>
  [
    address.shopName || address.restaurantName,
    address.colony,
    address.area,
    address.city,
    address.pincode,
    address.state
  ]
    .map((part) => String(part || "").trim())
    .filter((part, index, all) => part && all.indexOf(part) === index)
    .join(", ");

export const scoreShopPlaceSuggestion = (
  suggestion: { description?: string; mainText?: string; secondaryText?: string },
  shopName: string,
  area = "",
  city = ""
) => {
  const haystack = `${suggestion.mainText || ""} ${suggestion.secondaryText || ""} ${suggestion.description || ""}`.toLowerCase();
  const tokens = placeTokens(shopName);
  const matched = tokens.filter((token) => haystack.includes(token));
  let score = matched.length * 22;
  if (tokens.length > 0 && matched.length === tokens.length) score += 90;
  if (tokens.length > 0 && matched.length === 0) score -= 120;
  if (area && haystack.includes(area.toLowerCase())) score += 28;
  if (city && haystack.includes(city.toLowerCase())) score += 16;
  return score;
};

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

export type ShopPlaceAddress = ReverseGeocodedAddress & {
  placeId?: string;
  placeName?: string;
};

export type ShopPlaceSuggestion = {
  description: string;
  placeId: string;
  mainText?: string;
  secondaryText?: string;
  address?: ShopPlaceAddress;
};

export const suggestShopPlaces = async (query: string): Promise<ApiResponse<ShopPlaceSuggestion[]>> => {
  const response = await api.get<ApiResponse<ShopPlaceSuggestion[]>>(
    `/partners/geocode/suggest?q=${encodeURIComponent(query)}&kind=shop`
  );
  return response.data;
};

export const getShopPlaceAddress = async (placeId: string): Promise<ApiResponse<ShopPlaceAddress>> => {
  const response = await api.get<ApiResponse<ShopPlaceAddress>>(
    `/partners/geocode/place?placeId=${encodeURIComponent(placeId)}`
  );
  return response.data;
};

export const addressFieldsFromShopPlace = (
  place: ShopPlaceAddress,
  fallbackShopName = ""
) => {
  const shopName = String(place.placeName || place.buildingApartmentName || fallbackShopName).trim();
  const colony = String(place.buildingApartmentName || "").trim();
  return {
    shopName,
    address: {
      state: String(place.state || "").trim(),
      city: String(place.city || "").trim(),
      pincode: String(place.pincode || "").trim(),
      area: String(place.area || "").trim(),
      colony: shopName && colony.toLowerCase() === shopName.toLowerCase() ? "" : colony,
      roadStreet: String(place.streetRoadName || "").trim(),
      nearbyPlaces: String(place.formattedAddress || "").trim()
    },
    pin: {
      latitude: place.latitude,
      longitude: place.longitude,
      formattedAddress: [shopName, place.formattedAddress].filter(Boolean).join(", ")
    }
  };
};

const pinFromPlace = (place: ShopPlaceAddress, fallbackName = ""): ResolvedAddressPin | null => {
  if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return null;
  if (place.latitude === 0 && place.longitude === 0) return null;
  const name = String(place.placeName || fallbackName).trim();
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    formattedAddress: [name, place.formattedAddress].filter(Boolean).join(", ")
  };
};

export const resolveExactGoogleShopPin = async (address: {
  shopName?: string;
  restaurantName?: string;
  roadStreet?: string;
  colony?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  nearbyPlaces?: string | string[];
}): Promise<ResolvedAddressPin> => {
  const shopName = String(address.shopName || address.restaurantName || "").trim();
  const area = String(address.area || "").trim();
  const city = String(address.city || "").trim();
  const queries = [
    shopPlaceSearchQuery(address),
    [shopName, area, city].filter(Boolean).join(", "),
    [shopName, city].filter(Boolean).join(", ")
  ].filter((query, index, all) => query.length >= 3 && all.indexOf(query) === index);

  for (const query of queries) {
    try {
      const suggested = await suggestShopPlaces(query);
      const list = suggested.success && Array.isArray(suggested.data) ? suggested.data : [];
      const ranked = [...list]
        .map((item) => ({ item, score: scoreShopPlaceSuggestion(item, shopName, area, city) }))
        .sort((left, right) => right.score - left.score);
      const best = ranked.find((entry) => entry.score >= 40)?.item || (!shopName ? ranked[0]?.item : undefined);
      if (!best?.placeId) continue;

      const place = await getShopPlaceAddress(best.placeId);
      const fromDetails = place.success && place.data ? pinFromPlace(place.data, shopName) : null;
      if (fromDetails) return fromDetails;
      if (best.address) {
        const fromSuggestion = pinFromPlace(best.address, shopName);
        if (fromSuggestion) return fromSuggestion;
      }
    } catch {
      // Try a looser query, then the geocoder.
    }
  }

  const result = await resolveAddressPin(partnerAddressToGeocodePayload(address));
  if (!result.success || !result.data) {
    throw new Error(
      result.message ||
        "We could not find this shop on Google Maps. Pick the listing from suggestions, or stand at the entrance and use GPS."
    );
  }
  return result.data;
};

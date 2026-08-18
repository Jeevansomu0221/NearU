import { apiGet, apiPost, apiPut, apiPatch, apiDelete, uploadMultipart } from "./client.js";
import type { ApiResponse, PartnerStatusData } from "./types.js";

export type PartnerPayoutHistoryItem = {
  _id: string;
  amount: number;
  orderCount: number;
  periodType: "WEEKLY" | "MONTHLY";
  periodStart: string;
  periodEnd: string;
  status: "PAID";
  paidAt: string;
  paidReference?: string;
};

export type PartnerWalletOrder = {
  _id: string;
  amount: number;
  grandTotal: number;
  createdAt: string;
  deliveredAt: string;
  payoutStatus: "PENDING" | "PAID";
};

export type PartnerWallet = {
  todayEarnings: number;
  todayOrderCount: number;
  walletBalance: number;
  pendingPayoutOrderCount: number;
  lifetimeEarnings: number;
  lifetimeOrderCount: number;
  paidTotal: number;
  payoutCycle: "WEEKLY";
  nextPayoutDate: string;
  payoutNote: string;
  bankDetails: {
    accountHolderName: string;
    maskedAccountNumber: string;
    ifsc: string;
    upiId: string;
    hasBankDetails: boolean;
  };
  recentPendingPayoutOrders: PartnerWalletOrder[];
  payouts: PartnerPayoutHistoryItem[];
};

export const getMyStatus = () => apiGet<PartnerStatusData>("/partners/my-status");

export const getPartnerProfile = () => apiGet<Record<string, unknown>>("/partners/profile");

export const updatePartnerProfile = (payload: Record<string, unknown>) =>
  apiPut<Record<string, unknown>>("/partners/profile", payload);

export const getOnboardingDraft = () => apiGet<Record<string, unknown>>("/partners/onboarding-draft");

export const saveOnboardingDraft = (draft: Record<string, unknown>) =>
  apiPut("/partners/onboarding-draft", { draft });

export const submitOnboarding = (data: Record<string, unknown>) => apiPost("/partners/onboard", data);

export type ResolvedShopPin = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

export const resolveShopAddressPin = (address: Record<string, unknown>) =>
  apiPost<ResolvedShopPin>("/partners/geocode/resolve", address);

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

export const reverseGeocodeLocation = (latitude: number, longitude: number) =>
  apiPost<ReverseGeocodedAddress>("/partners/geocode/reverse", { latitude, longitude });

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

export const suggestShopPlaces = (query: string) =>
  apiGet<ShopPlaceSuggestion[]>(
    `/partners/geocode/suggest?q=${encodeURIComponent(query)}&kind=shop`
  );

export const getShopPlaceAddress = (placeId: string) =>
  apiGet<ShopPlaceAddress>(`/partners/geocode/place?placeId=${encodeURIComponent(placeId)}`);

export const addressFieldsFromShopPlace = (place: ShopPlaceAddress, fallbackShopName = "") => {
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

const pinFromPlace = (place: ShopPlaceAddress, fallbackName = ""): ResolvedShopPin | null => {
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
}): Promise<ResolvedShopPin> => {
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

  const result = await resolveShopAddressPin(partnerAddressToGeocodePayload(address));
  if (!result.success || !result.data) {
    throw new Error(
      result.message ||
        "We could not find this shop on Google Maps. Pick the listing from suggestions, or stand at the entrance and use GPS."
    );
  }
  return result.data;
};

export const completeSetup = () => apiPost("/partners/complete-setup");

export const getPartnerMenuItems = () => apiGet<unknown[]>("/partners/menu");

export const createMenuItem = (data: Record<string, unknown>) => apiPost("/partners/menu", data);

export const updateMenuItem = (id: string, data: Record<string, unknown>) =>
  apiPut(`/partners/menu/${id}`, data);

export const toggleMenuAvailability = (id: string, isAvailable: boolean) =>
  apiPatch(`/partners/menu/${id}/availability`, { isAvailable });

export const deleteMenuItem = (id: string) => apiDelete(`/partners/menu/${id}`);

export const updateShopStatus = (isOpen: boolean) => apiPut("/partners/shop-status", { isOpen });

export const getPartnerStats = () => apiGet<Record<string, unknown>>("/partners/stats");

export const getPartnerWallet = () => apiGet<PartnerWallet>("/partners/wallet");

export type PartnerStaffAccount = {
  _id: string;
  username: string;
  displayName: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  lastLoginPlatform?: "web" | "app" | "unknown";
  lastOperatorName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PartnerStaffLoginActivity = {
  _id: string;
  staffId: string;
  username: string;
  displayName?: string;
  event: "login" | "logout" | "failed_login";
  success: boolean;
  ip?: string;
  userAgent?: string;
  platform?: "web" | "app" | "unknown";
  message?: string;
  createdAt: string;
};

export const listPartnerStaff = () => apiGet<PartnerStaffAccount[]>("/partner-staff");

export const createPartnerStaff = (payload: {
  username: string;
  password: string;
  confirmPassword?: string;
  displayName?: string;
}) => apiPost<PartnerStaffAccount>("/partner-staff", payload);

export const updatePartnerStaff = (
  staffId: string,
  payload: { isActive?: boolean; password?: string; confirmPassword?: string }
) => apiPut<PartnerStaffAccount>(`/partner-staff/${staffId}`, payload);

export const disablePartnerStaff = (staffId: string) => apiDelete<PartnerStaffAccount>(`/partner-staff/${staffId}`);

export const getPartnerStaffLoginActivity = (params?: { staffId?: string; page?: number; limit?: number }) => {
  const search = new URLSearchParams();
  if (params?.staffId) search.set("staffId", params.staffId);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return apiGet<PartnerStaffLoginActivity[]>(`/partner-staff/login-activity${query ? `?${query}` : ""}`);
};

export const getMySubOrders = () => apiGet("/partners/suborders");

export const acceptSubOrder = (subOrderId: string, price: number) =>
  apiPost(`/partners/suborders/${subOrderId}/accept`, { price });

export const rejectSubOrder = (subOrderId: string) => apiPost(`/partners/suborders/${subOrderId}/reject`);

export const uploadImage = (file: File, folder = "nearu-app") => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("folder", folder);
  return uploadMultipart<{ url: string }>("/upload/image", formData);
};

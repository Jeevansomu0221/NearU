import type { SavedAddress } from "./types.js";

const isGeneratedCustomerName = (value?: string) => {
  const normalized = (value || "").trim().toLowerCase();
  return (
    normalized === "customer" ||
    normalized === "nearu customer" ||
    /^customer\s*\d{4}$/.test(normalized) ||
    /^customer\s+[0-9]+$/.test(normalized)
  );
};

const hasExactAddressPin = (address?: SavedAddress) =>
  typeof address?.latitude === "number" &&
  typeof address?.longitude === "number" &&
  Number.isFinite(address.latitude) &&
  Number.isFinite(address.longitude) &&
  !(address.latitude === 0 && address.longitude === 0);

export const isCustomerProfileComplete = (profile: {
  name?: string;
  address?: SavedAddress;
  addresses?: SavedAddress[];
}) => {
  const hasRealName =
    !!profile.name && !isGeneratedCustomerName(profile.name) && profile.name.trim().length >= 3;

  const address =
    profile.address || profile.addresses?.find((entry) => entry.isDefault) || profile.addresses?.[0];
  const hasAddress =
    !!(address?.houseFlatDoorNo || address?.street) &&
    !!(address?.streetRoadName || address?.street) &&
    !!(address?.cityTownVillage || address?.city) &&
    !!address?.state &&
    !!address?.pincode &&
    !!(address?.areaLocality || address?.area) &&
    hasExactAddressPin(address);

  return Boolean(hasRealName && hasAddress);
};

export const formatAddressText = (address?: SavedAddress): string => {
  if (!address) return "";
  const parts = [
    address.houseFlatDoorNo,
    address.buildingApartmentName,
    address.streetRoadName || address.street,
    address.areaLocality || address.area,
    address.cityTownVillage || address.city,
    address.state,
    address.pincode
  ].filter(Boolean);
  return parts.join(", ");
};

export const getShopName = (shop: { shopName?: string; restaurantName?: string }) =>
  shop.shopName || shop.restaurantName || "Shop";

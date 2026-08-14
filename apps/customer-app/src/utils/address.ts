import type { SavedAddress, UserProfile } from "../api/user.api";

const textValue = (value?: string | null) => String(value || "").trim();

export const parseAddressCoordinates = (address?: SavedAddress | string | null) => {
  if (!address || typeof address === "string") return undefined;
  const latitude = Number(address.latitude);
  const longitude = Number(address.longitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    (latitude === 0 && longitude === 0)
  ) {
    return undefined;
  }
  return { latitude, longitude };
};

export const hasUsableAddress = (address?: SavedAddress | string | null): address is SavedAddress | string => {
  if (!address) return false;
  if (typeof address === "string") return address.trim().length > 3;
  if (parseAddressCoordinates(address)) return true;
  return [
    address.houseFlatDoorNo,
    address.buildingApartmentName,
    address.streetRoadName,
    address.street,
    address.area,
    address.areaLocality,
    address.city,
    address.cityTownVillage,
    address.pincode,
    address.landmark,
    address.district,
    address.recipientName
  ].some((value) => textValue(value).length > 0);
};

export const listSavedAddresses = (profile?: UserProfile | null): SavedAddress[] => {
  if (!profile) return [];
  if (Array.isArray(profile.addresses) && profile.addresses.length > 0) {
    return profile.addresses.filter((address) => hasUsableAddress(address)) as SavedAddress[];
  }
  return hasUsableAddress(profile.address) && typeof profile.address !== "string"
    ? [profile.address]
    : [];
};

export const formatSavedAddress = (address?: SavedAddress | string | null, fallbackName?: string) => {
  if (!address) return "";
  if (typeof address === "string") return address.trim();

  return [
    address.recipientName || fallbackName,
    [address.houseFlatDoorNo, address.buildingApartmentName].filter(Boolean).join(", ") || address.street,
    address.streetRoadName,
    address.areaLocality || address.area,
    address.landmark ? `Near ${address.landmark}` : null,
    [address.cityTownVillage || address.city, address.district ? `${address.district} District` : null, address.state]
      .filter(Boolean)
      .join(", ") + (address.pincode ? ` - ${address.pincode}` : ""),
    address.country || "India"
  ]
    .filter(Boolean)
    .join(", ");
};

export const getSelectedAddress = (
  profile?: UserProfile | null
): SavedAddress | string | undefined => {
  const saved = listSavedAddresses(profile);
  const preferred = saved.find((address) => Boolean(address.isDefault)) || saved[0];
  if (preferred) return preferred;
  if (hasUsableAddress(profile?.address)) return profile?.address;
  return undefined;
};

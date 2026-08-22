import type { SavedAddress, UserProfile } from "../api/user.api";

const textValue = (value?: string | null) => String(value || "").trim();

const normalizeAddressKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const isRedundantAddressLine = (candidate: string, existingLine: string) => {
  const next = normalizeAddressKey(candidate);
  const prev = normalizeAddressKey(existingLine);
  if (!next || !prev) return false;
  if (next === prev) return true;
  return prev.includes(next);
};

const appendUniqueAddressLine = (lines: string[], candidate?: string | null) => {
  const value = textValue(candidate);
  if (!value) return;
  if (lines.some((line) => isRedundantAddressLine(value, line))) return;
  lines.push(value);
};

/** Multi-line saved-address display with overlap deduplication. */
export const buildAddressDisplayLines = (address?: SavedAddress | null, fallbackName?: string) => {
  if (!address) return [];

  const houseLine = [address.houseFlatDoorNo, address.buildingApartmentName]
    .map((part) => textValue(part))
    .filter(Boolean)
    .join(", ");
  const streetRoad = textValue(address.streetRoadName);
  const colony = textValue(address.colony);
  const area = textValue(address.areaLocality || address.area);
  const legacyStreet = textValue(address.street);

  const lines: string[] = [];
  appendUniqueAddressLine(lines, address.recipientName || fallbackName);

  if (houseLine) {
    appendUniqueAddressLine(lines, houseLine);
  } else if (legacyStreet) {
    appendUniqueAddressLine(lines, legacyStreet);
  }

  appendUniqueAddressLine(lines, streetRoad);

  if (colony && !streetRoad.toLowerCase().includes(colony.toLowerCase())) {
    appendUniqueAddressLine(lines, colony);
  }

  if (area && normalizeAddressKey(area) !== normalizeAddressKey(colony)) {
    appendUniqueAddressLine(lines, area);
  }

  if (address.landmark) {
    appendUniqueAddressLine(lines, `Near ${address.landmark}`);
  }

  const cityLine =
    [address.cityTownVillage || address.city, address.district ? `${address.district} District` : "", address.state]
      .filter(Boolean)
      .join(", ") + (address.pincode ? ` - ${address.pincode}` : "");
  appendUniqueAddressLine(lines, cityLine);
  appendUniqueAddressLine(lines, address.country || "India");

  return lines;
};

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
    address.colony,
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

const dedupeCommaSeparatedAddress = (value: string) => {
  const lines: string[] = [];
  value.split(",").forEach((part) => appendUniqueAddressLine(lines, part));
  return lines.join(", ");
};

export const formatSavedAddress = (address?: SavedAddress | string | null, fallbackName?: string) => {
  if (!address) return "";
  if (typeof address === "string") return dedupeCommaSeparatedAddress(address);
  return buildAddressDisplayLines(address, fallbackName).join(", ");
};

/** Compact one-line label for Home header (EatClub / Swiggy style). */
export const formatHomeDeliveryAddressLine = (address?: SavedAddress | string | null) => {
  if (!address) return "";
  if (typeof address === "string") return dedupeCommaSeparatedAddress(address);

  const label = textValue(address.label);
  const building = textValue(address.buildingApartmentName);
  const house = textValue(address.houseFlatDoorNo);
  const street = textValue(address.streetRoadName) || textValue(address.street);
  const colony = textValue(address.colony);
  const area = textValue(address.areaLocality) || textValue(address.area);
  const city = textValue(address.cityTownVillage) || textValue(address.city);

  const parts = [
    label,
    [house, building].filter(Boolean).join(", "),
    street,
    colony && !street.toLowerCase().includes(colony.toLowerCase()) && normalizeAddressKey(colony) !== normalizeAddressKey(area)
      ? colony
      : "",
    area && normalizeAddressKey(area) !== normalizeAddressKey(street) ? area : "",
    city
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return formatSavedAddress(address);
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

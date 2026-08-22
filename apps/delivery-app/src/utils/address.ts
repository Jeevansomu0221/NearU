export type AddressLike =
  | string
  | {
      recipientName?: string;
      houseFlatDoorNo?: string;
      buildingApartmentName?: string;
      shopHouseName?: string;
      floor?: string;
      streetRoadName?: string;
      street?: string;
      roadStreet?: string;
      colony?: string;
      area?: string;
      areaLocality?: string;
      landmark?: string;
      city?: string;
      cityTownVillage?: string;
      district?: string;
      state?: string;
      pincode?: string;
      country?: string;
      googleMapsLink?: string;
    }
  | null
  | undefined;

const textValue = (value?: string | null) => String(value || "").trim();

const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const isRedundantPart = (candidate: string, existing: string) => {
  const next = normalizeKey(candidate);
  const prev = normalizeKey(existing);
  if (!next || !prev) return false;
  if (next === prev) return true;
  return prev.includes(next);
};

/** Drop repeated / overlapping address segments (e.g. colony listed twice). */
const dedupeAddressParts = (parts: Array<string | null | undefined>) => {
  const result: string[] = [];

  for (const raw of parts) {
    const value = textValue(raw);
    if (!value) continue;
    if (result.some((existing) => isRedundantPart(value, existing))) continue;
    result.push(value);
  }

  return result;
};

export const formatAddress = (address: AddressLike, options: { short?: boolean } = {}) => {
  if (!address) return "Address not available";

  if (typeof address === "string") {
    const value = address.trim();
    if (!value) return "Address not available";

    const parts = dedupeAddressParts(value.split(","));
    if (parts.length === 0) return "Address not available";
    return options.short ? parts.slice(0, 2).join(", ") || value : parts.join(", ");
  }

  const houseBuildingLine = dedupeAddressParts([
    address.shopHouseName,
    address.floor,
    address.houseFlatDoorNo,
    address.buildingApartmentName
  ]).join(", ");

  const streetRoad = textValue(address.streetRoadName) || textValue(address.roadStreet);
  const legacyStreet = textValue(address.street);
  const streetLine =
    dedupeAddressParts([houseBuildingLine, streetRoad]).join(", ") ||
    (legacyStreet &&
    (!houseBuildingLine || !isRedundantPart(legacyStreet, houseBuildingLine))
      ? legacyStreet
      : "");

  const streetKey = normalizeKey(streetLine);
  const areaLine = [address.colony, address.areaLocality, address.area]
    .map((value) => textValue(value))
    .find((candidate) => {
      if (!candidate) return false;
      const key = normalizeKey(candidate);
      return Boolean(key) && key !== streetKey && !streetKey.includes(key);
    });

  const cityLine = dedupeAddressParts([
    address.cityTownVillage || address.city,
    address.district ? `${address.district} District` : undefined,
    address.state
  ]).join(", ");
  const postalLine = address.pincode && cityLine ? `${cityLine} - ${address.pincode}` : cityLine || textValue(address.pincode);

  const parts = dedupeAddressParts([
    address.recipientName,
    streetLine,
    areaLine,
    address.landmark ? `Near ${address.landmark}` : undefined,
    postalLine,
    address.country
  ]);

  if (parts.length === 0) return "Address not available";
  return options.short ? parts.slice(0, 2).join(", ") : parts.join(", ");
};

export const getAddressGoogleMapsLink = (address: AddressLike) =>
  typeof address === "object" && address ? address.googleMapsLink : undefined;

// Used by the delivery app when the order has no exact GPS pin – we still want
// to give the rider *something* in Google Maps instead of a dead alert. This is
// always a best-effort search, never a turn-by-turn navigation link.
export const buildMapsSearchUrl = (address: AddressLike) => {
  const query = formatAddress(address);
  if (!query || query === "Address not available") return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

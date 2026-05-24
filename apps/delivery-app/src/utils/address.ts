export type AddressLike =
  | string
  | {
      recipientName?: string;
      houseFlatDoorNo?: string;
      buildingApartmentName?: string;
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

const compact = (values: Array<string | null | undefined>) =>
  values.map((value) => value?.trim()).filter(Boolean) as string[];

export const formatAddress = (address: AddressLike, options: { short?: boolean } = {}) => {
  if (!address) return "Address not available";

  if (typeof address === "string") {
    const value = address.trim();
    if (!value) return "Address not available";

    const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
    return options.short ? parts.slice(0, 2).join(", ") || value : value;
  }

  const streetLine =
    compact([address.houseFlatDoorNo, address.buildingApartmentName, address.streetRoadName]).join(", ") ||
    address.street ||
    address.roadStreet;
  const areaLine = address.areaLocality || address.area || address.colony;
  const cityLine = compact([
    address.cityTownVillage || address.city,
    address.district ? `${address.district} District` : undefined,
    address.state
  ]).join(", ");
  const postalLine = address.pincode ? `${cityLine} - ${address.pincode}` : cityLine;

  const parts = compact([
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

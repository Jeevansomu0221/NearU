import { config } from "../config/env";

export type GeocodedAddress = {
  formattedAddress: string;
  placeId: string;
  houseFlatDoorNo: string;
  buildingApartmentName: string;
  streetRoadName: string;
  area: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  country: string;
  latitude: number;
  longitude: number;
};

export type AddressSuggestion = {
  description: string;
  placeId: string;
  address?: GeocodedAddress;
};

type GoogleAddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const GOOGLE_AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const GOOGLE_PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

const componentValue = (components: GoogleAddressComponent[], type: string, short = false) => {
  const match = components.find((component) => Array.isArray(component.types) && component.types.includes(type));
  const value = short ? match?.short_name : match?.long_name;
  return String(value || "").trim();
};

const firstComponent = (components: GoogleAddressComponent[], types: string[]) => {
  for (const type of types) {
    const value = componentValue(components, type);
    if (value) return value;
  }
  return "";
};

const parseGoogleAddress = (result: any): GeocodedAddress | null => {
  const components: GoogleAddressComponent[] = Array.isArray(result?.address_components)
    ? result.address_components
    : [];
  const location = result?.geometry?.location;
  const latitude = Number(location?.lat);
  const longitude = Number(location?.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const pincodeDigits = componentValue(components, "postal_code").replace(/\D/g, "").slice(0, 6);
  const streetNumber = componentValue(components, "street_number");
  const route = componentValue(components, "route");
  const country = firstComponent(components, ["country"]) || "India";

  return {
    formattedAddress: String(result?.formatted_address || "").trim(),
    placeId: String(result?.place_id || "").trim(),
    houseFlatDoorNo: streetNumber,
    buildingApartmentName: firstComponent(components, ["premise", "subpremise", "establishment"]),
    streetRoadName: route || firstComponent(components, ["sublocality_level_2", "sublocality"]),
    area: firstComponent(components, [
      "sublocality_level_1",
      "sublocality",
      "neighborhood",
      "political"
    ]),
    city: firstComponent(components, ["locality", "administrative_area_level_3", "postal_town"]),
    district: firstComponent(components, ["administrative_area_level_2"]),
    state: firstComponent(components, ["administrative_area_level_1"]),
    pincode: pincodeDigits,
    country,
    latitude,
    longitude
  };
};

const googleGet = async (url: string, params: Record<string, string>) => {
  const apiKey = config.googleMapsApiKey.trim();
  if (!apiKey) {
    throw Object.assign(new Error("Google Maps API key is not configured"), { statusCode: 503 });
  }

  const search = new URLSearchParams({ ...params, key: apiKey });
  const response = await fetch(`${url}?${search.toString()}`);
  if (!response.ok) {
    throw Object.assign(new Error("Address lookup is temporarily unavailable"), { statusCode: 502 });
  }
  return response.json();
};

export const geocodeTypedAddress = async (query: string): Promise<GeocodedAddress[]> => {
  const payload = await googleGet(GOOGLE_GEOCODE_URL, {
    address: query,
    components: "country:IN",
    region: "in",
    language: "en"
  });

  if (payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
    throw Object.assign(new Error(payload.error_message || "Could not look up that address"), {
      statusCode: 400
    });
  }

  return (Array.isArray(payload.results) ? payload.results : [])
    .map(parseGoogleAddress)
    .filter((entry: GeocodedAddress | null): entry is GeocodedAddress => Boolean(entry))
    .slice(0, 6);
};

export const suggestTypedAddresses = async (query: string): Promise<AddressSuggestion[]> => {
  try {
    const payload = await googleGet(GOOGLE_AUTOCOMPLETE_URL, {
      input: query,
      components: "country:in",
      language: "en",
      types: "geocode"
    });

    if (payload.status === "OK") {
      return (Array.isArray(payload.predictions) ? payload.predictions : [])
        .map((prediction: any) => ({
          description: String(prediction?.description || "").trim(),
          placeId: String(prediction?.place_id || "").trim()
        }))
        .filter((entry: AddressSuggestion) => entry.description && entry.placeId)
        .slice(0, 6);
    }
  } catch {
    // Fall through to geocoding if Places Autocomplete is not enabled.
  }

  const geocoded = await geocodeTypedAddress(query);
  return geocoded.map((address) => ({
    description: address.formattedAddress,
    placeId: address.placeId,
    address
  }));
};

export const getPlaceAddress = async (placeId: string): Promise<GeocodedAddress> => {
  const payload = await googleGet(GOOGLE_PLACE_DETAILS_URL, {
    place_id: placeId,
    fields: "formatted_address,address_component,geometry,place_id",
    language: "en"
  });

  if (payload.status === "OK") {
    const parsed = parseGoogleAddress(payload.result);
    if (parsed) return parsed;
  }

  const geocoded = await geocodeTypedAddress(`place_id:${placeId}`);
  if (!geocoded[0]) {
    throw Object.assign(new Error("Could not resolve that address"), { statusCode: 404 });
  }
  return geocoded[0];
};

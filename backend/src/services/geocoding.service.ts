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
  if (!apiKey) return null;

  const search = new URLSearchParams({ ...params, key: apiKey });
  const response = await fetch(`${url}?${search.toString()}`);
  if (!response.ok) return null;
  return response.json();
};

const parseNominatimAddress = (result: any): GeocodedAddress | null => {
  const latitude = Number(result?.lat);
  const longitude = Number(result?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const details = result?.address || {};
  const pincodeDigits = String(details.postcode || "").replace(/\D/g, "").slice(0, 6);

  return {
    formattedAddress: String(result?.display_name || "").trim(),
    placeId: String(result?.place_id || "").trim(),
    houseFlatDoorNo: String(details.house_number || "").trim(),
    buildingApartmentName: String(details.building || details.amenity || "").trim(),
    streetRoadName: String(details.road || details.residential || details.pedestrian || "").trim(),
    area: String(details.suburb || details.neighbourhood || details.quarter || details.village || "").trim(),
    city: String(details.city || details.town || details.county || "").trim(),
    district: String(details.state_district || details.county || "").trim(),
    state: String(details.state || "").trim(),
    pincode: pincodeDigits,
    country: String(details.country || "India").trim(),
    latitude,
    longitude
  };
};

const geocodeWithNominatim = async (query: string): Promise<GeocodedAddress[]> => {
  const search = new URLSearchParams({
    format: "jsonv2",
    q: query,
    countrycodes: "in",
    addressdetails: "1",
    limit: "6"
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${search.toString()}`, {
    headers: {
      "User-Agent": "Vyaha/1.0 (support@vyaha.com)",
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw Object.assign(new Error("Address lookup is temporarily unavailable"), { statusCode: 502 });
  }
  const payload = await response.json();
  return (Array.isArray(payload) ? payload : [])
    .map(parseNominatimAddress)
    .filter((entry: GeocodedAddress | null): entry is GeocodedAddress => Boolean(entry));
};

export const geocodeTypedAddress = async (query: string): Promise<GeocodedAddress[]> => {
  try {
    const payload = await googleGet(GOOGLE_GEOCODE_URL, {
      address: query,
      components: "country:IN",
      region: "in",
      language: "en"
    });

    if (payload?.status === "OK" || payload?.status === "ZERO_RESULTS") {
      return (Array.isArray(payload.results) ? payload.results : [])
        .map(parseGoogleAddress)
        .filter((entry: GeocodedAddress | null): entry is GeocodedAddress => Boolean(entry))
        .slice(0, 6);
    }
  } catch {
    // Fall through to OpenStreetMap if Google is unavailable.
  }

  return geocodeWithNominatim(query);
};

export const suggestTypedAddresses = async (query: string): Promise<AddressSuggestion[]> => {
  try {
    const payload = await googleGet(GOOGLE_AUTOCOMPLETE_URL, {
      input: query,
      components: "country:in",
      language: "en",
      types: "geocode"
    });

    if (payload?.status === "OK") {
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

const compactQuery = (parts: Array<string | undefined>) =>
  Array.from(
    new Set(
      parts
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  ).join(", ");

const normalizeText = (value?: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const pincodeDigits = (value?: string) => String(value || "").replace(/\D/g, "").slice(0, 6);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const buildAddressSearchQuery = (address: {
  houseFlatDoorNo?: string;
  buildingApartmentName?: string;
  streetRoadName?: string;
  street?: string;
  area?: string;
  areaLocality?: string;
  landmark?: string;
  city?: string;
  cityTownVillage?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country?: string;
}) =>
  compactQuery([
    address.houseFlatDoorNo,
    address.buildingApartmentName,
    address.streetRoadName || address.street,
    address.area || address.areaLocality,
    address.city || address.cityTownVillage,
    address.district,
    address.state,
    address.pincode,
    address.country || "India"
  ]);

type AddressLookup = Parameters<typeof buildAddressSearchQuery>[0];

const scoreGeocodedMatch = (match: GeocodedAddress, address: AddressLookup) => {
  let score = 0;
  const wantedPin = pincodeDigits(address.pincode);
  const haystack = normalizeText(
    [match.formattedAddress, match.area, match.city, match.district, match.state, match.pincode].join(" ")
  );

  if (wantedPin && match.pincode === wantedPin) score += 120;
  if (wantedPin && match.pincode && match.pincode !== wantedPin) score -= 90;

  const area = normalizeText(address.area || address.areaLocality);
  if (area && haystack.includes(area)) score += 70;
  area
    .split(" ")
    .filter((word) => word.length > 3)
    .forEach((word) => {
      if (haystack.includes(word)) score += 12;
    });

  const street = normalizeText(address.streetRoadName || address.street);
  if (street && haystack.includes(street)) score += 40;
  street
    .split(" ")
    .filter((word) => word.length > 3)
    .forEach((word) => {
      if (haystack.includes(word)) score += 8;
    });

  const city = normalizeText(address.city || address.cityTownVillage);
  if (city && (normalizeText(match.city).includes(city) || haystack.includes(city))) score += 25;

  const building = normalizeText(address.buildingApartmentName);
  if (building && haystack.includes(building)) score += 20;

  return score;
};

const pickBestMatch = (matches: GeocodedAddress[], address: AddressLookup) => {
  if (matches.length === 0) return null;
  return [...matches].sort((left, right) => scoreGeocodedMatch(right, address) - scoreGeocodedMatch(left, address))[0];
};

const buildFallbackQueries = (address: AddressLookup) => {
  const street = address.streetRoadName || address.street;
  const area = address.area || address.areaLocality;
  const city = address.city || address.cityTownVillage;
  const country = address.country || "India";

  return Array.from(
    new Set(
      [
        buildAddressSearchQuery(address),
        compactQuery([street, area, city, address.state, address.pincode, country]),
        compactQuery([area, city, address.pincode, address.state, country]),
        compactQuery([area, city, address.state, country]),
        compactQuery([city, address.pincode, address.state, country])
      ].filter((query) => query.length >= 3)
    )
  );
};

const geocodeWithGoogleStructured = async (address: AddressLookup): Promise<GeocodedAddress[]> => {
  const pin = pincodeDigits(address.pincode);
  const query = compactQuery([
    address.houseFlatDoorNo,
    address.buildingApartmentName,
    address.streetRoadName || address.street,
    address.area || address.areaLocality,
    address.city || address.cityTownVillage,
    address.state
  ]);
  if (!query) return [];

  const payload = await googleGet(GOOGLE_GEOCODE_URL, {
    address: query,
    components: pin ? `country:IN|postal_code:${pin}` : "country:IN",
    region: "in",
    language: "en"
  });

  if (payload?.status !== "OK" && payload?.status !== "ZERO_RESULTS") return [];
  return (Array.isArray(payload?.results) ? payload.results : [])
    .map(parseGoogleAddress)
    .filter((entry: GeocodedAddress | null): entry is GeocodedAddress => Boolean(entry));
};

const geocodeWithNominatimStructured = async (address: AddressLookup): Promise<GeocodedAddress[]> => {
  const search = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "in",
    limit: "6",
    country: address.country || "India"
  });
  const street = compactQuery([
    address.houseFlatDoorNo,
    address.streetRoadName || address.street
  ]);
  const city = address.city || address.cityTownVillage;
  const pin = pincodeDigits(address.pincode);
  if (street) search.set("street", street);
  if (city) search.set("city", city);
  if (address.state) search.set("state", address.state);
  if (pin) search.set("postalcode", pin);
  if (!street && !city && !pin) return [];

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${search.toString()}`, {
    headers: {
      "User-Agent": "Vyaha/1.0 (support@vyaha.com)",
      Accept: "application/json"
    }
  });
  if (!response.ok) return [];
  const payload = await response.json();
  return (Array.isArray(payload) ? payload : [])
    .map(parseNominatimAddress)
    .filter((entry: GeocodedAddress | null): entry is GeocodedAddress => Boolean(entry));
};

export const resolveAddressCoordinates = async (address: AddressLookup & {
  latitude?: number;
  longitude?: number;
}) => {
  const queries = buildFallbackQueries(address);
  if (queries.length === 0) {
    throw Object.assign(new Error("Enter a complete delivery address"), { statusCode: 400 });
  }

  const collected: GeocodedAddress[] = [];
  collected.push(...(await geocodeWithGoogleStructured(address)));
  const structuredBest = pickBestMatch(collected, address);
  if (structuredBest && scoreGeocodedMatch(structuredBest, address) >= 50) {
    return {
      latitude: structuredBest.latitude,
      longitude: structuredBest.longitude,
      formattedAddress: structuredBest.formattedAddress
    };
  }

  await wait(400);
  collected.push(...(await geocodeWithNominatimStructured(address)));
  const nominatimBest = pickBestMatch(collected, address);
  if (nominatimBest && scoreGeocodedMatch(nominatimBest, address) >= 50) {
    return {
      latitude: nominatimBest.latitude,
      longitude: nominatimBest.longitude,
      formattedAddress: nominatimBest.formattedAddress
    };
  }

  for (let index = 0; index < queries.length; index += 1) {
    if (collected.length > 0 || index > 0) {
      await wait(400);
    }
    collected.push(...(await geocodeTypedAddress(queries[index])));
    const bestSoFar = pickBestMatch(collected, address);
    if (bestSoFar && scoreGeocodedMatch(bestSoFar, address) >= 50) {
      return {
        latitude: bestSoFar.latitude,
        longitude: bestSoFar.longitude,
        formattedAddress: bestSoFar.formattedAddress
      };
    }
  }

  const best = pickBestMatch(collected, address);
  if (best && scoreGeocodedMatch(best, address) >= 0) {
    return {
      latitude: best.latitude,
      longitude: best.longitude,
      formattedAddress: best.formattedAddress
    };
  }

  throw Object.assign(
    new Error("We could not find this address on the map. Check the street, area, and pincode."),
    { statusCode: 400 }
  );
};

export const getPlaceAddress = async (placeId: string): Promise<GeocodedAddress> => {
  const payload = await googleGet(GOOGLE_PLACE_DETAILS_URL, {
    place_id: placeId,
    fields: "formatted_address,address_component,geometry,place_id",
    language: "en"
  });

  if (payload?.status === "OK") {
    const parsed = parseGoogleAddress(payload.result);
    if (parsed) return parsed;
  }

  const geocoded = await geocodeTypedAddress(placeId);
  if (!geocoded[0]) {
    throw Object.assign(new Error("Could not resolve that address"), { statusCode: 404 });
  }
  return geocoded[0];
};

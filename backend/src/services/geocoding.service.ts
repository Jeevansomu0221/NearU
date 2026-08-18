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
  locationType?: string;
  osmClass?: string;
  source?: "google" | "osm";
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
const GOOGLE_PLACE_TEXT_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";

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
    longitude,
    locationType: String(result?.geometry?.location_type || "").trim(),
    source: "google"
  };
};

const hasGoogleMapsKey = () => Boolean(config.googleMapsApiKey.trim());

const googleGet = async (url: string, params: Record<string, string>) => {
  const apiKey = config.googleMapsApiKey.trim();
  if (!apiKey) return null;

  const search = new URLSearchParams({ ...params, key: apiKey });
  const response = await fetch(`${url}?${search.toString()}`);
  if (!response.ok) return null;
  return response.json();
};

const parseGooglePlace = (result: any): GeocodedAddress | null => {
  const parsed = parseGoogleAddress(result);
  if (!parsed) return null;
  const name = String(result?.name || "").trim();
  if (name && !parsed.buildingApartmentName) {
    parsed.buildingApartmentName = name;
  }
  if (name && parsed.formattedAddress && !parsed.formattedAddress.toLowerCase().includes(name.toLowerCase())) {
    parsed.formattedAddress = `${name}, ${parsed.formattedAddress}`;
  }
  parsed.locationType = parsed.locationType || "PLACE";
  parsed.source = "google";
  return parsed;
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
    longitude,
    osmClass: String(result?.class || result?.category || "").trim(),
    locationType: String(result?.type || result?.addresstype || "").trim(),
    source: "osm"
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
    if (payload?.status) {
      console.warn("Google Geocoding lookup failed:", payload.status, payload.error_message || "");
    }
  } catch {
    // Fall through to OpenStreetMap if Google is unavailable.
  }

  return geocodeWithNominatim(query);
};

export const suggestTypedAddresses = async (
  query: string,
  kind: "shop" | "address" = "address"
): Promise<AddressSuggestion[]> => {
  try {
    const payload = await googleGet(GOOGLE_AUTOCOMPLETE_URL, {
      input: query,
      components: "country:in",
      language: "en",
      types: kind === "shop" ? "establishment" : "geocode"
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

const GENERIC_STREET_RE = /^(rd|road|st|street|lane|ln|cross|nh|highway)\s*\.?\s*\d*$/i;

const usableStreetName = (value?: string) => {
  const street = String(value || "").trim();
  if (!street || GENERIC_STREET_RE.test(street)) return "";
  return street;
};

export type AddressLookup = {
  houseFlatDoorNo?: string;
  buildingApartmentName?: string;
  shopHouseName?: string;
  shopName?: string;
  restaurantName?: string;
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
};

const shopIdentityName = (address: AddressLookup) =>
  String(address.shopName || address.restaurantName || "").trim();

const shopBuildingName = (address: AddressLookup) =>
  String(address.shopHouseName || address.buildingApartmentName || "").trim();

export const buildAddressSearchQuery = (address: AddressLookup) =>
  compactQuery([
    shopIdentityName(address),
    address.houseFlatDoorNo,
    shopBuildingName(address),
    usableStreetName(address.streetRoadName || address.street),
    address.area || address.areaLocality,
    address.city || address.cityTownVillage,
    address.district,
    address.state,
    address.pincode,
    address.country || "India"
  ]);

const scoreGeocodedMatch = (match: GeocodedAddress, address: AddressLookup) => {
  let score = 0;
  const wantedPin = pincodeDigits(address.pincode);
  const haystack = normalizeText(
    [
      match.formattedAddress,
      match.buildingApartmentName,
      match.area,
      match.city,
      match.district,
      match.state,
      match.pincode
    ].join(" ")
  );

  const area = normalizeText(address.area || address.areaLocality);
  const areaTokens = area.split(" ").filter((word) => word.length > 3);
  const areaMatched = Boolean(area && (haystack.includes(area) || areaTokens.some((word) => haystack.includes(word))));

  if (wantedPin && match.pincode === wantedPin) score += 50;
  // Indian pincodes often disagree with map data for the same colony.
  if (wantedPin && match.pincode && match.pincode !== wantedPin) {
    score += areaMatched ? -10 : -80;
  }

  if (area && haystack.includes(area)) score += 80;
  areaTokens.forEach((word) => {
    if (haystack.includes(word)) score += 16;
  });
  if (area && !areaMatched) score -= 70;

  const street = normalizeText(usableStreetName(address.streetRoadName || address.street));
  if (street && haystack.includes(street)) score += 50;
  street
    .split(" ")
    .filter((word) => word.length > 3)
    .forEach((word) => {
      if (haystack.includes(word)) score += 10;
    });

  const city = normalizeText(address.city || address.cityTownVillage);
  if (city && (normalizeText(match.city).includes(city) || haystack.includes(city))) score += 15;

  const shop = normalizeText(shopIdentityName(address));
  if (shop && haystack.includes(shop)) score += 120;
  shop
    .split(" ")
    .filter((word) => word.length > 3)
    .forEach((word) => {
      if (haystack.includes(word)) score += 18;
    });

  const building = normalizeText(shopBuildingName(address));
  if (building && haystack.includes(building)) score += 90;

  if (match.source === "google") score += 25;
  if (match.locationType === "ROOFTOP" || match.locationType === "PLACE") score += 60;
  if (match.locationType === "RANGE_INTERPOLATED") score += 25;
  if (match.osmClass === "highway" || match.locationType === "trunk" || match.locationType === "primary") {
    score -= 50;
  }
  if (match.locationType === "village" || match.locationType === "suburb" || match.locationType === "neighbourhood") {
    score += 35;
  }

  return score;
};

const pickBestMatch = (matches: GeocodedAddress[], address: AddressLookup) => {
  if (matches.length === 0) return null;
  return [...matches].sort((left, right) => scoreGeocodedMatch(right, address) - scoreGeocodedMatch(left, address))[0];
};

const buildFallbackQueries = (address: AddressLookup) => {
  const street = usableStreetName(address.streetRoadName || address.street);
  const area = address.area || address.areaLocality;
  const city = address.city || address.cityTownVillage;
  const building = shopBuildingName(address);
  const shop = shopIdentityName(address);
  const country = address.country || "India";

  return Array.from(
    new Set(
      [
        compactQuery([shop, building, area, city, address.state, country]),
        compactQuery([shop, area, city, address.state, country]),
        compactQuery([building, street, area, city, address.state, country]),
        compactQuery([street, area, city, address.state, country]),
        compactQuery([area, city, address.state, country]),
        compactQuery([area, address.state, country])
      ].filter((query) => query.length >= 3)
    )
  );
};

const geocodeWithGooglePlaces = async (address: AddressLookup): Promise<GeocodedAddress[]> => {
  if (!hasGoogleMapsKey()) return [];
  const shop = shopIdentityName(address);
  const building = shopBuildingName(address);
  const street = usableStreetName(address.streetRoadName || address.street);
  const area = address.area || address.areaLocality;
  const city = address.city || address.cityTownVillage;
  const queries = Array.from(
    new Set(
      [
        compactQuery([shop, building, area, city, address.pincode]),
        compactQuery([shop, area, city]),
        compactQuery([building, street, area, city, address.pincode]),
        compactQuery([building, area, city, address.state])
      ].filter((query) => query.length >= 3)
    )
  );
  if (queries.length === 0) return [];

  const collected: GeocodedAddress[] = [];
  for (const query of queries) {
    const payload = await googleGet(GOOGLE_PLACE_TEXT_URL, {
      query,
      region: "in",
      language: "en"
    });
    if (payload?.status && payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
      console.warn("Google Places text search failed:", payload.status, payload.error_message || "");
      continue;
    }
    collected.push(
      ...(Array.isArray(payload?.results) ? payload.results : [])
        .map(parseGooglePlace)
        .filter((entry: GeocodedAddress | null): entry is GeocodedAddress => Boolean(entry))
    );
    const best = pickBestMatch(collected, address);
    if (best && scoreGeocodedMatch(best, address) >= 80) {
      return collected;
    }
  }
  return collected;
};

const geocodeWithGoogleStructured = async (address: AddressLookup): Promise<GeocodedAddress[]> => {
  if (!hasGoogleMapsKey()) return [];
  const query = compactQuery([
    shopIdentityName(address),
    address.houseFlatDoorNo,
    shopBuildingName(address),
    usableStreetName(address.streetRoadName || address.street),
    address.area || address.areaLocality,
    address.city || address.cityTownVillage,
    address.state,
    address.pincode
  ]);
  if (!query) return [];

  const payload = await googleGet(GOOGLE_GEOCODE_URL, {
    address: query,
    components: "country:IN",
    region: "in",
    language: "en"
  });

  if (payload?.status && payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
    console.warn("Google Geocoding failed:", payload.status, payload.error_message || "");
    return [];
  }
  return (Array.isArray(payload?.results) ? payload.results : [])
    .map(parseGoogleAddress)
    .filter((entry: GeocodedAddress | null): entry is GeocodedAddress => Boolean(entry));
};

const geocodeWithNominatimStructured = async (address: AddressLookup): Promise<GeocodedAddress[]> => {
  const area = address.area || address.areaLocality;
  const collected: GeocodedAddress[] = [];
  const queries = Array.from(
    new Set(
      [
        compactQuery([shopIdentityName(address), shopBuildingName(address), area]),
        compactQuery([usableStreetName(address.streetRoadName || address.street), area]),
        compactQuery([area, address.state, "India"]),
        compactQuery([area])
      ].filter((query) => query.length >= 3)
    )
  );

  for (const query of queries) {
    const search = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      countrycodes: "in",
      limit: "6",
      q: query
    });
    if (query === compactQuery([area]) || query === compactQuery([area, address.state, "India"])) {
      search.set("featuretype", "settlement");
    }
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${search.toString()}`, {
      headers: {
        "User-Agent": "Vyaha/1.0 (support@vyaha.com)",
        Accept: "application/json"
      }
    });
    if (response.ok) {
      const payload = await response.json();
      collected.push(
        ...(Array.isArray(payload) ? payload : [])
          .map(parseNominatimAddress)
          .filter((entry: GeocodedAddress | null): entry is GeocodedAddress => Boolean(entry))
      );
    }
    if (collected.length) break;
    await wait(400);
  }
  return collected;
};

export const resolveAddressCoordinates = async (address: AddressLookup & {
  latitude?: number;
  longitude?: number;
}) => {
  const queries = buildFallbackQueries(address);
  if (queries.length === 0) {
    throw Object.assign(new Error("Enter a complete delivery address"), { statusCode: 400 });
  }

  if (!hasGoogleMapsKey()) {
    console.warn("GOOGLE_MAPS_API_KEY is not set; apartment lookup will use OpenStreetMap fallback");
  }

  const collected: GeocodedAddress[] = [];
  collected.push(...(await geocodeWithGooglePlaces(address)));
  collected.push(...(await geocodeWithGoogleStructured(address)));
  const googleBest = pickBestMatch(collected, address);
  if (googleBest && scoreGeocodedMatch(googleBest, address) >= 80) {
    console.info("Address pin source=", googleBest.source, "score=", scoreGeocodedMatch(googleBest, address));
    return {
      latitude: googleBest.latitude,
      longitude: googleBest.longitude,
      formattedAddress: googleBest.formattedAddress
    };
  }

  await wait(400);
  collected.push(...(await geocodeWithNominatimStructured(address)));
  const nominatimBest = pickBestMatch(collected, address);
  if (nominatimBest && scoreGeocodedMatch(nominatimBest, address) >= 80) {
    console.info("Address pin source=", nominatimBest.source, "score=", scoreGeocodedMatch(nominatimBest, address));
    return {
      latitude: nominatimBest.latitude,
      longitude: nominatimBest.longitude,
      formattedAddress: nominatimBest.formattedAddress
    };
  }

  for (let index = 0; index < queries.length; index += 1) {
    await wait(400);
    collected.push(...(await geocodeTypedAddress(queries[index])));
    const bestSoFar = pickBestMatch(collected, address);
    if (bestSoFar && scoreGeocodedMatch(bestSoFar, address) >= 80) {
      console.info("Address pin source=", bestSoFar.source, "score=", scoreGeocodedMatch(bestSoFar, address));
      return {
        latitude: bestSoFar.latitude,
        longitude: bestSoFar.longitude,
        formattedAddress: bestSoFar.formattedAddress
      };
    }
  }

  const best = pickBestMatch(collected, address);
  if (best && scoreGeocodedMatch(best, address) >= 20) {
    console.info("Address pin source=", best.source, "score=", scoreGeocodedMatch(best, address));
    return {
      latitude: best.latitude,
      longitude: best.longitude,
      formattedAddress: best.formattedAddress
    };
  }

  throw Object.assign(
    new Error("We could not find this shop on the map. Check the shop/house name, area, and pincode."),
    { statusCode: 400 }
  );
};

export const reverseGeocodeCoordinates = async (
  latitude: number,
  longitude: number
): Promise<GeocodedAddress | null> => {
  try {
    const payload = await googleGet(GOOGLE_GEOCODE_URL, {
      latlng: `${latitude},${longitude}`,
      language: "en",
      region: "in"
    });

    if (payload?.status === "OK") {
      const parsed = (Array.isArray(payload.results) ? payload.results : [])
        .map(parseGoogleAddress)
        .filter((entry: GeocodedAddress | null): entry is GeocodedAddress => Boolean(entry));
      if (parsed[0]) {
        return {
          ...parsed[0],
          latitude,
          longitude
        };
      }
    }
    if (payload?.status) {
      console.warn("Google reverse geocode failed:", payload.status, payload.error_message || "");
    }
  } catch {
    // Fall through to OpenStreetMap.
  }

  try {
    const search = new URLSearchParams({
      format: "jsonv2",
      lat: String(latitude),
      lon: String(longitude),
      addressdetails: "1",
      zoom: "18"
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${search.toString()}`, {
      headers: {
        "User-Agent": "Vyaha/1.0 (support@vyaha.com)",
        Accept: "application/json"
      }
    });
    if (!response.ok) return null;
    const parsed = parseNominatimAddress(await response.json());
    if (!parsed) return null;
    return {
      ...parsed,
      latitude,
      longitude
    };
  } catch {
    return null;
  }
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

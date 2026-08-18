import { config } from "../config/env";

export type GeocodedAddress = {
  formattedAddress: string;
  placeId: string;
  placeName?: string;
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
  placeTypes?: string[];
  source?: "google" | "osm";
};

export type AddressSuggestKind = "address" | "shop";

export type AddressSuggestion = {
  description: string;
  placeId: string;
  mainText?: string;
  secondaryText?: string;
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
const GOOGLE_FIND_PLACE_URL = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json";

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
    placeTypes: Array.isArray(result?.types) ? result.types.map((type: unknown) => String(type)) : [],
    source: "google"
  };
};

const hasGoogleMapsKey = () => Boolean(config.googleMapsApiKey.trim());

let googleMapsHttpBlocked = false;

const googleGet = async (url: string, params: Record<string, string>) => {
  const apiKey = config.googleMapsApiKey.trim();
  if (!apiKey || googleMapsHttpBlocked) return null;

  const search = new URLSearchParams({ ...params, key: apiKey });
  const response = await fetch(`${url}?${search.toString()}`);
  if (!response.ok) return null;
  const payload = await response.json();
  if (payload?.status === "REQUEST_DENIED") {
    googleMapsHttpBlocked = true;
    console.warn(
      "Google Maps HTTP API is blocked for this server key; shop pins will use OpenStreetMap until a server key is set."
    );
  }
  return payload;
};

const parseGooglePlace = (result: any): GeocodedAddress | null => {
  const parsed = parseGoogleAddress(result);
  if (!parsed) return null;
  const name = String(result?.name || "").trim();
  if (name) parsed.placeName = name;
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

const parseAutocompletePredictions = (payload: any): AddressSuggestion[] =>
  (Array.isArray(payload?.predictions) ? payload.predictions : [])
    .map((prediction: any) => {
      const mainText = String(prediction?.structured_formatting?.main_text || "").trim();
      const secondaryText = String(prediction?.structured_formatting?.secondary_text || "").trim();
      const description = String(
        prediction?.description || [mainText, secondaryText].filter(Boolean).join(", ")
      ).trim();
      return {
        description,
        placeId: String(prediction?.place_id || "").trim(),
        mainText: mainText || undefined,
        secondaryText: secondaryText || undefined
      };
    })
    .filter((entry: AddressSuggestion) => entry.description && entry.placeId)
    .slice(0, 8);

const autocompleteQuery = async (query: string, types?: string) => {
  const params: Record<string, string> = {
    input: query,
    components: "country:in",
    language: "en"
  };
  if (types) params.types = types;
  return googleGet(GOOGLE_AUTOCOMPLETE_URL, params);
};

export const suggestTypedAddresses = async (
  query: string,
  kind: AddressSuggestKind = "address"
): Promise<AddressSuggestion[]> => {
  try {
    if (kind === "shop") {
      const establishment = await autocompleteQuery(query, "establishment");
      if (establishment?.status === "OK") {
        const parsed = parseAutocompletePredictions(establishment);
        if (parsed.length) return parsed;
      }

      const mixed = await autocompleteQuery(query);
      if (mixed?.status === "OK") {
        const parsed = parseAutocompletePredictions(mixed);
        if (parsed.length) return parsed;
      }

      const textSearch = await googleGet(GOOGLE_PLACE_TEXT_URL, {
        query,
        region: "in",
        language: "en"
      });
      if (textSearch?.status === "OK") {
        return (Array.isArray(textSearch.results) ? textSearch.results : [])
          .map((result: any) => {
            const parsed = parseGooglePlace(result);
            const name = String(result?.name || parsed?.placeName || "").trim();
            const formatted = String(result?.formatted_address || parsed?.formattedAddress || "").trim();
            return {
              description: [name, formatted].filter(Boolean).join(", "),
              placeId: String(result?.place_id || parsed?.placeId || "").trim(),
              mainText: name || undefined,
              secondaryText: formatted || undefined,
              address: parsed || undefined
            };
          })
          .filter((entry: AddressSuggestion) => entry.description && entry.placeId)
          .slice(0, 8);
      }
    } else {
      const payload = await autocompleteQuery(query, "geocode");
      if (payload?.status === "OK") {
        return parseAutocompletePredictions(payload);
      }
    }
  } catch {
    // Fall through to geocoding if Places Autocomplete is not enabled.
  }

  const geocoded = await geocodeTypedAddress(query);
  return geocoded.map((address) => ({
    description: address.formattedAddress,
    placeId: address.placeId,
    mainText: address.placeName || address.buildingApartmentName || undefined,
    secondaryText: address.formattedAddress,
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
  shopName?: string;
  restaurantName?: string;
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
    address.shopName || address.restaurantName,
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

const shopNameOf = (address: AddressLookup) =>
  String(address.shopName || address.restaurantName || "").trim();

const isGenericStreetName = (value?: string) => {
  const text = normalizeText(value);
  return !text || text.length < 4 || /^(rd|road|st|street|lane|ln|cross)\s*\d*$/.test(text);
};

const scoreGeocodedMatch = (match: GeocodedAddress, address: AddressLookup) => {
  let score = 0;
  const wantedPin = pincodeDigits(address.pincode);
  const haystack = normalizeText(
    [
      match.formattedAddress,
      match.placeName,
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
  const shop = normalizeText(shopNameOf(address));
  if (area && !areaMatched && !shop) score -= 70;

  const streetRaw = address.streetRoadName || address.street;
  const street = isGenericStreetName(streetRaw) ? "" : normalizeText(streetRaw);
  if (street && haystack.includes(street)) score += 50;
  street
    .split(" ")
    .filter((word) => word.length > 3)
    .forEach((word) => {
      if (haystack.includes(word)) score += 10;
    });

  const city = normalizeText(address.city || address.cityTownVillage);
  if (city && (normalizeText(match.city).includes(city) || haystack.includes(city))) score += 15;

  const building = normalizeText(address.buildingApartmentName);
  if (building && haystack.includes(building)) score += 90;

  const shopTokens = shop
    .replace(/\s+\d+[a-z]?$/i, "")
    .split(" ")
    .filter((word) => word.length > 2 && !/^\d+$/.test(word));
  const matchedShopTokens = shopTokens.filter((word) => haystack.includes(word));
  if (shop && haystack.includes(shop)) score += 120;
  matchedShopTokens.forEach(() => {
    score += 18;
  });
  if (shopTokens.length > 0 && matchedShopTokens.length === 0) {
    score -= 160;
  }

  const placeTypes = match.placeTypes || [];
  if (placeTypes.includes("route") || placeTypes.includes("street_address") || placeTypes.includes("plus_code")) {
    score -= shop ? 90 : 25;
  }
  if (placeTypes.includes("premise") || placeTypes.includes("subpremise") || placeTypes.includes("establishment")) {
    score += 40;
  }

  if (match.source === "google") score += 25;
  if (match.locationType === "PLACE") score += 80;
  else if (match.locationType === "ROOFTOP") score += shop && matchedShopTokens.length ? 80 : 25;
  if (match.locationType === "RANGE_INTERPOLATED") score += 25;
  if (match.locationType === "GEOMETRIC_CENTER" || match.locationType === "APPROXIMATE") {
    score += shop ? -45 : 5;
  }
  if (match.osmClass === "highway" || match.locationType === "trunk" || match.locationType === "primary") {
    score -= 50;
  }
  if (
    match.locationType === "village" ||
    match.locationType === "suburb" ||
    match.locationType === "neighbourhood" ||
    match.locationType === "locality"
  ) {
    score += shop ? -55 : 20;
  }

  return score;
};

const pickBestMatch = (matches: GeocodedAddress[], address: AddressLookup) => {
  if (matches.length === 0) return null;
  return [...matches].sort((left, right) => scoreGeocodedMatch(right, address) - scoreGeocodedMatch(left, address))[0];
};

const buildFallbackQueries = (address: AddressLookup) => {
  const street = isGenericStreetName(address.streetRoadName || address.street)
    ? ""
    : address.streetRoadName || address.street;
  const area = address.area || address.areaLocality;
  const city = address.city || address.cityTownVillage;
  const building = address.buildingApartmentName;
  const shop = shopNameOf(address);
  const country = address.country || "India";

  return Array.from(
    new Set(
      [
        compactQuery([shop, street, area, city, address.state, country]),
        compactQuery([shop, area, city, address.state, country]),
        compactQuery([shop, city, address.state, country]),
        compactQuery([building, street, area, city, address.state, country]),
        compactQuery([street, area, city, address.state, country]),
        compactQuery([area, city, address.state, country]),
        compactQuery([area, address.state, country])
      ].filter((query) => query.length >= 3)
    )
  );
};

const geocodeAreaCenter = async (address: AddressLookup): Promise<{ lat: number; lng: number } | null> => {
  if (!hasGoogleMapsKey()) return null;
  const query = compactQuery([
    address.area || address.areaLocality,
    address.city || address.cityTownVillage,
    address.pincode,
    address.state,
    "India"
  ]);
  if (query.length < 3) return null;
  const payload = await googleGet(GOOGLE_GEOCODE_URL, {
    address: query,
    components: "country:IN",
    region: "in",
    language: "en"
  });
  const location = payload?.results?.[0]?.geometry?.location;
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const geocodeWithGooglePlaces = async (address: AddressLookup): Promise<GeocodedAddress[]> => {
  if (!hasGoogleMapsKey() || googleMapsHttpBlocked) return [];
  const shop = shopNameOf(address);
  const shopWithoutUnit = shop.replace(/\s+\d+[a-z]?$/i, "").trim();
  const street = isGenericStreetName(address.streetRoadName || address.street)
    ? ""
    : address.streetRoadName || address.street;
  const area = address.area || address.areaLocality;
  const city = address.city || address.cityTownVillage;
  const landmark = String(address.landmark || "").trim();
  const queries = Array.from(
    new Set(
      [
        compactQuery([shop, landmark, area, city, "India"]),
        compactQuery([shopWithoutUnit, landmark, area, city, "India"]),
        compactQuery([shopWithoutUnit, area, city, address.pincode, "India"]),
        compactQuery([shop, area, city, address.pincode, "India"]),
        compactQuery([shopWithoutUnit, city, "India"]),
        compactQuery([shop, street, area, city, address.pincode, address.state, "India"])
      ].filter((query) => query.length >= 3)
    )
  );
  if (queries.length === 0) return [];

  const center = await geocodeAreaCenter(address);
  const bias = center
    ? {
        locationbias: `circle:4000@${center.lat},${center.lng}`,
        location: `${center.lat},${center.lng}`,
        radius: "4000"
      }
    : {};

  const collected: GeocodedAddress[] = [];
  for (const query of queries) {
    const found = await googleGet(GOOGLE_FIND_PLACE_URL, {
      input: query,
      inputtype: "textquery",
      fields: "place_id,name,formatted_address,geometry,types",
      language: "en",
      region: "in",
      ...(bias.locationbias ? { locationbias: bias.locationbias } : {})
    });
    if (found?.status === "OK") {
      collected.push(
        ...(Array.isArray(found.candidates) ? found.candidates : [])
          .map(parseGooglePlace)
          .filter((entry: GeocodedAddress | null): entry is GeocodedAddress => Boolean(entry))
      );
    } else if (found?.status && found.status !== "ZERO_RESULTS") {
      console.warn("Google Find Place failed:", found.status, found.error_message || "");
      if (found.status === "REQUEST_DENIED") return collected;
    }

    const payload = await googleGet(GOOGLE_PLACE_TEXT_URL, {
      query,
      region: "in",
      language: "en",
      ...(bias.location && bias.radius ? { location: bias.location, radius: bias.radius } : {})
    });
    if (payload?.status && payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
      console.warn("Google Places text search failed:", payload.status, payload.error_message || "");
    } else {
      collected.push(
        ...(Array.isArray(payload?.results) ? payload.results : [])
          .map(parseGooglePlace)
          .filter((entry: GeocodedAddress | null): entry is GeocodedAddress => Boolean(entry))
      );
    }
    const shopHit = collected.find((entry) => {
      const haystack = normalizeText([entry.placeName, entry.formattedAddress, entry.buildingApartmentName].join(" "));
      const tokens = normalizeText(shopWithoutUnit || shop)
        .split(" ")
        .filter((word) => word.length > 2 && !/^\d+$/.test(word));
      return tokens.length > 0 && tokens.every((word) => haystack.includes(word));
    });
    if (shopHit) {
      if (shopHit.placeId) {
        try {
          const detailed = await getPlaceAddress(shopHit.placeId);
          return [detailed, ...collected.filter((entry) => entry.placeId !== detailed.placeId)];
        } catch {
          return collected;
        }
      }
      return collected;
    }
  }
  return collected;
};

const geocodeWithGoogleStructured = async (address: AddressLookup): Promise<GeocodedAddress[]> => {
  if (!hasGoogleMapsKey() || googleMapsHttpBlocked) return [];
  const street = isGenericStreetName(address.streetRoadName || address.street)
    ? ""
    : address.streetRoadName || address.street;
  const query = compactQuery([
    shopNameOf(address),
    address.buildingApartmentName,
    street,
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
  const shop = shopNameOf(address).replace(/\s+\d+[a-z]?$/i, "").trim();
  const street = isGenericStreetName(address.streetRoadName || address.street)
    ? ""
    : address.streetRoadName || address.street;
  const collected: GeocodedAddress[] = [];
  const queries = Array.from(
    new Set(
      [
        compactQuery([shop, address.landmark, area, address.city || address.cityTownVillage]),
        compactQuery([shop, area, address.city || address.cityTownVillage]),
        compactQuery([address.landmark, area, address.city || address.cityTownVillage]),
        compactQuery([street, area]),
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

  const pinFromMatch = async (match: GeocodedAddress) => {
    if (match.placeId && match.source === "google") {
      try {
        const detailed = await getPlaceAddress(match.placeId);
        return {
          latitude: detailed.latitude,
          longitude: detailed.longitude,
          formattedAddress: detailed.formattedAddress || match.formattedAddress
        };
      } catch {
        // Fall back to the already-scored geometry.
      }
    }
    return {
      latitude: match.latitude,
      longitude: match.longitude,
      formattedAddress: match.formattedAddress
    };
  };

  const collected: GeocodedAddress[] = [];
  collected.push(...(await geocodeWithGooglePlaces(address)));
  const placesBest = pickBestMatch(collected, address);
  if (
    placesBest &&
    scoreGeocodedMatch(placesBest, address) >= 80 &&
    (placesBest.placeName || placesBest.locationType === "PLACE")
  ) {
    console.info("Address pin source=", placesBest.source, "score=", scoreGeocodedMatch(placesBest, address));
    return pinFromMatch(placesBest);
  }

  collected.push(...(await geocodeWithGoogleStructured(address)));
  const googleBest = pickBestMatch(collected, address);
  if (googleBest && scoreGeocodedMatch(googleBest, address) >= 80) {
    console.info("Address pin source=", googleBest.source, "score=", scoreGeocodedMatch(googleBest, address));
    return pinFromMatch(googleBest);
  }

  await wait(400);
  collected.push(...(await geocodeWithNominatimStructured(address)));
  const nominatimBest = pickBestMatch(collected, address);
  if (nominatimBest && scoreGeocodedMatch(nominatimBest, address) >= 80) {
    console.info("Address pin source=", nominatimBest.source, "score=", scoreGeocodedMatch(nominatimBest, address));
    return pinFromMatch(nominatimBest);
  }

  for (let index = 0; index < queries.length; index += 1) {
    await wait(400);
    collected.push(...(await geocodeTypedAddress(queries[index])));
    const bestSoFar = pickBestMatch(collected, address);
    if (bestSoFar && scoreGeocodedMatch(bestSoFar, address) >= 80) {
      console.info("Address pin source=", bestSoFar.source, "score=", scoreGeocodedMatch(bestSoFar, address));
      return pinFromMatch(bestSoFar);
    }
  }

  const best = pickBestMatch(collected, address);
  if (best) {
    console.info("Address pin source=", best.source, "score=", scoreGeocodedMatch(best, address));
    return pinFromMatch(best);
  }

  throw Object.assign(
    new Error(
      shopNameOf(address)
        ? "We could not find this shop on the map. Search it as it appears on Google Maps and pick the listing."
        : "We could not find this address on the map. Check the street, area, and pincode."
    ),
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
    fields: "name,formatted_address,address_component,geometry,place_id",
    language: "en"
  });

  if (payload?.status === "OK") {
    const parsed = parseGooglePlace(payload.result) || parseGoogleAddress(payload.result);
    if (parsed) return parsed;
  }

  const geocodedPayload = await googleGet(GOOGLE_GEOCODE_URL, {
    place_id: placeId,
    language: "en",
    region: "in"
  });
  if (geocodedPayload?.status === "OK") {
    const parsed = parseGoogleAddress(geocodedPayload.results?.[0]);
    if (parsed) return parsed;
  }

  throw Object.assign(new Error("Could not resolve that Google Maps listing"), { statusCode: 404 });
};

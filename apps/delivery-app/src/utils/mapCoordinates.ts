export type CoordinateValue = number | string | null | undefined;

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type MapLocation = {
  coordinates?:
    | [CoordinateValue, CoordinateValue]
    | {
        latitude?: CoordinateValue;
        longitude?: CoordinateValue;
        lat?: CoordinateValue;
        lng?: CoordinateValue;
        lon?: CoordinateValue;
      };
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
  lat?: CoordinateValue;
  lng?: CoordinateValue;
  lon?: CoordinateValue;
};

export const toCoordinateNumber = (value: CoordinateValue) => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getLatLngFromPoint = (location?: MapLocation | null): LatLng | null => {
  if (!location) return null;

  const coordinateArray = Array.isArray(location.coordinates) ? location.coordinates : null;
  const coordinateObject = !Array.isArray(location.coordinates) ? location.coordinates : null;
  const latitude = toCoordinateNumber(
    location.latitude ?? location.lat ?? coordinateObject?.latitude ?? coordinateObject?.lat ?? coordinateArray?.[1]
  );
  const longitude = toCoordinateNumber(
    location.longitude ??
      location.lng ??
      location.lon ??
      coordinateObject?.longitude ??
      coordinateObject?.lng ??
      coordinateObject?.lon ??
      coordinateArray?.[0]
  );

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }

  return { latitude, longitude };
};

export const getLatLngFromMapsLink = (mapsLink?: string | null): LatLng | null => {
  if (!mapsLink) return null;

  let decodedLink = mapsLink;
  try {
    decodedLink = decodeURIComponent(mapsLink);
  } catch {
    decodedLink = mapsLink;
  }

  const coordinatePatterns = [
    /(?:destination|query|q)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i
  ];

  for (const pattern of coordinatePatterns) {
    const match = decodedLink.match(pattern);
    const latitude = toCoordinateNumber(match?.[1]);
    const longitude = toCoordinateNumber(match?.[2]);

    if (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !(latitude === 0 && longitude === 0)
    ) {
      return { latitude, longitude };
    }
  }

  return null;
};

export const resolveLatLng = (options: {
  location?: MapLocation | null;
  googleMapsLink?: string | null;
}): LatLng | null =>
  getLatLngFromPoint(options.location) || getLatLngFromMapsLink(options.googleMapsLink);

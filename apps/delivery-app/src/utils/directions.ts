import type { LatLng } from "./mapCoordinates";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";

/** Decode Google encoded polyline into LatLng points. */
export const decodePolyline = (encoded: string): LatLng[] => {
  if (!encoded) return [];

  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: LatLng[] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5
    });
  }

  return coordinates;
};

export const fetchDrivingRoute = async (
  origin: LatLng,
  destination: LatLng
): Promise<LatLng[] | null> => {
  if (!GOOGLE_MAPS_API_KEY) {
    return [origin, destination];
  }

  const params = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    mode: "driving",
    key: GOOGLE_MAPS_API_KEY
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
    );
    const data = await response.json();

    if (data?.status !== "OK" || !data?.routes?.[0]?.overview_polyline?.points) {
      return [origin, destination];
    }

    const points = decodePolyline(data.routes[0].overview_polyline.points);
    return points.length > 1 ? points : [origin, destination];
  } catch {
    return [origin, destination];
  }
};

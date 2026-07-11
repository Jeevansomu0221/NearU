export const isValidCoordinates = (coordinates: any): coordinates is [number, number] =>
  Array.isArray(coordinates) &&
  coordinates.length === 2 &&
  coordinates.every((value) => Number.isFinite(Number(value))) &&
  !(Number(coordinates[0]) === 0 && Number(coordinates[1]) === 0);

export const normalizeCoordinates = (coordinates: any): [number, number] | undefined => {
  if (!isValidCoordinates(coordinates)) return undefined;
  return [Number(coordinates[0]), Number(coordinates[1])];
};

export const haversineKm = (from: [number, number], to: [number, number]) => {
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// mapsParser.ts - Make sure this is the EXACT content
export interface ParsedCoordinates {
  latitude: number;
  longitude: number;
  isValid: boolean;
}

export const parseGoogleMapsLink = (url: string): ParsedCoordinates | null => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const cleanUrl = decodeURIComponent(url.trim());
  console.log('🔍 Parsing Google Maps link:', cleanUrl);

  // Pattern 1: ?q=lat,lng
  const qPattern = /[?&]q=([-\d.]+)%2C([-\d.]+)/;
  const qMatch = cleanUrl.match(qPattern);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { latitude: lat, longitude: lng, isValid: true };
    }
  }

  // Pattern 2: @lat,lng
  const atPattern = /@([-\d.]+),([-\d.]+)/;
  const atMatch = cleanUrl.match(atPattern);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { latitude: lat, longitude: lng, isValid: true };
    }
  }

  // Pattern 3: /place/.../@lat,lng
  const placePattern = /place\/[^@]+@([-\d.]+),([-\d.]+)/;
  const placeMatch = cleanUrl.match(placePattern);
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lng = parseFloat(placeMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { latitude: lat, longitude: lng, isValid: true };
    }
  }

  // Pattern 4: !3dlat!4dlng
  const dPattern = /!3d([-\d.]+)!4d([-\d.]+)/;
  const dMatch = cleanUrl.match(dPattern);
  if (dMatch) {
    const lat = parseFloat(dMatch[1]);
    const lng = parseFloat(dMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { latitude: lat, longitude: lng, isValid: true };
    }
  }

  // Pattern 5: Query parameters
  const queryPattern = /query=([-\d.]+)%2C([-\d.]+)/;
  const queryMatch = cleanUrl.match(queryPattern);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { latitude: lat, longitude: lng, isValid: true };
    }
  }

  console.warn('⚠️ Could not parse Google Maps link:', cleanUrl);
  return null;
};

export const isValidGoogleMapsLink = (url: string): boolean => {
  if (!url) return false;
  
  const patterns = [
    /maps\.google/,
    /google\.com\/maps/,
    /goo\.gl\/maps/,
    /maps\.app\.goo\.gl/
  ];
  
  return patterns.some(pattern => pattern.test(url));
};

const isValidCoordinate = (lat: number, lng: number): boolean => {
  return !isNaN(lat) && !isNaN(lng) && 
         lat >= -90 && lat <= 90 && 
         lng >= -180 && lng <= 180;
};
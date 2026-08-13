import { useEffect, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import * as Location from "expo-location";

const FRESH_LOCATION_MAX_AGE_MS = 8000;
const DEFAULT_LOCATION_LOOKUP_TIMEOUT_MS = 12000;
const WATCH_TIME_INTERVAL_MS = 3000;
const WATCH_DISTANCE_INTERVAL_M = 8;

export type RiderLatLng = {
  latitude: number;
  longitude: number;
};

type RiderLocationListener = (location: Location.LocationObject) => void;

let latestLiveLocation: Location.LocationObject | null = null;
let watchSubscription: Location.LocationSubscription | null = null;
let watchStartPromise: Promise<void> | null = null;
let foregroundPermissionRequest: Promise<boolean> | null = null;
const listeners = new Set<RiderLocationListener>();

const openAppSettings = () => {
  Linking.openSettings().catch(() => {});
};

const showLocationPermissionAlert = () => {
  Alert.alert(
    "Allow location access",
    "Delivery partners must allow location access before accepting or updating delivery jobs.",
    [
      { text: "Not now", style: "cancel" },
      {
        text: Platform.OS === "android" ? "Open Settings" : "Settings",
        onPress: openAppSettings
      }
    ]
  );
};

const showLocationUnavailableAlert = () => {
  Alert.alert(
    "Turn on location",
    "We could not read your current location. Please turn on device location and try again."
  );
};

const isFreshLocation = (
  location?: Location.LocationObject | null,
  maxAgeMs = FRESH_LOCATION_MAX_AGE_MS
) => {
  if (!location?.coords) return false;
  const age = Date.now() - location.timestamp;
  return Number.isFinite(age) && age >= 0 && age <= maxAgeMs;
};

export const toRiderLatLng = (location: Location.LocationObject): RiderLatLng => ({
  latitude: location.coords.latitude,
  longitude: location.coords.longitude
});

const notifyListeners = (location: Location.LocationObject) => {
  latestLiveLocation = location;
  listeners.forEach((listener) => listener(location));
};

const getCurrentPositionWithTimeout = async (
  timeoutMs = DEFAULT_LOCATION_LOOKUP_TIMEOUT_MS,
  accuracy: Location.LocationAccuracy = Location.Accuracy.High
) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race<Location.LocationObject | null>([
      Location.getCurrentPositionAsync({ accuracy }).catch(() => null),
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const requestRiderLocationPermission = async (options: { showDeniedAlert?: boolean } = {}) => {
  const showDeniedAlert = options.showDeniedAlert ?? true;
  const existingPermission = await Location.getForegroundPermissionsAsync();
  if (existingPermission.status === "granted") {
    return true;
  }

  if (!foregroundPermissionRequest) {
    foregroundPermissionRequest = Location.requestForegroundPermissionsAsync()
      .then((permission) => permission.status === "granted")
      .finally(() => {
        foregroundPermissionRequest = null;
      });
  }

  const granted = await foregroundPermissionRequest;
  if (!granted && showDeniedAlert) {
    showLocationPermissionAlert();
  }

  return granted;
};

export const getCurrentRiderLocation = async (
  options: {
    required?: boolean;
    showDeniedAlert?: boolean;
    timeoutMs?: number;
  } = {}
) => {
  const granted = await requestRiderLocationPermission({
    showDeniedAlert: options.showDeniedAlert
  });

  if (!granted) {
    return null;
  }

  if (isFreshLocation(latestLiveLocation, options.required ? FRESH_LOCATION_MAX_AGE_MS : 15000)) {
    return latestLiveLocation;
  }

  const currentLocation = await getCurrentPositionWithTimeout(
    options.timeoutMs ?? DEFAULT_LOCATION_LOOKUP_TIMEOUT_MS,
    Location.Accuracy.High
  );

  if (currentLocation) {
    notifyListeners(currentLocation);
    return currentLocation;
  }

  const lastKnownLocation = await Location.getLastKnownPositionAsync({
    maxAge: FRESH_LOCATION_MAX_AGE_MS,
    requiredAccuracy: 50
  }).catch(() => null);

  if (lastKnownLocation && isFreshLocation(lastKnownLocation)) {
    notifyListeners(lastKnownLocation);
    return lastKnownLocation;
  }

  if (options.required) {
    showLocationUnavailableAlert();
  }

  return isFreshLocation(latestLiveLocation, 20000) ? latestLiveLocation : null;
};

export const startRiderLocationWatch = async () => {
  const granted = await requestRiderLocationPermission({ showDeniedAlert: false });
  if (!granted) {
    return;
  }

  if (watchSubscription) {
    return;
  }

  if (watchStartPromise) {
    await watchStartPromise;
    return;
  }

  watchStartPromise = (async () => {
    await getCurrentRiderLocation({ showDeniedAlert: false, timeoutMs: 8000 });
    watchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: WATCH_TIME_INTERVAL_MS,
        distanceInterval: WATCH_DISTANCE_INTERVAL_M,
        mayShowUserSettingsDialog: true
      },
      (location) => {
        notifyListeners(location);
      }
    );
  })().finally(() => {
    watchStartPromise = null;
  });

  await watchStartPromise;
};

export const subscribeRiderLocation = (listener: RiderLocationListener) => {
  listeners.add(listener);
  if (latestLiveLocation) {
    listener(latestLiveLocation);
  }
  void startRiderLocationWatch();
  return () => {
    listeners.delete(listener);
  };
};

export const useRiderLiveLocation = () => {
  const [location, setLocation] = useState<RiderLatLng | null>(
    latestLiveLocation ? toRiderLatLng(latestLiveLocation) : null
  );

  useEffect(() => {
    return subscribeRiderLocation((next) => {
      setLocation(toRiderLatLng(next));
    });
  }, []);

  return location;
};

import { Alert, Linking, Platform } from "react-native";
import * as Location from "expo-location";

const DEFAULT_LOCATION_LOOKUP_TIMEOUT_MS = 5000;

let foregroundPermissionRequest: Promise<boolean> | null = null;

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

const getCurrentPositionWithTimeout = async (timeoutMs = DEFAULT_LOCATION_LOOKUP_TIMEOUT_MS) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race<Location.LocationObject | null>([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
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

export const getCurrentRiderLocation = async (options: {
  required?: boolean;
  showDeniedAlert?: boolean;
  timeoutMs?: number;
} = {}) => {
  const granted = await requestRiderLocationPermission({
    showDeniedAlert: options.showDeniedAlert
  });

  if (!granted) {
    return null;
  }

  const lastKnownLocation = await Location.getLastKnownPositionAsync({
    maxAge: 60000,
    requiredAccuracy: 200
  }).catch(() => null);
  const currentLocation = await getCurrentPositionWithTimeout(options.timeoutMs);
  const location = currentLocation || lastKnownLocation;

  if (!location && options.required) {
    showLocationUnavailableAlert();
  }

  return location;
};

import * as Location from "expo-location";

export const DEFAULT_LOCATION_TIMEOUT_MS = 8000;

export const requestForegroundLocationPermission = async () => {
  const existingPermission = await Location.getForegroundPermissionsAsync();
  if (existingPermission.status === "granted") {
    return true;
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  return permission.status === "granted";
};

export const getCurrentPositionWithTimeout = async (
  options: Location.LocationOptions = { accuracy: Location.Accuracy.Balanced },
  timeoutMs = DEFAULT_LOCATION_TIMEOUT_MS
) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    return await Promise.race([
      Location.getCurrentPositionAsync(options),
      timeout
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const runWithTimeout = async <T>(
  task: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

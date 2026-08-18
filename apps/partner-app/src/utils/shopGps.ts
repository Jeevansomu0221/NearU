export type ShopGpsFix = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export const loadLocationModule = async () => {
  try {
    return await import("expo-location");
  } catch (error) {
    console.warn("expo-location is unavailable in this app build:", error);
    return null;
  }
};

export const geocodeShopOnDevice = async (parts: Array<string | undefined>): Promise<ShopGpsFix | null> => {
  const Location = await loadLocationModule();
  if (!Location?.geocodeAsync) return null;

  const queries = [
    parts.map((part) => String(part || "").trim()).filter(Boolean).join(", "),
    parts
      .slice(1)
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(", ")
  ].filter((query, index, all) => query.length >= 5 && all.indexOf(query) === index);

  for (const query of queries) {
    try {
      const results = await Location.geocodeAsync(query);
      const match = results.find(
        (entry) => Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude)
      );
      if (match) {
        return {
          latitude: match.latitude,
          longitude: match.longitude,
          accuracy: Number.isFinite(match.accuracy) ? match.accuracy : undefined
        };
      }
    } catch {
      // Try the next, looser query.
    }
  }
  return null;
};

export const captureShopGps = async (): Promise<ShopGpsFix> => {
  const Location = await loadLocationModule();
  if (!Location) {
    throw new Error(
      "This Partner app build does not include location support yet. Install the latest build to capture your shop GPS pin."
    );
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error(
      "Open the Vyaha Partner app while standing at your shop and allow location access so we can pin its exact spot."
    );
  }

  try {
    await Location.enableNetworkProviderAsync();
  } catch {
    // Android-only helper; ignore when unavailable.
  }

  const toFix = (reading: {
    coords: { latitude: number; longitude: number; accuracy?: number | null };
  }): ShopGpsFix | null => {
    const latitude = reading.coords.latitude;
    const longitude = reading.coords.longitude;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
      latitude,
      longitude,
      accuracy: Number.isFinite(reading.coords.accuracy) ? Number(reading.coords.accuracy) : undefined
    };
  };

  const TARGET_ACCURACY_M = 25;
  const MAX_WAIT_MS = 12000;

  const instant = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
    mayShowUserSettingsDialog: true
  }).catch(() => null);
  const instantFix = instant ? toFix(instant) : null;
  if (instantFix && (instantFix.accuracy ?? 999) <= TARGET_ACCURACY_M) {
    return instantFix;
  }

  return await new Promise<ShopGpsFix>((resolve, reject) => {
    let settled = false;
    let best = instantFix;
    let subscription: { remove: () => void } | null = null;

    const finish = (fix: ShopGpsFix | null, error?: string) => {
      if (settled) return;
      settled = true;
      subscription?.remove();
      clearTimeout(timer);
      if (fix) {
        resolve(fix);
        return;
      }
      reject(new Error(error || "Could not read a GPS fix. Try again from the shop entrance."));
    };

    const timer = setTimeout(() => {
      finish(
        best,
        "Could not get a precise GPS fix. Stand at the shop entrance outdoors and try again."
      );
    }, MAX_WAIT_MS);

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 800,
        distanceInterval: 0
      },
      (reading) => {
        const fix = toFix(reading);
        if (!fix) return;
        if (!best || (fix.accuracy ?? 999) < (best.accuracy ?? 999)) {
          best = fix;
        }
        if ((fix.accuracy ?? 999) <= TARGET_ACCURACY_M) {
          finish(fix);
        }
      }
    )
      .then((watch) => {
        if (settled) {
          watch.remove();
          return;
        }
        subscription = watch;
      })
      .catch(() => finish(best));
  });
};

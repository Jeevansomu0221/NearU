type CrashlyticsInstance = {
  setCrashlyticsCollectionEnabled: (enabled: boolean) => Promise<null>;
};

const getCrashlytics = (): CrashlyticsInstance | null => {
  try {
    const crashlytics = require("@react-native-firebase/crashlytics").default;
    return crashlytics();
  } catch {
    return null;
  }
};

export const initCrashlytics = async () => {
  const instance = getCrashlytics();
  if (!instance) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[Crashlytics] Native module not available — rebuild the dev client to enable.");
    }
    return;
  }

  try {
    const enabled = typeof __DEV__ === "undefined" || !__DEV__;
    await instance.setCrashlyticsCollectionEnabled(enabled);
  } catch (error) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log("[Crashlytics] Init skipped:", error);
    }
  }
};

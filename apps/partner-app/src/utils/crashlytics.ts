import { NativeModules } from "react-native";

let nativeCrashlyticsAvailable: boolean | null = null;

const hasNativeCrashlytics = () => {
  if (nativeCrashlyticsAvailable !== null) {
    return nativeCrashlyticsAvailable;
  }

  nativeCrashlyticsAvailable = Boolean(NativeModules.RNFBCrashlyticsModule);
  return nativeCrashlyticsAvailable;
};

export const initCrashlytics = async () => {
  if (!hasNativeCrashlytics()) {
    return;
  }

  try {
    const {
      getCrashlytics,
      setCrashlyticsCollectionEnabled
    } = require("@react-native-firebase/crashlytics");
    const enabled = typeof __DEV__ === "undefined" || !__DEV__;
    await setCrashlyticsCollectionEnabled(getCrashlytics(), enabled);
  } catch {
    // Crashlytics is optional in dev/Expo Go builds.
  }
};

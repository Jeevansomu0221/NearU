import { NativeModules } from "react-native";

type CrashlyticsInstance = {
  setCrashlyticsCollectionEnabled: (enabled: boolean) => Promise<null>;
};

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
    const crashlytics = require("@react-native-firebase/crashlytics").default;
    const instance = crashlytics() as CrashlyticsInstance;
    const enabled = typeof __DEV__ === "undefined" || !__DEV__;
    await instance.setCrashlyticsCollectionEnabled(enabled);
  } catch {
    // Crashlytics is optional in dev/Expo Go builds.
  }
};

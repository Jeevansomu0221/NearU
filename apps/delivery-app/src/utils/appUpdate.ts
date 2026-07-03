import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Linking, Platform } from "react-native";
import { getAppUpdateInfo, type AppUpdateInfo } from "../api/delivery.api";

export type AppUpdateStatus = {
  currentVersion: string;
  latestVersion: string;
  minVersion: string;
  updateAvailable: boolean;
  storeUpdateAvailable: boolean;
  otaUpdateAvailable: boolean;
  forceUpdate: boolean;
  androidStoreUrl: string;
  iosStoreUrl: string;
};

const compareVersions = (left: string, right: string) => {
  const leftParts = left.split(".").map((part) => Number(part) || 0);
  const rightParts = right.split(".").map((part) => Number(part) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
};

export const getCurrentAppVersion = () =>
  Constants.expoConfig?.version || Constants.nativeAppVersion || "1.0.11";

export const checkAppUpdateStatus = async (): Promise<AppUpdateStatus> => {
  const currentVersion = getCurrentAppVersion();
  let remote: AppUpdateInfo = {
    latestVersion: currentVersion,
    minVersion: currentVersion,
    androidStoreUrl: "https://play.google.com/store/apps/details?id=com.vyaha.delivery",
    iosStoreUrl: ""
  };

  try {
    const response = await getAppUpdateInfo();
    if (response.success && response.data) {
      remote = response.data;
    }
  } catch {
    // Fall back to local version only.
  }

  let otaUpdateAvailable = false;
  if (!__DEV__ && Updates.isEnabled) {
    try {
      const update = await Updates.checkForUpdateAsync();
      otaUpdateAvailable = update.isAvailable;
    } catch {
      otaUpdateAvailable = false;
    }
  }

  const storeUpdateAvailable = compareVersions(currentVersion, remote.latestVersion) < 0;
  const forceUpdate = compareVersions(currentVersion, remote.minVersion) < 0;

  return {
    currentVersion,
    latestVersion: remote.latestVersion,
    minVersion: remote.minVersion,
    updateAvailable: storeUpdateAvailable || otaUpdateAvailable,
    storeUpdateAvailable,
    otaUpdateAvailable,
    forceUpdate,
    androidStoreUrl: remote.androidStoreUrl,
    iosStoreUrl: remote.iosStoreUrl
  };
};

export const openAppStoreListing = async (status: Pick<AppUpdateStatus, "androidStoreUrl" | "iosStoreUrl">) => {
  const url =
    Platform.OS === "ios" && status.iosStoreUrl
      ? status.iosStoreUrl
      : status.androidStoreUrl;

  if (!url) return false;
  await Linking.openURL(url);
  return true;
};

export const installOtaUpdate = async () => {
  if (!Updates.isEnabled) return false;
  const update = await Updates.fetchUpdateAsync();
  if (!update.isNew) return false;
  await Updates.reloadAsync();
  return true;
};

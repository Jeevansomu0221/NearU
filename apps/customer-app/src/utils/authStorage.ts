import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules } from "react-native";

const ACCESS_TOKEN_KEY = "vyaha.auth.accessToken";
const REFRESH_TOKEN_KEY = "vyaha.auth.refreshToken";
const LEGACY_ACCESS_KEY = "token";
const LEGACY_REFRESH_KEY = "refreshToken";

let cachedAccessToken: string | null | undefined;
let secureStoreModule: typeof import("expo-secure-store") | null | undefined;

const isSecureStoreAvailable = () => Boolean(NativeModules.ExpoSecureStore);

const getSecureStore = () => {
  if (secureStoreModule !== undefined) {
    return secureStoreModule;
  }

  if (!isSecureStoreAvailable()) {
    secureStoreModule = null;
    return null;
  }

  try {
    secureStoreModule = require("expo-secure-store");
    return secureStoreModule;
  } catch {
    secureStoreModule = null;
    return null;
  }
};

const getItem = async (key: string): Promise<string | null> => {
  const secureStore = getSecureStore();
  if (secureStore) {
    try {
      return (await secureStore.getItemAsync(key)) ?? null;
    } catch (error) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log("[authStorage] SecureStore read failed, using AsyncStorage:", error);
      }
    }
  }
  return AsyncStorage.getItem(key);
};

const setItem = async (key: string, value: string): Promise<void> => {
  const secureStore = getSecureStore();
  if (secureStore) {
    try {
      await secureStore.setItemAsync(key, value);
      return;
    } catch (error) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log("[authStorage] SecureStore write failed, using AsyncStorage:", error);
      }
    }
  }
  await AsyncStorage.setItem(key, value);
};

const deleteItem = async (key: string): Promise<void> => {
  const secureStore = getSecureStore();
  if (secureStore) {
    try {
      await secureStore.deleteItemAsync(key);
    } catch {
      // fall through to AsyncStorage cleanup
    }
  }
  await AsyncStorage.removeItem(key).catch(() => undefined);
};

const migrateLegacyTokens = async () => {
  const legacyAccess = await AsyncStorage.getItem(LEGACY_ACCESS_KEY);
  if (legacyAccess) {
    await setItem(ACCESS_TOKEN_KEY, legacyAccess);
    await AsyncStorage.removeItem(LEGACY_ACCESS_KEY);
  }

  const legacyRefresh = await AsyncStorage.getItem(LEGACY_REFRESH_KEY);
  if (legacyRefresh) {
    await setItem(REFRESH_TOKEN_KEY, legacyRefresh);
    await AsyncStorage.removeItem(LEGACY_REFRESH_KEY);
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  await migrateLegacyTokens();
  cachedAccessToken = await getItem(ACCESS_TOKEN_KEY);
  return cachedAccessToken;
};

export const setAccessToken = async (token: string): Promise<void> => {
  cachedAccessToken = token;
  await setItem(ACCESS_TOKEN_KEY, token);
  await AsyncStorage.removeItem(LEGACY_ACCESS_KEY);
};

export const getRefreshToken = async (): Promise<string | null> => {
  await migrateLegacyTokens();
  return getItem(REFRESH_TOKEN_KEY);
};

export const setRefreshToken = async (token: string): Promise<void> => {
  await setItem(REFRESH_TOKEN_KEY, token);
  await AsyncStorage.removeItem(LEGACY_REFRESH_KEY);
};

export const removeRefreshToken = async (): Promise<void> => {
  await deleteItem(REFRESH_TOKEN_KEY);
  await AsyncStorage.removeItem(LEGACY_REFRESH_KEY);
};

export const clearAuthTokens = async (): Promise<void> => {
  cachedAccessToken = null;
  await deleteItem(ACCESS_TOKEN_KEY);
  await deleteItem(REFRESH_TOKEN_KEY);
  await AsyncStorage.multiRemove([LEGACY_ACCESS_KEY, LEGACY_REFRESH_KEY]);
};

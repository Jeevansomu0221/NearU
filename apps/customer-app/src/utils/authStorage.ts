import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "vyaha.auth.accessToken";
const REFRESH_TOKEN_KEY = "vyaha.auth.refreshToken";
const LEGACY_ACCESS_KEY = "token";
const LEGACY_REFRESH_KEY = "refreshToken";

let cachedAccessToken: string | null | undefined;

const migrateLegacyTokens = async () => {
  const legacyAccess = await AsyncStorage.getItem(LEGACY_ACCESS_KEY);
  if (legacyAccess) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, legacyAccess);
    await AsyncStorage.removeItem(LEGACY_ACCESS_KEY);
  }

  const legacyRefresh = await AsyncStorage.getItem(LEGACY_REFRESH_KEY);
  if (legacyRefresh) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, legacyRefresh);
    await AsyncStorage.removeItem(LEGACY_REFRESH_KEY);
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  await migrateLegacyTokens();
  cachedAccessToken = (await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)) ?? null;
  return cachedAccessToken;
};

export const setAccessToken = async (token: string): Promise<void> => {
  cachedAccessToken = token;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  await AsyncStorage.removeItem(LEGACY_ACCESS_KEY);
};

export const getRefreshToken = async (): Promise<string | null> => {
  await migrateLegacyTokens();
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};

export const setRefreshToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  await AsyncStorage.removeItem(LEGACY_REFRESH_KEY);
};

export const removeRefreshToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => undefined);
  await AsyncStorage.removeItem(LEGACY_REFRESH_KEY);
};

export const clearAuthTokens = async (): Promise<void> => {
  cachedAccessToken = null;
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => undefined);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => undefined);
  await AsyncStorage.multiRemove([LEGACY_ACCESS_KEY, LEGACY_REFRESH_KEY]);
};

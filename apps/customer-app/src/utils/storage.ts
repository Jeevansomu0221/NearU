import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  removeRefreshToken,
  setAccessToken,
  setRefreshToken
} from "./authStorage";

export const setToken = async (token: string) => {
  await setAccessToken(token);
};

export const getToken = async (): Promise<string | null> => getAccessToken();

export const removeToken = async () => {
  await clearAuthTokens();
};

export const clearStorage = async () => {
  await clearAuthTokens();
  await AsyncStorage.clear();
};

export {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  removeRefreshToken,
  setAccessToken,
  setRefreshToken
};

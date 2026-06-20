import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken
} from "./authStorage";

let memoryToken: string | null = null;

export const setToken = async (token: string) => {
  memoryToken = token;
  await setAccessToken(token);
};

export const getToken = async (): Promise<string | null> => {
  if (memoryToken) return memoryToken;
  memoryToken = await getAccessToken();
  return memoryToken;
};

export const clearToken = async () => {
  memoryToken = null;
  await clearAuthTokens();
  await AsyncStorage.multiRemove(["user"]);
};

export {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken
};

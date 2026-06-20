import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  removeRefreshToken,
  setAccessToken,
  setRefreshToken
} from "./authStorage";

export const AUTH_STORAGE_KEYS = [
  "phone",
  "userId",
  "partnerId",
  "user"
] as const;

export interface AuthData {
  token: string;
  refreshToken?: string;
  phone: string;
  userId: string;
  partnerId?: string;
  user?: Record<string, unknown>;
}

export const getToken = async (): Promise<string | null> => getAccessToken();

export const setToken = async (token: string): Promise<void> => {
  await setAccessToken(token);
};

export const clearAuthData = async (): Promise<void> => {
  try {
    await clearAuthTokens();
    await AsyncStorage.multiRemove([...AUTH_STORAGE_KEYS]);
  } catch (error) {
    console.error("Error clearing auth data:", error);
  }
};

export const getUserData = async (): Promise<{
  token: string | null;
  phone: string | null;
  userId: string | null;
  partnerId: string | null;
}> => {
  try {
    const [token, phone, userId, partnerId] = await Promise.all([
      getAccessToken(),
      AsyncStorage.getItem("phone"),
      AsyncStorage.getItem("userId"),
      AsyncStorage.getItem("partnerId"),
    ]);

    return { token, phone, userId, partnerId };
  } catch (error) {
    console.error("Error getting user data:", error);
    return { token: null, phone: null, userId: null, partnerId: null };
  }
};

export const storeAuthData = async (data: AuthData): Promise<void> => {
  try {
    const { token, refreshToken, phone, userId, partnerId, user } = data;
    await setAccessToken(token);
    if (refreshToken) {
      await setRefreshToken(refreshToken);
    } else {
      await removeRefreshToken();
    }
    await AsyncStorage.setItem("phone", phone);
    await AsyncStorage.setItem("userId", userId);
    if (partnerId) {
      await AsyncStorage.setItem("partnerId", partnerId);
    } else {
      await AsyncStorage.removeItem("partnerId");
    }
    if (user) {
      await AsyncStorage.setItem("user", JSON.stringify(user));
    }
  } catch (error) {
    console.error("Error storing auth data:", error);
  }
};

export {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken
};

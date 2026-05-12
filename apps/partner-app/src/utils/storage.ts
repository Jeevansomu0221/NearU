import AsyncStorage from "@react-native-async-storage/async-storage";

export const AUTH_STORAGE_KEYS = [
  "token",
  "refreshToken",
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

export const getToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem("token");
    return token;
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

export const setToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem("token", token);
  } catch (error) {
    console.error("Error setting token:", error);
  }
};

export const clearAuthData = async (): Promise<void> => {
  try {
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
      AsyncStorage.getItem("token"),
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

// Store all auth data after login
export const storeAuthData = async (data: AuthData): Promise<void> => {
  try {
    const { token, refreshToken, phone, userId, partnerId, user } = data;
    await AsyncStorage.setItem("token", token);
    if (refreshToken) {
      await AsyncStorage.setItem("refreshToken", refreshToken);
    }
    await AsyncStorage.setItem("phone", phone);
    await AsyncStorage.setItem("userId", userId);
    if (partnerId) {
      await AsyncStorage.setItem("partnerId", partnerId);
    }
    if (user) {
      await AsyncStorage.setItem("user", JSON.stringify(user));
    }
    console.log("✅ Auth data stored successfully");
  } catch (error) {
    console.error("Error storing auth data:", error);
  }
};
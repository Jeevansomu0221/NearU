import api from "./client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerForPushNotifications, unregisterPushNotifications } from "../services/notifications";
import {
  clearAuthData as clearStoredAuthData,
  storeAuthData as persistStoredAuthData
} from "../utils/storage";

interface VerifyOtpPayload {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    phone: string;
    name: string;
    role: string;
    partnerId?: string;
  };
}

interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  data?: VerifyOtpPayload;
}

interface SendOtpResponse {
  success: boolean;
  message: string;
  data?: any;
}

const persistVerifiedSession = async (payload: VerifyOtpPayload) => {
  await persistStoredAuthData({
    token: payload.token,
    refreshToken: payload.refreshToken,
    phone: payload.user.phone,
    userId: payload.user.id,
    partnerId: payload.user.partnerId,
    user: payload.user
  });
};

export const sendOtp = async (phone: string, role: string) => {
  return api.post<SendOtpResponse>("/auth/send-otp", { phone, role });
};

export const verifyOtp = async (phone: string, otp: string, role: string) => {
  const response = await api.post<VerifyOtpResponse>("/auth/verify-otp", {
    phone,
    otp,
    role
  });

  const payload = response.data?.data;
  if (!response.data?.success || !payload?.token || !payload?.user) {
    throw new Error(response.data?.message || "Invalid response from server");
  }

  await persistVerifiedSession(payload);

  registerForPushNotifications().catch((error) => {
    console.log("Failed to register push notifications:", error);
  });

  return payload;
};

export const verifyFirebaseOtp = async (phone: string, firebaseIdToken: string, role: string) => {
  const response = await api.post<VerifyOtpResponse>("/auth/verify-otp", {
    phone,
    firebaseIdToken,
    role
  });

  const payload = response.data?.data;
  if (!response.data?.success || !payload?.token || !payload?.user) {
    throw new Error(response.data?.message || "Invalid response from server");
  }

  await persistVerifiedSession(payload);

  registerForPushNotifications().catch((error) => {
    console.log("Failed to register push notifications:", error);
  });

  return payload;
};

export const getAuthToken = async (): Promise<string | null> => {
  const { getAccessToken } = await import("../utils/authStorage");
  return getAccessToken();
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAuthToken();
  return !!token;
};

export const testBackendConnection = async () => {
  try {
    const response = await api.get("/health");
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = async () => {
  const userStr = await AsyncStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

export const logout = async () => {
  try {
    await unregisterPushNotifications().catch(() => {});
    await clearStoredAuthData();
    return true;
  } catch {
    return false;
  }
};

export const deleteAccount = async () => {
  try {
    await unregisterPushNotifications().catch(() => {});
    await api.delete("/users/me");
    await clearStoredAuthData();
    return true;
  } catch (error) {
    await clearStoredAuthData();
    throw error;
  }
};

export { clearStoredAuthData as clearAuthData, persistStoredAuthData as storeAuthData };

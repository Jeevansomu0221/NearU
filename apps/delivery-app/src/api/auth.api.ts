import api, { ApiResponse } from "./client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAuthTokens, setAccessToken, setRefreshToken, removeRefreshToken } from "../utils/authStorage";
import { unregisterPushNotifications } from "../services/notifications";

interface SendOtpResponse {
  phone: string;
}

interface VerifyOtpResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    name: string;
    role: string;
    partnerId?: string;
    deliveryPartnerId?: string;
  };
}

export const sendOtp = (phone: string): Promise<ApiResponse<SendOtpResponse>> => {
  return api.post("/auth/send-otp", { phone, role: "delivery" });
};

export const verifyOtp = (phone: string, otp: string): Promise<ApiResponse<VerifyOtpResponse>> => {
  return api.post("/auth/verify-otp", { phone, otp, role: "delivery" });
};

export const verifyFirebaseOtp = (
  phone: string,
  firebaseIdToken: string
): Promise<ApiResponse<VerifyOtpResponse>> => {
  return api.post("/auth/verify-otp", { phone, firebaseIdToken, role: "delivery" });
};

export const persistAuthSession = async (
  token: string,
  refreshToken?: string,
  user?: Record<string, unknown>
) => {
  await setAccessToken(token);
  if (refreshToken) {
    await setRefreshToken(refreshToken);
  } else {
    await removeRefreshToken();
  }
  if (user) {
    await AsyncStorage.setItem("user", JSON.stringify(user));
  }
};

export const logout = async () => {
  try {
    await unregisterPushNotifications().catch(() => {});
    await api.post("/auth/logout");
  } catch (_error) {
    // best effort
  } finally {
    await clearAuthTokens();
    await AsyncStorage.removeItem("user");
  }
};

export const deleteAccount = async () => {
  try {
    await unregisterPushNotifications().catch(() => {});
    const response = await api.delete("/users/me");
    return response;
  } finally {
    await clearAuthTokens();
    await AsyncStorage.removeItem("user");
  }
};

import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./client";
import { clearAuthTokens, setAccessToken, setRefreshToken, removeRefreshToken } from "../utils/authStorage";

export interface SendOtpResponse {
  success: boolean;
  message: string;
  data?: {
    phone: string;
  };
}

export interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    refreshToken: string;
    user: {
      id: string;
      phone: string;
      name: string;
      role: string;
    };
  };
}

export const sendOtp = (phone: string): Promise<SendOtpResponse> => {
  return api.post("/auth/send-otp", {
    phone,
    role: "customer"
  }) as Promise<SendOtpResponse>;
};

export const verifyOtp = (phone: string, otp: string): Promise<VerifyOtpResponse> => {
  return api.post("/auth/verify-otp", {
    phone,
    otp,
    role: "customer"
  }) as Promise<VerifyOtpResponse>;
};

export const verifyFirebaseOtp = (phone: string, firebaseIdToken: string): Promise<VerifyOtpResponse> => {
  return api.post("/auth/verify-otp", {
    phone,
    firebaseIdToken,
    role: "customer"
  }) as Promise<VerifyOtpResponse>;
};

export const persistAuthSession = async (token: string, refreshToken?: string, user?: Record<string, unknown>) => {
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
    await api.post("/auth/logout");
  } catch (_error) {
    // best effort
  } finally {
    await clearAuthTokens();
    await AsyncStorage.removeItem("user");
  }
};

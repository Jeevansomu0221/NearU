import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./client";
import { clearAuthTokens, setAccessToken, setRefreshToken, removeRefreshToken } from "../utils/authStorage";

export interface SendOtpResponse {
  success: boolean;
  message: string;
  data?: {
    phone: string;
    provider?: string;
    deliveryHint?: string;
    useFirebaseFallback?: boolean;
    fallbackReason?: string;
    otpDebug?: {
      traceId?: string;
      attempts?: Array<{ label: string; ok: boolean; detail: string }>;
      error?: string;
    };
    devOtp?: string;
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

export const sendOtp = async (phone: string): Promise<SendOtpResponse> => {
  return api.post("/auth/send-otp", {
    phone,
    role: "customer"
  });
};

export const verifyOtp = async (phone: string, otp: string): Promise<VerifyOtpResponse> => {
  return api.post("/auth/verify-otp", {
    phone,
    otp,
    role: "customer"
  });
};

export const verifyFirebaseOtp = async (phone: string, firebaseIdToken: string): Promise<VerifyOtpResponse> => {
  return api.post("/auth/verify-otp", {
    phone,
    firebaseIdToken,
    role: "customer"
  });
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

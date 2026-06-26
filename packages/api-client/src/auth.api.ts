import {
  clearAuthData,
  removeRefreshToken,
  setAccessToken,
  setRefreshToken,
  setStoredPhone,
  setStoredUser
} from "./storage.js";
import api from "./client.js";
import type { UserRole } from "./types.js";

export interface SendOtpResponse {
  success: boolean;
  message: string;
  data?: {
    phone: string;
    provider?: string;
    deliveryHint?: string;
    useFirebaseFallback?: boolean;
    fallbackReason?: string;
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

export const sendOtp = async (phone: string, role: UserRole): Promise<SendOtpResponse> => {
  const res = await api.post<NonNullable<SendOtpResponse["data"]>>("/auth/send-otp", { phone, role });
  return {
    success: res.success,
    message: res.message || "",
    data: res.data
  };
};

export const verifyOtp = async (phone: string, otp: string, role: UserRole): Promise<VerifyOtpResponse> => {
  return api.post("/auth/verify-otp", { phone, otp, role });
};

export const verifyFirebaseOtp = async (
  phone: string,
  firebaseIdToken: string,
  role: UserRole
): Promise<VerifyOtpResponse> => {
  return api.post("/auth/verify-otp", { phone, firebaseIdToken, role });
};

export const persistAuthSession = async (
  token: string,
  refreshToken?: string,
  user?: Record<string, unknown>,
  phone?: string
) => {
  await setAccessToken(token);
  if (refreshToken) {
    await setRefreshToken(refreshToken);
  } else {
    await removeRefreshToken();
  }
  if (user) {
    setStoredUser(user);
  }
  if (phone) {
    setStoredPhone(phone);
  }
};

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch {
    // best effort
  } finally {
    await clearAuthData();
  }
};

export const deleteAccount = async () => {
  await api.delete("/users/me");
  await clearAuthData();
};

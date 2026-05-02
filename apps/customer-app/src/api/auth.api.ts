import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./client";

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

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch (_error) {
    // best effort
  } finally {
    await AsyncStorage.multiRemove(["token", "refreshToken", "user"]);
  }
};

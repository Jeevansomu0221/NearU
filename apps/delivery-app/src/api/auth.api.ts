import api, { ApiResponse } from "./client";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch (_error) {
    // best effort
  } finally {
    await AsyncStorage.multiRemove(["token", "refreshToken", "user"]);
  }
};

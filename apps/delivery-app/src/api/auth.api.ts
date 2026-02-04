import api from "./client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiResponse } from "./client";

// Define response interfaces
interface SendOtpResponse {
  message: string;
  phone: string;
  role: string;
  testMode?: boolean;
  testOtp?: string;
  note?: string;
}

export const sendOtp = (phone: string): Promise<ApiResponse<SendOtpResponse>> => {
  return api.post("/auth/send-otp", { 
    phone, 
    role: "delivery"
  });
};

// Update verifyOtp to handle response properly too
interface VerifyOtpResponse {
  token: string;
  user: {
    id: string;
    phone: string;
    name: string;
    role: string;
    partnerId?: string;
    deliveryPartnerId?: string;
  };
  message: string;
}

export const verifyOtp = (phone: string, otp: string): Promise<ApiResponse<VerifyOtpResponse>> => {
  return api.post("/auth/verify-otp", { 
    phone, 
    otp, 
    role: "delivery"
  });
};

// Get user profile
export const getProfile = (): Promise<ApiResponse<any>> => {
  return api.get("/auth/profile");
};

// Logout (clear token from storage)
export const logout = async () => {
  // Clear token from AsyncStorage
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("user");
};
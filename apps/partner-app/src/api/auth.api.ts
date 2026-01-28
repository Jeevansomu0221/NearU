import api from "./client";
import { storeAuthData } from "../utils/storage";

// Define response interfaces
interface VerifyOtpResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    phone: string;
    name: string;
    role: string;
    partnerId?: string;
  };
  message?: string;
}

interface SendOtpResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const sendOtp = (phone: string, role: string) =>
  api.post("/auth/send-otp", { phone, role });

export const verifyOtp = async (phone: string, otp: string, role: string) => {
  try {
    const response = await api.post<VerifyOtpResponse>("/auth/verify-otp", { phone, otp, role });
    const responseData = response.data;
    
    // Type guard to ensure data structure
    if (responseData.success && responseData.token && responseData.user) {
      await storeAuthData({
        token: responseData.token,
        phone: responseData.user.phone,
        userId: responseData.user.id,
        partnerId: responseData.user.partnerId,
      });
    }
    
    return response;
  } catch (error) {
    console.error("Verify OTP error:", error);
    throw error;
  }
};

// Test connection to backend
export const testBackendConnection = async () => {
  try {
    const response = await api.get("/health");
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error };
  }
};
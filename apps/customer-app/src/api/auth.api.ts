import api from "./client";

// Define response types
export interface SendOtpResponse {
  success: boolean;
  message: string;
  phone: string;
  role: string;
  testMode?: boolean;
}

export interface VerifyOtpResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    phone: string;
    name: string;
    role: string;
    partnerId?: string;
  };
  message?: string;
}

export const sendOtp = (phone: string): Promise<SendOtpResponse> => {
  console.log('📞 Sending OTP to:', phone);
  
  return api.post("/auth/send-otp", {
    phone,
    role: "customer"
  }) as Promise<SendOtpResponse>;
};

export const verifyOtp = (phone: string, otp: string): Promise<VerifyOtpResponse> => {
  console.log('✅ Verifying OTP for:', phone);
  
  return api.post("/auth/verify-otp", {
    phone,
    otp,
    role: "customer"
  }) as Promise<VerifyOtpResponse>;
};
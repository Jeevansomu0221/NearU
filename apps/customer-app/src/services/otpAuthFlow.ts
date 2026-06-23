import { sendOtp, verifyOtp, verifyFirebaseOtp } from "../api/auth.api";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth";

export type OtpAuthProvider = "2factor" | "firebase";

export type OtpSessionInfo = {
  provider: OtpAuthProvider;
  deliveryHint?: string;
};

export const sendOtpWithFallback = async (phone: string): Promise<OtpSessionInfo> => {
  const response = await sendOtp(phone);
  const payload = response.data ?? {};

  if (response.success && payload.provider === "2factor") {
    return {
      provider: "2factor",
      deliveryHint: payload.deliveryHint || "OTP sent via SMS."
    };
  }

  if (response.success && payload.useFirebaseFallback) {
    await sendFirebaseOtp(phone);
    return { provider: "firebase" };
  }

  throw new Error(response.message || "Failed to send OTP");
};

export const verifyOtpSession = async (phone: string, otp: string, session: OtpSessionInfo) => {
  if (session.provider === "2factor") {
    const response = await verifyOtp(phone, otp);
    if (!response.success || !response.data?.token || !response.data?.user) {
      throw new Error(response.message || "Invalid or expired OTP");
    }
    return response;
  }

  const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
  const response = await verifyFirebaseOtp(phone, firebaseIdToken);
  if (!response.success || !response.data?.token || !response.data?.user) {
    throw new Error(response.message || "Invalid OTP");
  }
  return response;
};

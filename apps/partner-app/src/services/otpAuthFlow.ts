import { sendOtp } from "../api/auth.api";
import api from "../api/client";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth";

export type OtpAuthProvider = "2factor" | "firebase";

export type OtpSessionInfo = {
  provider: OtpAuthProvider;
  deliveryHint?: string;
};

export const sendOtpWithFallback = async (phone: string, role: string): Promise<OtpSessionInfo> => {
  const response = await sendOtp(phone, role);
  const body = response.data;
  const payload = body?.data ?? {};

  if (body?.success && payload.provider === "2factor") {
    return {
      provider: "2factor",
      deliveryHint: payload.deliveryHint || "OTP sent via SMS."
    };
  }

  if (body?.success && payload.useFirebaseFallback) {
    await sendFirebaseOtp(phone);
    return { provider: "firebase" };
  }

  throw new Error(body?.message || "Failed to send OTP");
};

export const verifyOtpSession = async (
  phone: string,
  otp: string,
  role: string,
  session: OtpSessionInfo
) => {
  if (session.provider === "2factor") {
    const response = await api.post("/auth/verify-otp", { phone, otp, role });
    const body = response.data;
    if (!body?.success || !body?.data?.token) {
      throw new Error(body?.message || "Invalid or expired OTP");
    }
    return body;
  }

  const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
  const response = await api.post("/auth/verify-otp", { phone, firebaseIdToken, role });
  const body = response.data;
  if (!body?.success || !body?.data?.token) {
    throw new Error(body?.message || "Invalid OTP");
  }
  return body;
};

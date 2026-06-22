import { sendOtp, verifyOtp, verifyFirebaseOtp } from "../api/auth.api";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth";

export type OtpAuthProvider = "2factor" | "firebase";

export type OtpSessionInfo = {
  provider: OtpAuthProvider;
  channel?: "sms" | "voice";
  deliveryHint?: string;
};

export const sendOtpWithFallback = async (phone: string): Promise<OtpSessionInfo> => {
  try {
    const response = await sendOtp(phone);
    const payload = response.data ?? {};

    if (payload.useFirebaseFallback) {
      await sendFirebaseOtp(phone);
      return { provider: "firebase" };
    }

    if (payload.provider === "2factor" || payload.provider === "memory") {
      return {
        provider: "2factor",
        channel: payload.channel,
        deliveryHint: payload.deliveryHint
      };
    }

    await sendFirebaseOtp(phone);
    return { provider: "firebase" };
  } catch {
    await sendFirebaseOtp(phone);
    return { provider: "firebase" };
  }
};

export const verifyOtpSession = async (phone: string, otp: string, session: OtpSessionInfo) => {
  if (session.provider === "2factor") {
    const response = await verifyOtp(phone, otp);
    if (!response.success || !response.data?.token || !response.data?.user) {
      throw new Error(response.message || "Invalid OTP");
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

import { sendOtp, verifyOtp, verifyFirebaseOtp } from "../api/auth.api";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth";

export type OtpAuthProvider = "2factor" | "firebase";

export type OtpSessionInfo = {
  provider: OtpAuthProvider;
  channel?: "sms" | "voice";
  deliveryHint?: string;
};

const isNetworkError = (error: unknown) => {
  const message = String((error as any)?.message || "").toLowerCase();
  return (
    message.includes("network") ||
    message.includes("connect") ||
    message.includes("server is taking longer") ||
    message.includes("timeout")
  );
};

export const sendOtpWithFallback = async (phone: string): Promise<OtpSessionInfo> => {
  try {
    const response = await sendOtp(phone);
    const payload = response.data ?? {};

    if (!response.success) {
      if (payload.useFirebaseFallback) {
        await sendFirebaseOtp(phone);
        return { provider: "firebase" };
      }
      throw new Error(response.message || "Failed to send OTP");
    }

    if (payload.useFirebaseFallback) {
      await sendFirebaseOtp(phone);
      return { provider: "firebase" };
    }

    if (payload.provider === "2factor") {
      return {
        provider: "2factor",
        channel: payload.channel,
        deliveryHint: payload.deliveryHint
      };
    }

    throw new Error(response.message || "OTP provider unavailable");
  } catch (error) {
    if (isNetworkError(error)) {
      await sendFirebaseOtp(phone);
      return { provider: "firebase" };
    }
    throw error;
  }
};

export const verifyOtpSession = async (phone: string, otp: string, session: OtpSessionInfo) => {
  if (session.provider === "2factor") {
    try {
      const response = await verifyOtp(phone, otp);
      if (response.success && response.data?.token && response.data?.user) {
        return response;
      }
    } catch {
      // User may have received Firebase OTP if send timed out — try that next.
    }

    try {
      const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
      const response = await verifyFirebaseOtp(phone, firebaseIdToken);
      if (response.success && response.data?.token && response.data?.user) {
        return response;
      }
    } catch {
      // fall through
    }

    throw new Error("Invalid or expired OTP. Use the code from your latest SMS or call.");
  }

  const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
  const response = await verifyFirebaseOtp(phone, firebaseIdToken);
  if (!response.success || !response.data?.token || !response.data?.user) {
    throw new Error(response.message || "Invalid OTP");
  }
  return response;
};

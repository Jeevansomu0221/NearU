import api from "../api/client";
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
    const body = await api.post("/auth/send-otp", { phone, role: "delivery" });
    const payload = body?.data ?? {};

    if (!body?.success) {
      if (payload.useFirebaseFallback) {
        await sendFirebaseOtp(phone);
        return { provider: "firebase" };
      }
      throw new Error(body?.message || "Failed to send OTP");
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

    throw new Error(body?.message || "OTP provider unavailable");
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
      const body = await api.post("/auth/verify-otp", { phone, otp, role: "delivery" });
      if (body?.success && body?.data?.token) {
        return body;
      }
    } catch {
      // try Firebase OTP below
    }

    try {
      const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
      const body = await api.post("/auth/verify-otp", { phone, firebaseIdToken, role: "delivery" });
      if (body?.success && body?.data?.token) {
        return body;
      }
    } catch {
      // fall through
    }

    throw new Error("Invalid or expired OTP. Use the code from your latest SMS or call.");
  }

  const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
  const body = await api.post("/auth/verify-otp", { phone, firebaseIdToken, role: "delivery" });
  if (!body?.success || !body?.data?.token) {
    throw new Error(body?.message || "Invalid OTP");
  }
  return body;
};

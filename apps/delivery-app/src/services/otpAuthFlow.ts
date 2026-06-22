import api from "../api/client";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth";

export type OtpAuthProvider = "2factor" | "firebase";

export type OtpSessionInfo = {
  provider: OtpAuthProvider;
  deliveryHint?: string;
};

export const sendOtpWithFallback = async (phone: string): Promise<OtpSessionInfo> => {
  try {
    const body = await api.post("/auth/send-otp", { phone, role: "delivery" });
    const payload = body?.data ?? {};

    if (body?.success && !payload.useFirebaseFallback) {
      return {
        provider: "2factor",
        deliveryHint: payload.deliveryHint || "OTP sent via SMS from VYAHA."
      };
    }
  } catch (error) {
    if (__DEV__) {
      console.log("[OTP] backend send failed, using Firebase:", error);
    }
  }

  await sendFirebaseOtp(phone);
  return { provider: "firebase" };
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

    throw new Error("Invalid or expired OTP. Please use the latest SMS code.");
  }

  const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
  const body = await api.post("/auth/verify-otp", { phone, firebaseIdToken, role: "delivery" });
  if (!body?.success || !body?.data?.token) {
    throw new Error(body?.message || "Invalid OTP");
  }
  return body;
};

import api from "../api/client";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth";

export type OtpSessionInfo = {
  provider: OtpAuthProvider;
  channel?: "sms" | "voice";
  deliveryHint?: string;
};

type SendOtpPayload = {
  phone?: string;
  provider?: string;
  channel?: "sms" | "voice";
  deliveryHint?: string;
  useFirebaseFallback?: boolean;
};

const unwrapSendOtpPayload = (body: any): SendOtpPayload => {
  return (body?.data ?? body ?? {}) as SendOtpPayload;
};

export const sendOtpWithFallback = async (phone: string): Promise<OtpSessionInfo> => {
  try {
    const body = await api.post("/auth/send-otp", { phone, role: "delivery" });
    const payload = unwrapSendOtpPayload(body);

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
    const body = await api.post("/auth/verify-otp", { phone, otp, role: "delivery" });
    if (!body?.success || !body?.data?.token) {
      throw new Error(body?.message || "Invalid OTP");
    }
    return body;
  }

  const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
  const body = await api.post("/auth/verify-otp", { phone, firebaseIdToken, role: "delivery" });
  if (!body?.success || !body?.data?.token) {
    throw new Error(body?.message || "Invalid OTP");
  }
  return body;
};

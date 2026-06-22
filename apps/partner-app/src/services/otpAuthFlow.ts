import { sendOtp } from "../api/auth.api";
import api from "../api/client";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth";

export type OtpAuthProvider = "2factor" | "firebase";

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

const unwrapSendOtpPayload = (response: any): SendOtpPayload => {
  const body = response?.data ?? response;
  return (body?.data ?? body ?? {}) as SendOtpPayload;
};

export const sendOtpWithFallback = async (phone: string, role: string): Promise<OtpSessionInfo> => {
  try {
    const response = await sendOtp(phone, role);
    const payload = unwrapSendOtpPayload(response);

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
      throw new Error(body?.message || "Invalid OTP");
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

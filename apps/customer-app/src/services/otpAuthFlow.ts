import { sendOtp, verifyOtp, verifyFirebaseOtp } from "../api/auth.api";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth";

export type OtpAuthProvider = "2factor" | "msg91" | "firebase";

export type OtpSessionInfo = {
  provider: OtpAuthProvider;
  deliveryHint?: string;
};

export const sendOtpWithFallback = async (phone: string): Promise<OtpSessionInfo> => {
  try {
    const response = await sendOtp(phone);
    const payload = response.data ?? {};

    if (response.success && !payload.useFirebaseFallback && (payload.provider === "2factor" || payload.provider === "msg91")) {
      return {
        provider: payload.provider,
        deliveryHint: payload.deliveryHint || "OTP sent via SMS."
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
  if (session.provider === "2factor" || session.provider === "msg91") {
    try {
      const response = await verifyOtp(phone, otp);
      if (response.success && response.data?.token && response.data?.user) {
        return response;
      }
    } catch {
      // User may have received Firebase OTP if SMS path fell back on send.
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

    throw new Error("Invalid or expired OTP. Please use the latest SMS code.");
  }

  const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
  const response = await verifyFirebaseOtp(phone, firebaseIdToken);
  if (!response.success || !response.data?.token || !response.data?.user) {
    throw new Error(response.message || "Invalid OTP");
  }
  return response;
};

import { sendOtp, verifyOtp, verifyFirebaseOtp, type SendOtpResponse } from "./auth.api.js";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth.js";
import type { UserRole } from "./types.js";

export const TEST_LOGIN_PHONE = "1010101010";
export const TEST_LOGIN_OTP = "000000";

export const isTestLoginPhone = (phone: string) => phone.replace(/\D/g, "") === TEST_LOGIN_PHONE;
export const isTestOtpLogin = (phone: string, otp: string) =>
  isTestLoginPhone(phone) && otp === TEST_LOGIN_OTP;

export type OtpAuthProvider = "2factor" | "firebase";

export type OtpSessionInfo = {
  provider: OtpAuthProvider;
  deliveryHint?: string;
};

const toErrorMessage = (error: unknown, fallback = "Failed to send OTP") => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && typeof (error as { message?: string }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
};

const normalizeSendOtpResponse = (raw: SendOtpResponse | Record<string, unknown>) => {
  if (typeof (raw as SendOtpResponse).success === "boolean") {
    const response = raw as SendOtpResponse;
    return { success: response.success, message: response.message || "", data: response.data ?? {} };
  }
  const inner = raw as SendOtpResponse["data"];
  if (inner?.provider || inner?.useFirebaseFallback || inner?.phone) {
    return { success: true, message: "OTP sent successfully", data: inner };
  }
  return { success: false, message: "Failed to send OTP", data: {} };
};

export const sendOtpWithFallback = async (phone: string, role: UserRole): Promise<OtpSessionInfo> => {
  const cleanedPhone = phone.replace(/\D/g, "");
  if (isTestLoginPhone(cleanedPhone)) {
    return { provider: "2factor", deliveryHint: `Use test OTP ${TEST_LOGIN_OTP} to continue.` };
  }

  try {
    const rawResponse = await sendOtp(phone, role);
    const response = normalizeSendOtpResponse(rawResponse as SendOtpResponse);
    const payload = response.data as NonNullable<SendOtpResponse["data"]> | Record<string, never>;

    if (response.success && payload.provider === "2factor") {
      return { provider: "2factor", deliveryHint: payload.deliveryHint || "OTP sent via SMS." };
    }

    if (response.success && (payload.provider === "memory" || payload.deliveryHint?.includes("test OTP"))) {
      return {
        provider: "2factor",
        deliveryHint: payload.deliveryHint || `Use test OTP ${TEST_LOGIN_OTP} to continue.`
      };
    }

    if (response.success && payload.useFirebaseFallback) {
      await sendFirebaseOtp(phone);
      return { provider: "firebase" };
    }

    throw new Error(response.message || "Failed to send OTP");
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
};

export const verifyOtpSession = async (
  phone: string,
  otp: string,
  role: UserRole,
  session: OtpSessionInfo
) => {
  if (isTestOtpLogin(phone, otp)) {
    const response = await verifyOtp(phone, otp, role);
    if (!response.success || !response.data?.token || !response.data?.user) {
      throw new Error(response.message || "Invalid or expired OTP");
    }
    return response;
  }

  if (session.provider === "2factor") {
    const response = await verifyOtp(phone, otp, role);
    if (!response.success || !response.data?.token || !response.data?.user) {
      throw new Error(response.message || "Invalid or expired OTP");
    }
    return response;
  }

  const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
  const response = await verifyFirebaseOtp(phone, firebaseIdToken, role);
  if (!response.success || !response.data?.token || !response.data?.user) {
    throw new Error(response.message || "Invalid OTP");
  }
  return response;
};

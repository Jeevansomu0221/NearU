import { sendOtp, verifyOtp, verifyFirebaseOtp, SendOtpResponse } from "../api/auth.api";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth";

export const TEST_LOGIN_PHONE = "1010101010";
export const TEST_LOGIN_OTP = "000000";

const DEFAULT_TEST_LOGIN_CREDENTIALS: Record<string, string> = {
  "1010101010": "000000",
  "1234567890": "123456"
};

const TEST_LOGIN_CREDENTIALS = (() => {
  const raw = process.env.EXPO_PUBLIC_TEST_LOGIN_CREDENTIALS;
  if (!raw) {
    return DEFAULT_TEST_LOGIN_CREDENTIALS;
  }
  try {
    return { ...DEFAULT_TEST_LOGIN_CREDENTIALS, ...(JSON.parse(raw) as Record<string, string>) };
  } catch {
    return DEFAULT_TEST_LOGIN_CREDENTIALS;
  }
})();

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

export const isTestLoginPhone = (phone: string) => normalizePhone(phone) in TEST_LOGIN_CREDENTIALS;
export const getTestLoginOtp = (phone: string) => TEST_LOGIN_CREDENTIALS[normalizePhone(phone)];
export const isTestOtpLogin = (phone: string, otp: string) => getTestLoginOtp(phone) === otp;

export type OtpAuthProvider = "2factor" | "firebase";

export type OtpSessionInfo = {
  provider: OtpAuthProvider;
  deliveryHint?: string;
};

type OtpDebugPayload = {
  traceId?: string;
  attempts?: Array<{ label: string; ok: boolean; detail: string }>;
  error?: string;
};

const logOtp = (step: string, detail?: unknown) => {
  console.log(`[OTP] ${step}`, detail ?? "");
};

const formatOtpDebug = (otpDebug?: OtpDebugPayload | null) => {
  if (!otpDebug?.attempts?.length) {
    return "";
  }

  const attempts = otpDebug.attempts.map((attempt) => `${attempt.label}=${attempt.ok ? "ok" : attempt.detail}`).join("; ");
  return `trace=${otpDebug.traceId || "n/a"} ${attempts}`;
};

const toErrorMessage = (error: unknown, fallback = "Failed to send OTP") => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && typeof (error as { message?: string }).message === "string") {
    return (error as { message: string }).message;
  }

  return fallback;
};

const normalizeSendOtpResponse = (raw: SendOtpResponse | Record<string, unknown>) => {
  if (typeof (raw as SendOtpResponse).success === "boolean") {
    const response = raw as SendOtpResponse;
    return {
      success: response.success,
      message: response.message || "",
      data: response.data ?? {}
    };
  }

  // Backward compatibility if inner payload was returned by mistake.
  const inner = raw as SendOtpResponse["data"];
  if (inner?.provider || inner?.useFirebaseFallback || inner?.phone) {
    return {
      success: true,
      message: "OTP sent successfully",
      data: inner
    };
  }

  return {
    success: false,
    message: "Failed to send OTP",
    data: {}
  };
};

export const sendOtpWithFallback = async (phone: string): Promise<OtpSessionInfo> => {
  const cleanedPhone = phone.replace(/\D/g, "");

  if (isTestLoginPhone(cleanedPhone)) {
    return {
      provider: "2factor",
      deliveryHint: `Use test OTP ${getTestLoginOtp(cleanedPhone)} to continue.`
    };
  }

  try {
    const rawResponse = await sendOtp(phone);
    const response = normalizeSendOtpResponse(rawResponse as SendOtpResponse);
    const payload = response.data;

    logOtp("backend-response", {
      success: response.success,
      provider: payload.provider,
      useFirebaseFallback: payload.useFirebaseFallback,
      fallbackReason: payload.fallbackReason,
      otpDebug: payload.otpDebug
    });

    if (response.success && payload.provider === "2factor") {
      return {
        provider: "2factor",
        deliveryHint: payload.deliveryHint || "OTP sent via SMS."
      };
    }

    if (response.success && (payload.provider === "memory" || payload.deliveryHint?.includes("test OTP"))) {
      return {
        provider: "2factor",
        deliveryHint: payload.deliveryHint || `Use test OTP ${TEST_LOGIN_OTP} to continue.`
      };
    }

    if (response.success && payload.useFirebaseFallback) {
      logOtp("firebase-fallback-start", payload.fallbackReason || formatOtpDebug(payload.otpDebug));
      try {
        await sendFirebaseOtp(phone);
        return { provider: "firebase" };
      } catch (firebaseError) {
        const debug = formatOtpDebug(payload.otpDebug);
        const reason = payload.fallbackReason || "2factor unavailable";
        throw new Error(
          `2factor failed (${reason}). Firebase backup failed: ${toErrorMessage(firebaseError)}${debug ? `. Debug: ${debug}` : ""}`
        );
      }
    }

    if (response.success) {
      return {
        provider: "2factor",
        deliveryHint: payload.deliveryHint || response.message || "OTP sent via SMS."
      };
    }

    const debug = formatOtpDebug(payload.otpDebug);
    throw new Error(`${response.message || "Failed to send OTP"}${debug ? `. Debug: ${debug}` : ""}`);
  } catch (error) {
    logOtp("send-failed", error);
    throw new Error(toErrorMessage(error));
  }
};

export const verifyOtpSession = async (phone: string, otp: string, session: OtpSessionInfo) => {
  if (isTestOtpLogin(phone, otp) || isTestLoginPhone(phone) || session.provider === "2factor") {
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

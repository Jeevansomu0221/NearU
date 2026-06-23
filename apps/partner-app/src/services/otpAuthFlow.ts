import { sendOtp, verifyOtp, verifyFirebaseOtp } from "../api/auth.api";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth";

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

const isRetryableNetworkError = (error: unknown) => {
  const message = toErrorMessage(error, "").toLowerCase();
  return (
    message.includes("network error") ||
    message.includes("timeout") ||
    message.includes("taking longer than usual")
  );
};

const withNetworkRetry = async <T>(action: () => Promise<T>, label: string) => {
  try {
    return await action();
  } catch (error) {
    if (!isRetryableNetworkError(error)) {
      throw error;
    }

    logOtp(`${label}-retry`, toErrorMessage(error));
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return action();
  }
};

export const sendOtpWithFallback = async (phone: string, role: string): Promise<OtpSessionInfo> => {
  try {
    const axiosResponse = await withNetworkRetry(() => sendOtp(phone, role), "send-otp");
    const body = axiosResponse.data;
    const payload = body?.data ?? {};

    logOtp("backend-response", {
      success: body?.success,
      provider: payload.provider,
      useFirebaseFallback: payload.useFirebaseFallback,
      fallbackReason: payload.fallbackReason,
      otpDebug: payload.otpDebug
    });

    if (body?.success && payload.provider === "2factor") {
      return {
        provider: "2factor",
        deliveryHint: payload.deliveryHint || "OTP sent via SMS."
      };
    }

    if (body?.success && payload.useFirebaseFallback) {
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

    const debug = formatOtpDebug(payload.otpDebug);
    throw new Error(`${body?.message || "Failed to send OTP"}${debug ? `. Debug: ${debug}` : ""}`);
  } catch (error) {
    logOtp("send-failed", error);
    throw new Error(toErrorMessage(error));
  }
};

export const verifyOtpSession = async (
  phone: string,
  otp: string,
  role: string,
  session: OtpSessionInfo
) => {
  if (session.provider === "2factor") {
    const payload = await withNetworkRetry(() => verifyOtp(phone, otp, role), "verify-otp");
    return {
      success: true,
      data: payload
    };
  }

  const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
  const payload = await withNetworkRetry(
    () => verifyFirebaseOtp(phone, firebaseIdToken, role),
    "verify-firebase-otp"
  );
  return {
    success: true,
    data: payload
  };
};

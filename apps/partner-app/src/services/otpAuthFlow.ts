import { sendOtp, verifyOtp, verifyFirebaseOtp } from "../api/auth.api";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth";

export const TEST_LOGIN_PHONE = "1010101010";
export const TEST_LOGIN_OTP = "000000";

/** Firebase Console → Authentication → Phone → numbers for testing (+91, no country code). */
const DEFAULT_FIREBASE_TEST_PHONES: Record<string, string> = {
  "9999900000": "123456",
  "9999900001": "123456",
  "2020202020": "000000",
  "3030303030": "000000"
};

const parseFirebaseTestPhones = (): Record<string, string> => {
  const raw = process.env.EXPO_PUBLIC_FIREBASE_TEST_PHONES;
  if (!raw) {
    return DEFAULT_FIREBASE_TEST_PHONES;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return { ...DEFAULT_FIREBASE_TEST_PHONES, ...parsed };
  } catch {
    return DEFAULT_FIREBASE_TEST_PHONES;
  }
};

const FIREBASE_TEST_PHONES = parseFirebaseTestPhones();

export const isTestLoginPhone = (phone: string) => phone.replace(/\D/g, "") === TEST_LOGIN_PHONE;
export const isTestOtpLogin = (phone: string, otp: string) =>
  isTestLoginPhone(phone) && otp === TEST_LOGIN_OTP;

export const isFirebaseTestPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned in FIREBASE_TEST_PHONES;
};

export const getFirebaseTestOtpHint = (phone: string) => {
  const cleaned = phone.replace(/\D/g, "");
  return FIREBASE_TEST_PHONES[cleaned] || "the Firebase test code";
};

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
  const cleanedPhone = phone.replace(/\D/g, "");

  if (isTestLoginPhone(cleanedPhone)) {
    return {
      provider: "2factor",
      deliveryHint: `Use test OTP ${TEST_LOGIN_OTP} to continue.`
    };
  }

  if (isFirebaseTestPhone(cleanedPhone)) {
    logOtp("firebase-test-phone", cleanedPhone);
    await sendFirebaseOtp(phone);
    return {
      provider: "firebase",
      deliveryHint: `Use test OTP ${getFirebaseTestOtpHint(cleanedPhone)} to continue.`
    };
  }

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

    if (body?.success && (payload.provider === "memory" || payload.deliveryHint?.includes("test OTP"))) {
      return {
        provider: "2factor",
        deliveryHint: payload.deliveryHint || `Use test OTP ${TEST_LOGIN_OTP} to continue.`
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

    if (body?.success) {
      return {
        provider: "2factor",
        deliveryHint: payload.deliveryHint || body.message || "OTP sent via SMS."
      };
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
  if (isTestOtpLogin(phone, otp)) {
    const payload = await withNetworkRetry(() => verifyOtp(phone, otp, role), "verify-otp");
    return {
      success: true,
      data: payload
    };
  }

  if (session.provider === "2factor" && !isFirebaseTestPhone(phone)) {
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

import { sendOtp, verifyOtp, verifyFirebaseOtp } from "../api/auth.api";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth";

export const TEST_LOGIN_PHONE = "1010101010";
export const TEST_LOGIN_OTP = "000000";

/** Soft backend OTP bypass (no SMS). Keep in sync with backend testLoginCredentials defaults. */
const DEFAULT_TEST_LOGIN_CREDENTIALS: Record<string, string> = {
  "1010101010": "000000",
  "1234567890": "123456"
};

/** Firebase Console → Authentication → Phone → numbers for testing (+91, no country code). */
const DEFAULT_FIREBASE_TEST_PHONES: Record<string, string> = {
  "1010101010": "000000",
  "1000010000": "000000",
  "1234567890": "123456",
  "9999900000": "123456",
  "9999900001": "123456",
  "2020202020": "000000",
  "2222222222": "222222",
  "3030303030": "000000",
  "3333333333": "333333",
  "4444444444": "444444",
  "5555555555": "555555",
  "6666666666": "666666",
  "7777777777": "777777"
};

const parseJsonPhoneMap = (raw: string | undefined, defaults: Record<string, string>) => {
  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
};

const TEST_LOGIN_CREDENTIALS = parseJsonPhoneMap(
  process.env.EXPO_PUBLIC_TEST_LOGIN_CREDENTIALS,
  DEFAULT_TEST_LOGIN_CREDENTIALS
);

const FIREBASE_TEST_PHONES = parseJsonPhoneMap(
  process.env.EXPO_PUBLIC_FIREBASE_TEST_PHONES,
  DEFAULT_FIREBASE_TEST_PHONES
);

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

export const isTestLoginPhone = (phone: string) => normalizePhone(phone) in TEST_LOGIN_CREDENTIALS;
export const getTestLoginOtp = (phone: string) => TEST_LOGIN_CREDENTIALS[normalizePhone(phone)];
export const isTestOtpLogin = (phone: string, otp: string) => getTestLoginOtp(phone) === otp;

export const isFirebaseTestPhone = (phone: string) => {
  const cleaned = normalizePhone(phone);
  return cleaned in FIREBASE_TEST_PHONES;
};

export const getFirebaseTestOtpHint = (phone: string) => {
  const cleaned = normalizePhone(phone);
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

export const sendOtpWithFallback = async (phone: string): Promise<OtpSessionInfo> => {
  const cleanedPhone = phone.replace(/\D/g, "");

  if (isTestLoginPhone(cleanedPhone)) {
    return {
      provider: "2factor",
      deliveryHint: `Use test OTP ${getTestLoginOtp(cleanedPhone)} to continue.`
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
    const response = await sendOtp(phone);
    const payload = response.data ?? {};

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
  if (isTestOtpLogin(phone, otp) || isTestLoginPhone(phone) || (session.provider === "2factor" && !isFirebaseTestPhone(phone))) {
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

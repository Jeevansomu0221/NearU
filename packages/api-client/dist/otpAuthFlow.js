import { sendOtp, verifyOtp, verifyFirebaseOtp } from "./auth.api.js";
import { sendFirebaseOtp, confirmFirebaseOtp } from "./firebasePhoneAuth.js";
export const TEST_LOGIN_PHONE = "1010101010";
export const TEST_LOGIN_OTP = "000000";
const DEFAULT_TEST_LOGIN_CREDENTIALS = {
    "1010101010": "000000",
    "1234567890": "123456"
};
const readEnv = (key) => {
    try {
        const viteEnv = import.meta.env;
        if (viteEnv) {
            const viteKey = key.replace(/^EXPO_PUBLIC_/, "VITE_");
            const fromVite = viteEnv[viteKey] || viteEnv[key];
            if (typeof fromVite === "string" && fromVite.trim())
                return fromVite.trim();
        }
    }
    catch {
        // Not a Vite bundle (e.g. React Native / Metro).
    }
    if (typeof process !== "undefined" && process.env?.[key]) {
        return process.env[key];
    }
    return undefined;
};
const TEST_LOGIN_CREDENTIALS = (() => {
    const raw = readEnv("EXPO_PUBLIC_TEST_LOGIN_CREDENTIALS");
    if (!raw) {
        return DEFAULT_TEST_LOGIN_CREDENTIALS;
    }
    try {
        return { ...DEFAULT_TEST_LOGIN_CREDENTIALS, ...JSON.parse(raw) };
    }
    catch {
        return DEFAULT_TEST_LOGIN_CREDENTIALS;
    }
})();
const normalizePhone = (phone) => phone.replace(/\D/g, "");
export const isTestLoginPhone = (phone) => normalizePhone(phone) in TEST_LOGIN_CREDENTIALS;
export const getTestLoginOtp = (phone) => TEST_LOGIN_CREDENTIALS[normalizePhone(phone)];
export const isTestOtpLogin = (phone, otp) => getTestLoginOtp(phone) === otp;
const toErrorMessage = (error, fallback = "Failed to send OTP") => {
    if (error instanceof Error && error.message)
        return error.message;
    if (error && typeof error === "object" && typeof error.message === "string") {
        return error.message;
    }
    return fallback;
};
const normalizeSendOtpResponse = (raw) => {
    if (typeof raw.success === "boolean") {
        const response = raw;
        return { success: response.success, message: response.message || "", data: response.data ?? {} };
    }
    const inner = raw;
    if (inner?.provider || inner?.useFirebaseFallback || inner?.phone) {
        return { success: true, message: "OTP sent successfully", data: inner };
    }
    return { success: false, message: "Failed to send OTP", data: {} };
};
export const sendOtpWithFallback = async (phone, role) => {
    const cleanedPhone = phone.replace(/\D/g, "");
    if (isTestLoginPhone(cleanedPhone)) {
        return { provider: "2factor", deliveryHint: `Use test OTP ${getTestLoginOtp(cleanedPhone)} to continue.` };
    }
    try {
        const rawResponse = await sendOtp(phone, role);
        const response = normalizeSendOtpResponse(rawResponse);
        const payload = response.data;
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
        if (response.success) {
            return {
                provider: "2factor",
                deliveryHint: payload.deliveryHint || response.message || "OTP sent via SMS."
            };
        }
        throw new Error(response.message || "Failed to send OTP");
    }
    catch (error) {
        throw new Error(toErrorMessage(error));
    }
};
export const verifyOtpSession = async (phone, otp, role, session) => {
    const cleanedPhone = normalizePhone(phone);
    const cleanedOtp = String(otp || "").trim();
    if (isTestOtpLogin(cleanedPhone, cleanedOtp) ||
        isTestLoginPhone(cleanedPhone) ||
        session.provider === "2factor") {
        const response = await verifyOtp(cleanedPhone, cleanedOtp, role);
        if (!response.success || !response.data?.token || !response.data?.user) {
            throw new Error(response.message || "Invalid or expired OTP");
        }
        return response;
    }
    const firebaseIdToken = await confirmFirebaseOtp(cleanedOtp, cleanedPhone);
    const response = await verifyFirebaseOtp(cleanedPhone, firebaseIdToken, role);
    if (!response.success || !response.data?.token || !response.data?.user) {
        throw new Error(response.message || "Invalid OTP");
    }
    return response;
};

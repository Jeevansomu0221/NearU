import { initializeApp, getApps } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
let firebaseApp = null;
let firebaseAuth = null;
let confirmationResult = null;
let confirmationPhone = "";
let recaptchaVerifier = null;
const normalizeIndianPhone = (phone) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length > 10 ? digits.slice(-10) : digits;
};
const getFirebaseConfig = () => {
    const env = (typeof import.meta !== "undefined" && import.meta.env) || {};
    return {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID || "vyaha-a24a7",
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.VITE_FIREBASE_APP_ID
    };
};
const ensureFirebase = () => {
    if (firebaseAuth) {
        return firebaseAuth;
    }
    const config = getFirebaseConfig();
    if (!config.apiKey) {
        throw new Error("Firebase is not configured for web OTP fallback.");
    }
    firebaseApp = getApps().length ? getApps()[0] : initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);
    return firebaseAuth;
};
export const clearFirebaseOtpSession = () => {
    confirmationResult = null;
    confirmationPhone = "";
    if (recaptchaVerifier) {
        try {
            recaptchaVerifier.clear();
        }
        catch {
            // ignore
        }
        recaptchaVerifier = null;
    }
};
const ensureRecaptcha = (containerId = "vyaha-recaptcha") => {
    const auth = ensureFirebase();
    if (!recaptchaVerifier) {
        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement("div");
            container.id = containerId;
            container.style.display = "none";
            document.body.appendChild(container);
        }
        recaptchaVerifier = new RecaptchaVerifier(auth, container, { size: "invisible" });
    }
    return recaptchaVerifier;
};
export const sendFirebaseOtp = async (phone) => {
    const cleanedPhone = normalizeIndianPhone(phone);
    clearFirebaseOtpSession();
    const auth = ensureFirebase();
    const verifier = ensureRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, `+91${cleanedPhone}`, verifier);
    confirmationPhone = cleanedPhone;
};
export const confirmFirebaseOtp = async (otp, phone) => {
    const cleanedPhone = phone ? normalizeIndianPhone(phone) : confirmationPhone;
    if (!confirmationResult) {
        throw new Error("Please request a new OTP and try again.");
    }
    if (confirmationPhone && cleanedPhone && confirmationPhone !== cleanedPhone) {
        clearFirebaseOtpSession();
        throw new Error("Please request a new OTP for this phone number and try again.");
    }
    const credential = await confirmationResult.confirm(otp);
    if (!credential.user) {
        throw new Error("We could not verify this OTP. Please try again.");
    }
    clearFirebaseOtpSession();
    return credential.user.getIdToken(true);
};

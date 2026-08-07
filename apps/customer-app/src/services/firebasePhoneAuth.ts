import {
  FirebaseAuthTypes,
  getAuth,
  getIdToken,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signOut
} from "@react-native-firebase/auth";

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;
let confirmationPhone = "";

const normalizeIndianPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

export const clearFirebaseOtpSession = () => {
  confirmationResult = null;
  confirmationPhone = "";
};

export const isFirebaseOtpSessionExpiredError = (error: any) => {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  return (
    code.includes("session-expired") ||
    message.includes("expired") ||
    message.includes("sms code has expired") ||
    message.includes("sms code has been expired") ||
    message.includes("verification code has expired")
  );
};

export const isFirebaseInvalidOtpError = (error: any) => {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  return (
    code.includes("invalid-verification-code") ||
    message.includes("invalid verification code") ||
    (message.includes("invalid") && message.includes("code"))
  );
};

const getIdTokenForVerifiedPhoneUser = async (
  user: FirebaseAuthTypes.User | null,
  phone?: string
) => {
  if (!user) {
    return null;
  }

  const userPhone = normalizeIndianPhone(user.phoneNumber || "");
  const expectedPhone = phone ? normalizeIndianPhone(phone) : confirmationPhone;

  if (!userPhone || (expectedPhone && userPhone !== expectedPhone)) {
    return null;
  }

  return getIdToken(user, true);
};

export const getFirebaseVerifiedPhoneIdToken = async (phone?: string) => {
  return getIdTokenForVerifiedPhoneUser(getAuth().currentUser, phone);
};

export const waitForFirebaseVerifiedPhoneIdToken = async (phone?: string, timeoutMs = 3000) => {
  const existingToken = await getFirebaseVerifiedPhoneIdToken(phone);
  if (existingToken) {
    return existingToken;
  }

  return new Promise<string | null>((resolve) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;

    const finish = (idToken: string | null) => {
      if (settled) {
        return;
      }

      settled = true;
      unsubscribe?.();
      clearTimeout(timeout);
      resolve(idToken);
    };

    const timeout = setTimeout(() => finish(null), timeoutMs);
    unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
      try {
        const idToken = await getIdTokenForVerifiedPhoneUser(user, phone);
        if (idToken) {
          finish(idToken);
        }
      } catch {
        finish(null);
      }
    });
  });
};

export const sendFirebaseOtp = async (phone: string) => {
  const cleanedPhone = normalizeIndianPhone(phone);
  const auth = getAuth();

  clearFirebaseOtpSession();
  if (auth.currentUser) {
    await signOut(auth);
  }

  // Native RNFirebase accepts forceResend as the third argument.
  confirmationResult = await signInWithPhoneNumber(auth, `+91${cleanedPhone}`, true as any);
  confirmationPhone = cleanedPhone;
};

export const confirmFirebaseOtp = async (otp: string, phone?: string) => {
  const cleanedPhone = phone ? normalizeIndianPhone(phone) : confirmationPhone;

  if (!confirmationResult) {
    const idToken = await waitForFirebaseVerifiedPhoneIdToken(cleanedPhone);
    if (idToken) {
      clearFirebaseOtpSession();
      return idToken;
    }

    throw new Error("Please request a new OTP and try again.");
  }

  if (confirmationPhone && cleanedPhone && confirmationPhone !== cleanedPhone) {
    clearFirebaseOtpSession();
    throw new Error("Please request a new OTP for this phone number and try again.");
  }

  try {
    const autoVerifiedToken = await getFirebaseVerifiedPhoneIdToken(cleanedPhone);
    if (autoVerifiedToken) {
      clearFirebaseOtpSession();
      return autoVerifiedToken;
    }

    const userCredential = await confirmationResult.confirm(otp);
    if (!userCredential?.user) {
      throw new Error("We could not verify this OTP. Please try again.");
    }

    clearFirebaseOtpSession();
    return getIdToken(userCredential.user, true);
  } catch (error) {
    if (isFirebaseOtpSessionExpiredError(error) || isFirebaseInvalidOtpError(error)) {
      const idToken = await waitForFirebaseVerifiedPhoneIdToken(cleanedPhone);
      if (idToken) {
        clearFirebaseOtpSession();
        return idToken;
      }

      clearFirebaseOtpSession();
    }
    throw error;
  }
};

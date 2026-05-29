import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

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
    message.includes("sms code has expired") ||
    message.includes("verification code has expired")
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

  return user.getIdToken(true);
};

export const sendFirebaseOtp = async (phone: string) => {
  const cleanedPhone = normalizeIndianPhone(phone);

  clearFirebaseOtpSession();
  if (auth().currentUser) {
    await auth().signOut();
  }

  confirmationResult = await auth().signInWithPhoneNumber(`+91${cleanedPhone}`);
  confirmationPhone = cleanedPhone;
};

export const confirmFirebaseOtp = async (otp: string, phone?: string) => {
  if (!confirmationResult) {
    throw new Error("Please request a new OTP and try again.");
  }

  const cleanedPhone = phone ? normalizeIndianPhone(phone) : confirmationPhone;
  if (confirmationPhone && cleanedPhone && confirmationPhone !== cleanedPhone) {
    clearFirebaseOtpSession();
    throw new Error("Please request a new OTP for this phone number and try again.");
  }

  try {
    const userCredential = await confirmationResult.confirm(otp);
    if (!userCredential?.user) {
      throw new Error("We could not verify this OTP. Please try again.");
    }

    clearFirebaseOtpSession();
    return userCredential.user.getIdToken(true);
  } catch (error) {
    if (isFirebaseOtpSessionExpiredError(error)) {
      const idToken = await getIdTokenForVerifiedPhoneUser(auth().currentUser, cleanedPhone);
      if (idToken) {
        clearFirebaseOtpSession();
        return idToken;
      }

      clearFirebaseOtpSession();
    }
    throw error;
  }
};

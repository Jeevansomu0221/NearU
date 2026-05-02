import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

export const sendFirebaseOtp = async (phone: string) => {
  confirmationResult = await auth().signInWithPhoneNumber(`+91${phone}`);
};

export const confirmFirebaseOtp = async (otp: string) => {
  if (!confirmationResult) {
    throw new Error("Please request a new OTP and try again.");
  }

  const userCredential = await confirmationResult.confirm(otp);
  if (!userCredential?.user) {
    throw new Error("Firebase could not verify this OTP.");
  }

  return userCredential.user.getIdToken(true);
};

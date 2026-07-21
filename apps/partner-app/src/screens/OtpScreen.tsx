import React, { useState } from "react";
import {
  Text,
  TextInput,
  Button,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet
} from "react-native";
import { verifyFirebaseOtp } from "../api/auth.api";
import {
  clearFirebaseOtpSession,
  confirmFirebaseOtp,
  isFirebaseOtpSessionExpiredError
} from "../services/firebasePhoneAuth";
import { resolveStartupDeletionRequest } from "../api/accountDeletion.api";
import { androidKeyboardPadding, useKeyboardBottomInset } from "../hooks/useKeyboardBottomInset";

export default function OtpScreen({ route, navigation }: any) {
  const { phone, role } = route.params;
  const [otp, setOtp] = useState("");
  const keyboardHeight = useKeyboardBottomInset();

  const extractServerMessage = (error: any): string => {
    const data = error?.response?.data;
    if (data && typeof data === "object" && typeof data.message === "string") {
      return data.message;
    }
    if (typeof data === "string") {
      return data;
    }
    return "";
  };

  const getRawErrorDetail = (error: any): string => {
    const parts: string[] = [];
    if (error?.code) parts.push(`code=${error.code}`);
    const serverMessage = extractServerMessage(error);
    if (serverMessage) parts.push(`server=${serverMessage}`);
    if (error?.message) parts.push(`msg=${error.message}`);
    if (error?.response?.status) parts.push(`http=${error.response.status}`);
    return parts.join(" | ");
  };

  const getOtpErrorMessage = (error: any) => {
    const code = String(error?.code || "").toLowerCase();
    const serverMessage = extractServerMessage(error).toLowerCase();
    const message = `${String(error?.message || "")} ${serverMessage}`.toLowerCase();

    if (__DEV__) {
      console.log("[OTP][partner] verify failure detail:", getRawErrorDetail(error));
    }

    if (code.includes("invalid-verification-code") || message.includes("invalid")) {
      return "That code does not look right. Please check the SMS and try again.";
    }

    if (code.includes("session-expired") || message.includes("expired")) {
      return "This OTP expired. Please request a fresh OTP and use only the newest SMS code.";
    }

    if (message.includes("aud") || message.includes("audience") || message.includes("decoding firebase")) {
      return "Sign-in is misconfigured (Firebase project mismatch). Please update the app to the latest version.";
    }

    if (message.includes("did not match this phone")) {
      return "This code was verified for a different number. Please request a fresh OTP and try again.";
    }

    const userSafeServerMessage = extractServerMessage(error);
    if (userSafeServerMessage && !userSafeServerMessage.toLowerCase().includes("firebase id token")) {
      return userSafeServerMessage;
    }

    const detail = getRawErrorDetail(error);
    const base = "We could not verify this code. Please try again.";
    return __DEV__ && detail ? `${base}\n\n[debug] ${detail}` : base;
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert("Error", "Enter valid OTP");
      return;
    }

    try {
      const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
      await verifyFirebaseOtp(phone, firebaseIdToken, role);

      // Check for pending/approved deletion before navigating to main app
      try {
        const deletionRequest = await resolveStartupDeletionRequest();
        if (deletionRequest) {
          navigation.replace("AccountDeletionReview", { initialRequest: deletionRequest });
          return;
        }
      } catch {
        // Ignore — go to normal flow if check fails
      }

      navigation.replace("Orders");
    } catch (err: any) {
      if (isFirebaseOtpSessionExpiredError(err)) {
        clearFirebaseOtpSession();
        setOtp("");
        Alert.alert("OTP Expired", "Please request a fresh OTP and use only the newest SMS code.");
      } else {
        Alert.alert("Error", getOtpErrorMessage(err));
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 40 + androidKeyboardPadding(keyboardHeight) }
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bounces={false}
      >
        <Text style={styles.title}>OTP sent to {phone}</Text>
        <TextInput
          placeholder="Enter OTP"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
          maxLength={6}
          style={styles.input}
        />
        <Button title="Verify OTP" onPress={handleVerify} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flexGrow: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 18, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 20,
    textAlign: "center",
    borderRadius: 6
  }
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyFirebaseOtp } from "../api/auth.api";
import { getDeliveryProfile } from "../api/profile.api";
import { resolveDeliveryRoute } from "../utils/deliveryStatus";
import {
  clearFirebaseOtpSession,
  confirmFirebaseOtp,
  isFirebaseOtpSessionExpiredError,
  sendFirebaseOtp
} from "../services/firebasePhoneAuth";
import { registerForPushNotifications } from "../services/notifications";
import { requestRiderLocationPermission } from "../utils/riderLocation";

export default function OtpScreen({ route, navigation }: any) {
  const { phone } = route.params;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [requiresFreshOtp, setRequiresFreshOtp] = useState(false);

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
    // The delivery API layer forwards backend failures as error.message, while
    // Firebase errors expose error.code; check both plus any nested server body.
    const serverMessage = extractServerMessage(error).toLowerCase();
    const message = `${String(error?.message || "")} ${serverMessage}`.toLowerCase();

    if (__DEV__) {
      console.log("[OTP][delivery] verify failure detail:", getRawErrorDetail(error));
    }

    if (code.includes("invalid-verification-code") || message.includes("invalid")) {
      return "That code does not look right. Please check the SMS and try again.";
    }

    if (code.includes("session-expired") || message.includes("expired")) {
      return "This SMS code has expired. Please resend OTP and use the newest code.";
    }

    if (message.includes("aud") || message.includes("audience") || message.includes("decoding firebase")) {
      return "Sign-in is misconfigured (Firebase project mismatch). Please update the app to the latest version.";
    }

    if (message.includes("did not match this phone")) {
      return "This code was verified for a different number. Please resend OTP and try again.";
    }

    const userSafeServerMessage = extractServerMessage(error) || String(error?.message || "");
    if (userSafeServerMessage && !userSafeServerMessage.toLowerCase().includes("firebase id token")) {
      return userSafeServerMessage;
    }

    const detail = getRawErrorDetail(error);
    const base = "We could not verify this code. Please try again or resend OTP.";
    return __DEV__ && detail ? `${base}\n\n[debug] ${detail}` : base;
  };

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const onVerify = async () => {
    if (requiresFreshOtp) {
      Alert.alert("Fresh OTP Required", "Please resend OTP and use the newest SMS code.");
      return;
    }

    if (otp.length !== 6) {
      Alert.alert("Error", "Please enter 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
      const response = await verifyFirebaseOtp(phone, firebaseIdToken);

      if (!response.success || !response.data?.token || !response.data?.user) {
        Alert.alert("Error", getOtpErrorMessage(response.message ? response : { message: "Invalid OTP" }));
        return;
      }

      await AsyncStorage.multiSet([
        ["token", response.data.token],
        ["refreshToken", response.data.refreshToken || ""],
        ["user", JSON.stringify(response.data.user)]
      ]);

      const notificationRegistration = registerForPushNotifications().catch((error) => {
        console.log("Failed to register push notifications:", error);
      });

      const profileResponse = await getDeliveryProfile();
      const nextRoute =
        profileResponse.success && profileResponse.data
          ? resolveDeliveryRoute(profileResponse.data)
          : "CompleteProfile";

      if (nextRoute === "Main") {
        await notificationRegistration;
        await requestRiderLocationPermission({ showDeniedAlert: true });
      }

      navigation.reset({
        index: 0,
        routes: [{ name: nextRoute }],
      });
    } catch (error: any) {
      if (isFirebaseOtpSessionExpiredError(error)) {
        clearFirebaseOtpSession();
        setOtp("");
        setRequiresFreshOtp(true);
        setCanResend(true);
        setTimer(0);
        Alert.alert("OTP Expired", "Please resend OTP and use only the newest SMS code.");
      } else {
        Alert.alert("Error", getOtpErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!canResend) return;
    try {
      setLoading(true);
      setTimer(60);
      setCanResend(false);
      setOtp("");
      setRequiresFreshOtp(false);
      await sendFirebaseOtp(phone);
    } catch {
      Alert.alert("Error", "Could not resend OTP right now. Please wait a moment and try again.");
      setCanResend(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to{"\n"}
        <Text style={styles.phoneText}>+91 {phone}</Text>
      </Text>

      <View style={styles.otpContainer}>
        <TextInput
          placeholder="000000"
          keyboardType="number-pad"
          value={otp}
          onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
          style={styles.otpInput}
          maxLength={6}
          autoFocus
          editable={!loading && !requiresFreshOtp}
        />
        <Text style={styles.otpHint}>Enter 6-digit OTP</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Verifying OTP...</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.button, (otp.length !== 6 || requiresFreshOtp) && styles.buttonDisabled]}
          onPress={onVerify}
          disabled={otp.length !== 6 || loading || requiresFreshOtp}
        >
          <Text style={styles.buttonText}>Verify OTP</Text>
        </TouchableOpacity>
      )}

      <View style={styles.resendContainer}>
        <Text style={styles.timerText}>
          {canResend ? "Didn't receive code?" : `Resend OTP in ${timer}s`}
        </Text>
        <TouchableOpacity onPress={onResend} disabled={!canResend || loading}>
          <Text style={[styles.resendText, canResend && styles.resendTextActive]}>Resend OTP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: "bold", color: "#333", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 40, textAlign: "center", lineHeight: 24 },
  phoneText: { fontWeight: "bold", color: "#333" },
  otpContainer: { marginBottom: 30 },
  otpInput: { fontSize: 32, textAlign: "center", letterSpacing: 8, backgroundColor: "white", padding: 16, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", color: "#333", fontWeight: "bold" },
  otpHint: { fontSize: 12, color: "#999", textAlign: "center", marginTop: 8 },
  loadingContainer: { alignItems: "center", marginTop: 20 },
  loadingText: { fontSize: 16, color: "#666", marginTop: 12 },
  button: { backgroundColor: "#4CAF50", paddingVertical: 16, borderRadius: 8, alignItems: "center", marginTop: 10 },
  buttonDisabled: { backgroundColor: "#A5D6A7", opacity: 0.7 },
  buttonText: { color: "white", fontSize: 18, fontWeight: "600" },
  resendContainer: { alignItems: "center", marginTop: 30, gap: 8 },
  timerText: { fontSize: 14, color: "#666" },
  resendText: { fontSize: 16, color: "#999", fontWeight: "500" },
  resendTextActive: { color: "#4CAF50", fontWeight: "600" }
});

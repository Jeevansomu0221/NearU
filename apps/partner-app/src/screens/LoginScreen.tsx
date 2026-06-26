import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Linking,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api, { warmApi } from "../api/client";
import { storeAuthData } from "../utils/storage";
import {
  clearFirebaseOtpSession,
  isFirebaseOtpSessionExpiredError
} from "../services/firebasePhoneAuth";
import { sendOtpWithFallback, verifyOtpSession, OtpSessionInfo } from "../services/otpAuthFlow";
import { registerForPushNotifications } from "../services/notifications";
import { partnerTheme } from "../theme";
import { buildLegalUrl } from "../constants/legal";

const TERMS_URL = buildLegalUrl("terms");
const PRIVACY_URL = buildLegalUrl("privacy");

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [otpSession, setOtpSession] = useState<OtpSessionInfo>({ provider: "firebase" });
  const lastSubmittedOtp = useRef("");
  const insets = useSafeAreaInsets();

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
    // Backend errors surface the real reason in error.response.data.message,
    // not error.message (which is just "Request failed with status code 500").
    const serverMessage = extractServerMessage(error).toLowerCase();
    const message = `${String(error?.message || "")} ${serverMessage}`.toLowerCase();

    if (__DEV__) {
      console.log("[OTP][partner] verify failure detail:", getRawErrorDetail(error));
    }

    if (code.includes("too-many-requests") || message.includes("too many")) {
      return "Too many OTP requests. Please wait a few minutes and try again.";
    }

    if (
      message.includes("network error") ||
      message.includes("taking longer than usual") ||
      message.includes("timeout")
    ) {
      return "Cannot reach server. Please check your internet and try again.";
    }

    if (code.includes("invalid-verification-code") || message.includes("invalid or expired otp")) {
      return "That code does not look right. Please check the SMS and try again.";
    }

    if (code.includes("session-expired") || message.includes("expired")) {
      return "This OTP expired. Tap Resend OTP and use only the newest SMS code.";
    }

    if (message.includes("aud") || message.includes("audience") || message.includes("decoding firebase")) {
      return "Sign-in is misconfigured (Firebase project mismatch). Please update the app to the latest version.";
    }

    if (message.includes("did not match this phone")) {
      return "This code was verified for a different number. Tap Resend OTP and try again.";
    }

    const userSafeServerMessage = extractServerMessage(error);
    if (userSafeServerMessage && !userSafeServerMessage.toLowerCase().includes("firebase id token")) {
      return userSafeServerMessage;
    }

    const detail = getRawErrorDetail(error);
    const base = "We could not verify this code. Please try again or resend OTP.";
    return __DEV__ && detail ? `${base}\n\n[debug] ${detail}` : base;
  };

  const handleSendOtp = async () => {
    const cleanedPhone = phone.replace(/\D/g, "");

    if (cleanedPhone.length !== 10) {
      setFeedback({ type: "error", text: "Enter a valid 10-digit phone number." });
      return;
    }

    try {
      setLoading(true);
      setFeedback(null);
      setPhone(cleanedPhone);
      setOtp("");
      lastSubmittedOtp.current = "";

      void warmApi();
      const session = await sendOtpWithFallback(cleanedPhone, "partner");
      setOtpSession(session);

      setStep("otp");
      setFeedback({
        type: "success",
        text: session.deliveryHint || "OTP sent. Enter the code below."
      });
    } catch (error: any) {
      console.error("Send OTP error:", error);
      setFeedback({ type: "error", text: getOtpErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const checkPartnerStatus = async () => {
    try {
      const res = await api.get("/partners/my-status");
      const responseData = res.data as { success: boolean; data?: any; message?: string };

      if (!responseData.success || !responseData.data) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }]
        });
        return;
      }

      const partner = responseData.data;
      if (partner.status === "PENDING") {
        navigation.reset({
          index: 0,
          routes: [{ name: "PendingApproval" }]
        });
      } else if (partner.status === "APPROVED") {
        navigation.reset({
          index: 0,
          routes: [{ name: "Dashboard" }]
        });
      } else if (partner.status === "REJECTED") {
        navigation.reset({
          index: 0,
          routes: [{ name: "Rejected" }]
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }]
        });
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }]
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }]
        });
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (loading || lastSubmittedOtp.current === otp) {
      return;
    }

    if (otp.length !== 6) {
      setFeedback({ type: "error", text: "Enter the 6-digit OTP." });
      return;
    }

    try {
      setLoading(true);
      setFeedback(null);
      lastSubmittedOtp.current = otp;

      const data = await verifyOtpSession(phone, otp, "partner", otpSession);
      const payload = data.data;

      if (!data.success || !payload?.token || !payload.user) {
        throw new Error(data.message || "Invalid response from server");
      }

      await storeAuthData({
        token: payload.token,
        refreshToken: payload.refreshToken,
        phone,
        userId: payload.user.id,
        partnerId: payload.user.partnerId,
        user: payload.user
      });

      registerForPushNotifications().catch((error) => {
        console.log("Failed to register push notifications:", error);
      });

      await checkPartnerStatus();
    } catch (error: any) {
      if (otpSession.provider === "firebase" && isFirebaseOtpSessionExpiredError(error)) {
        clearFirebaseOtpSession();
        setOtp("");
        setFeedback({
          type: "error",
          text: "This OTP expired. Tap Resend OTP and use only the newest SMS code."
        });
        return;
      }
      console.error("OTP verification error:", error);
      lastSubmittedOtp.current = "";
      setFeedback({ type: "error", text: getOtpErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Image
            source={require("../../assets/vyaha-partner-text-logo.png")}
            style={styles.brandImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{step === "phone" ? "Partner login" : "Verify OTP"}</Text>
          <Text style={styles.cardHint}>
            {step === "phone" ? "Register now or continue with the phone number linked to your shop." : `We sent an OTP to ${phone}.`}
          </Text>

          {feedback ? (
            <View style={[styles.feedbackCard, feedback.type === "success" ? styles.feedbackSuccess : styles.feedbackError]}>
              <Text style={[styles.feedbackText, feedback.type === "success" ? styles.feedbackSuccessText : styles.feedbackErrorText]}>
                {feedback.text}
              </Text>
            </View>
          ) : null}

          {step === "phone" ? (
            <>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="#98A2B3"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(value) => {
                  setPhone(value.replace(/\D/g, ""));
                  if (feedback) setFeedback(null);
                }}
                maxLength={10}
              />

              <TouchableOpacity style={styles.primaryButton} onPress={handleSendOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Send OTP</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>One-time password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit OTP"
                placeholderTextColor="#98A2B3"
                keyboardType="number-pad"
                value={otp}
                onChangeText={(value) => {
                  const numbers = value.replace(/\D/g, "");
                  setOtp(numbers);
                  if (feedback?.type === "error") setFeedback(null);
                  if (numbers.length < 6) lastSubmittedOtp.current = "";
                }}
                maxLength={6}
              />

              <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Verify and Continue</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={handleSendOtp} disabled={loading}>
                <Text style={styles.secondaryButtonText}>Resend OTP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setStep("phone");
                  setFeedback(null);
                }}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Change phone number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{" "}
            <Text style={styles.footerLink} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Service</Text>
            {" "}and{" "}
            <Text style={styles.footerLink} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: partnerTheme.colors.background
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    flexGrow: 1,
    justifyContent: "center"
  },
  headerContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 20
  },
  brandImage: {
    width: 240,
    height: 120
  },
  card: {
    backgroundColor: partnerTheme.colors.card,
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    shadowColor: partnerTheme.colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
    marginTop: -6
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: partnerTheme.colors.primaryDark,
    marginBottom: 6
  },
  cardHint: {
    fontSize: 14,
    lineHeight: 20,
    color: partnerTheme.colors.muted,
    marginBottom: 18
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: partnerTheme.colors.mutedDark,
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: partnerTheme.colors.text,
    backgroundColor: partnerTheme.colors.surface,
    marginBottom: 16
  },
  feedbackCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14
  },
  feedbackSuccess: {
    backgroundColor: partnerTheme.colors.successSoft,
    borderWidth: 1,
    borderColor: "#CDE8D4"
  },
  feedbackError: {
    backgroundColor: partnerTheme.colors.dangerSoft,
    borderWidth: 1,
    borderColor: "#F4C7C3"
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  feedbackSuccessText: {
    color: "#216E39"
  },
  feedbackErrorText: {
    color: partnerTheme.colors.danger
  },
  primaryButton: {
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 14
  },
  secondaryButtonText: {
    color: partnerTheme.colors.primary,
    fontSize: 14,
    fontWeight: "700"
  },
  footer: {
    marginTop: 20,
    paddingHorizontal: 20
  },
  footerText: {
    fontSize: 12,
    color: partnerTheme.colors.muted,
    textAlign: "center",
    lineHeight: 18
  },
  footerLink: {
    color: partnerTheme.colors.primary,
    fontWeight: "700"
  }
});

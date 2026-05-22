import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";
import { confirmFirebaseOtp, sendFirebaseOtp } from "../services/firebasePhoneAuth";

const TEST_LOGIN_PHONE = "1010101010";
const TEST_LOGIN_OTP = "000000";

interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    refreshToken?: string;
    user: {
      id: string;
      phone: string;
      name: string;
      role: string;
      partnerId?: string;
    };
  };
  message?: string;
}

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const lastSubmittedOtp = useRef("");
  const insets = useSafeAreaInsets();

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

      await sendFirebaseOtp(cleanedPhone);

      setStep("otp");
      setFeedback({
        type: "success",
        text: cleanedPhone === TEST_LOGIN_PHONE ? "Use test OTP 000000 to continue." : "OTP sent. Enter the code below."
      });
    } catch (error: any) {
      console.error("Send OTP error:", error);
      setFeedback({ type: "error", text: error.response?.data?.message || "Failed to send OTP." });
    } finally {
      setLoading(false);
    }
  };

  const checkPartnerStatus = async (phoneNumber: string) => {
    try {
      const res = await api.get(`/partners/status/${phoneNumber}`);
      const responseData = res.data as { success: boolean; data?: any };

      if (!responseData.success) {
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

      let verificationPayload: { phone: string; role: string; firebaseIdToken?: string; otp?: string };
      try {
        verificationPayload = {
          phone,
          firebaseIdToken: await confirmFirebaseOtp(otp),
          role: "partner"
        };
      } catch (firebaseError) {
        if (phone !== TEST_LOGIN_PHONE || otp !== TEST_LOGIN_OTP) {
          throw firebaseError;
        }

        verificationPayload = { phone, otp, role: "partner" };
      }

      const res = await api.post("/auth/verify-otp", verificationPayload);

      const data = res.data as AuthResponse;
      const payload = data.data;

      if (!data.success || !payload?.token || !payload.user) {
        throw new Error(data.message || "Invalid response from server");
      }

      await AsyncStorage.setItem("token", payload.token);
      await AsyncStorage.setItem("phone", phone);
      await AsyncStorage.setItem("userId", payload.user.id);
      await AsyncStorage.setItem("user", JSON.stringify(payload.user));
      if (payload.user.partnerId) {
        await AsyncStorage.setItem("partnerId", payload.user.partnerId);
      } else {
        await AsyncStorage.removeItem("partnerId");
      }
      if (payload.refreshToken) {
        await AsyncStorage.setItem("refreshToken", payload.refreshToken);
      } else {
        await AsyncStorage.removeItem("refreshToken");
      }

      await checkPartnerStatus(phone);
    } catch (error: any) {
      console.error("OTP verification error:", error);
      lastSubmittedOtp.current = "";
      setFeedback({ type: "error", text: error.response?.data?.message || "Invalid OTP. Please try again." });
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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.brand}>Vyaha Partner</Text>
          <Text style={styles.title}>No extra commission. Genuine pricing for your customers.</Text>
          <Text style={styles.subtitle}>
            Register now, upload documents once, and start receiving trusted local orders after approval.
          </Text>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8FF"
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    flexGrow: 1,
    justifyContent: "center"
  },
  hero: {
    marginBottom: 42,
    backgroundColor: "#2F80ED",
    borderRadius: 28,
    padding: 22
  },
  brand: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#DDEBFF",
    marginBottom: 12
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#EAF3FF"
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    shadowColor: "#143A66",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#143A66",
    marginBottom: 6
  },
  cardHint: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5E7897",
    marginBottom: 18
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#486887",
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "#CFE0F5",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#123456",
    backgroundColor: "#F9FCFF",
    marginBottom: 16
  },
  feedbackCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14
  },
  feedbackSuccess: {
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#CDE8D4"
  },
  feedbackError: {
    backgroundColor: "#FDECEC",
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
    color: "#B42318"
  },
  primaryButton: {
    backgroundColor: "#2F80ED",
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
    color: "#2F80ED",
    fontSize: 14,
    fontWeight: "700"
  }
});

import React, { useState } from "react";
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

interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    phone: string;
    name: string;
    role: string;
  };
}

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const insets = useSafeAreaInsets();

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      setFeedback({ type: "error", text: "Enter a valid 10-digit phone number." });
      return;
    }

    try {
      setLoading(true);
      setFeedback(null);
      await api.post("/auth/send-otp", { phone, role: "partner" });
      setStep("otp");
      setFeedback({ type: "success", text: "OTP sent. Enter the code below. Use 111111 for testing." });
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
        navigation.replace("Onboarding");
        return;
      }

      const partner = responseData.data;
      if (partner.status === "PENDING") {
        navigation.replace("PendingApproval");
      } else if (partner.status === "APPROVED") {
        if (partner.menuItemsCount === 0) {
          navigation.replace("WelcomeApproved");
        } else {
          navigation.replace("Dashboard");
        }
      } else if (partner.status === "REJECTED") {
        navigation.replace("Rejected");
      } else {
        navigation.replace("Onboarding");
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        navigation.replace("Onboarding");
      } else {
        navigation.replace("Onboarding");
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setFeedback({ type: "error", text: "Enter the 6-digit OTP." });
      return;
    }

    try {
      setLoading(true);
      setFeedback(null);
      const res = await api.post("/auth/verify-otp", {
        phone,
        otp,
        role: "partner"
      });

      const data = res.data as AuthResponse;

      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("phone", phone);
      await AsyncStorage.setItem("userId", data.user.id);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));

      await checkPartnerStatus(phone);
    } catch (error: any) {
      console.error("OTP verification error:", error);
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{step === "phone" ? "Partner login" : "Verify OTP"}</Text>
          <Text style={styles.cardHint}>
            {step === "phone" ? "Enter the phone number linked to your shop account." : `We sent an OTP to ${phone}.`}
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
                  setPhone(value);
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
                  setOtp(value);
                  if (feedback?.type === "error") setFeedback(null);
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

        <View style={styles.hero}>
          <Text style={styles.brand}>NearU Partner</Text>
          <Text style={styles.title}>Run your shop with a cleaner, faster partner app</Text>
          <Text style={styles.subtitle}>
            Manage orders, menu items, and shop timings in one place.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F3EE"
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    flexGrow: 1
  },
  hero: {
    marginTop: 10,
    backgroundColor: "#FF6B35",
    borderRadius: 28,
    padding: 20
  },
  brand: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#FFE4D7",
    marginBottom: 12
  },
  title: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#FFF3EC"
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 6
  },
  cardHint: {
    fontSize: 14,
    lineHeight: 20,
    color: "#7B6D63",
    marginBottom: 18
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B5E55",
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "#D9D0C5",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1A120B",
    backgroundColor: "#FFFCF8",
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
    backgroundColor: "#FF6B35",
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
    color: "#C4541C",
    fontSize: 14,
    fontWeight: "700"
  }
});

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
import { verifyOtp, sendOtp } from "../api/auth.api";
import { getDeliveryProfile } from "../api/profile.api";
import { resolveDeliveryRoute } from "../utils/deliveryStatus";

export default function OtpScreen({ route, navigation }: any) {
  const { phone } = route.params;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

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
    if (otp.length !== 6) {
      Alert.alert("Error", "Please enter 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      const response = await verifyOtp(phone, otp);

      if (!response.success || !response.data?.token || !response.data?.user) {
        Alert.alert("Error", response.message || "Invalid OTP. Please try again.");
        return;
      }

      await AsyncStorage.multiSet([
        ["token", response.data.token],
        ["refreshToken", response.data.refreshToken || ""],
        ["user", JSON.stringify(response.data.user)]
      ]);

      const profileResponse = await getDeliveryProfile();
      const nextRoute =
        profileResponse.success && profileResponse.data
          ? resolveDeliveryRoute(profileResponse.data)
          : "CompleteProfile";

      navigation.reset({
        index: 0,
        routes: [{ name: nextRoute }],
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to verify OTP. Please try again.");
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
      const response = await sendOtp(phone);
      if (!response.success) {
        Alert.alert("Error", response.message || "Failed to resend OTP");
        setCanResend(true);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to resend OTP");
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
          style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
          onPress={onVerify}
          disabled={otp.length !== 6 || loading}
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

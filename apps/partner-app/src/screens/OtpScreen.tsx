import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { verifyFirebaseOtp } from "../api/auth.api";
import {
  clearFirebaseOtpSession,
  confirmFirebaseOtp,
  isFirebaseOtpSessionExpiredError
} from "../services/firebasePhoneAuth";

export default function OtpScreen({ route, navigation }: any) {
  const { phone, role } = route.params;
  const [otp, setOtp] = useState("");

  const getOtpErrorMessage = (error: any) => {
    const code = String(error?.code || "").toLowerCase();
    const message = String(error?.message || "").toLowerCase();

    if (code.includes("invalid-verification-code") || message.includes("invalid")) {
      return "That code does not look right. Please check the SMS and try again.";
    }

    if (code.includes("session-expired") || message.includes("expired")) {
      return "This OTP expired. Please request a fresh OTP and use only the newest SMS code.";
    }

    return "We could not verify this code. Please try again.";
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert("Error", "Enter valid OTP");
      return;
    }

    try {
      const firebaseIdToken = await confirmFirebaseOtp(otp, phone);
      await verifyFirebaseOtp(phone, firebaseIdToken, role);
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
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>OTP sent to {phone}</Text>
      <TextInput
        placeholder="Enter OTP"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
        maxLength={6}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 12,
          marginBottom: 20,
          textAlign: "center",
          borderRadius: 6
        }}
      />
      <Button title="Verify OTP" onPress={handleVerify} />
    </View>
  );
}

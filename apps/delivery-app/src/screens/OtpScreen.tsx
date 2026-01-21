import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { verifyOtp } from "../api/auth.api";
import { setToken } from "../utils/storage";

export default function OtpScreen({ route, navigation }: any) {
  const { phone } = route.params;
  const [otp, setOtp] = useState("");

  const onVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert("Error", "Invalid OTP");
      return;
    }
    try {
      const res = await verifyOtp(phone, otp);
      const token = (res.data as any).token;
      await setToken(token);
      navigation.replace("Jobs");
    } catch {
      Alert.alert("Error", "OTP verification failed");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text>OTP sent to {phone}</Text>
      <TextInput
        placeholder="Enter OTP"
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
        style={{ borderWidth: 1, padding: 12, marginVertical: 20, textAlign: "center" }}
      />
      <Button title="Verify" onPress={onVerify} />
    </View>
  );
}

import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyOtp } from "../api/auth.api";

export default function OtpScreen({ route, navigation }: any) {
  const { phone, role } = route.params; // ✅ RECEIVE ROLE
  const [otp, setOtp] = useState("");

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert("Error", "Enter valid OTP");
      return;
    }

    try {
      // ✅ SEND ROLE TO BACKEND
      const res = await verifyOtp(phone, otp, role);
      const token = (res.data as any).token;

      // ✅ SAVE TOKEN
      await AsyncStorage.setItem("token", token);

      // ✅ MOVE TO ORDERS SCREEN
      navigation.replace("Orders");
    } catch (err) {
      Alert.alert("Error", "Invalid OTP");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>
        OTP sent to {phone}
      </Text>

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

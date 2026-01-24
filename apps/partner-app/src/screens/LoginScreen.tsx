import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { sendOtp } from "../api/auth.api";

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState("");

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      Alert.alert("Error", "Enter valid phone number");
      return;
    }

    try {
      // ✅ IMPORTANT: send role explicitly
      await sendOtp(phone, "partner");

      navigation.navigate("Otp", {
        phone,
        role: "partner" // 👈 pass role forward
      });
    } catch (err) {
      Alert.alert("Error", "Failed to send OTP");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 22, marginBottom: 20 }}>
        Partner Login
      </Text>

      <TextInput
        placeholder="Phone number"
        keyboardType="number-pad"
        value={phone}
        onChangeText={setPhone}
        maxLength={10}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 12,
          marginBottom: 20,
          borderRadius: 6
        }}
      />

      <Button title="Send OTP" onPress={handleSendOtp} />
    </View>
  );
}

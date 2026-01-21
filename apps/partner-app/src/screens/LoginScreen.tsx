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
      await sendOtp(phone);
      navigation.navigate("Otp", { phone });
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
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 12,
          marginBottom: 20
        }}
      />

      <Button title="Send OTP" onPress={handleSendOtp} />
    </View>
  );
}

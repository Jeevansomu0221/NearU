import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet
} from "react-native";
import { sendOtp } from "../api/auth.api";

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      Alert.alert("Error", "Enter a valid 10-digit phone number");
      return;
    }

    try {
      setLoading(true);
      await sendOtp(phone);
      navigation.navigate("Otp", { phone });
    } catch (err) {
      Alert.alert("Error", "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NearU</Text>

      <TextInput
        placeholder="Enter phone number"
        keyboardType="number-pad"
        value={phone}
        onChangeText={setPhone}
        style={styles.input}
        maxLength={10}
      />

      <Button
        title={loading ? "Sending..." : "Send OTP"}
        onPress={handleSendOtp}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 30
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 20,
    borderRadius: 6
  }
});

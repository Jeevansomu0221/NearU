import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyOtp } from "../api/auth.api";
import { setToken } from "../utils/storage";
export default function OtpScreen({ route, navigation }: any) {
  const { phone } = route.params;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert("Error", "Enter valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);

      const response = await verifyOtp(phone, otp);

const data = response.data as {
  token: string;
};

const token = data.token;

      // ✅ Save token
      await setToken(token);

      // 👉 TEMP: Navigate to placeholder screen
      Alert.alert("Success", "Login successful");
navigation.replace("Home");
      // Later this will go to HomeScreen
      // navigation.replace("Home");

    } catch (error) {
      Alert.alert("Error", "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>
        OTP sent to {phone}
      </Text>

      <TextInput
        placeholder="Enter OTP"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
        style={styles.input}
        maxLength={6}
      />

      <Button
        title={loading ? "Verifying..." : "Verify OTP"}
        onPress={handleVerifyOtp}
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
    fontSize: 24,
    textAlign: "center",
    marginBottom: 10
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 20,
    color: "#666"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 20,
    borderRadius: 6,
    textAlign: "center",
    fontSize: 18
  }
});

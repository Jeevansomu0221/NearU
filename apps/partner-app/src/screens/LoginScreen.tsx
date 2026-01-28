// apps/partner-app/src/screens/LoginScreen.tsx
import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert,
  ActivityIndicator 
} from "react-native";
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

interface PartnerResponse {
  success: boolean;
  data: {
    _id: string;
    ownerName: string;
    restaurantName: string;
    phone: string;
    address: string;
    category: string;
    status: string;
    createdAt: string;
  };
}

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      Alert.alert("Error", "Enter valid 10-digit phone number");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/send-otp", { phone, role: "partner" });
      setStep("otp");
      Alert.alert("OTP Sent", "Check your phone for OTP");
    } catch (error) {
      Alert.alert("Error", "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

 // In LoginScreen.tsx - Update the handleVerifyOtp function:
const handleVerifyOtp = async () => {
  if (otp.length !== 6) {
    Alert.alert("Error", "Enter 6-digit OTP");
    return;
  }

  try {
    setLoading(true);
    const res = await api.post("/auth/verify-otp", { 
      phone, 
      otp,
      role: "partner" 
    });
    
    const data = res.data as AuthResponse;
    
    console.log("✅ Login successful, user data:", data.user);
    
    // ✅ IMPORTANT: Save ALL user data including userId
    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("phone", phone);
    await AsyncStorage.setItem("userId", data.user.id); // ✅ THIS WAS MISSING!
    await AsyncStorage.setItem("user", JSON.stringify(data.user));
    
    console.log("✅ Saved userId to AsyncStorage:", data.user.id);
    
    // Check partner status
    await checkPartnerStatus(phone);
    
  } catch (error: any) {
    console.error("❌ OTP verification error:", error);
    Alert.alert("Error", error.response?.data?.message || "Invalid OTP");
  } finally {
    setLoading(false);
  }
};

  // In LoginScreen.tsx - Update the checkPartnerStatus function
// In LoginScreen.tsx - Update checkPartnerStatus
// In LoginScreen.tsx - Update checkPartnerStatus function
const checkPartnerStatus = async (phoneNumber: string) => {
  try {
    const res = await api.get(`/partners/status/${phoneNumber}`);
    const responseData = res.data as { success: boolean; data?: any; message?: string };
    
    console.log("🔍 Partner status response:", responseData);
    
    if (!responseData.success) {
      // No partner profile exists - go to onboarding
      console.log("📝 No partner profile, navigating to Onboarding");
      navigation.replace("Onboarding");
    } else {
      // Partner exists, check status
      const partner = responseData.data;
      if (partner.status === "PENDING") {
        navigation.replace("PendingApproval");
      } else if (partner.status === "APPROVED") {
        // Check if partner has menu items
        if (partner.menuItemsCount === 0) {
          console.log("📝 Approved but no menu items, going to WelcomeApproved");
          navigation.replace("WelcomeApproved");
        } else {
          console.log("📝 Approved with menu items, going to Dashboard");
          navigation.replace("Dashboard");
        }
      } else if (partner.status === "REJECTED") {
        navigation.replace("Rejected");
      }
    }
  } catch (error: any) {
    console.error("❌ Status check error:", error);
    navigation.replace("Onboarding");
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Partner Login</Text>
      
      {step === "phone" ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter 10-digit phone number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={10}
          />
          <TouchableOpacity 
            style={styles.button}
            onPress={handleSendOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.phoneText}>Verifying: {phone}</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
          />
          <TouchableOpacity 
            style={styles.button}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setStep("phone")}
          >
            <Text style={styles.backButtonText}>Change Phone</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20
  },
  phoneText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#666"
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 8,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold"
  },
  backButton: {
    marginTop: 15,
    alignItems: "center"
  },
  backButtonText: {
    color: "#2196F3",
    fontSize: 16
  }
});
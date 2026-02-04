import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { sendOtp } from "../api/auth.api";

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    // Validate phone
    if (phone.length !== 10) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return;
    }

    // Check if phone contains only digits
    if (!/^\d+$/.test(phone)) {
      Alert.alert("Error", "Phone number should contain only digits");
      return;
    }

    try {
      setLoading(true);
      console.log("Sending OTP to:", phone, "with role: delivery");
      
      const response = await sendOtp(phone);
      
      console.log("🔍 Send OTP Response:", response);
      
      if (response.success) {
        console.log("✅ OTP sent successfully");
        
        // Navigate immediately without showing OTP in Alert
        navigation.navigate("Otp", { 
          phone
          // Don't pass testOtp to avoid auto-fill
        });
        
      } else {
        console.log("❌ Send OTP failed:", response.message);
        Alert.alert("Error", response.message || "Failed to send OTP");
      }
    } catch (error: any) {
      console.error("❌ Send OTP error:", error);
      Alert.alert("Error", error.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>🚚 NearU Delivery</Text>
            <Text style={styles.subtitle}>Delivery Partner Login</Text>
          </View>
          
          <View style={styles.form}>
            <Text style={styles.label}>Enter your phone number</Text>
            
            <View style={styles.phoneContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                placeholder="9876543210"
                keyboardType="number-pad"
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                style={styles.input}
                maxLength={10}
                autoFocus
                editable={!loading}
              />
            </View>
            
            <Text style={styles.hint}>10-digit mobile number</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.button, phone.length !== 10 && styles.buttonDisabled]}
            onPress={onSend}
            disabled={phone.length !== 10 || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📱 Development Mode</Text>
            <Text style={styles.infoText}>
              OTP will be shown in console/server logs only.
              Check your console for the test OTP.
            </Text>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>By continuing, you agree to our</Text>
            <Text style={styles.footerLink}>Terms & Conditions</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  form: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 12,
    marginLeft: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    marginBottom: 8,
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f0f0f0',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  footerLink: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
});
import React, { useState } from "react";
import { 
  View, 
  Text, 
  Image,
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking
} from "react-native";
import { sendOtpWithFallback } from "../services/otpAuthFlow";
import { buildLegalUrl } from "../constants/legal";
import { androidKeyboardPadding, useKeyboardBottomInset } from "../hooks/useKeyboardBottomInset";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "../theme/colors";

const TERMS_URL = buildLegalUrl("terms");
const PRIVACY_URL = buildLegalUrl("privacy");

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const keyboardHeight = useKeyboardBottomInset();
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();

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
      
      const otpSession = await sendOtpWithFallback(phone);
      
      console.log("✅ OTP sent successfully");
      navigation.navigate("Otp", { phone, otpSession });
    } catch (error: any) {
      const detail = [
        error?.code ? `code=${error.code}` : "",
        error?.message ? `msg=${error.message}` : ""
      ].filter(Boolean).join(" | ");
      console.error("❌ Send OTP error:", detail || error);
      const base = error?.message || "Failed to send OTP. Please try again.";
      Alert.alert("Error", __DEV__ && detail ? `${base}\n\n[debug] ${detail}` : base);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: 40 + androidKeyboardPadding(keyboardHeight), paddingTop: insets.top }
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require("../../assets/vyaha-delivery-text-logo.png")}
              style={[
                styles.logo,
                {
                  width: Math.min(240, layout.width - 64),
                  height: Math.min(120, Math.round((layout.width - 64) * 0.48))
                }
              ]}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Sign in to start delivering</Text>
          </View>
          
          <View style={styles.formCard}>
            <Text style={styles.label}>Phone number</Text>
            
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
            
            <Text style={styles.hint}>We'll send a 6-digit OTP</Text>
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
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our{" "}
              <Text style={styles.footerLink} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Service</Text>
              {" "}and{" "}
              <Text style={styles.footerLink} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 24,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 240,
    height: 120,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textMuted,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.1)"
  },
  label: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 12,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 8,
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.primaryMuted,
    borderRightWidth: 1,
    borderRightColor: colors.primaryBorder,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDeep,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: colors.text,
    letterSpacing: 1
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
  },
  infoBox: {
    backgroundColor: colors.primarySoft,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primaryDeep,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: colors.primaryDeep,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '700',
  },
});

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { verifyFirebaseOtp, persistAuthSession } from '../api/auth.api';
import { getUserProfile } from '../api/user.api';
import {
  clearFirebaseOtpSession,
  isFirebaseOtpSessionExpiredError,
} from '../services/firebasePhoneAuth';
import { sendOtpWithFallback, verifyOtpSession, OtpSessionInfo } from '../services/otpAuthFlow';
import { registerForPushNotifications } from '../services/notifications';
import { buildLegalUrl } from '../constants/legal';

const TERMS_URL = buildLegalUrl("terms");
const PRIVACY_URL = buildLegalUrl("privacy");
const RESEND_COOLDOWN_SECONDS = 60;

type OtpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Otp'>;
type OtpScreenRouteProp = RouteProp<RootStackParamList, 'Otp'>;

interface Props {
  navigation: OtpScreenNavigationProp;
  route: OtpScreenRouteProp;
}

export default function OtpScreen({ navigation, route }: Props) {
  const { phone, otpSession: initialOtpSession } = route.params;
  const [otpSession, setOtpSession] = useState<OtpSessionInfo>(initialOtpSession);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [requiresFreshOtp, setRequiresFreshOtp] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SECONDS);
  const lastSubmittedOtp = useRef('');

  const extractServerMessage = (error: any): string => {
    const data = error?.response?.data;
    if (data && typeof data === 'object' && typeof data.message === 'string') {
      return data.message;
    }
    if (typeof data === 'string') {
      return data;
    }
    return '';
  };

  const getRawErrorDetail = (error: any): string => {
    const parts: string[] = [];
    if (error?.code) parts.push(`code=${error.code}`);
    const serverMessage = extractServerMessage(error);
    if (serverMessage) parts.push(`server=${serverMessage}`);
    if (error?.message) parts.push(`msg=${error.message}`);
    if (error?.response?.status) parts.push(`http=${error.response.status}`);
    return parts.join(' | ');
  };

  const getOtpErrorMessage = (error: any) => {
    const code = String(error?.code || '').toLowerCase();
    const serverMessage = extractServerMessage(error).toLowerCase();
    const lowerMessage = `${String(error?.message || '')} ${serverMessage}`.toLowerCase();
    const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

    if (isDev) {
      console.log('[OTP][customer] verify failure detail:', getRawErrorDetail(error));
    }

    if (code.includes('invalid-verification-code') || lowerMessage.includes('invalid')) {
      return 'That code does not look right. Please check the SMS and try again.';
    }

    if (code.includes('session-expired') || lowerMessage.includes('expired')) {
      return 'This SMS code has expired. Please resend OTP and use the newest code.';
    }

    if (lowerMessage.includes('aud') || lowerMessage.includes('audience') || lowerMessage.includes('decoding firebase')) {
      return 'Sign-in is misconfigured (Firebase project mismatch). Please update the app to the latest version.';
    }

    if (lowerMessage.includes('did not match this phone')) {
      return 'This code was verified for a different number. Please resend OTP and try again.';
    }

    const userSafeServerMessage = extractServerMessage(error) || String(error?.message || '');
    if (userSafeServerMessage && !userSafeServerMessage.toLowerCase().includes('firebase id token')) {
      return userSafeServerMessage;
    }

    const detail = getRawErrorDetail(error);
    const base = 'We could not verify this code. Please try again or resend OTP.';
    return isDev && detail ? `${base}\n\n[debug] ${detail}` : base;
  };

  const isCustomerProfileComplete = (profile: {
    name?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
      area?: string;
      latitude?: number;
      longitude?: number;
    };
    addresses?: Array<{
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
      area?: string;
      latitude?: number;
      longitude?: number;
      isDefault?: boolean;
    }>;
  }) => {
    const normalizedName = (profile.name || '').trim().toLowerCase();
    const isGeneratedName =
      normalizedName === 'customer' ||
      normalizedName === 'nearu customer' ||
      /^customer\s*\d{4}$/.test(normalizedName) ||
      /^customer\s+[0-9]+$/.test(normalizedName);

    const hasRealName =
      !!profile.name &&
      !isGeneratedName &&
      profile.name.trim().length >= 3;

    const address = profile.address || profile.addresses?.find((entry) => entry.isDefault) || profile.addresses?.[0];
    const hasExactPin =
      typeof address?.latitude === "number" &&
      typeof address?.longitude === "number" &&
      Number.isFinite(address.latitude) &&
      Number.isFinite(address.longitude) &&
      !(address.latitude === 0 && address.longitude === 0);

    return Boolean(
      hasRealName &&
        address?.street &&
        address?.city &&
        address?.state &&
        address?.pincode &&
        address?.area &&
        hasExactPin
    );
  };

  const handleVerifyOTP = async () => {
    if (requiresFreshOtp) {
      setOtpError('Please resend OTP and use the newest SMS code.');
      return;
    }

    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter 6-digit OTP');
      return;
    }

    if (loading || lastSubmittedOtp.current === otp) {
      return;
    }

    lastSubmittedOtp.current = otp;
    setOtpError('');
    setLoading(true);
    try {
      const response = await verifyOtpSession(phone, otp, otpSession);

      if (!response.success || !response.data?.token || !response.data?.user) {
        Alert.alert('Error', getOtpErrorMessage(response.message ? response : { message: 'Invalid OTP' }));
        return;
      }

      await persistAuthSession(
        response.data.token,
        response.data.refreshToken,
        response.data.user
      );

      registerForPushNotifications().catch((error) => {
        console.log("Failed to register push notifications:", error);
      });

      const profileResponse = await getUserProfile();
      const nextRoute =
        profileResponse.success && profileResponse.data && isCustomerProfileComplete(profileResponse.data)
          ? { name: 'Home' as const }
          : { name: 'Profile' as const, params: { forceComplete: true } };

      navigation.reset({
        index: 0,
        routes: [nextRoute],
      });
    } catch (error: any) {
      lastSubmittedOtp.current = '';
      if (otpSession.provider === 'firebase' && isFirebaseOtpSessionExpiredError(error)) {
        clearFirebaseOtpSession();
        setOtp('');
        setRequiresFreshOtp(true);
        setOtpError('This SMS code can no longer be verified. Tap Resend OTP and use only the newest SMS code.');
      } else {
        setOtpError(getOtpErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (otp.length === 6 && !loading && !requiresFreshOtp) {
      handleVerifyOTP();
    }
  }, [otp]);

  React.useEffect(() => {
    if (resendSeconds <= 0 || requiresFreshOtp) {
      return;
    }

    const timeout = setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [resendSeconds, requiresFreshOtp]);

  const handleResendOTP = async () => {
    if (loading) {
      return;
    }

    if (resendSeconds > 0 && !requiresFreshOtp) {
      setOtpError(`Please wait ${resendSeconds}s before requesting another OTP.`);
      return;
    }

    setLoading(true);
    try {
      setOtp('');
      setOtpError('');
      setRequiresFreshOtp(false);
      lastSubmittedOtp.current = '';
      const refreshedSession = await sendOtpWithFallback(phone);
      setOtpSession(refreshedSession);
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      Alert.alert('Fresh OTP Sent', 'Please use the newest SMS code. Older codes will stop working.');
    } catch {
      Alert.alert('Error', 'Could not resend OTP right now. Please wait a moment and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify Phone Number</Text>
        <View style={styles.phoneContainer}>
          <Text style={styles.phoneLabel}>Code sent to</Text>
          <Text style={styles.phoneNumber}>+91 {phone}</Text>
        </View>
        <Text style={styles.instruction}>Enter the 6-digit code sent to your phone</Text>
        <View style={styles.otpContainer}>
          <TextInput
            style={styles.otpInput}
            placeholder="000000"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            value={otp}
            onChangeText={(text) => {
              const numbers = text.replace(/\D/g, '');
              if (numbers.length <= 6) {
                setOtp(numbers);
                setOtpError('');
                if (numbers.length < 6) {
                  lastSubmittedOtp.current = '';
                }
              }
            }}
            maxLength={6}
            editable={!loading && !requiresFreshOtp}
            autoFocus
            textAlign="center"
          />
        </View>
        <View style={styles.otpDots}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={[styles.otpDot, index < otp.length && styles.otpDotFilled]} />
          ))}
        </View>
        {otpError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Verification failed</Text>
            <Text style={styles.errorText}>{otpError}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={[styles.button, (loading || otp.length !== 6 || requiresFreshOtp) && styles.buttonDisabled]}
          onPress={handleVerifyOTP}
          disabled={loading || otp.length !== 6 || requiresFreshOtp}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Verify & Continue</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResendOTP}
          disabled={loading || (resendSeconds > 0 && !requiresFreshOtp)}
        >
          <Text style={styles.resendText}>
            {requiresFreshOtp ? 'Code expired? ' : resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : "Didn't receive code? "}
            {resendSeconds === 0 || requiresFreshOtp ? <Text style={styles.resendLink}>Resend OTP</Text> : null}
          </Text>
        </TouchableOpacity>
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By verifying, you agree to our{" "}
            <Text style={styles.footerLink} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Service</Text>
            {" "}and{" "}
            <Text style={styles.footerLink} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 24, paddingVertical: 40, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 24 },
  phoneContainer: { alignItems: 'center', marginBottom: 8 },
  phoneLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  phoneNumber: { fontSize: 18, fontWeight: '600', color: '#333' },
  instruction: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  otpContainer: { marginBottom: 16 },
  otpInput: { borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 12, padding: 16, fontSize: 24, fontWeight: 'bold', letterSpacing: 8, color: '#333', backgroundColor: '#FAFAFA' },
  otpDots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 40 },
  otpDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E0E0E0', marginHorizontal: 6 },
  otpDotFilled: { backgroundColor: '#FF6B35' },
  errorCard: { backgroundColor: '#FFF4EF', borderWidth: 1, borderColor: '#FFD2C0', borderRadius: 14, padding: 12, marginBottom: 18 },
  errorTitle: { fontSize: 13, fontWeight: '800', color: '#B93815', marginBottom: 4 },
  errorText: { fontSize: 12, lineHeight: 17, color: '#7A3A24' },
  button: { backgroundColor: '#FF6B35', paddingVertical: 18, borderRadius: 12, alignItems: 'center', shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, marginBottom: 24 },
  buttonDisabled: { backgroundColor: '#FFA285', shadowOpacity: 0.1 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resendButton: { alignItems: 'center', marginBottom: 40 },
  resendText: { fontSize: 14, color: '#666' },
  resendLink: { color: '#FF6B35', fontWeight: '600' },
  footer: { paddingHorizontal: 20 },
  footerText: { fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18 },
  footerLink: { color: '#FF6B35', fontWeight: '700' },
});

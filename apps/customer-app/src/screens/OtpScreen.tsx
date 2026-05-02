import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { verifyFirebaseOtp } from '../api/auth.api';
import { getUserProfile } from '../api/user.api';
import { confirmFirebaseOtp, sendFirebaseOtp } from '../services/firebasePhoneAuth';

type OtpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Otp'>;
type OtpScreenRouteProp = RouteProp<RootStackParamList, 'Otp'>;

interface Props {
  navigation: OtpScreenNavigationProp;
  route: OtpScreenRouteProp;
}

export default function OtpScreen({ navigation, route }: Props) {
  const { phone } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const isCustomerProfileComplete = (profile: {
    name?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
      area?: string;
    };
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

    const address = profile.address;
    return Boolean(
      hasRealName &&
        address?.street &&
        address?.city &&
        address?.state &&
        address?.pincode &&
        address?.area
    );
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const firebaseIdToken = await confirmFirebaseOtp(otp);
      const response = await verifyFirebaseOtp(phone, firebaseIdToken);

      if (!response.success || !response.data?.token || !response.data?.user) {
        Alert.alert('Error', response.message || 'Invalid OTP');
        return;
      }

      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      if (response.data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
      } else {
        await AsyncStorage.removeItem('refreshToken');
      }

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
      Alert.alert('Verification Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleVerifyOTP();
    }
  }, [otp]);

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await sendFirebaseOtp(phone);
      Alert.alert('OTP Sent', 'A new OTP has been sent to your phone.');
      setOtp('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP. Please try again.');
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
              if (numbers.length <= 6) setOtp(numbers);
            }}
            maxLength={6}
            editable={!loading}
            autoFocus
            textAlign="center"
          />
        </View>
        <View style={styles.otpDots}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={[styles.otpDot, index < otp.length && styles.otpDotFilled]} />
          ))}
        </View>
        <TouchableOpacity
          style={[styles.button, (loading || otp.length !== 6) && styles.buttonDisabled]}
          onPress={handleVerifyOTP}
          disabled={loading || otp.length !== 6}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Verify & Continue</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.resendButton} onPress={handleResendOTP} disabled={loading}>
          <Text style={styles.resendText}>Didn't receive code? <Text style={styles.resendLink}>Resend OTP</Text></Text>
        </TouchableOpacity>
        <View style={styles.footer}>
          <Text style={styles.footerText}>By verifying, you agree to our Terms of Service and Privacy Policy</Text>
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
  button: { backgroundColor: '#FF6B35', paddingVertical: 18, borderRadius: 12, alignItems: 'center', shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, marginBottom: 24 },
  buttonDisabled: { backgroundColor: '#FFA285', shadowOpacity: 0.1 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resendButton: { alignItems: 'center', marginBottom: 40 },
  resendText: { fontSize: 14, color: '#666' },
  resendLink: { color: '#FF6B35', fontWeight: '600' },
  footer: { paddingHorizontal: 20 },
  footerText: { fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18 },
});

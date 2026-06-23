import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Linking
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { warmApi } from '../api/client';
import { sendOtpWithFallback, OtpSessionInfo } from '../services/otpAuthFlow';
import { buildLegalUrl } from '../constants/legal';

const TERMS_URL = buildLegalUrl("terms");
const PRIVACY_URL = buildLegalUrl("privacy");

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const getSendOtpErrorMessage = (error: any) => {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || error?.response?.data?.message || '').trim();

    if (code.includes('too-many-requests') || message.toLowerCase().includes('too many')) {
      return 'Too many OTP requests. Please wait a few minutes and try again.';
    }

    if (
      message.toLowerCase().includes('network') ||
      message.toLowerCase().includes('server is taking longer') ||
      message.toLowerCase().includes('cannot connect')
    ) {
      return message || 'Cannot connect to server. Please check your internet connection.';
    }

    if (message) {
      return message;
    }

    return 'Could not send OTP right now. Please try again.';
  };

  const handleSendOTP = async () => {
    // Clean phone number (remove any spaces, dashes, etc.)
    const cleanedPhone = phone.replace(/\D/g, '');
    
    if (!cleanedPhone || cleanedPhone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      void warmApi();
      const otpSession = await sendOtpWithFallback(cleanedPhone);

      navigation.navigate('Otp', { 
        phone: cleanedPhone,
        otpSession
      });
      
    } catch (error: any) {
      console.error('[OTP] Login send failed:', error);
      Alert.alert('Error', getSendOtpErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image source={require('../../assets/vyaha-wordmark.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.subtitle}>Good food near you</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.phoneInputWrapper}>
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 10-digit number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => {
                // Allow only numbers
                const numbers = text.replace(/\D/g, '');
                // Limit to 10 digits
                if (numbers.length <= 10) {
                  setPhone(numbers);
                }
              }}
              maxLength={10}
              editable={!loading}
            />
          </View>
          <Text style={styles.hint}>Enter without country code</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, (loading || phone.length !== 10) && styles.buttonDisabled]}
          onPress={handleSendOTP}
          disabled={loading || phone.length !== 10}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              Send OTP
            </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  logo: {
    width: 210,
    height: 92,
    alignSelf: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 60,
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontWeight: '600',
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  countryCode: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f0f0f0',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#FFA285',
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#FF6B35',
    fontWeight: '700',
  },
});

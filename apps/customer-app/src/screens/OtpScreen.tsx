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
import { verifyOtp, VerifyOtpResponse } from '../api/auth.api';

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

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Verifying OTP:', { phone, otp });
      
      // ✅ Use the verifyOtp function from auth.api.ts
      const response: VerifyOtpResponse = await verifyOtp(phone, otp);
      
      console.log('✅ OTP Verification Response:', response);
      
      // Check if response has success property
      if (response && response.success) {
        // Save token and user info
        if (response.token) {
          await AsyncStorage.setItem('token', response.token);
        }
        if (response.user) {
          await AsyncStorage.setItem('user', JSON.stringify(response.user));
        }
        
        Alert.alert('Success', 'Login successful!');
        
        // Navigate to Home and clear navigation stack
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        // Handle error response
        Alert.alert('Error', response?.message || 'Invalid OTP');
      }
    } catch (error: any) {
      console.error('❌ OTP Verification Error:', error);
      
      // Extract error message
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.message) {
        if (error.message.includes('Network Error')) {
          errorMessage = 'Cannot connect to server. Check your connection.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout. Please try again.';
        } else if (error.message.includes('Phone number and role are required')) {
          errorMessage = 'Invalid request. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Verification Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when OTP length reaches 6
  React.useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleVerifyOTP();
    }
  }, [otp]);

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      // Dynamically import to avoid circular dependency if needed
      const { sendOtp } = await import('../api/auth.api');
      await sendOtp(phone);
      Alert.alert('OTP Sent', 'A new OTP has been sent to your phone.');
      setOtp(''); // Clear OTP field
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
              // Allow only numbers
              const numbers = text.replace(/\D/g, '');
              // Limit to 6 digits
              if (numbers.length <= 6) {
                setOtp(numbers);
              }
            }}
            maxLength={6}
            editable={!loading}
            autoFocus={true}
            textAlign="center"
          />
        </View>
        
        <View style={styles.otpDots}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.otpDot,
                index < otp.length && styles.otpDotFilled
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, (loading || otp.length !== 6) && styles.buttonDisabled]}
          onPress={handleVerifyOTP}
          disabled={loading || otp.length !== 6}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              Verify & Continue
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResendOTP}
          disabled={loading}
        >
          <Text style={styles.resendText}>
            Didn't receive code?{' '}
            <Text style={styles.resendLink}>Resend OTP</Text>
          </Text>
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By verifying, you agree to our Terms of Service and Privacy Policy
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  phoneContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  phoneLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  otpContainer: {
    marginBottom: 16,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  otpDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  otpDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 6,
  },
  otpDotFilled: {
    backgroundColor: '#FF6B35',
  },
  button: {
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
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
  resendButton: {
    alignItems: 'center',
    marginBottom: 40,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
});
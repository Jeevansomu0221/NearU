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
import { RootStackParamList } from '../navigation/AppNavigator';
import { sendOtp } from '../api/auth.api';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    // Clean phone number (remove any spaces, dashes, etc.)
    const cleanedPhone = phone.replace(/\D/g, '');
    
    if (!cleanedPhone || cleanedPhone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      console.log('📱 Sending OTP to:', cleanedPhone);
      
      // ✅ Use the sendOtp function from auth.api.ts
      const response = await sendOtp(cleanedPhone);
      
      console.log('✅ OTP sent successfully:', response);
      
      // Navigate to OTP screen with phone number ONLY
      // Type is { phone: string } so only pass phone
      navigation.navigate('Otp', { 
        phone: cleanedPhone
      });
      
    } catch (error: any) {
      console.error('❌ OTP send error:', error);
      
      // Check if it's the specific validation error from backend
      if (error.response?.data?.message === "Phone number and role are required") {
        Alert.alert('Error', 'Server configuration error. Please try again.');
      } else if (error.message && error.message.includes('Network Error')) {
        Alert.alert('Connection Error', 'Cannot connect to server. Please check your internet connection.');
      } else {
        Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to send OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>NearU</Text>
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
            By continuing, you agree to our Terms of Service and Privacy Policy
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
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
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
});
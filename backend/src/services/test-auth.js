const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testAuthFlow() {
  try {
    console.log('1. Testing OTP send...');
    const phone = '9876543210';
    
    const otpResponse = await axios.post(`${API_BASE}/auth/send-otp`, {
      phone
    });
    
    console.log('OTP Send Response:', otpResponse.data);
    
    // In console, you'll see the OTP printed
    console.log('\n2. Check console for OTP, then verify...');
    console.log('(OTP is logged in server console)');
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testAuthFlow();
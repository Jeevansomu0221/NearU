import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// CHANGE THIS to your computer's IP
const API_BASE_URL = 'http://192.168.1.9:5000/api';

// Create simple axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token to all requests
apiClient.interceptors.request.use(async (config: any) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  } catch (error) {
    console.error('Error getting token:', error);
  }
  return config;
});

// Handle responses
apiClient.interceptors.response.use(
  (response: any) => {
    // Return data directly
    return response.data;
  },
  (error: any) => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
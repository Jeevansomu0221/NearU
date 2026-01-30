import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

// IMPORTANT: Use your laptop IP address instead of localhost
// For physical device testing, use your actual IP: 10.3.128.220
const API_BASE_URL = "http://10.3.128.220:5000/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// REQUEST INTERCEPTOR
api.interceptors.request.use(
  async (config: any) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting token:", error);
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR - Return only the data
api.interceptors.response.use(
  (response: any) => {
    // Return the data directly as a Promise
    return Promise.resolve(response.data);
  },
  (error: any) => {
    console.error("API Error:", {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data
    });
    
    // Return a more specific error message for network errors
    if (error.message === "Network Error") {
      return Promise.reject(new Error("Cannot connect to server. Please check your connection."));
    }
    
    // Return the error response data if available
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
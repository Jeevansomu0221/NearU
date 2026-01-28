import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "http://10.3.128.220:5000/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config: any) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      return config;
    }
  },
  (error: any) => {
    return Promise.reject(error);
  }
);
// In the response interceptor, update the error logging:
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`❌ API Error ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data, // This shows the error message from backend
        headers: error.response.headers,
      });
      
      // Log the full error for debugging
      console.error("Full error response:", JSON.stringify(error.response.data, null, 2));
    }
    // ... rest of error handling
  }
);

export default api;
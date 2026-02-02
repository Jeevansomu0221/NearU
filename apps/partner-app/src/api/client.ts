import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define generic API response type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  [key: string]: any;
}

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

// Response interceptor
api.interceptors.response.use(
  (response: any) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error: any) => {
    if (error.response) {
      const url = error.config?.url || '';
      const method = error.config?.method?.toUpperCase() || 'GET';
      
      if (url.includes('/partners/my-status') && error.response.status === 404) {
        console.log(`📝 ${method} ${url}: Partner not found (404) - This is expected for new users`);
        return Promise.resolve(error.response);
      }
      
      console.error(`❌ API Error ${method} ${url}:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error("🌐 Network error - No response received");
    } else {
      console.error("🚫 Request setup error:", error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
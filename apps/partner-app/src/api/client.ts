import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

// Define generic API response type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  [key: string]: any;
}

const DEV_LAN_HOST = "10.3.189.31";

const isPrivateIp = (hostname: string) => {
  return (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
};

const api = axios.create({
  baseURL: (() => {
    const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
    if (envUrl) {
      return envUrl.endsWith("/api") ? envUrl : `${envUrl.replace(/\/$/, "")}/api`;
    }

    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      try {
        const bundleUrl = new URL(scriptURL);
        const hostname = bundleUrl.hostname;

        if (isPrivateIp(hostname)) {
          return `http://${hostname}:5000/api`;
        }
      } catch (error) {
        console.warn("Failed to parse bundle URL for API host detection:", error);
      }
    }

    if (Platform.OS === "android") {
      return `http://${DEV_LAN_HOST}:5000/api`;
    }

    return `http://${DEV_LAN_HOST}:5000/api`;
  })(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

console.log("Partner API base URL:", api.defaults.baseURL);

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

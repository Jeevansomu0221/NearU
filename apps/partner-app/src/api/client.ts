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

const DEV_LAN_HOST = "10.3.8.130";
const ANDROID_EMULATOR_HOST = "10.0.2.2";
const BLOCKED_DEV_HOSTS = new Set(["192.168.43.1", "192.168.61.1"]);

const isPrivateIp = (hostname: string) => {
  return (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
};

const addUnique = (items: string[], value: string) => {
  if (!items.includes(value)) {
    items.push(value);
  }
};

const resolveApiBaseUrls = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return [envUrl.endsWith("/api") ? envUrl : `${envUrl.replace(/\/$/, "")}/api`];
  }

  const urls: string[] = [];
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    try {
      const bundleUrl = new URL(scriptURL);
      const hostname = bundleUrl.hostname;

      if (isPrivateIp(hostname) && !BLOCKED_DEV_HOSTS.has(hostname)) {
        addUnique(urls, `http://${hostname}:5000/api`);
      }
    } catch (error) {
      console.warn("Failed to parse bundle URL for API host detection:", error);
    }
  }

  addUnique(urls, `http://${DEV_LAN_HOST}:5000/api`);

  if (Platform.OS === "android") {
    addUnique(urls, `http://${ANDROID_EMULATOR_HOST}:5000/api`);
  }

  return urls;
};

const API_BASE_URLS = resolveApiBaseUrls();

const api = axios.create({
  baseURL: API_BASE_URLS[0],
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

console.log("Partner API base URL:", api.defaults.baseURL);
console.log("Partner API fallback URLs:", API_BASE_URLS);

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
  async (error: any) => {
    const requestConfig = error.config;
    const currentRetryIndex = requestConfig?._baseUrlRetryIndex || 0;
    const nextBaseUrl = API_BASE_URLS[currentRetryIndex + 1];
    const isNetworkError = error.message === "Network Error" || (error.request && !error.response);

    if (isNetworkError && requestConfig && nextBaseUrl) {
      console.log(`Trying fallback API base URL: ${nextBaseUrl}`);
      requestConfig._baseUrlRetryIndex = currentRetryIndex + 1;
      requestConfig.baseURL = nextBaseUrl;
      api.defaults.baseURL = nextBaseUrl;
      return api.request(requestConfig);
    }

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

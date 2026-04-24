// apps/customer-app/src/api/client.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

// Define API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

const DEV_LAN_HOST = "10.3.8.130";
const BLOCKED_DEV_HOSTS = new Set(["192.168.43.1", "192.168.61.1"]);

const isPrivateIp = (hostname: string) => {
  return (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
};

const resolveApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.endsWith("/api") ? envUrl : `${envUrl.replace(/\/$/, "")}/api`;
  }

  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    try {
      const bundleUrl = new URL(scriptURL);
      const hostname = bundleUrl.hostname;

      if (isPrivateIp(hostname) && !BLOCKED_DEV_HOSTS.has(hostname)) {
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
};

const API_BASE_URL = resolveApiBaseUrl();
console.log("Customer API base URL:", API_BASE_URL);

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

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response: any) => {
    // Return the full response
    return response;
  },
  (error: any) => {
    console.error("API Error:", {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data
    });
    
    if (error.message === "Network Error") {
      return Promise.reject(new Error("Cannot connect to server. Please check your connection."));
    }
    
    return Promise.reject(error.response?.data || error);
  }
);

// Helper function to extract data from response
const extractData = <T>(response: any): ApiResponse<T> => {
  return response.data;
};

// Create typed API functions
export const apiGet = async <T = any>(url: string, config?: any): Promise<ApiResponse<T>> => {
  const response = await api.get(url, config);
  return extractData<T>(response);
};

export const apiPost = async <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
  const response = await api.post(url, data, config);
  return extractData<T>(response);
};

export const apiPut = async <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
  const response = await api.put(url, data, config);
  return extractData<T>(response);
};

export const apiDelete = async <T = any>(url: string, config?: any): Promise<ApiResponse<T>> => {
  const response = await api.delete(url, config);
  return extractData<T>(response);
};

export const apiPatch = async <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
  const response = await api.patch(url, data, config);
  return extractData<T>(response);
};

// Export default for backward compatibility
const typedApi = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  patch: apiPatch,
};

export default typedApi;

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

const DEV_LAN_HOST = "10.3.189.31";

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
};

const API_BASE_URL = resolveApiBaseUrl();
console.log("Delivery API base URL:", API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// REQUEST INTERCEPTOR - Add token to every request
api.interceptors.request.use(
  async (config: any) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    try {
      const token = await AsyncStorage.getItem("token");
      console.log("📱 Token from storage:", token ? `Yes (${token.length} chars)` : "No token");
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("✅ Added Authorization header");
        console.log("🔑 Authorization:", `Bearer ${token.substring(0, 30)}...`);
      } else {
        console.log("❌ No token available for request");
      }
    } catch (error) {
      console.error("❌ Error getting token from storage:", error);
    }
    
    return config;
  },
  (error: any) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response: any) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error: any) => {
    console.error("❌ API Error:", {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      headers: error.config?.headers,
      data: error.response?.data
    });
    
    // Handle specific errors
    if (error.response?.status === 401) {
      console.log("⚠️ Authentication error - token might be invalid or expired");
      // Clear token and redirect to login
      AsyncStorage.removeItem("token");
      AsyncStorage.removeItem("user");
    }
    
    if (error.message === "Network Error") {
      console.log("🌐 Network Error - Check connection");
      return Promise.reject(new Error("Cannot connect to server. Please check your connection."));
    }
    
    // Return the error response data if available
    const errorData = error.response?.data || { 
      success: false,
      message: error.message || "Unknown error"
    };
    
    return Promise.reject(errorData);
  }
);

// Helper function to extract data from response
const extractData = <T>(response: any): ApiResponse<T> => {
  console.log("🔍 Extracting data from response:", {
    status: response.status,
    data: response.data
  });
  
  // If response.data already has the structure we want
  if (response.data && typeof response.data === 'object') {
    // Check if it already has success property (most responses)
    if ('success' in response.data) {
      console.log("✅ Response already has ApiResponse structure");
      return response.data;
    }
    
    // For auth responses, they might be direct data
    console.log("✅ Response is direct data, wrapping in success");
    return {
      success: true,
      data: response.data
    };
  }
  
  // If response.data is a string or other type
  console.log("⚠️ Response.data is not object or null");
  return {
    success: true,
    data: response.data
  };
};

// Create typed API functions
export const apiGet = async <T = any>(url: string, config?: any): Promise<ApiResponse<T>> => {
  try {
    console.log(`📤 GET ${url}`);
    const response = await api.get(url, config);
    return extractData<T>(response);
  } catch (error: any) {
    console.error(`❌ GET ${url} failed:`, error);
    return {
      success: false,
      message: error.message || "Request failed",
      ...error
    };
  }
};

export const apiPost = async <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
  try {
    console.log(`📤 POST ${url}`);
    const response = await api.post(url, data, config);
    return extractData<T>(response);
  } catch (error: any) {
    console.error(`❌ POST ${url} failed:`, error);
    return {
      success: false,
      message: error.message || "Request failed",
      ...error
    };
  }
};

export const apiPut = async <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
  try {
    console.log(`📤 PUT ${url}`);
    const response = await api.put(url, data, config);
    return extractData<T>(response);
  } catch (error: any) {
    console.error(`❌ PUT ${url} failed:`, error);
    return {
      success: false,
      message: error.message || "Request failed",
      ...error
    };
  }
};

export const apiDelete = async <T = any>(url: string, config?: any): Promise<ApiResponse<T>> => {
  try {
    console.log(`📤 DELETE ${url}`);
    const response = await api.delete(url, config);
    return extractData<T>(response);
  } catch (error: any) {
    console.error(`❌ DELETE ${url} failed:`, error);
    return {
      success: false,
      message: error.message || "Request failed",
      ...error
    };
  }
};

export const apiPatch = async <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
  try {
    console.log(`📤 PATCH ${url}`);
    const response = await api.patch(url, data, config);
    return extractData<T>(response);
  } catch (error: any) {
    console.error(`❌ PATCH ${url} failed:`, error);
    return {
      success: false,
      message: error.message || "Request failed",
      ...error
    };
  }
};

// Export default for backward compatibility
const typedApi = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  patch: apiPatch,
};

export { api as rawApi, API_BASE_URL };
export default typedApi;

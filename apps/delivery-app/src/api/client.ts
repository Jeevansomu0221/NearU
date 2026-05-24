import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter, NativeModules, Platform } from "react-native";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

const DEV_LAN_HOST = "10.3.8.130";
const ANDROID_EMULATOR_HOST = "10.0.2.2";
const BLOCKED_DEV_HOSTS = new Set(["192.168.43.1", "192.168.61.1"]);
const PRODUCTION_API_URL = "https://vyaha-app-backend.onrender.com/api";
const isDev = typeof __DEV__ !== "undefined" && __DEV__;

const logDebug = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

const isPrivateIp = (hostname: string) =>
  /^10\./.test(hostname) ||
  /^192\.168\./.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

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

  if (!isDev) {
    return [PRODUCTION_API_URL];
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
      logDebug("Failed to parse bundle URL for API host detection:", error);
    }
  }

  addUnique(urls, `http://${DEV_LAN_HOST}:5000/api`);

  if (Platform.OS === "android") {
    addUnique(urls, `http://${ANDROID_EMULATOR_HOST}:5000/api`);
  }

  return urls;
};

const API_BASE_URLS = resolveApiBaseUrls();
const API_BASE_URL = API_BASE_URLS[0];

logDebug("Delivery API base URL:", API_BASE_URL);
logDebug("Delivery API fallback URLs:", API_BASE_URLS);

const isFormDataPayload = (value: any) => {
  if (!value || typeof value !== "object") return false;
  if (typeof FormData !== "undefined" && value instanceof FormData) return true;
  return typeof value.append === "function" && Array.isArray(value._parts);
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  }
});

const clearSessionAndNotify = async () => {
  await AsyncStorage.multiRemove(["token", "refreshToken", "user"]);
  DeviceEventEmitter.emit("auth:expired");
};

let inFlightRefresh: Promise<string | null> | null = null;

const refreshAccessToken = async () => {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    try {
      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (!refreshToken) return null;

      const response = await axios.post(
        "/auth/refresh",
        { refreshToken },
        {
          baseURL: api.defaults.baseURL || API_BASE_URL,
          timeout: 15000,
          headers: { "Content-Type": "application/json" }
        }
      );

      const refreshData = response.data as any;
      const token = refreshData?.data?.token;
      const nextRefreshToken = refreshData?.data?.refreshToken;
      if (!token) return null;

      await AsyncStorage.multiSet([
        ["token", token],
        ["refreshToken", nextRefreshToken || refreshToken]
      ]);

      return token;
    } catch {
      return null;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
};

api.interceptors.request.use(
  async (config: any) => {
    if (isFormDataPayload(config.data) && config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      logDebug("Error reading auth token:", error);
    }

    logDebug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error: any) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: any) => {
    logDebug(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: any) => {
    const requestConfig = error.config;
    const currentRetryIndex = requestConfig?._baseUrlRetryIndex || 0;
    const nextBaseUrl = API_BASE_URLS[currentRetryIndex + 1];
    const isNetworkError = error.message === "Network Error" || (error.request && !error.response);

    if (isNetworkError && requestConfig && nextBaseUrl) {
      logDebug(`Trying fallback API base URL: ${nextBaseUrl}`);
      requestConfig._baseUrlRetryIndex = currentRetryIndex + 1;
      requestConfig.baseURL = nextBaseUrl;
      api.defaults.baseURL = nextBaseUrl;
      return api.request(requestConfig);
    }

    if (
      error.response?.status === 401 &&
      requestConfig &&
      !requestConfig._tokenRefreshRetry &&
      !requestConfig.url?.includes("/auth/refresh")
    ) {
      const refreshedToken = await refreshAccessToken();

      if (refreshedToken) {
        requestConfig._tokenRefreshRetry = true;
        requestConfig.headers = requestConfig.headers || {};
        requestConfig.headers.Authorization = `Bearer ${refreshedToken}`;
        return api.request(requestConfig);
      }

      await clearSessionAndNotify();
    }

    logDebug("API Error:", {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data
    });

    if (error.message === "Network Error") {
      return Promise.reject(new Error("Cannot connect to server. Please check your connection."));
    }

    return Promise.reject(
      error.response?.data || {
        success: false,
        message: error.message || "Unknown error"
      }
    );
  }
);

const extractData = <T>(response: any): ApiResponse<T> => {
  if (response.data && typeof response.data === "object") {
    if ("success" in response.data) {
      return response.data;
    }

    return {
      success: true,
      data: response.data
    };
  }

  return {
    success: true,
    data: response.data
  };
};

export const apiGet = async <T = any>(url: string, config?: any): Promise<ApiResponse<T>> => {
  try {
    const response = await api.get(url, config);
    return extractData<T>(response);
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Request failed",
      ...error
    };
  }
};

export const apiPost = async <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
  try {
    const response = await api.post(url, data, config);
    return extractData<T>(response);
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Request failed",
      ...error
    };
  }
};

export const apiPut = async <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
  try {
    const response = await api.put(url, data, config);
    return extractData<T>(response);
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Request failed",
      ...error
    };
  }
};

export const apiDelete = async <T = any>(url: string, config?: any): Promise<ApiResponse<T>> => {
  try {
    const response = await api.delete(url, config);
    return extractData<T>(response);
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Request failed",
      ...error
    };
  }
};

export const apiPatch = async <T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
  try {
    const response = await api.patch(url, data, config);
    return extractData<T>(response);
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Request failed",
      ...error
    };
  }
};

const typedApi = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  patch: apiPatch
};

export { api as rawApi, API_BASE_URL, API_BASE_URLS };
export default typedApi;

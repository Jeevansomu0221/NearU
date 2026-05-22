import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

const DEV_LAN_HOST = "10.3.8.130";
const ANDROID_EMULATOR_HOST = "10.0.2.2";
const BLOCKED_DEV_HOSTS = new Set(["192.168.43.1", "192.168.61.1"]);
const API_TIMEOUT_MS = 60000;
const PRODUCTION_API_URL = "https://vyaha-app-backend.onrender.com/api";
const PRODUCTION_HEALTH_URL = "https://vyaha-app-backend.onrender.com/health";
const isDev = typeof __DEV__ !== "undefined" && __DEV__;

const logDebug = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

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

  if (!__DEV__) {
    return [PRODUCTION_API_URL];
  }

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

  if (Platform.OS === "android") {
    addUnique(urls, `http://${ANDROID_EMULATOR_HOST}:5000/api`);
  }

  addUnique(urls, `http://${DEV_LAN_HOST}:5000/api`);
  addUnique(urls, "http://127.0.0.1:5000/api");
  addUnique(urls, PRODUCTION_API_URL);

  return urls;
};

const API_BASE_URLS = resolveApiBaseUrls();
const API_BASE_URL = API_BASE_URLS[0];
logDebug("Customer API base URL:", API_BASE_URL);
logDebug("Customer API fallback URLs:", API_BASE_URLS);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  }
});

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

api.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    const requestConfig = error.config;
    const statusCode = error.response?.status;
    const serverMessage = error.response?.data?.message || "";
    const currentRetryIndex = requestConfig?._baseUrlRetryIndex || 0;
    const nextBaseUrl = requestConfig ? API_BASE_URLS[currentRetryIndex + 1] : undefined;
    const isTimeoutError =
      error.code === "ECONNABORTED" ||
      String(error.message || "").toLowerCase().includes("timeout");
    const isNetworkError = error.message === "Network Error" || isTimeoutError || (error.request && !error.response);

    console.error("API Error:", {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data
    });

    if (isNetworkError && requestConfig && nextBaseUrl) {
      logDebug(`Trying fallback API base URL: ${nextBaseUrl}`);
      requestConfig._baseUrlRetryIndex = currentRetryIndex + 1;
      requestConfig.baseURL = nextBaseUrl;
      api.defaults.baseURL = nextBaseUrl;
      return api.request(requestConfig);
    }

    if (isNetworkError) {
      return Promise.reject(new Error("The server is taking longer than usual. Please wait a moment and try again."));
    }

    if (
      statusCode === 401 &&
      requestConfig &&
      !requestConfig._retryAuth &&
      requestConfig.url !== "/auth/refresh" &&
      String(serverMessage).toLowerCase().includes("token expired")
    ) {
      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("Missing refresh token");
        }

        requestConfig._retryAuth = true;
        const refreshResponse = await axios.post(
          "/auth/refresh",
          { refreshToken },
          {
            baseURL: requestConfig.baseURL || api.defaults.baseURL || API_BASE_URL,
            timeout: API_TIMEOUT_MS,
            headers: { "Content-Type": "application/json" }
          }
        );
        const refreshData = (refreshResponse as any).data;
        const refreshedToken = refreshData?.data?.token;
        const refreshedRefreshToken = refreshData?.data?.refreshToken;

        if (!refreshedToken) {
          throw new Error("Refresh response did not include a token");
        }

        await AsyncStorage.multiSet([
          ["token", refreshedToken],
          ["refreshToken", refreshedRefreshToken || refreshToken]
        ]);
        requestConfig.headers = {
          ...(requestConfig.headers || {}),
          Authorization: `Bearer ${refreshedToken}`
        };

        return api.request(requestConfig);
      } catch (refreshError) {
        await AsyncStorage.multiRemove(["token", "refreshToken", "user"]);
        return Promise.reject(new Error("Your session expired. Please log in again."));
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

const extractData = <T>(response: any): ApiResponse<T> => response.data;

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

const typedApi = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  patch: apiPatch,
};

export const warmApi = async () => {
  try {
    await axios.get(PRODUCTION_HEALTH_URL, { timeout: API_TIMEOUT_MS });
  } catch (error) {
    console.warn("Backend warmup failed:", error);
  }
};

export { API_BASE_URL, API_BASE_URLS };
export default typedApi;

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";
import { clearAuthData } from "../utils/storage";
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken
} from "../utils/authStorage";

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
const PRODUCTION_API_URL = "https://vyaha-app-backend.onrender.com/api";
const PRODUCTION_HEALTH_URL = "https://vyaha-app-backend.onrender.com/health";
const API_TIMEOUT_MS = 60000;
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

  if (!isDev) {
    return [PRODUCTION_API_URL];
  }

  const urls: string[] = [];
  addUnique(urls, PRODUCTION_API_URL);

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

  if (Platform.OS === "android") {
    addUnique(urls, `http://${ANDROID_EMULATOR_HOST}:5000/api`);
  }

  addUnique(urls, `http://${DEV_LAN_HOST}:5000/api`);
  addUnique(urls, "http://127.0.0.1:5000/api");
  addUnique(urls, PRODUCTION_API_URL);

  return urls;
};

const API_BASE_URLS = resolveApiBaseUrls();
const REFRESH_BUFFER_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 30_000;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let inFlightRefresh: Promise<string | null> | null = null;

const isFormDataPayload = (value: any) => {
  if (!value || typeof value !== "object") return false;
  if (typeof FormData !== "undefined" && value instanceof FormData) return true;
  return typeof value.append === "function" && Array.isArray(value._parts);
};

const api = axios.create({
  baseURL: API_BASE_URLS[0],
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

logDebug("Partner API base URL:", api.defaults.baseURL);
logDebug("Partner API fallback URLs:", API_BASE_URLS);

const persistAuthPayload = async (payload: any) => {
  if (payload?.token) {
    await setAccessToken(payload.token);
  }

  if (payload?.refreshToken) {
    await setRefreshToken(payload.refreshToken);
  }

  if (payload?.user) {
    await AsyncStorage.setItem("user", JSON.stringify(payload.user));
    if (payload.user.id) {
      await AsyncStorage.setItem("userId", payload.user.id);
    }
    if (payload.user.phone) {
      await AsyncStorage.setItem("phone", payload.user.phone);
    }
    if (payload.user.partnerId) {
      await AsyncStorage.setItem("partnerId", payload.user.partnerId);
    }
  }
};

const clearStoredSession = async () => {
  await clearAuthData();
};

const decodeJwtExpiry = (token: string): number | null => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    if (!globalThis.atob) {
      return null;
    }
    const decoded = JSON.parse(globalThis.atob(padded));
    if (typeof decoded?.exp !== "number") return null;
    return decoded.exp * 1000;
  } catch {
    return null;
  }
};

const clearRefreshTimer = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

export const scheduleProactiveRefresh = async (token?: string | null) => {
  clearRefreshTimer();
  const currentToken = token ?? (await getAccessToken());
  if (!currentToken) return;
  const expiresAt = decodeJwtExpiry(currentToken);
  if (!expiresAt) return;
  const delay = Math.max(expiresAt - Date.now() - REFRESH_BUFFER_MS, MIN_REFRESH_DELAY_MS);
  refreshTimer = setTimeout(() => {
    refreshAccessToken().catch((error) => {
      console.log("Proactive token refresh failed:", error?.message || error);
    });
  }, delay);
};

const refreshAccessToken = async () => {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
  const savedRefreshToken = await getRefreshToken();
  if (!savedRefreshToken) {
    await clearStoredSession();
    return null;
  }

  for (const baseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: savedRefreshToken }),
      });

      const data = await response.json();
      const payload = data?.data;

      if (response.ok && data?.success && payload?.token) {
        await persistAuthPayload(payload);
        await scheduleProactiveRefresh(payload.token);
        return payload.token as string;
      }
    } catch (error: any) {
      console.log(`Token refresh failed for ${baseUrl}:`, error?.message || error);
    }
  }

  await clearStoredSession();
  return null;
  })();

  try {
    return await inFlightRefresh;
  } finally {
    inFlightRefresh = null;
  }
};

export const uploadMultipart = async <T = any>(path: string, formData: FormData): Promise<ApiResponse<T>> => {
  let token = await getAccessToken();
  let didRefresh = false;

  const makeRequest = async (baseUrl: string, authToken?: string | null) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: formData,
    });
    const responseText = await response.text();
    const data = responseText
      ? (() => {
          try {
            return JSON.parse(responseText);
          } catch {
            return { success: false, message: responseText };
          }
        })()
      : null;
    return { response, data };
  };

  for (const baseUrl of API_BASE_URLS) {
    try {
      let { response, data } = await makeRequest(baseUrl, token);

      if (response.status === 401 && !didRefresh) {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          token = refreshedToken;
          didRefresh = true;
          ({ response, data } = await makeRequest(baseUrl, token));
        }
      }

      if (!response.ok) {
        if (data && typeof data === "object") {
          return data;
        }

        return {
          success: false,
          message: `Request failed (${response.status})`,
        };
      }

      return data;
    } catch (error: any) {
      console.log(`Upload failed for ${baseUrl}${path}:`, error?.message || error);
    }
  }

  throw new Error("Network Error");
};

// Add token to requests
api.interceptors.request.use(
  async (config: any) => {
    try {
      if (isFormDataPayload(config.data)) {
        config.headers = config.headers || {};
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }

      const token = await getAccessToken();
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
    logDebug(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: any) => {
    const requestConfig = error.config;
    const currentRetryIndex = requestConfig?._baseUrlRetryIndex || 0;
    const nextBaseUrl = API_BASE_URLS[currentRetryIndex + 1];
    const isTimeoutError =
      error.code === "ECONNABORTED" ||
      String(error.message || "").toLowerCase().includes("timeout");
    const isNetworkError =
      error.message === "Network Error" || isTimeoutError || (error.request && !error.response);

    if (isNetworkError && requestConfig && nextBaseUrl) {
      logDebug(`Trying fallback API base URL: ${nextBaseUrl}`);
      requestConfig._baseUrlRetryIndex = currentRetryIndex + 1;
      requestConfig.baseURL = nextBaseUrl;
      api.defaults.baseURL = nextBaseUrl;
      return api.request(requestConfig);
    }

    if (isNetworkError) {
      return Promise.reject(
        new Error("The server is taking longer than usual. Please wait a moment and try again.")
      );
    }

    if (error.response?.status === 401 && requestConfig && !requestConfig._tokenRefreshRetry && !requestConfig.url?.includes("/auth/refresh")) {
      const refreshedToken = await refreshAccessToken();

      if (refreshedToken) {
        requestConfig._tokenRefreshRetry = true;
        requestConfig.headers = requestConfig.headers || {};
        requestConfig.headers.Authorization = `Bearer ${refreshedToken}`;
        return api.request(requestConfig);
      }

      await clearStoredSession();
    }

    if (error.response) {
      const url = error.config?.url || '';
      const method = error.config?.method?.toUpperCase() || 'GET';
      
      if (url.includes('/partners/my-status') && error.response.status === 404) {
        logDebug(`📝 ${method} ${url}: Partner not found (404) - This is expected for new users`);
        return Promise.resolve(error.response);
      }
      
      logDebug(`❌ API Error ${method} ${url}:`, {
        status: error.response.status,
        statusText: error.response.statusText,
      });
    } else if (error.request) {
      logDebug("🌐 Network error - No response received");
    } else {
      logDebug("🚫 Request setup error:", error.message);
    }
    
    return Promise.reject(error.response?.data || error);
  }
);

export const warmApi = async () => {
  try {
    await axios.get(PRODUCTION_HEALTH_URL, { timeout: API_TIMEOUT_MS });
  } catch (error) {
    console.warn("Backend warmup failed:", error);
  }
};

export default api;

export const bootstrapSessionRefresh = async () => {
  await scheduleProactiveRefresh();
};

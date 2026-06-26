import axios from "axios";
import {
  clearAuthData,
  clearStoredUser,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken
} from "./storage.js";
import type { ApiResponse } from "./types.js";

const API_TIMEOUT_MS = 60000;
const PRODUCTION_API_URL = "https://vyaha-app-backend.onrender.com/api";
const PRODUCTION_HEALTH_URL = "https://vyaha-app-backend.onrender.com/health";

const resolveApiBaseUrl = (): string => {
  let envUrl: string | undefined;
  try {
    envUrl = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL;
  } catch {
    envUrl = undefined;
  }

  if (envUrl?.trim()) {
    const trimmed = envUrl.trim();
    return trimmed.endsWith("/api") ? trimmed : `${trimmed.replace(/\/$/, "")}/api`;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:5000/api";
    }
    return PRODUCTION_API_URL;
  }

  return PRODUCTION_API_URL;
};

export const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  }
});

api.interceptors.request.use((config) => {
  if (typeof localStorage !== "undefined") {
    const token = localStorage.getItem("vyaha_access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestConfig = error.config as {
      _retryAuth?: boolean;
      url?: string;
      baseURL?: string;
      headers?: Record<string, string>;
    };
    const statusCode = error.response?.status;
    const serverMessage = error.response?.data?.message || "";
    const isTimeoutError =
      error.code === "ECONNABORTED" || String(error.message || "").toLowerCase().includes("timeout");
    const isNetworkError =
      error.message === "Network Error" || isTimeoutError || (error.request && !error.response);

    if (isNetworkError) {
      return Promise.reject(
        new Error("The server is taking longer than usual. Please wait a moment and try again.")
      );
    }

    if (
      statusCode === 401 &&
      requestConfig &&
      !requestConfig._retryAuth &&
      requestConfig.url !== "/auth/refresh" &&
      (String(serverMessage).toLowerCase().includes("token expired") ||
        String(serverMessage).toLowerCase().includes("session expired"))
    ) {
      try {
        const refreshToken = await getRefreshToken();
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
        const refreshData = refreshResponse.data as ApiResponse<{
          token: string;
          refreshToken?: string;
        }>;
        const refreshedToken = refreshData?.data?.token;
        const refreshedRefreshToken = refreshData?.data?.refreshToken;

        if (!refreshedToken) {
          throw new Error("Refresh response did not include a token");
        }

        await setAccessToken(refreshedToken);
        await setRefreshToken(refreshedRefreshToken || refreshToken);
        requestConfig.headers = {
          ...(requestConfig.headers || {}),
          Authorization: `Bearer ${refreshedToken}`
        };

        return api.request(requestConfig as never);
      } catch {
        await clearAuthData();
        clearStoredUser();
        return Promise.reject(new Error("Your session expired. Please log in again."));
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

const extractData = <T>(response: { data: ApiResponse<T> }): ApiResponse<T> => response.data;

export const apiGet = async <T = unknown>(
  url: string,
  config?: Record<string, unknown>
): Promise<ApiResponse<T>> => {
  const response = await api.get<ApiResponse<T>>(url, config);
  return extractData<T>(response);
};

export const apiPost = async <T = unknown>(
  url: string,
  data?: unknown,
  config?: Record<string, unknown>
): Promise<ApiResponse<T>> => {
  const response = await api.post<ApiResponse<T>>(url, data, config);
  return extractData<T>(response);
};

export const apiPut = async <T = unknown>(
  url: string,
  data?: unknown,
  config?: Record<string, unknown>
): Promise<ApiResponse<T>> => {
  const response = await api.put<ApiResponse<T>>(url, data, config);
  return extractData<T>(response);
};

export const apiDelete = async <T = unknown>(
  url: string,
  config?: Record<string, unknown>
): Promise<ApiResponse<T>> => {
  const response = await api.delete<ApiResponse<T>>(url, config);
  return extractData<T>(response);
};

export const apiPatch = async <T = unknown>(
  url: string,
  data?: unknown,
  config?: Record<string, unknown>
): Promise<ApiResponse<T>> => {
  const response = await api.patch<ApiResponse<T>>(url, data, config);
  return extractData<T>(response);
};

export const uploadMultipart = async <T = unknown>(path: string, formData: FormData): Promise<ApiResponse<T>> => {
  const response = await api.post<ApiResponse<T>>(path, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return extractData<T>(response);
};

export const warmApi = async () => {
  try {
    await axios.get(PRODUCTION_HEALTH_URL, { timeout: API_TIMEOUT_MS });
  } catch {
    // best effort
  }
};

const typedApi = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  patch: apiPatch
};

export default typedApi;

import axios from "axios";
import { clearAuthData, clearStoredUser, getRefreshToken, setAccessToken, setRefreshToken } from "./storage.js";
const API_TIMEOUT_MS = 60000;
const PRODUCTION_API_URL = "https://api.vyaha.com/api";
const PRODUCTION_HEALTH_URL = "https://api.vyaha.com/health";
const isBrowserLocalhost = () => {
    if (typeof window === "undefined")
        return false;
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
};
const isViteDevServer = () => {
    if (!isBrowserLocalhost())
        return false;
    const port = window.location.port;
    return port === "5173" || port === "5174" || port === "5175";
};
const isProductionApiUrl = (url) => /(?:^https?:\/\/)?api\.vyaha\.com/i.test(url);
const normalizeApiUrl = (url) => url.endsWith("/api") ? url : `${url.replace(/\/$/, "")}/api`;
const resolveApiBaseUrl = () => {
    let envUrl;
    try {
        envUrl = import.meta.env?.VITE_API_URL;
    }
    catch {
        envUrl = undefined;
    }
    const normalizedEnv = envUrl?.trim() ? normalizeApiUrl(envUrl.trim()) : "";
    if (typeof window !== "undefined") {
        if (isViteDevServer()) {
            // Local Vite always uses the /api proxy to localhost:5000, even if .env still has production.
            if (normalizedEnv && !isProductionApiUrl(normalizedEnv)) {
                return normalizedEnv;
            }
            return "/api";
        }
        if (normalizedEnv) {
            return normalizedEnv;
        }
        if (isBrowserLocalhost()) {
            return "http://localhost:5000/api";
        }
        return PRODUCTION_API_URL;
    }
    return normalizedEnv || PRODUCTION_API_URL;
};
export const API_BASE_URL = resolveApiBaseUrl();
export const API_HEALTH_URL = API_BASE_URL === "/api"
    ? "/health"
    : API_BASE_URL.endsWith("/api")
        ? `${API_BASE_URL.replace(/\/api\/?$/, "")}/health`
        : PRODUCTION_HEALTH_URL;
const formatNetworkError = (error) => {
    const axiosError = error;
    const code = axiosError.code || "";
    const message = String(axiosError.message || "").toLowerCase();
    if (code === "ECONNREFUSED" || message.includes("connection refused") || message.includes("err_connection_refused")) {
        if (isViteDevServer() || (isBrowserLocalhost() && API_BASE_URL.includes("localhost"))) {
            return "Cannot reach the local API server. Start it with `cd backend && npm run dev` and make sure MongoDB is available.";
        }
        return "Please check your network and try again.";
    }
    if (code === "ECONNABORTED" || message.includes("timeout")) {
        return "Please check your network and try again.";
    }
    return "Please check your network and try again.";
};
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
const AUTH_SKIP_REFRESH_PATHS = ["/auth/refresh", "/auth/send-otp", "/auth/verify-otp", "/auth/logout", "/auth/partner-staff-login"];
const authExpiredListeners = new Set();
export const onAuthExpired = (listener) => {
    authExpiredListeners.add(listener);
    return () => {
        authExpiredListeners.delete(listener);
    };
};
const notifyAuthExpired = () => {
    authExpiredListeners.forEach((listener) => {
        try {
            listener();
        }
        catch {
            // ignore listener errors
        }
    });
};
const shouldAttemptTokenRefresh = (url) => {
    if (!url)
        return true;
    const path = url.split("?")[0] || "";
    return !AUTH_SKIP_REFRESH_PATHS.some((skip) => path === skip || path.endsWith(skip));
};
api.interceptors.response.use((response) => response, async (error) => {
    const requestConfig = error.config;
    const statusCode = error.response?.status;
    const isTimeoutError = error.code === "ECONNABORTED" || String(error.message || "").toLowerCase().includes("timeout");
    const isNetworkError = error.message === "Network Error" || isTimeoutError || (error.request && !error.response);
    if (isNetworkError) {
        return Promise.reject(new Error(formatNetworkError(error)));
    }
    if (statusCode === 401 && requestConfig && !requestConfig._retryAuth && shouldAttemptTokenRefresh(requestConfig.url)) {
        try {
            const refreshToken = await getRefreshToken();
            if (!refreshToken) {
                throw new Error("Missing refresh token");
            }
            requestConfig._retryAuth = true;
            const refreshResponse = await axios.post("/auth/refresh", { refreshToken }, {
                baseURL: requestConfig.baseURL || api.defaults.baseURL || API_BASE_URL,
                timeout: API_TIMEOUT_MS,
                headers: { "Content-Type": "application/json" }
            });
            const refreshData = refreshResponse.data;
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
            return api.request(requestConfig);
        }
        catch {
            await clearAuthData();
            clearStoredUser();
            notifyAuthExpired();
            return Promise.reject(new Error("Your session expired. Please log in again."));
        }
    }
    return Promise.reject(error.response?.data || error);
});
const extractData = (response) => response.data;
export const apiGet = async (url, config) => {
    const response = await api.get(url, config);
    return extractData(response);
};
export const apiPost = async (url, data, config) => {
    const response = await api.post(url, data, config);
    return extractData(response);
};
export const apiPut = async (url, data, config) => {
    const response = await api.put(url, data, config);
    return extractData(response);
};
export const apiDelete = async (url, config) => {
    const response = await api.delete(url, config);
    return extractData(response);
};
export const apiPatch = async (url, data, config) => {
    const response = await api.patch(url, data, config);
    return extractData(response);
};
export const uploadMultipart = async (path, formData) => {
    const response = await api.post(path, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return extractData(response);
};
export const checkApiHealth = async () => {
    try {
        const response = await axios.get(API_HEALTH_URL, { timeout: 12000 });
        return response.status >= 200 && response.status < 300;
    }
    catch {
        return false;
    }
};
export const warmApi = async () => {
    await checkApiHealth();
};
const typedApi = {
    get: apiGet,
    post: apiPost,
    put: apiPut,
    delete: apiDelete,
    patch: apiPatch
};
export default typedApi;

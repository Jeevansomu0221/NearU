import axios from "axios";
import { clearAuthData, clearStoredUser, getRefreshToken, setAccessToken, setRefreshToken } from "./storage.js";
const API_TIMEOUT_MS = 60000;
const PRODUCTION_API_URL = "https://vyaha-app-backend.onrender.com/api";
const PRODUCTION_HEALTH_URL = "https://vyaha-app-backend.onrender.com/health";
const resolveApiBaseUrl = () => {
    let envUrl;
    try {
        envUrl = import.meta.env?.VITE_API_URL;
    }
    catch {
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
api.interceptors.response.use((response) => response, async (error) => {
    const requestConfig = error.config;
    const statusCode = error.response?.status;
    const serverMessage = error.response?.data?.message || "";
    const isTimeoutError = error.code === "ECONNABORTED" || String(error.message || "").toLowerCase().includes("timeout");
    const isNetworkError = error.message === "Network Error" || isTimeoutError || (error.request && !error.response);
    if (isNetworkError) {
        return Promise.reject(new Error("The server is taking longer than usual. Please wait a moment and try again."));
    }
    if (statusCode === 401 &&
        requestConfig &&
        !requestConfig._retryAuth &&
        requestConfig.url !== "/auth/refresh" &&
        (String(serverMessage).toLowerCase().includes("token expired") ||
            String(serverMessage).toLowerCase().includes("session expired"))) {
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
export const warmApi = async () => {
    try {
        await axios.get(PRODUCTION_HEALTH_URL, { timeout: API_TIMEOUT_MS });
    }
    catch {
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

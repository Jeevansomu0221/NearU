import axios from "axios";
import { clearToken } from "../utils/auth";

const PRODUCTION_API_URL = "https://vyaha-app-backend.onrender.com/api";
const LOCAL_API_URL = "http://localhost:5000/api";

const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    return envUrl.endsWith("/api") ? envUrl : `${envUrl.replace(/\/$/, "")}/api`;
  }

  if (import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_API === "true") {
    return LOCAL_API_URL;
  }

  return PRODUCTION_API_URL;
};

export const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;

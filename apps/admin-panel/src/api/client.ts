import axios from "axios";
import { clearToken } from "../utils/auth";

const resolveApiBaseUrl = () => {
  const host = window.location.hostname;

  if (!host || host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:5000/api";
  }

  return `http://${host}:5000/api`;
};

const API_BASE_URL = resolveApiBaseUrl();

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

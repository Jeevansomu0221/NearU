import axios from "axios";
import { getToken } from "../utils/storage";

const api = axios.create({
  baseURL: "http://10.61.129.57:5000/api",
  timeout: 10000
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

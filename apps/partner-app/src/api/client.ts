import axios from "axios";
import { getToken } from "../utils/storage";

const api = axios.create({
  baseURL: "http://10.9.72.39:5000/api",
  timeout: 10000
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

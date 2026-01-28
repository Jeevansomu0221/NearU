import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// CHANGE THIS to your computer's IP
const API_BASE_URL = "http://10.61.129.57:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

// REQUEST INTERCEPTOR (WITH ASYNC/AWAIT)
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

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response: any) => response.data,
  (error: any) => {
    // You can handle errors here
    return Promise.reject(error);
  }
);

export default api;
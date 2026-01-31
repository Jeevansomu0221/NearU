import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "http://10.3.128.220:5000/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config: any) => {
    try {
      const token = await AsyncStorage.getItem("token");
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
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      // For 404 responses on /partners/my-status, we want to treat them as normal responses
      // because they just mean "partner not found" which is a valid application state
      const url = error.config?.url || '';
      const method = error.config?.method?.toUpperCase() || 'GET';
      
      if (url.includes('/partners/my-status') && error.response.status === 404) {
        console.log(`📝 ${method} ${url}: Partner not found (404) - This is expected for new users`);
        // Return the error response as a successful response so it can be handled in the component
        return Promise.resolve(error.response);
      }
      
      console.error(`❌ API Error ${method} ${url}:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
      });
      
      console.error("Full error response:", JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // The request was made but no response was received
      console.error("🌐 Network error - No response received:", error.request);
    } else {
      // Something happened in setting up the request
      console.error("🚫 Request setup error:", error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
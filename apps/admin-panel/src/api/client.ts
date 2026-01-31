// apps/admin-panel/src/api/client.ts
import axios from 'axios';

const API_BASE_URL = 'http://10.3.128.220:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log("🔍 Client.ts - Making request to:", config.url);
    
    const token = localStorage.getItem('adminToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("✅ Client.ts - Added Authorization header");
      
      // Debug token
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log("🔍 Client.ts - Token payload:", {
            role: payload.role,
            phone: payload.phone,
            id: payload.id.substring(0, 8) + '...'
          });
        }
      } catch (e) {
        console.warn("⚠️ Client.ts - Could not decode token:", e);
      }
    } else {
      console.warn("⚠️ Client.ts - No adminToken found in localStorage");
      console.log("Available localStorage keys:", Object.keys(localStorage));
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Client.ts - Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('✅ Client.ts - Success:', {
      url: response.config.url,
      status: response.status,
      dataCount: response.data?.data?.length || 'N/A'
    });
    return response;
  },
  (error) => {
    const errorDetails = {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    };
    
    console.error('❌ Client.ts - API Error:', errorDetails);
    
    if (error.response?.status === 401) {
      console.warn('⚠️ Client.ts - 401 Unauthorized - Clearing tokens');
      localStorage.clear();
      window.location.href = '/login';
    }
    
    if (error.response?.status === 403) {
      console.warn('⚠️ Client.ts - 403 Forbidden');
      if (error.response?.data?.message) {
        console.error("Server message:", error.response.data.message);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
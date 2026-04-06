import api from "./client";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define response interfaces
interface VerifyOtpResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    phone: string;
    name: string;
    role: string;
    partnerId?: string;
  };
  message?: string;
}

interface SendOtpResponse {
  success: boolean;
  message: string;
  data?: any;
}

interface AuthData {
  token: string;
  phone: string;
  userId: string;
  partnerId?: string;
}

// Store auth data in AsyncStorage
export const storeAuthData = async (authData: AuthData) => {
  try {
    await AsyncStorage.setItem("token", authData.token);
    await AsyncStorage.setItem("phone", authData.phone);
    await AsyncStorage.setItem("userId", authData.userId);
    if (authData.partnerId) {
      await AsyncStorage.setItem("partnerId", authData.partnerId);
    }
    console.log("✅ Auth data stored successfully");
  } catch (error) {
    console.error("❌ Error storing auth data:", error);
    throw error;
  }
};

// Clear auth data on logout
export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("phone");
    await AsyncStorage.removeItem("userId");
    await AsyncStorage.removeItem("partnerId");
    await AsyncStorage.removeItem("user");
    console.log("✅ Auth data cleared");
  } catch (error) {
    console.error("❌ Error clearing auth data:", error);
  }
};

// Send OTP
export const sendOtp = async (phone: string, role: string) => {
  try {
    console.log(`📱 Sending OTP to ${phone} with role ${role}`);
    const response = await api.post<SendOtpResponse>("/auth/send-otp", { phone, role });
    console.log("✅ OTP sent successfully:", response.data);
    return response;
  } catch (error: any) {
    console.error("❌ Send OTP error:", error);
    throw error;
  }
};

// Verify OTP
export const verifyOtp = async (phone: string, otp: string, role: string) => {
  try {
    console.log(`🔐 Verifying OTP for ${phone} with role ${role}`);
    const response = await api.post<VerifyOtpResponse>("/auth/verify-otp", { 
      phone, 
      otp, 
      role 
    });
    
    const responseData = response.data;
    console.log("✅ OTP verification response:", responseData);
    
    // Type guard to ensure data structure
    if (responseData.success && responseData.token && responseData.user) {
      await storeAuthData({
        token: responseData.token,
        phone: responseData.user.phone,
        userId: responseData.user.id,
        partnerId: responseData.user.partnerId,
      });
      
      // Also store full user object
      await AsyncStorage.setItem("user", JSON.stringify(responseData.user));
      
      console.log("✅ Auth data saved successfully");
      console.log(`📝 User ID: ${responseData.user.id}`);
      console.log(`🔑 Token: ${responseData.token.substring(0, 20)}...`);
    } else {
      console.error("❌ Invalid response structure:", responseData);
      throw new Error("Invalid response from server");
    }
    
    return response;
  } catch (error: any) {
    console.error("❌ Verify OTP error:", error);
    throw error;
  }
};

// Get current auth token
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem("token");
    return token;
  } catch (error) {
    console.error("❌ Error getting token:", error);
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    return !!token;
  } catch (error) {
    return false;
  }
};

// Test connection to backend
export const testBackendConnection = async () => {
  try {
    console.log("🌐 Testing backend connection...");
    const response = await api.get("/health");
    console.log("✅ Backend connection successful:", response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("❌ Backend connection failed:", error.message);
    return { success: false, error: error.message };
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const userStr = await AsyncStorage.getItem("user");
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    console.error("❌ Error getting current user:", error);
    return null;
  }
};

// Logout function
export const logout = async () => {
  try {
    await clearAuthData();
    console.log("✅ User logged out successfully");
    return true;
  } catch (error) {
    console.error("❌ Logout error:", error);
    return false;
  }
};
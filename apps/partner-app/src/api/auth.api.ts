import api from "./client";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface VerifyOtpPayload {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    phone: string;
    name: string;
    role: string;
    partnerId?: string;
  };
}

interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  data?: VerifyOtpPayload;
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

export const storeAuthData = async (authData: AuthData) => {
  await AsyncStorage.setItem("token", authData.token);
  await AsyncStorage.setItem("phone", authData.phone);
  await AsyncStorage.setItem("userId", authData.userId);

  if (authData.partnerId) {
    await AsyncStorage.setItem("partnerId", authData.partnerId);
  } else {
    await AsyncStorage.removeItem("partnerId");
  }
};

export const clearAuthData = async () => {
  await AsyncStorage.multiRemove(["token", "refreshToken", "phone", "userId", "partnerId", "user"]);
};

export const sendOtp = async (phone: string, role: string) => {
  return api.post<SendOtpResponse>("/auth/send-otp", { phone, role });
};

export const verifyOtp = async (phone: string, otp: string, role: string) => {
  const response = await api.post<VerifyOtpResponse>("/auth/verify-otp", {
    phone,
    otp,
    role
  });

  const payload = response.data?.data;
  if (!response.data?.success || !payload?.token || !payload?.user) {
    throw new Error(response.data?.message || "Invalid response from server");
  }

  await storeAuthData({
    token: payload.token,
    phone: payload.user.phone,
    userId: payload.user.id,
    partnerId: payload.user.partnerId
  });

  await AsyncStorage.setItem("user", JSON.stringify(payload.user));
  if (payload.refreshToken) {
    await AsyncStorage.setItem("refreshToken", payload.refreshToken);
  } else {
    await AsyncStorage.removeItem("refreshToken");
  }

  return payload;
};

export const getAuthToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem("token");
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getAuthToken();
  return !!token;
};

export const testBackendConnection = async () => {
  try {
    const response = await api.get("/health");
    return { success: true, data: response.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = async () => {
  const userStr = await AsyncStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

export const logout = async () => {
  try {
    await clearAuthData();
    return true;
  } catch {
    return false;
  }
};

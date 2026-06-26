import { clearAuthData, removeRefreshToken, setAccessToken, setRefreshToken, setStoredPhone, setStoredUser } from "./storage.js";
import api from "./client.js";
export const sendOtp = async (phone, role) => {
    const res = await api.post("/auth/send-otp", { phone, role });
    return {
        success: res.success,
        message: res.message || "",
        data: res.data
    };
};
export const verifyOtp = async (phone, otp, role) => {
    return api.post("/auth/verify-otp", { phone, otp, role });
};
export const verifyFirebaseOtp = async (phone, firebaseIdToken, role) => {
    return api.post("/auth/verify-otp", { phone, firebaseIdToken, role });
};
export const persistAuthSession = async (token, refreshToken, user, phone) => {
    await setAccessToken(token);
    if (refreshToken) {
        await setRefreshToken(refreshToken);
    }
    else {
        await removeRefreshToken();
    }
    if (user) {
        setStoredUser(user);
    }
    if (phone) {
        setStoredPhone(phone);
    }
};
export const logout = async () => {
    try {
        await api.post("/auth/logout");
    }
    catch {
        // best effort
    }
    finally {
        await clearAuthData();
    }
};
export const deleteAccount = async () => {
    await api.delete("/users/me");
    await clearAuthData();
};

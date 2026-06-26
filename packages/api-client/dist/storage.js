const ACCESS_TOKEN_KEY = "vyaha_access_token";
const REFRESH_TOKEN_KEY = "vyaha_refresh_token";
const USER_KEY = "vyaha_user";
const PHONE_KEY = "vyaha_phone";
const hasStorage = () => typeof localStorage !== "undefined";
export const getAccessToken = async () => {
    if (!hasStorage())
        return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
};
export const getRefreshToken = async () => {
    if (!hasStorage())
        return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
};
export const setAccessToken = async (token) => {
    if (!hasStorage())
        return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
};
export const setRefreshToken = async (token) => {
    if (!hasStorage())
        return;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
};
export const removeRefreshToken = async () => {
    if (!hasStorage())
        return;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};
export const clearAuthTokens = async () => {
    if (!hasStorage())
        return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};
export const getStoredUser = () => {
    if (!hasStorage())
        return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
};
export const setStoredUser = (user) => {
    if (!hasStorage())
        return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const clearStoredUser = () => {
    if (!hasStorage())
        return;
    localStorage.removeItem(USER_KEY);
};
export const getStoredPhone = () => {
    if (!hasStorage())
        return null;
    return localStorage.getItem(PHONE_KEY);
};
export const setStoredPhone = (phone) => {
    if (!hasStorage())
        return;
    localStorage.setItem(PHONE_KEY, phone);
};
export const clearStoredPhone = () => {
    if (!hasStorage())
        return;
    localStorage.removeItem(PHONE_KEY);
};
export const clearAuthData = async () => {
    await clearAuthTokens();
    clearStoredUser();
    clearStoredPhone();
};

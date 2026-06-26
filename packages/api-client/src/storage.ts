const ACCESS_TOKEN_KEY = "vyaha_access_token";
const REFRESH_TOKEN_KEY = "vyaha_refresh_token";
const USER_KEY = "vyaha_user";
const PHONE_KEY = "vyaha_phone";

const hasStorage = () => typeof localStorage !== "undefined";

export const getAccessToken = async (): Promise<string | null> => {
  if (!hasStorage()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = async (): Promise<string | null> => {
  if (!hasStorage()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setAccessToken = async (token: string): Promise<void> => {
  if (!hasStorage()) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const setRefreshToken = async (token: string): Promise<void> => {
  if (!hasStorage()) return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const removeRefreshToken = async (): Promise<void> => {
  if (!hasStorage()) return;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const clearAuthTokens = async (): Promise<void> => {
  if (!hasStorage()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getStoredUser = (): Record<string, unknown> | null => {
  if (!hasStorage()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: Record<string, unknown>): void => {
  if (!hasStorage()) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStoredUser = (): void => {
  if (!hasStorage()) return;
  localStorage.removeItem(USER_KEY);
};

export const getStoredPhone = (): string | null => {
  if (!hasStorage()) return null;
  return localStorage.getItem(PHONE_KEY);
};

export const setStoredPhone = (phone: string): void => {
  if (!hasStorage()) return;
  localStorage.setItem(PHONE_KEY, phone);
};

export const clearStoredPhone = (): void => {
  if (!hasStorage()) return;
  localStorage.removeItem(PHONE_KEY);
};

export const clearAuthData = async (): Promise<void> => {
  await clearAuthTokens();
  clearStoredUser();
  clearStoredPhone();
};

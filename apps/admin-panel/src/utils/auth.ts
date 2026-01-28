// apps/admin-panel/src/utils/auth.ts
export const setToken = (token: string) => {
  localStorage.setItem("adminToken", token);
};

export const getToken = () => {
  return localStorage.getItem("adminToken");
};

export const clearToken = () => {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
  localStorage.removeItem("adminPhone");
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const getAdminUser = () => {
  const user = localStorage.getItem("adminUser");
  return user ? JSON.parse(user) : null;
};
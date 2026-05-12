// apps/admin-panel/src/utils/auth.ts
export const setToken = (token: string) => {
  console.log("🔄 auth.ts - Setting adminToken:", token.substring(0, 20) + '...');
  localStorage.setItem("adminToken", token);
};

export const getToken = () => {
  const token = localStorage.getItem("adminToken");
  console.log("🔄 auth.ts - Getting adminToken:", token ? "Found" : "Not found");
  return token;
};

export const clearToken = () => {
  console.log("🔄 auth.ts - Clearing all tokens");
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
  localStorage.removeItem("adminPhone");
  localStorage.removeItem("adminRefreshToken");
};

export const isAuthenticated = () => {
  const token = getToken();
  const isAuth = !!token;
  console.log("🔄 auth.ts - Is authenticated:", isAuth);
  return isAuth;
};

export const getAdminUser = () => {
  const userStr = localStorage.getItem("adminUser");
  if (!userStr) {
    console.log("🔄 auth.ts - No adminUser found");
    return null;
  }
  
  try {
    const user = JSON.parse(userStr);
    console.log("🔄 auth.ts - Admin user found, role:", user.role);
    return user;
  } catch (e) {
    console.error("🔄 auth.ts - Failed to parse adminUser:", e);
    return null;
  }
};

// New function to check if user is admin
export const isAdmin = () => {
  const user = getAdminUser();
  const isAdmin = user && user.role === "admin";
  console.log("🔄 auth.ts - Is admin:", isAdmin);
  return isAdmin;
};

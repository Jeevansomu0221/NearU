let token: string | null = null;

export const setToken = (t: string) => {
  token = t;
  localStorage.setItem("admin_token", t);
};

export const getToken = () => {
  if (!token) {
    token = localStorage.getItem("admin_token");
  }
  return token;
};

export const logout = () => {
  token = null;
  localStorage.removeItem("admin_token");
};

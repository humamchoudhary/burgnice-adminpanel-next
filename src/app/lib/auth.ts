// lib/auth.ts
export const isAuthenticated = () => {
  if (typeof window !== "undefined") {
    return !!localStorage.getItem("adminToken");
  }
  return false;
};

export const login = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("adminToken", token);
  }
};

export const logout = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("adminToken");
  }
};

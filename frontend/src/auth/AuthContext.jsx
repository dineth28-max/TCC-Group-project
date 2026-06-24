import { createContext, useContext, useEffect, useState } from "react";
import apiClient, { setAccessToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | authenticated | anonymous

  async function tryRestoreSession() {
    try {
      const refreshRes = await apiClient.post("/auth/refresh");
      setAccessToken(refreshRes.data.accessToken);
      const meRes = await apiClient.get("/auth/me");
      setUser(meRes.data);
      setStatus("authenticated");
    } catch {
      setAccessToken(null);
      setUser(null);
      setStatus("anonymous");
    }
  }

  useEffect(() => {
    tryRestoreSession();
  }, []);

  async function login(email, password) {
    const res = await apiClient.post("/auth/login", { email, password });
    setAccessToken(res.data.accessToken);
    const meRes = await apiClient.get("/auth/me");
    setUser(meRes.data);
    setStatus("authenticated");
    return meRes.data;
  }

  async function logout() {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus("anonymous");
    }
  }

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

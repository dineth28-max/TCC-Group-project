import { createContext, useContext, useEffect, useState } from "react";
import apiClient, { setAccessToken, setAuthExpiredHandler } from "../api/client";

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
    // If the access token expires mid-session and the refresh token is also gone (expired/
    // revoked), the response interceptor in api/client.js calls this to force the user back to
    // a logged-out state instead of leaving them stuck behind a wall of silent 401s.
    setAuthExpiredHandler(() => {
      setUser(null);
      setStatus("anonymous");
    });
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

  // Used after a forced password change so the mustChangePassword flag clears without a full
  // page reload — re-fetches "who am I" and replaces the cached user object.
  async function refreshUser() {
    const meRes = await apiClient.get("/auth/me");
    setUser(meRes.data);
    return meRes.data;
  }

  return (
    <AuthContext.Provider value={{ user, status, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true, // refresh token travels as an httpOnly cookie
});

let accessToken = null;
let onAuthExpired = null;

export function setAccessToken(token) {
  accessToken = token;
}

// AuthContext registers this so the interceptor below can hand off "refresh failed, log out"
// without the two modules needing to import each other.
export function setAuthExpiredHandler(handler) {
  onAuthExpired = handler;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// The access token is short-lived (15 minutes). Without this, every request made after it
// expires fails with a generic 401 and the user sees scattered "Could not load…" errors with
// no way to recover short of a manual page reload. Refresh once and retry the original request;
// if the refresh itself fails (refresh token expired/revoked too), force a logout.
let refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthEndpoint = config?.url?.startsWith("/auth/");
    if (response?.status !== 401 || isAuthEndpoint || config._retried) {
      return Promise.reject(error);
    }

    config._retried = true;
    try {
      refreshPromise ??= apiClient.post("/auth/refresh").finally(() => {
        refreshPromise = null;
      });
      const refreshRes = await refreshPromise;
      setAccessToken(refreshRes.data.accessToken);
      config.headers.Authorization = `Bearer ${refreshRes.data.accessToken}`;
      return apiClient(config);
    } catch (refreshError) {
      setAccessToken(null);
      onAuthExpired?.();
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;

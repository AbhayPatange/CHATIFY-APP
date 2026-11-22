import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "/api";
// Socket.IO connects at the server origin; `/api` is an HTTP route, not a
// Socket.IO namespace. Normalising also protects against a common deployment
// mistake: setting VITE_SOCKET_URL to the same value as VITE_API_URL.
const socketEndpoint = import.meta.env.VITE_SOCKET_URL || API_URL;
export const SOCKET_URL = socketEndpoint.startsWith("http") ? new URL(socketEndpoint).origin : "/";

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30_000, // image uploads can be slow
});

/** Turns any axios/network error into a message safe to show the user. */
export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === "ECONNABORTED") return "The request timed out. Please try again.";
  if (error?.request && !error.response) return "Cannot reach the server. Check your connection.";
  return fallback;
};

// Registered by the auth store (avoids a circular import).
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

const AUTH_ENTRY_URLS = ["/auth/login", "/auth/signup", "/auth/check"];

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    // an expired/revoked session mid-use: drop back to the login screen
    if (error.response?.status === 401 && !AUTH_ENTRY_URLS.some((u) => url.startsWith(u))) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

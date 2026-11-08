import { create } from "zustand";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { axiosInstance, getErrorMessage, setUnauthorizedHandler, SOCKET_URL } from "../lib/axios";
import { useChatStore } from "./useChatStore";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  socket: null,
  onlineUsers: [],

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      set({ authUser: null });
      if (error.response?.status !== 401) console.error("Error in checkAuth:", error);
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully!");
      get().connectSocket();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(getErrorMessage(error, "Login failed. Please try again."));
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // Clears everything tied to the signed-in user so the next user never sees stale data.
  clearSession: () => {
    get().disconnectSocket();
    useChatStore.getState().reset();
    set({ authUser: null });
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      get().clearSession();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Error logging out"));
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    // guard on the socket object itself: "connected" is false while still connecting,
    // which previously allowed duplicate connections (e.g. React StrictMode double-run)
    if (!get().authUser || get().socket) return;

    const socket = io("https://api.pinglet.site", {
      transports: ["websocket", "polling"],
    });

    socket.on("getOnlineUsers", (userIds) => set({ onlineUsers: userIds }));
    socket.on("connect_error", (err) => {
      console.warn("Socket connection error:", err.message);
      if (err.message?.startsWith("Unauthorized") && get().authUser) {
        // cookie is gone/expired: re-check, which routes to /login if the session is really dead
        socket.disconnect();
        set({ socket: null });
        get().checkAuth();
      }
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    set({ socket: null, onlineUsers: [] });
  },
}));

// a 401 on any normal API call means the session expired
setUnauthorizedHandler(() => {
  if (useAuthStore.getState().authUser) {
    useAuthStore.getState().clearSession();
    toast.error("Your session has expired. Please log in again.");
  }
});

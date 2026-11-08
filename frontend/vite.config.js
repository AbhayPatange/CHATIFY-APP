import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND = process.env.VITE_DEV_BACKEND || "https://chatify-app-1-g6jc.onrender.com/";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // proxy API + websockets so the app is same-origin in dev too (cookies "just work", no CORS)
    proxy: {
      "/api": { target: BACKEND, changeOrigin: true },
      "/socket.io": { target: BACKEND, changeOrigin: true, ws: true },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
});

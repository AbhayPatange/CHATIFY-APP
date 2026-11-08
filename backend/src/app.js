import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { ENV } from "./lib/env.js";
import { securityHeaders } from "./middleware/security.middleware.js";
import { apiNotFound, errorHandler } from "./middleware/error.middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.resolve(__dirname, "../../frontend/dist");

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", ENV.TRUST_PROXY); // so req.ip / rate limits use the real client IP behind a proxy

  app.use(securityHeaders);

  // liveness/readiness probe: registered before CORS, Arcjet and body parsing on purpose
  app.get("/api/health", (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ status: dbUp ? "ok" : "degraded", db: dbUp ? "up" : "down" });
  });

  app.use(cors({ origin: ENV.CLIENT_ORIGINS, credentials: true }));

  // image routes accept base64 payloads; everything else gets a tight body limit.
  // (body-parser skips a request that was already parsed, so order matters here)
  app.use("/api/messages/send", express.json({ limit: "5mb" }));
  app.use("/api/auth/update-profile", express.json({ limit: "5mb" }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.use("/api/auth", authRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api", apiNotFound);

  // serve the built React app (single-service deployment)
  if (ENV.IS_PROD) {
    if (fs.existsSync(path.join(FRONTEND_DIST, "index.html"))) {
      app.use(
        express.static(FRONTEND_DIST, {
          index: false,
          setHeaders: (res, filePath) => {
            // Vite fingerprints files in /assets, so they can be cached forever
            if (filePath.includes(`${path.sep}assets${path.sep}`)) {
              res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            } else {
              res.setHeader("Cache-Control", "public, max-age=3600");
            }
          },
        })
      );
      // SPA fallback (never swallow API or socket.io paths)
      app.get(/^\/(?!api\/|socket\.io\/).*/, (_req, res) => {
        res.setHeader("Cache-Control", "no-cache");
        res.sendFile(path.join(FRONTEND_DIST, "index.html"));
      });
    } else {
      console.warn(`Frontend build not found at ${FRONTEND_DIST}. Run "npm run build" first.`);
    }
  }

  app.use(errorHandler);
  return app;
}

import express from "express";
import { acceptConnection, getConnections, removeConnection, requestConnection } from "../controllers/connection.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { createRateLimiter, requireTrustedOrigin } from "../middleware/rateLimit.middleware.js";
import { ENV } from "../lib/env.js";

const router = express.Router();
const trustedOrigin = requireTrustedOrigin(ENV.CLIENT_ORIGINS);
const requestLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 20, message: "Too many connection requests. Try again later." });
router.use(arcjetProtection, protectRoute);
router.get("/", getConnections);
router.post("/request", trustedOrigin, requestLimiter, requestConnection);
router.post("/:id/accept", trustedOrigin, acceptConnection);
router.delete("/:id", trustedOrigin, removeConnection);
export default router;

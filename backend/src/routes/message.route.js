import express from "express";
import {
  getAllContacts,
  getChatPartners,
  getMessagesByUserId,
  markMessagesSeen,
  sendMessage,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { createRateLimiter, requireTrustedOrigin } from "../middleware/rateLimit.middleware.js";
import { ENV } from "../lib/env.js";

const router = express.Router();
const sendLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many messages sent. Please slow down.",
});
const readReceiptLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many read-receipt requests. Please slow down.",
});
const trustedOrigin = requireTrustedOrigin(ENV.CLIENT_ORIGINS);

// requests get rate-limited first, then authenticated
router.use(arcjetProtection, protectRoute);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", trustedOrigin, sendLimiter, sendMessage);
router.put("/seen/:id", trustedOrigin, readReceiptLimiter, markMessagesSeen);

export default router;

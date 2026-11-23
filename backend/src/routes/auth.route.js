import express from "express";
import { signup, login, logout, updateProfile, setupEncryption, forgotPassword, resetPassword, blockUser, unblockUser, getBlockedUsers } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { createRateLimiter, requireTrustedOrigin } from "../middleware/rateLimit.middleware.js";
import { ENV } from "../lib/env.js";

const router = express.Router();

// only failed logins count, so legitimate users are never locked out
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  countOnlyFailures: true,
  message: "Too many failed login attempts. Please try again in a few minutes.",
});
const signupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many sign-up attempts. Please try again later.",
});
const profileLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many profile updates. Please try again later.",
});
const trustedOrigin = requireTrustedOrigin(ENV.CLIENT_ORIGINS);
const passwordResetLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: "Too many reset requests. Please try again later." });

router.use(arcjetProtection);

router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", trustedOrigin, passwordResetLimiter, resetPassword);
router.post("/logout", trustedOrigin, logout);

router.put("/update-profile", trustedOrigin, protectRoute, profileLimiter, updateProfile);
router.put("/encryption-key", trustedOrigin, protectRoute, profileLimiter, setupEncryption);
router.post("/block/:id", trustedOrigin, protectRoute, blockUser);
router.delete("/block/:id", trustedOrigin, protectRoute, unblockUser);
router.get("/blocked", protectRoute, getBlockedUsers);

router.get("/check", protectRoute, (req, res) =>
  res.status(200).json({
    _id: req.user._id,
    fullName: req.user.fullName,
    email: req.user.email,
    profilePic: req.user.profilePic,
    encryptionPublicKey: req.user.encryptionPublicKey || "",
    encryptionKeyBundle: req.user.encryptionKeyBundle || null,
  })
);

export default router;

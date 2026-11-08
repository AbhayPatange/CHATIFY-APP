import aj from "../lib/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";

export const arcjetProtection = async (req, res, next) => {
  if (!aj) return next(); // Arcjet not configured

  try {
    const decision = await aj.protect(req);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return res.status(429).json({ message: "Rate limit exceeded. Please try again later." });
      }
      if (decision.reason.isBot()) {
        return res.status(403).json({ message: "Bot access denied." });
      }
      return res.status(403).json({ message: "Access denied by security policy." });
    }

    if (decision.results.some(isSpoofedBot)) {
      return res.status(403).json({ message: "Malicious bot activity detected." });
    }
  } catch (error) {
    // fail open: an Arcjet outage must not take the whole API down
    console.error("Arcjet protection error:", error.message);
  }
  next();
};

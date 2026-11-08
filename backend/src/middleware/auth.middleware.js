import User from "../models/User.js";
import { clearAuthCookie, verifyToken } from "../lib/utils.js";

const JWT_ERRORS = new Set(["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"]);

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;
    if (!token) return res.status(401).json({ message: "Unauthorized - No token provided" });

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.userId);
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ message: "Unauthorized - User no longer exists" });
    }

    req.user = user;
    next();
  } catch (error) {
    // a bad/expired token is the client's problem (401), not a server error
    if (JWT_ERRORS.has(error.name)) {
      clearAuthCookie(res);
      return res.status(401).json({ message: "Unauthorized - Invalid or expired token" });
    }
    next(error);
  }
};

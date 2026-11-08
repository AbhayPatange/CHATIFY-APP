import User from "../models/User.js";
import { getTokenFromCookieHeader, verifyToken } from "../lib/utils.js";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = getTokenFromCookieHeader(socket.handshake.headers.cookie);
    if (!token) return next(new Error("Unauthorized - No Token Provided"));

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error("Unauthorized - User not found"));

    socket.user = user;
    socket.userId = user._id.toString();
    next();
  } catch (error) {
    next(new Error("Unauthorized - Authentication failed"));
  }
};

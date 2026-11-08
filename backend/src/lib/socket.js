import { Server } from "socket.io";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import Message, { MESSAGE_STATUS } from "../models/Message.js";

let io = null;

// userId -> number of open sockets (a user can have several tabs / devices)
const onlineCounts = new Map();

const broadcastOnlineUsers = () => io?.emit("getOnlineUsers", [...onlineCounts.keys()]);

export const isUserOnline = (userId) => onlineCounts.has(String(userId));

/**
 * The user just came online: everything that was waiting for them ("sent") is now "delivered".
 * Each sender is told which of their messages changed so their single tick becomes a double tick.
 */
async function markPendingAsDelivered(userId) {
  try {
    const pending = await Message.find({ receiverId: userId, status: MESSAGE_STATUS.SENT })
      .select("_id senderId")
      .lean();
    if (pending.length === 0) return;

    const now = new Date();
    await Message.updateMany(
      { _id: { $in: pending.map((m) => m._id) }, status: MESSAGE_STATUS.SENT },
      { $set: { status: MESSAGE_STATUS.DELIVERED, deliveredAt: now } }
    );

    const bySender = new Map();
    for (const m of pending) {
      const key = m.senderId.toString();
      if (!bySender.has(key)) bySender.set(key, []);
      bySender.get(key).push(m._id.toString());
    }
    for (const [senderId, ids] of bySender) {
      emitToUser(senderId, "messagesDelivered", { by: userId, ids, deliveredAt: now });
    }
  } catch (error) {
    console.error("Could not mark messages as delivered:", error.message);
  }
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: ENV.CLIENT_ORIGINS, credentials: true },
    maxHttpBufferSize: 1e5, // clients only receive big payloads, they never send them
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const { userId } = socket;

    // every socket of a user joins a room named after the user id, so we can reach all their devices
    socket.join(userId);
    onlineCounts.set(userId, (onlineCounts.get(userId) || 0) + 1);
    broadcastOnlineUsers();
    markPendingAsDelivered(userId);

    socket.on("disconnect", () => {
      const remaining = (onlineCounts.get(userId) || 1) - 1;
      if (remaining <= 0) onlineCounts.delete(userId);
      else onlineCounts.set(userId, remaining);
      broadcastOnlineUsers();
    });
  });

  return io;
}

export const emitToUser = (userId, event, payload) => {
  io?.to(String(userId)).emit(event, payload);
};

export const closeSocket = () =>
  new Promise((resolve) => {
    if (!io) return resolve();
    io.close(() => resolve());
  });

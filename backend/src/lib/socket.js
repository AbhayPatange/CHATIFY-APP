import { Server } from "socket.io";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import Message, { MESSAGE_STATUS } from "../models/Message.js";
import User from "../models/User.js";
import Connection from "../models/Connection.js";

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

    socket.on("presence:refresh", async () => {
      socket.user = await User.findById(userId).select("blockedUsers");
    });

    socket.on("connections:refresh", () => {
      // The client uses this as a harmless hint to refresh its connection list.
      // It deliberately exposes no account directory over Socket.IO.
    });

    // WebRTC media stays peer-to-peer; Socket.IO only relays authenticated
    // signaling messages and never persists audio/video.
    for (const event of ["call:offer", "call:answer", "call:ice", "call:reject", "call:end"]) {
      socket.on(event, async ({ to, ...payload } = {}) => {
        if (typeof to !== "string" || to === userId || !onlineCounts.has(to)) return;
        if (socket.user?.blockedUsers?.some((id) => String(id) === to) || await User.exists({ _id: to, blockedUsers: userId })) return;
        const connected = await Connection.exists({ status: "accepted", $or: [{ requester: userId, recipient: to }, { requester: to, recipient: userId }] });
        if (!connected) return;
        io.to(to).emit(event, { from: userId, ...payload });
      });
    }

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

// Complete once at least one of the recipient's devices has committed the encrypted photo.
export async function deliverAttachment(receiverId, attachment, event) {
  const devices = await io.in(String(receiverId)).fetchSockets();
  try {
    await Promise.any(devices.map(async (socket) => {
      const saved = await socket.timeout(10000).emitWithAck(event, attachment);
      if (saved !== true) throw new Error("Photo was not saved");
    }));
    return true;
  } catch {
    return false;
  }
}

export const closeSocket = () =>
  new Promise((resolve) => {
    if (!io) return resolve();
    io.close(() => resolve());
  });

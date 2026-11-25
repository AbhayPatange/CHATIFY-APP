import crypto from "crypto";
import Connection from "../models/Connection.js";
import User from "../models/User.js";
import { emitToUser } from "../lib/socket.js";
import { isObjectId } from "../lib/validators.js";

const userFields = "fullName profilePic bio encryptionPublicKey";
const isBlocked = async (me, otherId) =>
  me.blockedUsers?.some((id) => String(id) === String(otherId)) ||
  Boolean(await User.exists({ _id: otherId, blockedUsers: me._id }));

async function ensureConnectionCode(user) {
  if (user.shortConnectionCode) return user.shortConnectionCode;
  // A randomly generated, unguessable code means users cannot enumerate accounts.
  for (let attempts = 0; attempts < 5; attempts += 1) {
    const code = crypto.randomBytes(5).toString("base64url").toUpperCase().replace(/[-_]/g, "A");
    try {
      const saved = await User.findOneAndUpdate(
        { _id: user._id, shortConnectionCode: { $in: [null, ""] } },
        { $set: { shortConnectionCode: code } },
        { new: true }
      ).select("+shortConnectionCode");
      if (saved?.shortConnectionCode) return saved.shortConnectionCode;
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
    const existing = await User.findById(user._id).select("+shortConnectionCode").lean();
    if (existing?.shortConnectionCode) return existing.shortConnectionCode;
  }
  throw new Error("Could not create a connection code.");
}

const publicUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  profilePic: user.profilePic,
  bio: user.bio || "",
  encryptionPublicKey: user.encryptionPublicKey || "",
});

export const getConnections = async (req, res, next) => {
  try {
    const myCode = await ensureConnectionCode(req.user);
    const rows = await Connection.find({ $or: [{ requester: req.user._id }, { recipient: req.user._id }] })
      .populate("requester", userFields)
      .populate("recipient", userFields)
      .sort({ updatedAt: -1 })
      .lean();
    const result = { code: myCode, connected: [], incoming: [], outgoing: [] };
    for (const row of rows) {
      if (!row.requester || !row.recipient) continue;
      const iRequested = String(row.requester._id) === String(req.user._id);
      const other = iRequested ? row.recipient : row.requester;
      if (!other || await isBlocked(req.user, other._id)) continue;
      const item = { ...publicUser(other), connectionId: row._id, requestedAt: row.createdAt };
      if (row.status === "accepted") result.connected.push(item);
      else result[iRequested ? "outgoing" : "incoming"].push(item);
    }
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const requestConnection = async (req, res, next) => {
  try {
    const code = String(req.body?.code || "").trim().toUpperCase();
    if (!/^(?:[A-Z0-9]{7}|P-[A-F0-9]{14})$/.test(code)) return res.status(400).json({ message: "Enter a valid connection code." });
    const target = await User.findOne({ $or: [{ shortConnectionCode: code }, { connectionCode: code }] }).select(userFields);
    if (!target) return res.status(404).json({ message: "No user was found for that connection code." });
    if (String(target._id) === String(req.user._id)) return res.status(400).json({ message: "That is your own connection code." });
    if (await isBlocked(req.user, target._id)) return res.status(403).json({ message: "This connection is unavailable." });
    const existing = await Connection.findOne({ $or: [
      { requester: req.user._id, recipient: target._id },
      { requester: target._id, recipient: req.user._id },
    ] });
    if (existing?.status === "accepted") return res.status(409).json({ message: "You are already connected." });
    if (existing) return res.status(409).json({ message: "A connection request is already pending." });
    const connection = await Connection.create({ requester: req.user._id, recipient: target._id });
    emitToUser(target._id, "connection:request", { connectionId: String(connection._id) });
    res.status(201).json({ message: "Connection request sent." });
  } catch (error) { next(error); }
};

export const acceptConnection = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: "Invalid connection request." });
    const connection = await Connection.findOne({ _id: id, recipient: req.user._id, status: "pending" });
    if (!connection) return res.status(404).json({ message: "Connection request not found." });
    if (await isBlocked(req.user, connection.requester)) return res.status(403).json({ message: "This connection is unavailable." });
    connection.status = "accepted";
    await connection.save();
    emitToUser(connection.requester, "connection:updated", { connectionId: id });
    emitToUser(req.user._id, "connection:updated", { connectionId: id });
    res.status(200).json({ message: "Connection accepted." });
  } catch (error) { next(error); }
};

export const removeConnection = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(400).json({ message: "Invalid connection." });
    const connection = await Connection.findOneAndDelete({ _id: id, $or: [{ requester: req.user._id }, { recipient: req.user._id }] });
    if (!connection) return res.status(404).json({ message: "Connection not found." });
    const other = String(connection.requester) === String(req.user._id) ? connection.recipient : connection.requester;
    emitToUser(other, "connection:updated", { connectionId: id });
    res.status(200).json({ removed: true });
  } catch (error) { next(error); }
};

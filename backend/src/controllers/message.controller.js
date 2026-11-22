import { emitToUser, isUserOnline } from "../lib/socket.js";
import { isObjectId, isString } from "../lib/validators.js";
import Message, { MESSAGE_STATUS } from "../models/Message.js";
import User from "../models/User.js";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export const getAllContacts = async (req, res, next) => {
  try {
    // only expose what the UI needs: never other users' emails
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("fullName profilePic encryptionPublicKey")
      .sort({ fullName: 1 })
      .limit(500)
      .lean();

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/messages/:id?limit=50&before=<ISO date>
 * Returns up to `limit` messages (oldest -> newest) older than `before`.
 */
export const getMessagesByUserId = async (req, res, next) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;
    if (!isObjectId(userToChatId)) return res.status(400).json({ message: "Invalid user id." });

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);

    const filter = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    };

    if (req.query.before !== undefined) {
      const before = new Date(String(req.query.before));
      if (Number.isNaN(before.getTime())) return res.status(400).json({ message: "Invalid 'before' date." });
      filter.createdAt = { $lt: before };
    }

    const page = await Message.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.status(200).json(page.reverse());
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const { encrypted } = req.body ?? {};

    if (!isObjectId(receiverId)) return res.status(400).json({ message: "Invalid user id." });
    if (!isEncryptedMessage(encrypted)) return res.status(400).json({ message: "An encrypted text message is required." });
    if (senderId.equals(receiverId)) return res.status(400).json({ message: "Cannot send messages to yourself." });

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) return res.status(404).json({ message: "Receiver not found." });

    // receiver has the app open on some device -> straight to "delivered" (two ticks)
    const delivered = isUserOnline(receiverId);

    const newMessage = await Message.create({
      senderId,
      receiverId,
      encrypted,
      status: delivered ? MESSAGE_STATUS.DELIVERED : MESSAGE_STATUS.SENT,
      deliveredAt: delivered ? new Date() : undefined,
    });

    // deliver to every open tab/device of the receiver
    emitToUser(receiverId, "newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    next(error);
  }

function isEncryptedMessage(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1) return false;
  const fields = ["ciphertext", "iv", "senderKey", "receiverKey"];
  return fields.every((field) => isString(value[field]) && value[field].length > 8 && value[field].length < 20_000);
}
};

/**
 * Mark everything `:id` sent me as seen (blue ticks) and tell them about it.
 * PUT /api/messages/seen/:id
 */
export const markMessagesSeen = async (req, res, next) => {
  try {
    const me = req.user._id;
    const { id: partnerId } = req.params;
    if (!isObjectId(partnerId)) return res.status(400).json({ message: "Invalid user id." });

    const unread = await Message.find({
      senderId: partnerId,
      receiverId: me,
      // messages saved before ticks existed have no status: they count as already seen
      status: { $in: [MESSAGE_STATUS.SENT, MESSAGE_STATUS.DELIVERED] },
    })
      .select("_id")
      .lean();

    if (unread.length === 0) return res.status(200).json({ ids: [] });

    const ids = unread.map((m) => m._id);
    const now = new Date();
    await Message.updateMany(
      { _id: { $in: ids } },
      [
        {
          $set: {
            status: MESSAGE_STATUS.SEEN,
            seenAt: now,
            // anything seen was by definition delivered
            deliveredAt: { $ifNull: ["$deliveredAt", now] },
          },
        },
      ]
    );

    const idStrings = ids.map(String);
    emitToUser(partnerId, "messagesSeen", { by: String(me), ids: idStrings, seenAt: now });
    // my other tabs/devices should clear their unread badge too
    emitToUser(me, "chatRead", { partnerId });

    res.status(200).json({ ids: idStrings });
  } catch (error) {
    next(error);
  }
};

/** Users I have talked to, most recent conversation first, with last message + unread count. */
export const getChatPartners = async (req, res, next) => {
  try {
    const me = req.user._id;

    const partners = await Message.aggregate([
      { $match: { $or: [{ senderId: me }, { receiverId: me }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$senderId", me] }, "$receiverId", "$senderId"] },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", me] },
                    { $in: ["$status", [MESSAGE_STATUS.SENT, MESSAGE_STATUS.DELIVERED]] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
      { $limit: 200 },
    ]);

    const users = await User.find({ _id: { $in: partners.map((p) => p._id) } })
      .select("fullName profilePic encryptionPublicKey")
      .lean();
    const byId = new Map(users.map((u) => [u._id.toString(), u]));

    const result = partners
      .map((p) => {
        const user = byId.get(p._id.toString());
        if (!user) return null;
        const m = p.lastMessage;
        return {
          ...user,
          unreadCount: p.unreadCount,
          lastMessage: {
            _id: m._id,
            senderId: m.senderId,
            text: m.text,
            encrypted: m.encrypted ? { version: m.encrypted.version } : undefined,
            hasImage: Boolean(m.image),
            status: m.status || MESSAGE_STATUS.SEEN, // pre-tick messages
            createdAt: m.createdAt,
          },
        };
      })
      .filter(Boolean);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

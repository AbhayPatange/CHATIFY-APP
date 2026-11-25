import { deliverAttachment, emitToUser, isUserOnline } from "../lib/socket.js";
import { isObjectId, isString } from "../lib/validators.js";
import Message, { MESSAGE_STATUS } from "../models/Message.js";
import User from "../models/User.js";
import Connection from "../models/Connection.js";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const connectedFilter = (me, other) => ({
  status: "accepted",
  $or: [{ requester: me, recipient: other }, { requester: other, recipient: me }],
});

const isConnected = (me, other) => Connection.exists(connectedFilter(me, other));

async function connectedPartnerIds(me) {
  const rows = await Connection.find({ status: "accepted", $or: [{ requester: me }, { recipient: me }] })
    .select("requester recipient")
    .lean();
  return rows.map((row) => String(row.requester) === String(me) ? row.recipient : row.requester);
}

export const getAllContacts = async (req, res, next) => {
  try {
    // Only accepted connections appear here. There is intentionally no directory of users.
    const partnerIds = await connectedPartnerIds(req.user._id);
    const users = await User.find({ _id: { $in: partnerIds, $nin: req.user.blockedUsers || [] }, blockedUsers: { $ne: req.user._id } })
      .select("fullName profilePic bio encryptionPublicKey")
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
    if (!await isConnected(myId, userToChatId)) return res.status(403).json({ message: "Accept a connection request before chatting." });
    if (req.user.blockedUsers?.some((id) => String(id) === userToChatId) || await User.exists({ _id: userToChatId, blockedUsers: myId })) return res.status(403).json({ message: "This conversation is unavailable." });

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
    const { encrypted, replyTo, photo, document: file } = req.body ?? {};

    if (!isObjectId(receiverId)) return res.status(400).json({ message: "Invalid user id." });
    if (!isEncryptedMessage(encrypted)) return res.status(400).json({ message: "An encrypted text message is required." });
    if (senderId.equals(receiverId)) return res.status(400).json({ message: "Cannot send messages to yourself." });
    if (!await isConnected(senderId, receiverId)) return res.status(403).json({ message: "Accept a connection request before chatting." });
    if (req.user.blockedUsers?.some((id) => String(id) === receiverId) || await User.exists({ _id: receiverId, blockedUsers: senderId })) return res.status(403).json({ message: "This conversation is unavailable." });
    if (replyTo !== undefined && (!replyTo || typeof replyTo !== "object" || !isObjectId(replyTo.messageId) || !isObjectId(replyTo.senderId))) {
      return res.status(400).json({ message: "Invalid reply reference." });
    }

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) return res.status(404).json({ message: "Receiver not found." });

    // receiver has the app open on some device -> straight to "delivered" (two ticks)
    const delivered = isUserOnline(receiverId);

    const attachment = file ?? photo;
    if (file !== undefined && photo !== undefined) return res.status(400).json({ message: "Send one attachment at a time." });
    if (attachment !== undefined) {
      if (!attachment || typeof attachment.id !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(attachment.id) || !isEncryptedMessage(attachment.encrypted, file ? 3_740_000 : 1_000_000)) {
        return res.status(400).json({ message: "Invalid encrypted attachment." });
      }
      const received = await deliverAttachment(receiverId, { id: attachment.id, senderId: String(senderId), encrypted: attachment.encrypted }, file ? "document:receive" : "photo:receive");
      if (!received) return res.status(409).json({ message: "Ask your contact to open the updated Pinglet app, then send the attachment again." });
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      encrypted,
      photoId: photo?.id,
      documentId: file?.id,
      replyTo: replyTo ? { messageId: String(replyTo.messageId), senderId: String(replyTo.senderId) } : undefined,
      status: delivered ? MESSAGE_STATUS.DELIVERED : MESSAGE_STATUS.SENT,
      deliveredAt: delivered ? new Date() : undefined,
    });

    // deliver to every open tab/device of the receiver
    emitToUser(receiverId, "newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    next(error);
  }

function isEncryptedMessage(value, ciphertextLimit = 20_000) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1) return false;
  const fields = ["ciphertext", "iv", "senderKey", "receiverKey"];
  return Object.keys(value).length === fields.length + 1 && fields.every((field) => isString(value[field]) && value[field].length > 8 && value[field].length < (field === "ciphertext" ? ciphertextLimit : 20_000));
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
    if (!await isConnected(me, partnerId)) return res.status(403).json({ message: "Accept a connection request before chatting." });

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
    const connectedIds = await connectedPartnerIds(me);
    if (connectedIds.length === 0) return res.status(200).json([]);

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

    const users = await User.find({ _id: { $in: partners.map((p) => p._id).filter((id) => connectedIds.some((connectedId) => String(connectedId) === String(id))), $nin: req.user.blockedUsers || [] }, blockedUsers: { $ne: me } })
      .select("fullName profilePic bio encryptionPublicKey")
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
            hasImage: Boolean(m.image || m.photoId),
            hasDocument: Boolean(m.documentId),
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

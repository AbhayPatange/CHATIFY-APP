import mongoose from "mongoose";

export const MESSAGE_STATUS = Object.freeze({
  SENT: "sent", // saved on the server                -> one grey tick
  DELIVERED: "delivered", // receiver's device got it  -> two grey ticks
  SEEN: "seen", // receiver opened the chat            -> two blue ticks
});

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, maxlength: 2000 },
    image: { type: String },
    status: {
      type: String,
      enum: Object.values(MESSAGE_STATUS),
      default: MESSAGE_STATUS.SENT,
    },
    deliveredAt: { type: Date },
    seenAt: { type: Date },
  },
  { timestamps: true }
);

// conversation lookups (both directions) sorted by time, and "all chats of user X"
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });
// "what is still undelivered / unread for user X"
messageSchema.index({ receiverId: 1, status: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;

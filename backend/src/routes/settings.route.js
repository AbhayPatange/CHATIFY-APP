import express from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Message from "../models/Message.js";
import Connection from "../models/Connection.js";
import { EMAIL_RE, normalizeEmail } from "../lib/validators.js";
import { ENV } from "../lib/env.js";
import { sendEmail } from "../lib/resend.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createRateLimiter, requireTrustedOrigin } from "../middleware/rateLimit.middleware.js";

const router = express.Router();
const limit = createRateLimiter({ windowMs: 15 * 60_000, max: 8 });
const digest = value => crypto.createHash("sha256").update(value).digest("hex");
router.use(requireTrustedOrigin(ENV.CLIENT_ORIGINS));

router.post("/confirm-email", limit, async (req, res, next) => {
  try {
    const token = req.body?.token;
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: "Invalid verification link." });
    const filter = { "emailChange.hash": digest(token), "emailChange.expires": { $gt: new Date() } };
    const user = await User.findOne(filter).select("+emailChange");
    if (!user) return res.status(400).json({ message: "This link expired or has already been used." });
    const updated = await User.updateOne({ ...filter, _id: user._id, email: user.emailChange.previous,
      sessionVersion: user.emailChange.version === 0 ? { $in: [0, null] } : user.emailChange.version }, {
      $set: { email: user.emailChange.address }, $unset: { emailChange: 1, resetPasswordToken: 1, resetPasswordExpires: 1 }
    });
    if (!updated.modifiedCount) return res.status(400).json({ message: "Request a new link from Settings." });
    res.json({ message: "Email updated. Use your new address the next time you sign in." });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "This address is unavailable." });
    next(error);
  }
});

router.use(protectRoute);
router.put("/name", limit, async (req, res, next) => {
  try {
    const name = req.body?.fullName;
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 50) return res.status(400).json({ message: "Use 2 to 50 characters for your name." });
    await User.updateOne({ _id: req.user._id }, { $set: { fullName: name.trim() } });
    res.json({ fullName: name.trim() });
  } catch (error) { next(error); }
});

router.post("/email", limit, async (req, res, next) => {
  try {
    const address = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!EMAIL_RE.test(address) || address.length > 254 || address === req.user.email || typeof password !== "string" || Buffer.byteLength(password) > 72) return res.status(400).json({ message: "Enter your new email and current password." });
    const user = await User.findById(req.user._id).select("+password");
    if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ message: "Check your current password." });
    if (await User.exists({ email: address })) return res.status(409).json({ message: "This address is unavailable." });
    const token = crypto.randomBytes(32).toString("hex");
    const hash = digest(token);
    await User.updateOne({ _id: user._id }, { $set: { emailChange: { hash, address, previous: user.email, version: user.sessionVersion ?? 0, expires: new Date(Date.now() + 30 * 60_000) } } });
    try {
      await sendEmail({ to: address, subject: "Confirm your new Pinglet email", html: `<p>Confirm your new sign-in email for Pinglet.</p><p><a href="${ENV.CLIENT_URL}/#email-change=${token}">Confirm email change</a></p><p>This link expires in 30 minutes.</p>` });
    } catch {
      await User.updateOne({ _id: user._id, "emailChange.hash": hash }, { $unset: { emailChange: 1 } });
      return res.status(503).json({ message: "Could not send the verification email. Try again later." });
    }
    res.json({ message: "Check your new inbox for the confirmation link." });
  } catch (error) { next(error); }
});

router.get("/unread", async (req, res, next) => {
  try {
    const me = req.user._id;
    const connections = await Connection.find({ status: "accepted", $or: [{ requester: me }, { recipient: me }] }).select("requester recipient").lean();
    const ids = connections.map(c => String(c.requester) === String(me) ? c.recipient : c.requester);
    const users = await User.find({ _id: { $in: ids, $nin: req.user.blockedUsers || [] }, blockedUsers: { $ne: me } }).select("fullName").lean();
    const names = new Map(users.map(u => [String(u._id), u.fullName]));
    const rows = await Message.aggregate([
      { $match: { receiverId: me, senderId: { $in: users.map(u => u._id) }, status: { $in: ["sent", "delivered"] } } },
      { $group: { _id: "$senderId", count: { $sum: 1 }, latest: { $max: "$_id" } } }
    ]);
    res.set("Cache-Control", "no-store").json({ owner: me, chats: rows.map(r => ({ id: r._id, count: r.count, latest: r.latest, name: names.get(String(r._id)) })) });
  } catch (error) { next(error); }
});
export default router;

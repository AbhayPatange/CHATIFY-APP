import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../emails/emailHandlers.js";
import { clearAuthCookie, generateToken } from "../lib/utils.js";
import { ENV } from "../lib/env.js";
import cloudinary from "../lib/cloudinary.js";
import User from "../models/User.js";
import { EMAIL_RE, isObjectId, isString, normalizeEmail, validateImageDataUrl, validateSignupInput } from "../lib/validators.js";

const BCRYPT_ROUNDS = 12;
// compared against when the email is unknown so login timing doesn't reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync("pinglet-dummy-password", BCRYPT_ROUNDS);

const publicUser = (user, { includeKeyBundle = false } = {}) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  profilePic: user.profilePic,
  bio: user.bio || "",
  encryptionPublicKey: user.encryptionPublicKey || "",
  ...(includeKeyBundle ? { encryptionKeyBundle: user.encryptionKeyBundle || null } : {}),
});

export const signup = async (req, res, next) => {
  try {
    const invalid = validateSignupInput(req.body ?? {});
    if (invalid) return res.status(400).json({ message: invalid });

    const fullName = req.body.fullName.trim();
    const email = normalizeEmail(req.body.email);

    const hashedPassword = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);
    const { encryptionPublicKey, encryptionKeyBundle } = req.body;
    if (!isEncryptionIdentity(encryptionPublicKey, encryptionKeyBundle)) {
      return res.status(400).json({ message: "A valid encryption identity is required." });
    }

    let savedUser;
    try {
      savedUser = await User.create({ fullName, email, password: hashedPassword, encryptionPublicKey, encryptionKeyBundle });
    } catch (error) {
      // unique index violation: also covers two simultaneous signups with the same email
      if (error?.code === 11000) return res.status(409).json({ message: "Email already exists" });
      throw error;
    }

    generateToken(savedUser._id, res, savedUser.sessionVersion);
    res.status(201).json(publicUser(savedUser, { includeKeyBundle: true }));

    // fire and forget: a slow/failed email provider must never affect signup
    sendWelcomeEmail(savedUser.email, savedUser.fullName, ENV.CLIENT_URL).catch((error) =>
      console.error("Failed to send welcome email:", error.message)
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    // reject non-strings: an object like {"$gt": ""} would otherwise become a NoSQL query operator
    if (!isString(email) || !isString(password) || !email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: normalizeEmail(email) }).select("+password +encryptionKeyBundle");
    const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    // never tell the client which one is incorrect: password or email
    if (!user || !passwordOk) return res.status(401).json({ message: "Invalid credentials" });

    generateToken(user._id, res, user.sessionVersion);
    res.status(200).json(publicUser(user, { includeKeyBundle: true }));
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    // Identical response whether the account exists or not prevents account enumeration.
    const response = { message: "If that email is registered, a reset link has been sent." };
    if (!email || !EMAIL_RE.test(email)) return res.status(200).json(response);
    const user = await User.findOne({ email }).select("+resetPasswordToken +resetPasswordExpires");
    if (!user || !ENV.EMAIL_CONFIGURED) return res.status(200).json(response);

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    const resetUrl = `${ENV.CLIENT_URL}/reset-password?token=${token}`;
    sendPasswordResetEmail(user.email, resetUrl).catch((error) => console.error("Failed to send reset email:", error.message));
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body ?? {};
    if (!isString(token) || !/^[a-f0-9]{64}$/i.test(token) || !isString(password) || password.length < 6 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ message: "Invalid or expired reset link." });
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ resetPasswordToken: tokenHash, resetPasswordExpires: { $gt: new Date() } }).select("+resetPasswordToken +resetPasswordExpires +encryptionKeyBundle");
    if (!user) return res.status(400).json({ message: "Invalid or expired reset link." });
    user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.encryptionPublicKey = "";
    user.encryptionKeyBundle = undefined;
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    await user.save();
    generateToken(user._id, res, user.sessionVersion);
    res.status(200).json({ message: "Password reset. Sign in to create a new encrypted identity." });
  } catch (error) {
    next(error);
  }
};

export const setupEncryption = async (req, res, next) => {
  try {
    const { encryptionPublicKey, encryptionKeyBundle } = req.body ?? {};
    if (!isEncryptionIdentity(encryptionPublicKey, encryptionKeyBundle)) {
      return res.status(400).json({ message: "Invalid encryption identity." });
    }
    req.user.encryptionPublicKey = encryptionPublicKey;
    req.user.encryptionKeyBundle = encryptionKeyBundle;
    await req.user.save();
    res.status(200).json(publicUser(req.user, { includeKeyBundle: true }));
  } catch (error) {
    next(error);
  }
};

function isEncryptionIdentity(publicKey, bundle) {
  if (!isString(publicKey) || publicKey.length < 50 || publicKey.length > 10_000) return false;
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) return false;
  return ["salt", "iv", "ciphertext"].every(
    (key) => isString(bundle[key]) && bundle[key].length > 10 && bundle[key].length < 20_000
  );
}

export const logout = (_req, res) => {
  clearAuthCookie(res);
  res.status(200).json({ message: "Logged out successfully" });
};

export const updateProfile = async (req, res, next) => {
  try {
    const { profilePic, bio } = req.body ?? {};
    if (bio === undefined && profilePic === undefined) return res.status(400).json({ message: "Provide a bio or profile picture." });
    if (bio !== undefined && (!isString(bio) || bio.trim().length > 160)) return res.status(400).json({ message: "Bio must be 160 characters or fewer." });
    const changes = {};
    if (bio !== undefined) changes.bio = bio.trim();
    if (profilePic !== undefined) {
      if (!ENV.CLOUDINARY_CONFIGURED) return res.status(503).json({ message: "Image uploads are not configured on this server." });
      const check = validateImageDataUrl(profilePic);
      if (!check.ok) return res.status(400).json({ message: check.message });
      try {
        const uploadResponse = await cloudinary.uploader.upload(profilePic, {
        folder: "pinglet/avatars",
        resource_type: "image",
        transformation: [{ width: 400, height: 400, crop: "fill" }],
        });
        changes.profilePic = uploadResponse.secure_url;
      } catch (error) {
        console.error("Cloudinary upload failed:", error.message);
        return res.status(502).json({ message: "Image upload failed. Please try again." });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      changes,
      { new: true }
    );

    res.status(200).json(publicUser(updatedUser));
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (!isObjectId(targetId) || String(req.user._id) === targetId) return res.status(400).json({ message: "Invalid user." });
    if (!await User.exists({ _id: targetId })) return res.status(404).json({ message: "User not found." });
    await User.updateOne({ _id: req.user._id }, { $addToSet: { blockedUsers: targetId } });
    res.status(200).json({ blocked: true, userId: targetId });
  } catch (error) { next(error); }
};

export const unblockUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (!isObjectId(targetId)) return res.status(400).json({ message: "Invalid user." });
    await User.updateOne({ _id: req.user._id }, { $pull: { blockedUsers: targetId } });
    res.status(200).json({ blocked: false, userId: targetId });
  } catch (error) { next(error); }
};

export const getBlockedUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $in: req.user.blockedUsers || [] } }).select("fullName profilePic").lean();
    res.status(200).json(users);
  } catch (error) { next(error); }
};

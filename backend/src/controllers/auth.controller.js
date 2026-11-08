import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import { clearAuthCookie, generateToken } from "../lib/utils.js";
import { ENV } from "../lib/env.js";
import cloudinary from "../lib/cloudinary.js";
import User from "../models/User.js";
import { isString, normalizeEmail, validateImageDataUrl, validateSignupInput } from "../lib/validators.js";

const BCRYPT_ROUNDS = 12;
// compared against when the email is unknown so login timing doesn't reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync("pinglet-dummy-password", BCRYPT_ROUNDS);

const publicUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  profilePic: user.profilePic,
});

export const signup = async (req, res, next) => {
  try {
    const invalid = validateSignupInput(req.body ?? {});
    if (invalid) return res.status(400).json({ message: invalid });

    const fullName = req.body.fullName.trim();
    const email = normalizeEmail(req.body.email);

    const hashedPassword = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);

    let savedUser;
    try {
      savedUser = await User.create({ fullName, email, password: hashedPassword });
    } catch (error) {
      // unique index violation: also covers two simultaneous signups with the same email
      if (error?.code === 11000) return res.status(409).json({ message: "Email already exists" });
      throw error;
    }

    generateToken(savedUser._id, res);
    res.status(201).json(publicUser(savedUser));

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

    const user = await User.findOne({ email: normalizeEmail(email) }).select("+password");
    const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    // never tell the client which one is incorrect: password or email
    if (!user || !passwordOk) return res.status(401).json({ message: "Invalid credentials" });

    generateToken(user._id, res);
    res.status(200).json(publicUser(user));
  } catch (error) {
    next(error);
  }
};

export const logout = (_req, res) => {
  clearAuthCookie(res);
  res.status(200).json({ message: "Logged out successfully" });
};

export const updateProfile = async (req, res, next) => {
  try {
    if (!ENV.CLOUDINARY_CONFIGURED) {
      return res.status(503).json({ message: "Image uploads are not configured on this server." });
    }

    const { profilePic } = req.body ?? {};
    if (!profilePic) return res.status(400).json({ message: "Profile pic is required" });

    const check = validateImageDataUrl(profilePic);
    if (!check.ok) return res.status(400).json({ message: check.message });

    let uploadResponse;
    try {
      uploadResponse = await cloudinary.uploader.upload(profilePic, {
        folder: "pinglet/avatars",
        resource_type: "image",
        transformation: [{ width: 400, height: 400, crop: "fill" }],
      });
    } catch (error) {
      console.error("Cloudinary upload failed:", error.message);
      return res.status(502).json({ message: "Image upload failed. Please try again." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(publicUser(updatedUser));
  } catch (error) {
    next(error);
  }
};

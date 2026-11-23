import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    password: {
      type: String,
      required: true,
      select: false, // never returned unless explicitly requested with .select("+password")
    },
    profilePic: {
      type: String,
      default: "",
    },
    // Public key is intentionally visible to contacts. The matching private
    // key is encrypted in the browser with the user's password before it ever
    // reaches this database.
    encryptionPublicKey: { type: String, default: "", maxlength: 10_000 },
    encryptionKeyBundle: { type: mongoose.Schema.Types.Mixed, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    sessionVersion: { type: Number, default: 0 },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;

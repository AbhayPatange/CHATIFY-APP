export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const IMAGE_DATA_URL_RE = /^data:image\/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB decoded
export const MAX_TEXT_LENGTH = 2000;
export const MAX_PASSWORD_BYTES = 72; // bcrypt silently truncates beyond this

export const isString = (v) => typeof v === "string";
export const isObjectId = (v) => isString(v) && OBJECT_ID_RE.test(v);

export const normalizeEmail = (v) => (isString(v) ? v.trim().toLowerCase() : "");

/** Validates a base64 image data URL. Returns { ok: true } or { ok: false, message }. */
export function validateImageDataUrl(value) {
  if (!isString(value)) return { ok: false, message: "Image must be a base64 data URL." };
  const match = IMAGE_DATA_URL_RE.exec(value);
  if (!match) return { ok: false, message: "Only PNG, JPEG, GIF or WebP images are allowed." };
  const b64 = match[2];
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((b64.length * 3) / 4) - padding;
  if (bytes > MAX_IMAGE_BYTES) {
    return { ok: false, message: `Image is too large (max ${MAX_IMAGE_BYTES / 1024 / 1024} MB).` };
  }
  return { ok: true };
}

export function validateSignupInput({ fullName, email, password }) {
  if (!isString(fullName) || !isString(email) || !isString(password)) {
    return "All fields are required";
  }
  const name = fullName.trim();
  if (name.length < 2 || name.length > 50) return "Full name must be between 2 and 50 characters";
  const mail = normalizeEmail(email);
  if (mail.length > 254 || !EMAIL_RE.test(mail)) return "Invalid email format";
  if (password.length < 6) return "Password must be at least 6 characters";
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    return "Password is too long (max 72 bytes)";
  }
  return null;
}

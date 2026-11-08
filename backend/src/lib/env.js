import "dotenv/config";

const clean = (v) => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
};

const stripTrailingSlash = (s) => s.replace(/\/+$/, "");

const NODE_ENV = clean(process.env.NODE_ENV) || "development";
const IS_PROD = NODE_ENV === "production";

// CLIENT_URL may hold several comma-separated origins (no trailing slashes needed).
const CLIENT_ORIGINS = (clean(process.env.CLIENT_URL) || "http://localhost:5173")
  .split(",")
  .map((s) => stripTrailingSlash(s.trim()))
  .filter(Boolean);

function parseTrustProxy(value) {
  const v = clean(value);
  if (v === undefined) return IS_PROD ? 1 : false; // one reverse proxy hop in production (Render, Sevalla, Fly, Nginx...)
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v; // e.g. "loopback", "10.0.0.0/8"
}

export const ENV = {
  NODE_ENV,
  IS_PROD,
  PORT: Number(process.env.PORT) || 3000,
  MONGO_URI: clean(process.env.MONGO_URI),
  JWT_SECRET: clean(process.env.JWT_SECRET),
  CLIENT_URL: CLIENT_ORIGINS[0],
  CLIENT_ORIGINS,
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY),
  COOKIE_SECURE: clean(process.env.COOKIE_SECURE) ? process.env.COOKIE_SECURE === "true" : IS_PROD,
  COOKIE_SAMESITE: clean(process.env.COOKIE_SAMESITE) || "strict", // use "none" (+ secure) only if API and frontend are on different sites
  RESEND_API_KEY: clean(process.env.RESEND_API_KEY),
  EMAIL_FROM: clean(process.env.EMAIL_FROM),
  EMAIL_FROM_NAME: clean(process.env.EMAIL_FROM_NAME) || "Pinglet",
  CLOUDINARY_CLOUD_NAME: clean(process.env.CLOUDINARY_CLOUD_NAME),
  CLOUDINARY_API_KEY: clean(process.env.CLOUDINARY_API_KEY),
  CLOUDINARY_API_SECRET: clean(process.env.CLOUDINARY_API_SECRET),
  ARCJET_KEY: clean(process.env.ARCJET_KEY),
};

ENV.CLOUDINARY_CONFIGURED = Boolean(
  ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_API_KEY && ENV.CLOUDINARY_API_SECRET
);
ENV.EMAIL_CONFIGURED = Boolean(ENV.RESEND_API_KEY && ENV.EMAIL_FROM);

/**
 * Fail fast on misconfiguration. Returns a list of non-fatal warnings.
 * Throws if something required is missing.
 */
export function validateEnv() {
  const errors = [];
  const warnings = [];

  if (!["development", "production", "test"].includes(NODE_ENV)) {
    warnings.push(`NODE_ENV="${NODE_ENV}" is not recognised; treating it as development.`);
  }
  if (!ENV.MONGO_URI) errors.push("MONGO_URI is required.");
  if (!ENV.JWT_SECRET) errors.push("JWT_SECRET is required.");

  if (IS_PROD) {
    if (ENV.JWT_SECRET && ENV.JWT_SECRET.length < 32) {
      errors.push("JWT_SECRET must be at least 32 characters in production (try: openssl rand -base64 48).");
    }
    if (!clean(process.env.CLIENT_URL)) {
      errors.push("CLIENT_URL is required in production (CORS, socket origin and email links depend on it).");
    }
    if (!ENV.ARCJET_KEY) warnings.push("ARCJET_KEY is not set: Arcjet shield/bot/rate-limit protection is disabled.");
  } else if (ENV.JWT_SECRET && ENV.JWT_SECRET.length < 32) {
    warnings.push("JWT_SECRET is short. Use a long random value (>= 32 chars) before deploying.");
  }

  if (!ENV.CLOUDINARY_CONFIGURED) warnings.push("Cloudinary is not configured: image uploads are disabled.");
  if (!ENV.EMAIL_CONFIGURED) warnings.push("Resend is not configured: welcome emails are disabled.");

  if (errors.length) {
    throw new Error("Invalid environment configuration:\n - " + errors.join("\n - "));
  }
  return warnings;
}

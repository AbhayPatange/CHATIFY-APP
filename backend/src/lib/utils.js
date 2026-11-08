import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

const COOKIE_NAME = "jwt";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const baseCookieOptions = {
  httpOnly: true, // not readable from JS: mitigates XSS token theft
  sameSite: ENV.COOKIE_SAMESITE, // mitigates CSRF
  secure: ENV.COOKIE_SECURE,
  path: "/",
};

export const generateToken = (userId, res) => {
  if (!ENV.JWT_SECRET) throw new Error("JWT_SECRET is not configured");

  const token = jwt.sign({ userId }, ENV.JWT_SECRET, { expiresIn: "7d", algorithm: "HS256" });
  res.cookie(COOKIE_NAME, token, { ...baseCookieOptions, maxAge: SEVEN_DAYS_MS });
  return token;
};

// clearCookie only works if the attributes match the ones used when the cookie was set
export const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, baseCookieOptions);

export const verifyToken = (token) => jwt.verify(token, ENV.JWT_SECRET, { algorithms: ["HS256"] });

export const parseCookies = (header = "") => {
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    let val = part.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
};

export const getTokenFromCookieHeader = (header) => parseCookies(header)[COOKIE_NAME];

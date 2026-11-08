import { ENV } from "../lib/env.js";

export const apiNotFound = (req, res) => {
  res.status(404).json({ message: "Not found" });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request is too large." });
  }
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ message: "Malformed JSON body." });
  }
  if (err.name === "CastError" || err.name === "ValidationError") {
    return res.status(400).json({ message: "Invalid request data." });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    message: "Internal server error",
    ...(ENV.IS_PROD ? {} : { detail: err.message }),
  });
};

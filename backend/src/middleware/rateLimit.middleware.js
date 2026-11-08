/**
 * Small in-memory fixed-window rate limiter keyed by client IP.
 * It is per-process: good protection against password guessing on a single instance.
 * If you scale to several instances, put a shared limiter (Redis / Arcjet) in front as well.
 */
export function createRateLimiter({
  windowMs,
  max,
  message = "Too many requests, please try again later.",
  countOnlyFailures = false,
}) {
  const hits = new Map(); // ip -> { count, resetAt }

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, Math.min(windowMs, 60_000));
  sweep.unref();

  return (req, res, next) => {
    const key = req.ip || "unknown";
    const now = Date.now();

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (hits.size > 50_000) hits.clear(); // hard cap against memory exhaustion
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    if (entry.count >= max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ message });
    }

    if (countOnlyFailures) {
      // only failed attempts (4xx/5xx) consume the budget, so normal users are never locked out
      res.on("finish", () => {
        if (res.statusCode >= 400) entry.count += 1;
      });
    } else {
      entry.count += 1;
    }
    next();
  };
}

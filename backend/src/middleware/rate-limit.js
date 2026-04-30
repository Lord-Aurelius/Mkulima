const AppError = require("../lib/app-error");

function createRateLimiter({ windowMs, max, keyPrefix }) {
  const buckets = new Map();

  return (req, _res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${req.ip || req.headers["x-forwarded-for"] || "unknown"}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      return next(new AppError(429, "Too many attempts. Try again shortly."));
    }

    if (buckets.size > 10000) {
      for (const [bucketKey, value] of buckets.entries()) {
        if (value.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
    }

    return next();
  };
}

module.exports = {
  createRateLimiter
};

import rateLimit from "express-rate-limit";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "too_many_requests", message: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: (req) => req.body?.email?.toString?.().startsWith("demo-admin-"),
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: "too_many_requests", message: "Rate limit exceeded. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const sensitiveOpRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "too_many_requests", message: "Too many sensitive operations. Please wait." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "too_many_requests", message: "Webhook rate limit exceeded." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown",
});

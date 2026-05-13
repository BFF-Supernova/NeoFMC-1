import { Request, Response, NextFunction } from "express";

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), payment=()");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );

  if (process.env.NODE_ENV !== "production") {
    res.removeHeader("Content-Security-Policy");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
  }

  next();
}

export function tenantRateLimiterMiddleware() {
  const tenantRequests = new Map<string, { count: number; resetAt: number }>();
  const WINDOW_MS = 60000;
  const MAX_REQUESTS_PER_TENANT = 1000;

  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) { next(); return; }

    const now = Date.now();
    let entry = tenantRequests.get(tenantId);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + WINDOW_MS };
      tenantRequests.set(tenantId, entry);
    }

    entry.count++;

    res.setHeader("X-RateLimit-Tenant-Limit", MAX_REQUESTS_PER_TENANT.toString());
    res.setHeader("X-RateLimit-Tenant-Remaining", Math.max(0, MAX_REQUESTS_PER_TENANT - entry.count).toString());

    if (entry.count > MAX_REQUESTS_PER_TENANT) {
      res.status(429).json({
        error: "tenant_rate_limit_exceeded",
        message: "Too many requests for this tenant. Please try again later.",
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
}

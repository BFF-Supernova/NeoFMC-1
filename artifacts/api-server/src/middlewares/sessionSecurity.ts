import { Request, Response, NextFunction } from "express";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const sessionLastActivity = new Map<string, number>();

setInterval(() => {
  const now = Date.now();
  for (const [key, lastActivity] of sessionLastActivity.entries()) {
    if (now - lastActivity > SESSION_TIMEOUT_MS * 2) {
      sessionLastActivity.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function sessionTimeoutMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) { next(); return; }

  const sessionKey = `${req.user.id}_${req.user.tenantId || "global"}`;
  const now = Date.now();
  const lastActivity = sessionLastActivity.get(sessionKey);

  if (lastActivity && (now - lastActivity) > SESSION_TIMEOUT_MS) {
    sessionLastActivity.delete(sessionKey);
    res.status(401).json({ error: "session_expired", message: "Session expired due to inactivity. Please log in again." });
    return;
  }

  sessionLastActivity.set(sessionKey, now);
  next();
}

export function recordLoginActivity(userId: string, tenantId: string | null): void {
  const sessionKey = `${userId}_${tenantId || "global"}`;
  sessionLastActivity.set(sessionKey, Date.now());
}

export function clearSession(userId: string, tenantId: string | null): void {
  const sessionKey = `${userId}_${tenantId || "global"}`;
  sessionLastActivity.delete(sessionKey);
}

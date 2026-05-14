import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export interface AuthUser {
  id: string;
  tenantId: string | null;
  role: string;
  email: string;
  fullName: string;
  branchId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is required. Server cannot start without it.");
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || crypto.randomBytes(64).toString("hex");

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

export function signToken(payload: AuthUser): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  const signature = crypto
    .createHmac("sha256", EFFECTIVE_JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const [header, body, signature] = token.split(".");
    const expectedSig = crypto
      .createHmac("sha256", EFFECTIVE_JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(base64UrlDecode(body));
    if (payload.exp < Date.now()) return null;
    return payload as AuthUser;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function hashPasswordLegacy(password: string): string {
  return crypto.createHash("sha256").update(password + EFFECTIVE_JWT_SECRET).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  if (hash.length === 64 && /^[a-f0-9]+$/.test(hash)) {
    return crypto.createHash("sha256").update(password + EFFECTIVE_JWT_SECRET).digest("hex") === hash;
  }
  return bcrypt.compareSync(password, hash);
}

export function validatePasswordComplexity(password: string): { valid: boolean; message: string } {
  if (password.length < 8) return { valid: false, message: "Password must be at least 8 characters" };
  if (!/[A-Z]/.test(password)) return { valid: false, message: "Password must contain at least one uppercase letter" };
  if (!/[a-z]/.test(password)) return { valid: false, message: "Password must contain at least one lowercase letter" };
  if (!/[0-9]/.test(password)) return { valid: false, message: "Password must contain at least one digit" };
  return { valid: true, message: "OK" };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.user) {
    applySuperAdminTenantContext(req);
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "No token provided" });
    return;
  }
  const token = authHeader.slice(7);
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
    return;
  }
  req.user = user;
  applySuperAdminTenantContext(req);
  next();
}

function applySuperAdminTenantContext(req: Request): void {
  if (req.user?.role === "SuperAdmin" && !req.user.tenantId) {
    const headerTenantId = req.headers["x-tenant-id"];
    if (headerTenantId && typeof headerTenantId === "string" && headerTenantId.length > 0) {
      req.user = { ...req.user, tenantId: headerTenantId };
    }
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "forbidden", message: "Insufficient permissions" });
      return;
    }
    next();
  };
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  requireRole("SuperAdmin")(req, res, next);
}

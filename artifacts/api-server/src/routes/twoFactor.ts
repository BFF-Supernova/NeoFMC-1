import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logAudit } from "../lib/auditLog";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const router = Router();

router.post("/setup", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!user) { res.status(404).json({ error: "not_found" }); return; }

    if (user.totpEnabled) {
      res.status(400).json({ error: "already_enabled", message: "2FA is already enabled" });
      return;
    }

    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: "NeoFMC",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });

    await db.update(usersTable)
      .set({ totpSecret: secret.base32 })
      .where(eq(usersTable.id, user.id));

    const uri = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(uri);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      uri,
    });
  } catch (err) {
    console.error("2FA setup error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/verify", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) { res.status(400).json({ error: "bad_request", message: "Code required" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!user || !user.totpSecret) { res.status(400).json({ error: "not_setup", message: "2FA not set up" }); return; }

    const totp = new OTPAuth.TOTP({
      issuer: "NeoFMC",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totpSecret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      res.status(401).json({ error: "invalid_code", message: "Invalid verification code" });
      return;
    }

    await db.update(usersTable)
      .set({ totpEnabled: true })
      .where(eq(usersTable.id, user.id));

    await logAudit({
      tenantId: user.tenantId || "system",
      userId: user.id,
      userName: user.fullName,
      action: "ENABLE_2FA",
      entity: "User",
      entityId: user.id,
      details: {},
    });

    res.json({ success: true, message: "2FA enabled successfully" });
  } catch (err) {
    console.error("2FA verify error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/disable", requireAuth, async (req, res) => {
  try {
    const { code, password } = req.body;
    if (!password || !code) { res.status(400).json({ error: "bad_request", message: "Password and TOTP code required" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!user) { res.status(404).json({ error: "not_found" }); return; }

    if (!user.totpEnabled) {
      res.status(400).json({ error: "not_enabled", message: "2FA is not enabled" });
      return;
    }

    const { verifyPassword } = await import("../lib/auth");
    if (!verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "invalid_credentials", message: "Invalid password" });
      return;
    }

    if (!user.totpSecret) {
      res.status(400).json({ error: "not_setup", message: "2FA secret not found" });
      return;
    }

    const totp = new OTPAuth.TOTP({
      issuer: "NeoFMC",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totpSecret),
    });
    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      res.status(401).json({ error: "invalid_code", message: "Invalid verification code" });
      return;
    }

    await db.update(usersTable)
      .set({ totpEnabled: false, totpSecret: null })
      .where(eq(usersTable.id, user.id));

    await logAudit({
      tenantId: user.tenantId || "system",
      userId: user.id,
      userName: user.fullName,
      action: "DISABLE_2FA",
      entity: "User",
      entityId: user.id,
      details: {},
    });

    res.json({ success: true, message: "2FA disabled successfully" });
  } catch (err) {
    console.error("2FA disable error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/status", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select({
      totpEnabled: usersTable.totpEnabled,
    }).from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!user) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ enabled: user.totpEnabled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

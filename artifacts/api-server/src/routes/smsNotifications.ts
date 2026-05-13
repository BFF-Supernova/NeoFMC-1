import { Router } from "express";
import { db, smsNotificationsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { sendSms, sendTemplateSms, sendBatchSms, getSmsTemplates, isConfigured } from "../lib/smsService";

const ADMIN_ROLES = ["SuperAdmin", "TenantAdmin", "BranchManager"];

function requireAdminRole(req: any, res: any, next: any) {
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    res.status(403).json({ error: "forbidden", message: "Insufficient permissions" });
    return;
  }
  next();
}

const router = Router();
router.use(requireAuth, requireAdminRole);

router.get("/status", async (_req, res) => {
  res.json({ configured: isConfigured(), provider: process.env.SMS_PROVIDER || "none" });
});

router.get("/templates", async (_req, res) => {
  res.json({ templates: getSmsTemplates() });
});

router.post("/send", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const { phone, message, templateKey, variables, language } = req.body;
    if (!phone) { res.status(400).json({ error: "bad_request", message: "phone required" }); return; }

    let result;
    if (templateKey) {
      result = await sendTemplateSms(tenantId, phone, templateKey, variables || {}, language || "ar", req.user!.id);
    } else if (message) {
      result = await sendSms(tenantId, phone, message, { createdById: req.user!.id });
    } else {
      res.status(400).json({ error: "bad_request", message: "message or templateKey required" });
      return;
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/send-batch", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const { recipients } = req.body;
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ error: "bad_request", message: "recipients array required" });
      return;
    }

    const result = await sendBatchSms(tenantId, recipients, req.user!.id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);

    const [rows, [{ count }]] = await Promise.all([
      db.select().from(smsNotificationsTable)
        .where(eq(smsNotificationsTable.tenantId, tenantId))
        .orderBy(desc(smsNotificationsTable.createdAt))
        .limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(smsNotificationsTable)
        .where(eq(smsNotificationsTable.tenantId, tenantId)),
    ]);

    res.json({ data: rows, total: Number(count), page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

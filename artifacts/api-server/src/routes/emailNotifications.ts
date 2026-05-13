import { Router } from "express";
import { db, notificationsTable, notificationTemplatesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { sendEmail, sendTemplatedEmail, sendBatchEmails, EMAIL_TEMPLATES } from "../lib/emailService";
import { logAudit } from "../lib/auditLog";

const ADMIN_ROLES = ["SuperAdmin", "TenantAdmin", "BranchManager"];

function requireAdminRole(req: any, res: any, next: any) {
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    res.status(403).json({ error: "forbidden", message: "Admin role required" });
    return;
  }
  next();
}

const router = Router();

router.use(requireAuth, requireAdminRole);

router.get("/templates", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const templates = await db.select()
      .from(notificationTemplatesTable)
      .where(eq(notificationTemplatesTable.tenantId, tenantId))
      .orderBy(desc(notificationTemplatesTable.createdAt));

    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const { templateName, templateType, channel, subject, bodyTemplate, bodyTemplateAr, triggerEvent, variables } = req.body;
    if (!templateName || !templateType || !bodyTemplate) {
      res.status(400).json({ error: "bad_request", message: "templateName, templateType, and bodyTemplate required" });
      return;
    }

    const [template] = await db.insert(notificationTemplatesTable).values({
      tenantId,
      templateName,
      templateType,
      channel: channel || "Email",
      subject,
      bodyTemplate,
      bodyTemplateAr,
      triggerEvent,
      variables: variables || [],
    }).returning();

    res.json(template);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/templates/seed-defaults", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const results: any[] = [];
    for (const tmpl of Object.values(EMAIL_TEMPLATES)) {
      const existing = await db.select().from(notificationTemplatesTable)
        .where(and(
          eq(notificationTemplatesTable.tenantId, tenantId),
          eq(notificationTemplatesTable.templateName, tmpl.name),
        )).limit(1);

      if (existing.length === 0) {
        const [created] = await db.insert(notificationTemplatesTable).values({
          tenantId,
          templateName: tmpl.name,
          templateType: "Automated",
          channel: "Email",
          subject: tmpl.subject,
          bodyTemplate: tmpl.body,
          bodyTemplateAr: tmpl.bodyAr,
          triggerEvent: tmpl.name,
          variables: tmpl.variables,
        }).returning();
        results.push({ ...created, action: "created" });
      } else {
        results.push({ ...existing[0], action: "exists" });
      }
    }

    res.json({ templates: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/send", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const { to, subject, body, templateName, variables, recipientType, recipientId } = req.body;

    let result;
    if (templateName) {
      result = await sendTemplatedEmail({
        tenantId,
        templateName,
        to,
        variables: variables || {},
        recipientType,
        recipientId,
      });
    } else {
      if (!to || !subject || !body) {
        res.status(400).json({ error: "bad_request", message: "to, subject, and body required" });
        return;
      }
      result = await sendEmail({ tenantId, to, subject, body, recipientType, recipientId });
    }

    await logAudit({
      tenantId,
      userId: req.user!.id,
      userName: req.user!.fullName,
      action: "SEND_EMAIL",
      entity: "Notification",
      entityId: "email",
      details: { to, templateName, success: result.success },
    });

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

    const { templateName, recipients, recipientType } = req.body;
    if (!templateName || !recipients?.length) {
      res.status(400).json({ error: "bad_request", message: "templateName and recipients required" });
      return;
    }

    const result = await sendBatchEmails({
      tenantId,
      templateName,
      recipients,
      recipientType,
    });

    await logAudit({
      tenantId,
      userId: req.user!.id,
      userName: req.user!.fullName,
      action: "SEND_BATCH_EMAIL",
      entity: "Notification",
      entityId: "batch",
      details: { templateName, totalRecipients: recipients.length, sent: result.sent, failed: result.failed },
    });

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

    const { channel, status, limit: lim } = req.query;
    const pageSize = Math.min(parseInt(lim as string) || 50, 200);

    let query = db.select().from(notificationsTable)
      .where(eq(notificationsTable.tenantId, tenantId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(pageSize);

    const notifications = await query;
    const filtered = notifications.filter(n => {
      if (channel && n.channel !== channel) return false;
      if (status && n.status !== status) return false;
      return true;
    });

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const [stats] = await db.select({
      total: sql<number>`count(*)::int`,
      sent: sql<number>`count(*) filter (where status = 'Sent')::int`,
      failed: sql<number>`count(*) filter (where status = 'Failed')::int`,
      pending: sql<number>`count(*) filter (where status = 'Pending')::int`,
      emailCount: sql<number>`count(*) filter (where channel = 'Email')::int`,
      smsCount: sql<number>`count(*) filter (where channel = 'SMS')::int`,
    }).from(notificationsTable)
      .where(eq(notificationsTable.tenantId, tenantId));

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

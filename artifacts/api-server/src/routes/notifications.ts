import { Router } from "express";
import { db, notificationTemplatesTable, notificationsTable, clientsTable, installmentsTable, loansTable, loanRequestsTable } from "@workspace/db";
import { eq, and, desc, sql, lte } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/templates", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const templates = await db.select().from(notificationTemplatesTable)
      .where(eq(notificationTemplatesTable.tenantId, tenantId)).orderBy(desc(notificationTemplatesTable.createdAt));
    res.json(templates);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/templates", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { templateName, templateType, channel, subject, bodyTemplate, bodyTemplateAr, triggerEvent, variables } = req.body;
    if (!templateName || !templateType || !bodyTemplate) {
      res.status(400).json({ error: "bad_request", message: "templateName, templateType, bodyTemplate required" });
      return;
    }

    const [template] = await db.insert(notificationTemplatesTable).values({
      tenantId, templateName, templateType,
      channel: channel || "SMS",
      subject, bodyTemplate, bodyTemplateAr, triggerEvent,
      variables: variables || null,
    }).returning();

    res.status(201).json(template);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/templates/:id", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const fields = ["templateName", "templateType", "channel", "subject", "bodyTemplate", "bodyTemplateAr", "triggerEvent", "isActive", "variables"];
    for (const f of fields) {
      if (req.body[f] !== undefined) updateData[f] = req.body[f];
    }

    const [updated] = await db.update(notificationTemplatesTable).set(updateData)
      .where(and(eq(notificationTemplatesTable.id, req.params.id), eq(notificationTemplatesTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/send", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { templateId, channel, recipientType, recipientId, recipientContact, subject, body, metadata } = req.body;
    if (!channel || !recipientContact || !body) {
      res.status(400).json({ error: "bad_request", message: "channel, recipientContact, body required" });
      return;
    }

    const [notification] = await db.insert(notificationsTable).values({
      tenantId, templateId: templateId || null, channel,
      recipientType: recipientType || "Client",
      recipientId: recipientId || null,
      recipientContact, subject, body,
      status: "Queued",
      metadata,
    }).returning();

    res.status(201).json(notification);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/send-reminders", requireAuth, requireRole("TenantAdmin", "BranchManager", "CollectionOfficer"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { daysBeforeDue, channel } = req.body;
    const reminderDays = daysBeforeDue || 3;
    const reminderChannel = channel || "SMS";

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + reminderDays);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    const upcomingInstallments = await db.select().from(installmentsTable)
      .where(and(
        eq(installmentsTable.tenantId, tenantId),
        eq(installmentsTable.status, "Pending"),
        lte(installmentsTable.dueDate, targetDateStr),
      ));

    let sentCount = 0;
    for (const inst of upcomingInstallments) {
      const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, inst.loanId)).limit(1);
      if (!loan) continue;
      const [lr] = await db.select({ clientId: loanRequestsTable.clientId }).from(loanRequestsTable).where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
      if (!lr) continue;
      const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, lr.clientId)).limit(1);
      if (!client || !client.phone) continue;

      const body = `Dear ${client.fullNameAr}, your installment #${inst.installmentNumber} of ${Number(inst.totalAmount)} EGP is due on ${inst.dueDate}. Please arrange payment.`;

      await db.insert(notificationsTable).values({
        tenantId, channel: reminderChannel,
        recipientType: "Client", recipientId: client.id,
        recipientContact: client.phone,
        subject: "Payment Reminder",
        body, status: "Queued",
        metadata: { installmentId: inst.id, loanId: inst.loanId },
      });
      sentCount++;
    }

    res.json({ remindersQueued: sentCount });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const status = req.query.status as string | undefined;
    const channel = req.query.channel as string | undefined;

    let whereClause = eq(notificationsTable.tenantId, tenantId);
    if (status) whereClause = and(whereClause, eq(notificationsTable.status, status)) as typeof whereClause;
    if (channel) whereClause = and(whereClause, eq(notificationsTable.channel, channel)) as typeof whereClause;

    const [notifications, [{ count }]] = await Promise.all([
      db.select().from(notificationsTable).where(whereClause).orderBy(desc(notificationsTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(notificationsTable).where(whereClause),
    ]);

    res.json({ data: notifications, total: Number(count), page, limit });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

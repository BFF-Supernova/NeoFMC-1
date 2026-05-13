import { Router } from "express";
import { db, webhooksTable, webhookDeliveriesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getAvailableEvents } from "../lib/webhookService";
import crypto from "crypto";

const ADMIN_ROLES = ["SuperAdmin", "TenantAdmin"];

function requireAdminRole(req: any, res: any, next: any) {
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    res.status(403).json({ error: "forbidden", message: "Insufficient permissions" });
    return;
  }
  next();
}

const router = Router();
router.use(requireAuth, requireAdminRole);

router.get("/events", async (_req, res) => {
  res.json({ events: getAvailableEvents() });
});

router.get("/", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const rows = await db.select().from(webhooksTable)
      .where(eq(webhooksTable.tenantId, tenantId))
      .orderBy(desc(webhooksTable.createdAt));
    res.json({ data: rows.map(w => ({ ...w, secret: w.secret ? "****" : null })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const { url, events, description } = req.body;
    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      res.status(400).json({ error: "bad_request", message: "url and events[] required" });
      return;
    }

    const secret = crypto.randomBytes(32).toString("hex");

    const [webhook] = await db.insert(webhooksTable).values({
      tenantId, url, events, secret, description, createdById: req.user!.id,
    }).returning();

    res.status(201).json({ ...webhook, secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const { url, events, isActive, description } = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (url !== undefined) updateData.url = url;
    if (events !== undefined) updateData.events = events;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (description !== undefined) updateData.description = description;

    const [updated] = await db.update(webhooksTable).set(updateData)
      .where(and(eq(webhooksTable.id, req.params.id), eq(webhooksTable.tenantId, tenantId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ ...updated, secret: updated.secret ? "****" : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const [deleted] = await db.delete(webhooksTable)
      .where(and(eq(webhooksTable.id, req.params.id), eq(webhooksTable.tenantId, tenantId)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id/deliveries", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);

    const [rows, [{ count }]] = await Promise.all([
      db.select().from(webhookDeliveriesTable)
        .where(and(eq(webhookDeliveriesTable.webhookId, req.params.id), eq(webhookDeliveriesTable.tenantId, tenantId)))
        .orderBy(desc(webhookDeliveriesTable.createdAt))
        .limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(webhookDeliveriesTable)
        .where(and(eq(webhookDeliveriesTable.webhookId, req.params.id), eq(webhookDeliveriesTable.tenantId, tenantId))),
    ]);

    res.json({ data: rows, total: Number(count), page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

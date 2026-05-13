import { Router } from "express";
import { db, branchCashTransfersTable, branchesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const status = req.query.status as string | undefined;

    let whereClause = eq(branchCashTransfersTable.tenantId, tenantId);
    if (status) whereClause = and(whereClause, eq(branchCashTransfersTable.status, status)) as any;

    const fromBranch = db.$with("from_branch").as(db.select({ id: branchesTable.id, name: branchesTable.name }).from(branchesTable));
    const toBranch = db.$with("to_branch").as(db.select({ id: branchesTable.id, name: branchesTable.name }).from(branchesTable));

    const [transfers, [{ total }]] = await Promise.all([
      db.select().from(branchCashTransfersTable)
        .where(whereClause)
        .orderBy(desc(branchCashTransfersTable.createdAt))
        .limit(limit).offset((page - 1) * limit),
      db.select({ total: sql<number>`count(*)` }).from(branchCashTransfersTable).where(whereClause),
    ]);

    const branchIds = [...new Set(transfers.flatMap(t => [t.fromBranchId, t.toBranchId]))];
    const branches = branchIds.length > 0
      ? await db.select({ id: branchesTable.id, name: branchesTable.name }).from(branchesTable).where(sql`${branchesTable.id} = ANY(${branchIds})`)
      : [];
    const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));

    res.json({
      data: transfers.map(t => ({
        ...t, amount: Number(t.amount),
        fromBranchName: branchMap[t.fromBranchId] || "",
        toBranchName: branchMap[t.toBranchId] || "",
      })),
      total: Number(total), page, limit,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { fromBranchId, toBranchId, amount, reason, notes } = req.body;
    if (!fromBranchId || !toBranchId || !amount) {
      res.status(400).json({ error: "bad_request", message: "fromBranchId, toBranchId, amount required" }); return;
    }
    if (fromBranchId === toBranchId) {
      res.status(400).json({ error: "bad_request", message: "Cannot transfer to same branch" }); return;
    }
    const refNum = `CTR-${Date.now().toString(36).toUpperCase()}`;
    const [transfer] = await db.insert(branchCashTransfersTable).values({
      tenantId, fromBranchId, toBranchId, amount: Number(amount).toString(),
      reason: reason || null, notes: notes || null, referenceNumber: refNum,
      requestedById: req.user!.id, requestedByName: req.user!.fullName,
    }).returning();

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName, action: "CREATE", entity: "BranchCashTransfer", entityId: transfer.id, details: { fromBranchId, toBranchId, amount } });
    res.status(201).json({ ...transfer, amount: Number(transfer.amount) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id/approve", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    if (!["TenantAdmin", "BranchManager", "SuperAdmin"].includes(req.user!.role)) {
      res.status(403).json({ error: "forbidden" }); return;
    }
    const [transfer] = await db.select().from(branchCashTransfersTable)
      .where(and(eq(branchCashTransfersTable.id, req.params.id), eq(branchCashTransfersTable.tenantId, tenantId))).limit(1);
    if (!transfer) { res.status(404).json({ error: "not_found" }); return; }
    if (transfer.status !== "Pending") { res.status(400).json({ error: "bad_request", message: "Only pending transfers can be approved" }); return; }
    if (transfer.requestedById === req.user!.id) { res.status(400).json({ error: "bad_request", message: "Cannot approve own request" }); return; }

    const [updated] = await db.update(branchCashTransfersTable).set({
      status: "Approved", approvedById: req.user!.id, approvedByName: req.user!.fullName,
      approvedAt: new Date(), updatedAt: new Date(),
    }).where(eq(branchCashTransfersTable.id, transfer.id)).returning();

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName, action: "APPROVE", entity: "BranchCashTransfer", entityId: transfer.id });
    res.json({ ...updated, amount: Number(updated.amount) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id/receive", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [transfer] = await db.select().from(branchCashTransfersTable)
      .where(and(eq(branchCashTransfersTable.id, req.params.id), eq(branchCashTransfersTable.tenantId, tenantId))).limit(1);
    if (!transfer) { res.status(404).json({ error: "not_found" }); return; }
    if (transfer.status !== "Approved") { res.status(400).json({ error: "bad_request", message: "Only approved transfers can be received" }); return; }

    const [updated] = await db.update(branchCashTransfersTable).set({
      status: "Completed", receivedById: req.user!.id, receivedByName: req.user!.fullName,
      receivedAt: new Date(), updatedAt: new Date(),
    }).where(eq(branchCashTransfersTable.id, transfer.id)).returning();

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName, action: "RECEIVE", entity: "BranchCashTransfer", entityId: transfer.id });
    res.json({ ...updated, amount: Number(updated.amount) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id/reject", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    if (!["TenantAdmin", "BranchManager", "SuperAdmin"].includes(req.user!.role)) {
      res.status(403).json({ error: "forbidden" }); return;
    }
    const { reason } = req.body;
    const [transfer] = await db.select().from(branchCashTransfersTable)
      .where(and(eq(branchCashTransfersTable.id, req.params.id), eq(branchCashTransfersTable.tenantId, tenantId))).limit(1);
    if (!transfer) { res.status(404).json({ error: "not_found" }); return; }
    if (transfer.status !== "Pending") { res.status(400).json({ error: "bad_request", message: "Only pending transfers can be rejected" }); return; }

    const [updated] = await db.update(branchCashTransfersTable).set({
      status: "Rejected", notes: reason || transfer.notes, updatedAt: new Date(),
    }).where(eq(branchCashTransfersTable.id, transfer.id)).returning();

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName, action: "REJECT", entity: "BranchCashTransfer", entityId: transfer.id });
    res.json({ ...updated, amount: Number(updated.amount) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

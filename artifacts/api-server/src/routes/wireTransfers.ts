import { Router } from "express";
import { db, wireTransfersTable, journalEntriesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const status = req.query.status as string | undefined;
    const reconciliationStatus = req.query.reconciliationStatus as string | undefined;

    let whereClause = eq(wireTransfersTable.tenantId, tenantId);
    if (status) whereClause = and(whereClause, eq(wireTransfersTable.status, status)) as typeof whereClause;
    if (reconciliationStatus) whereClause = and(whereClause, eq(wireTransfersTable.reconciliationStatus, reconciliationStatus)) as typeof whereClause;

    const [transfers, [{ count }]] = await Promise.all([
      db.select().from(wireTransfersTable).where(whereClause).orderBy(desc(wireTransfersTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(wireTransfersTable).where(whereClause),
    ]);

    res.json({
      data: transfers.map(t => ({ ...t, amount: Number(t.amount) })),
      total: Number(count), page, limit,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { loanId, branchId, transferType, senderBank, senderAccountNumber, senderName, recipientBank, recipientAccountNumber, recipientName, amount, referenceNumber, bankReferenceNumber, transferDate, valueDate, notes } = req.body;
    if (!amount || !transferDate) {
      res.status(400).json({ error: "bad_request", message: "amount, transferDate required" });
      return;
    }

    const [wt] = await db.insert(wireTransfersTable).values({
      tenantId, loanId: loanId || null, branchId: branchId || null,
      transferType: transferType || "Incoming",
      senderBank, senderAccountNumber, senderName,
      recipientBank, recipientAccountNumber, recipientName,
      amount: amount.toString(), referenceNumber, bankReferenceNumber,
      transferDate, valueDate, notes,
      status: "Pending", reconciliationStatus: "Unreconciled",
      createdById: req.user!.id,
    }).returning();

    res.status(201).json({ ...wt, amount: Number(wt.amount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/status", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { status } = req.body;
    const validStatuses = ["Pending", "Completed", "Failed", "Cancelled"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: "bad_request", message: `status must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const [updated] = await db.update(wireTransfersTable).set({ status, updatedAt: new Date() })
      .where(and(eq(wireTransfersTable.id, req.params.id), eq(wireTransfersTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ ...updated, amount: Number(updated.amount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/reconcile", requireAuth, requireRole("TenantAdmin", "BranchManager", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [wt] = await db.select().from(wireTransfersTable)
      .where(and(eq(wireTransfersTable.id, req.params.id), eq(wireTransfersTable.tenantId, tenantId))).limit(1);
    if (!wt) { res.status(404).json({ error: "not_found" }); return; }
    if (wt.reconciliationStatus === "Reconciled") {
      res.status(400).json({ error: "bad_request", message: "Already reconciled" });
      return;
    }

    await db.insert(journalEntriesTable).values({
      tenantId, branchId: wt.branchId, referenceType: "WireTransfer", referenceId: wt.id,
      description: `Wire transfer ${wt.transferType} - ${Number(wt.amount)} EGP (Ref: ${wt.referenceNumber || wt.bankReferenceNumber || "N/A"})`,
      totalDebit: wt.amount, totalCredit: wt.amount,
    });

    const [updated] = await db.update(wireTransfersTable).set({
      reconciliationStatus: "Reconciled",
      reconciledAt: new Date(), reconciledById: req.user!.id,
      glReconciled: true, updatedAt: new Date(),
    }).where(eq(wireTransfersTable.id, wt.id)).returning();

    res.json({ ...updated, amount: Number(updated.amount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

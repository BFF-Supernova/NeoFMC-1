import { Router } from "express";
import { db, offloadingBatchesTable, offloadingItemsTable, loansTable, loanRequestsTable, clientsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);

    const [batches, [{ count }]] = await Promise.all([
      db.select().from(offloadingBatchesTable).where(eq(offloadingBatchesTable.tenantId, tenantId)).orderBy(desc(offloadingBatchesTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(offloadingBatchesTable).where(eq(offloadingBatchesTable.tenantId, tenantId)),
    ]);

    res.json({
      data: batches.map(b => ({ ...b, totalAmount: Number(b.totalAmount) })),
      total: Number(count), page, limit,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [batch] = await db.select().from(offloadingBatchesTable)
      .where(and(eq(offloadingBatchesTable.id, req.params.id), eq(offloadingBatchesTable.tenantId, tenantId))).limit(1);
    if (!batch) { res.status(404).json({ error: "not_found" }); return; }

    const items = await db.select().from(offloadingItemsTable)
      .where(eq(offloadingItemsTable.batchId, batch.id));

    res.json({
      ...batch, totalAmount: Number(batch.totalAmount),
      items: items.map(i => ({ ...i, outstandingAmount: Number(i.outstandingAmount), offloadPrice: i.offloadPrice ? Number(i.offloadPrice) : null })),
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, requireRole("TenantAdmin", "BranchManager"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { batchName, description, branchId, thirdPartyName, thirdPartyContact, offloadDate, offloadTerms, loanIds } = req.body;
    if (!batchName) {
      res.status(400).json({ error: "bad_request", message: "batchName required" });
      return;
    }

    const [batch] = await db.insert(offloadingBatchesTable).values({
      tenantId, batchName, description, branchId: branchId || null,
      thirdPartyName, thirdPartyContact,
      offloadDate: offloadDate || new Date().toISOString().split("T")[0],
      offloadTerms, status: "Draft",
      createdById: req.user!.id,
    }).returning();

    let totalAmount = 0;
    let totalLoans = 0;

    if (loanIds && Array.isArray(loanIds)) {
      for (const loanId of loanIds) {
        const [loan] = await db.select().from(loansTable)
          .where(and(eq(loansTable.id, loanId), eq(loansTable.tenantId, tenantId))).limit(1);
        if (!loan) continue;

        const [lr] = await db.select({ clientId: loanRequestsTable.clientId }).from(loanRequestsTable)
          .where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
        let clientName = "";
        if (lr) {
          const [client] = await db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable)
            .where(eq(clientsTable.id, lr.clientId)).limit(1);
          clientName = client?.fullNameAr || "";
        }

        await db.insert(offloadingItemsTable).values({
          tenantId, batchId: batch.id, loanId: loan.id,
          clientName, outstandingAmount: loan.outstandingBalance,
          status: "Pending",
        });

        totalAmount += Number(loan.outstandingBalance);
        totalLoans++;
      }

      await db.update(offloadingBatchesTable).set({
        totalLoans, totalAmount: totalAmount.toString(), updatedAt: new Date(),
      }).where(eq(offloadingBatchesTable.id, batch.id));
    }

    res.status(201).json({ ...batch, totalLoans, totalAmount });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/status", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { status } = req.body;
    if (!status || !["Draft", "Submitted", "Approved", "Completed", "Cancelled"].includes(status)) {
      res.status(400).json({ error: "bad_request", message: "Invalid status" });
      return;
    }

    const [updated] = await db.update(offloadingBatchesTable).set({ status, updatedAt: new Date() })
      .where(and(eq(offloadingBatchesTable.id, req.params.id), eq(offloadingBatchesTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }

    res.json({ ...updated, totalAmount: Number(updated.totalAmount) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

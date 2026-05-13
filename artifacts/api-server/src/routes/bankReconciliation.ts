import { Router } from "express";
import { db, bankReconciliationTable, bankReconciliationItemsTable, paymentsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, requireRole("TenantAdmin", "BranchManager", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const reconciliations = await db.select().from(bankReconciliationTable)
      .where(eq(bankReconciliationTable.tenantId, tenantId))
      .orderBy(desc(bankReconciliationTable.createdAt))
      .limit(50);
    res.json(reconciliations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, requireRole("TenantAdmin", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { reconciliationDate, bankAccountName, statementBalance, notes, items } = req.body;

    if (!reconciliationDate || !bankAccountName) {
      res.status(400).json({ error: "bad_request", message: "reconciliationDate and bankAccountName required" });
      return;
    }

    const paymentsResult = await db.select({
      total: sql<number>`COALESCE(SUM(amount::numeric), 0)`,
    }).from(paymentsTable)
      .where(and(
        eq(paymentsTable.tenantId, tenantId),
        eq(paymentsTable.status, "Completed"),
        sql`${paymentsTable.createdAt}::date = ${reconciliationDate}::date`,
      ));
    const systemBalance = Number(paymentsResult[0]?.total || 0);
    const stmtBal = Number(statementBalance || 0);
    const discrepancy = Math.round((stmtBal - systemBalance) * 100) / 100;

    const [reconciliation] = await db.insert(bankReconciliationTable).values({
      tenantId,
      reconciliationDate,
      bankAccountName,
      statementBalance: stmtBal.toString(),
      systemBalance: systemBalance.toString(),
      discrepancy: discrepancy.toString(),
      matchedCount: "0",
      unmatchedCount: String((items || []).length),
      notes,
      reconciledById: req.user!.id,
      reconciledByName: req.user!.fullName,
    }).returning();

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await db.insert(bankReconciliationItemsTable).values({
          reconciliationId: reconciliation.id,
          tenantId,
          transactionDate: item.transactionDate,
          description: item.description,
          amount: String(item.amount),
          type: item.type || "Debit",
          source: item.source || "Bank",
          matchStatus: "Unmatched",
        });
      }
    }

    res.status(201).json(reconciliation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [reconciliation] = await db.select().from(bankReconciliationTable)
      .where(and(eq(bankReconciliationTable.id, req.params.id), eq(bankReconciliationTable.tenantId, tenantId))).limit(1);
    if (!reconciliation) { res.status(404).json({ error: "not_found" }); return; }

    const items = await db.select().from(bankReconciliationItemsTable)
      .where(eq(bankReconciliationItemsTable.reconciliationId, req.params.id));

    res.json({ ...reconciliation, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/finalize", requireAuth, requireRole("TenantAdmin", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [updated] = await db.update(bankReconciliationTable)
      .set({ status: "Finalized", updatedAt: new Date() })
      .where(and(eq(bankReconciliationTable.id, req.params.id), eq(bankReconciliationTable.tenantId, tenantId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

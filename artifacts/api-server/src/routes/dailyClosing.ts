import { Router } from "express";
import { db, dailyClosingsTable, paymentsTable, loansTable, expensesTable, loanRequestsTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const branchId = req.query.branchId as string | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);

    let whereClause = eq(dailyClosingsTable.tenantId, tenantId);
    if (branchId) whereClause = and(whereClause, eq(dailyClosingsTable.branchId, branchId)) as typeof whereClause;

    const [rows, [{ count }]] = await Promise.all([
      db.select().from(dailyClosingsTable).where(whereClause).orderBy(desc(dailyClosingsTable.closingDate)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(dailyClosingsTable).where(whereClause),
    ]);

    res.json({ data: rows.map(r => ({ ...r, totalCollected: Number(r.totalCollected), totalDisbursed: Number(r.totalDisbursed), totalExpenses: Number(r.totalExpenses), expectedCash: Number(r.expectedCash), actualCash: Number(r.actualCash), discrepancy: Number(r.discrepancy) })), total: Number(count), page, limit });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/prepare", requireAuth, requireRole("TenantAdmin", "BranchManager", "Cashier", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { branchId } = req.body;
    if (!branchId) { res.status(400).json({ error: "bad_request", message: "branchId required" }); return; }

    const today = new Date().toISOString().split("T")[0];

    const [existing] = await db.select().from(dailyClosingsTable)
      .where(and(eq(dailyClosingsTable.tenantId, tenantId), eq(dailyClosingsTable.branchId, branchId), eq(dailyClosingsTable.closingDate, today))).limit(1);
    if (existing && existing.status === "Closed") {
      res.status(400).json({ error: "already_closed", message: "Today is already closed for this branch" }); return;
    }

    const [{ collected }] = await db.select({ collected: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(paymentsTable)
      .where(and(eq(paymentsTable.tenantId, tenantId), gte(paymentsTable.createdAt, new Date(today)), eq(paymentsTable.status, "Completed")));

    const [{ disbursed }] = await db.select({ disbursed: sql<number>`COALESCE(SUM(requested_amount), 0)` })
      .from(loanRequestsTable)
      .where(and(eq(loanRequestsTable.tenantId, tenantId), eq(loanRequestsTable.workflowStatus, "Disbursed"), gte(loanRequestsTable.updatedAt, new Date(today))));

    const [{ expenses }] = await db.select({ expenses: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(expensesTable)
      .where(and(eq(expensesTable.tenantId, tenantId), eq(expensesTable.branchId, branchId), eq(expensesTable.status, "Approved"), gte(expensesTable.createdAt, new Date(today))));

    const expectedCash = Number(collected) - Number(disbursed) - Number(expenses);

    res.json({
      closingDate: today,
      branchId,
      totalCollected: Number(collected),
      totalDisbursed: Number(disbursed),
      totalExpenses: Number(expenses),
      expectedCash: Math.round(expectedCash * 100) / 100,
      status: existing ? existing.status : "Open",
      existingId: existing?.id || null,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/close", requireAuth, requireRole("TenantAdmin", "BranchManager", "Cashier", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { branchId, actualCash, notes, totalCollected, totalDisbursed, totalExpenses, expectedCash, denominationBreakdown } = req.body;
    if (!branchId || actualCash === undefined) {
      res.status(400).json({ error: "bad_request", message: "branchId and actualCash required" }); return;
    }
    if (isNaN(Number(actualCash)) || Number(actualCash) < 0) {
      res.status(400).json({ error: "bad_request", message: "actualCash must be a non-negative number" }); return;
    }

    const today = new Date().toISOString().split("T")[0];
    const discrepancy = Math.round((Number(actualCash) - Number(expectedCash)) * 100) / 100;

    const [existing] = await db.select().from(dailyClosingsTable)
      .where(and(eq(dailyClosingsTable.tenantId, tenantId), eq(dailyClosingsTable.branchId, branchId), eq(dailyClosingsTable.closingDate, today))).limit(1);

    let row;
    const closeData = {
      totalCollected: (totalCollected || 0).toString(),
      totalDisbursed: (totalDisbursed || 0).toString(),
      totalExpenses: (totalExpenses || 0).toString(),
      expectedCash: (expectedCash || 0).toString(),
      actualCash: actualCash.toString(),
      discrepancy: discrepancy.toString(),
      denominationBreakdown: denominationBreakdown || null,
      status: "Closed" as const,
      closedById: req.user!.id,
      closedByName: req.user!.fullName || "",
      closedAt: new Date(),
      notes,
    };
    if (existing) {
      [row] = await db.update(dailyClosingsTable).set(closeData)
        .where(eq(dailyClosingsTable.id, existing.id)).returning();
    } else {
      [row] = await db.insert(dailyClosingsTable).values({
        tenantId, branchId, closingDate: today, ...closeData,
      }).returning();
    }

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName || "", action: "DAILY_CLOSE", entity: "DailyClosing", entityId: row.id, details: { branchId, actualCash, expectedCash, discrepancy } });

    res.json({ ...row, totalCollected: Number(row.totalCollected), totalDisbursed: Number(row.totalDisbursed), totalExpenses: Number(row.totalExpenses), expectedCash: Number(row.expectedCash), actualCash: Number(row.actualCash), discrepancy: Number(row.discrepancy) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/reopen", requireAuth, requireRole("SuperAdmin", "TenantAdmin"), async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ error: "bad_request", message: "Reopen reason is required" });
      return;
    }

    let tenantFilter: any;
    if (userRole === "SuperAdmin") {
      const [closing] = await db.select().from(dailyClosingsTable).where(eq(dailyClosingsTable.id, req.params.id)).limit(1);
      if (!closing) { res.status(404).json({ error: "not_found" }); return; }
      tenantFilter = closing.tenantId;
    } else {
      tenantFilter = req.user!.tenantId;
      if (!tenantFilter) { res.status(403).json({ error: "forbidden" }); return; }
    }

    const [closing] = await db.select().from(dailyClosingsTable)
      .where(and(eq(dailyClosingsTable.id, req.params.id), eq(dailyClosingsTable.tenantId, tenantFilter))).limit(1);
    if (!closing) { res.status(404).json({ error: "not_found" }); return; }
    if (closing.status !== "Closed") {
      res.status(400).json({ error: "bad_request", message: "Only closed days can be reopened" });
      return;
    }

    const [updated] = await db.update(dailyClosingsTable)
      .set({ status: "Reopened", notes: `REOPENED: ${reason}. Original notes: ${closing.notes || ""}` })
      .where(eq(dailyClosingsTable.id, closing.id)).returning();

    await logAudit({
      tenantId: tenantFilter, userId, userName: req.user!.fullName || "",
      action: "REOPEN_DAILY_CLOSING", entity: "DailyClosing", entityId: closing.id,
      details: { closingDate: closing.closingDate, reason, reopenedBy: userRole },
    });

    res.json({ ...updated, totalCollected: Number(updated.totalCollected), totalDisbursed: Number(updated.totalDisbursed), totalExpenses: Number(updated.totalExpenses), expectedCash: Number(updated.expectedCash), actualCash: Number(updated.actualCash), discrepancy: Number(updated.discrepancy) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

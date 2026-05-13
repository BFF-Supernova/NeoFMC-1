import { Router } from "express";
import {
  db, periodicClosingsTable, dailyClosingsTable, glAccountsTable,
  journalEntriesTable, journalItemsTable, installmentsTable, loansTable,
  paymentsTable, expensesTable,
} from "@workspace/db";
import { eq, and, desc, sql, gte, lte, between } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

function formatClosing(r: typeof periodicClosingsTable.$inferSelect) {
  return {
    ...r,
    totalCollected: Number(r.totalCollected),
    totalDisbursed: Number(r.totalDisbursed),
    totalExpenses: Number(r.totalExpenses),
    expectedCash: Number(r.expectedCash),
    actualCash: Number(r.actualCash),
    discrepancy: Number(r.discrepancy),
    dailyClosingsCount: Number(r.dailyClosingsCount),
    accruedInterest: Number(r.accruedInterest),
    accruedPenalties: Number(r.accruedPenalties),
    provisionForLosses: Number(r.provisionForLosses),
    retainedEarningsTransfer: Number(r.retainedEarningsTransfer),
  };
}

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return { start, end };
}

function getQuarterRange(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const start = `${year}-${String(startMonth).padStart(2, '0')}-01`;
  const endDate = new Date(year, endMonth, 0);
  const end = `${year}-${String(endMonth).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return { start, end };
}

function getYearRange(year: number) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

function computePeriodDates(periodType: string, year: number, month?: number, quarter?: number) {
  let periodStart: string, periodEnd: string, periodLabel: string;
  if (periodType === "Monthly") {
    if (!month) throw new Error("month is required for Monthly closing");
    const range = getMonthRange(year, month);
    periodStart = range.start;
    periodEnd = range.end;
    periodLabel = `${year}-${String(month).padStart(2, '0')}`;
  } else if (periodType === "Quarterly") {
    if (!quarter) throw new Error("quarter is required for Quarterly closing");
    const range = getQuarterRange(year, quarter);
    periodStart = range.start;
    periodEnd = range.end;
    periodLabel = `${year}-Q${quarter}`;
  } else if (periodType === "Annual") {
    const range = getYearRange(year);
    periodStart = range.start;
    periodEnd = range.end;
    periodLabel = `${year}`;
  } else {
    throw new Error("Invalid periodType");
  }
  return { periodStart, periodEnd, periodLabel };
}

async function computeAggregates(tenantId: string, periodType: string, periodStart: string, periodEnd: string) {
  const dailyAgg = await db.select({
    totalCollected: sql<number>`COALESCE(SUM(CAST(total_collected AS NUMERIC)), 0)`,
    totalDisbursed: sql<number>`COALESCE(SUM(CAST(total_disbursed AS NUMERIC)), 0)`,
    totalExpenses: sql<number>`COALESCE(SUM(CAST(total_expenses AS NUMERIC)), 0)`,
    expectedCash: sql<number>`COALESCE(SUM(CAST(expected_cash AS NUMERIC)), 0)`,
    actualCash: sql<number>`COALESCE(SUM(CAST(actual_cash AS NUMERIC)), 0)`,
    discrepancy: sql<number>`COALESCE(SUM(CAST(discrepancy AS NUMERIC)), 0)`,
    closingsCount: sql<number>`COUNT(*)`,
  }).from(dailyClosingsTable)
    .where(and(
      eq(dailyClosingsTable.tenantId, tenantId),
      gte(dailyClosingsTable.closingDate, periodStart),
      lte(dailyClosingsTable.closingDate, periodEnd),
      eq(dailyClosingsTable.status, "Closed")
    ));

  const agg = dailyAgg[0] || { totalCollected: 0, totalDisbursed: 0, totalExpenses: 0, expectedCash: 0, actualCash: 0, discrepancy: 0, closingsCount: 0 };

  const trialBalanceRows = await db.select({
    accountId: glAccountsTable.id,
    accountCode: glAccountsTable.accountCode,
    accountName: glAccountsTable.accountName,
    accountNameAr: glAccountsTable.accountNameAr,
    accountType: glAccountsTable.accountType,
    totalDebit: sql<number>`COALESCE(SUM(CAST(ji.debit AS NUMERIC)), 0)`,
    totalCredit: sql<number>`COALESCE(SUM(CAST(ji.credit AS NUMERIC)), 0)`,
  })
    .from(glAccountsTable)
    .leftJoin(
      sql`journal_items ji ON ji.account_id = ${glAccountsTable.id} AND ji.tenant_id = ${tenantId} AND ji.entry_id IN (SELECT id FROM journal_entries WHERE tenant_id = ${tenantId} AND transaction_date >= ${periodStart} AND transaction_date <= ${periodEnd})`,
    )
    .where(eq(glAccountsTable.tenantId, tenantId))
    .groupBy(glAccountsTable.id, glAccountsTable.accountCode, glAccountsTable.accountName, glAccountsTable.accountNameAr, glAccountsTable.accountType)
    .orderBy(glAccountsTable.accountCode);

  const trialBalance = trialBalanceRows
    .filter(r => Number(r.totalDebit) !== 0 || Number(r.totalCredit) !== 0)
    .map(r => ({
      accountCode: r.accountCode,
      accountName: r.accountName,
      accountNameAr: r.accountNameAr,
      accountType: r.accountType,
      debit: Number(r.totalDebit),
      credit: Number(r.totalCredit),
      balance: Number(r.totalDebit) - Number(r.totalCredit),
    }));

  const [interestAgg] = await db.select({
    accrued: sql<number>`COALESCE(SUM(CAST(interest_amount AS NUMERIC) - LEAST(CAST(paid_amount AS NUMERIC), CAST(interest_amount AS NUMERIC))), 0)`,
  }).from(installmentsTable)
    .where(and(
      eq(installmentsTable.tenantId, tenantId),
      lte(installmentsTable.dueDate, periodEnd),
      sql`${installmentsTable.status} IN ('Pending', 'Overdue')`
    ));

  const [penaltyAgg] = await db.select({
    accrued: sql<number>`COALESCE(SUM(CAST(penalty_amount AS NUMERIC)), 0)`,
  }).from(installmentsTable)
    .where(and(
      eq(installmentsTable.tenantId, tenantId),
      lte(installmentsTable.dueDate, periodEnd),
      sql`${installmentsTable.status} = 'Overdue'`
    ));

  let provisionForLosses = 0;
  let parBreakdown: any = null;
  let retainedEarningsTransfer = 0;
  let incomeStatement: any = null;

  if (periodType === "Quarterly" || periodType === "Annual") {
    const parRows = await db.select({
      bucket: sql<string>`CASE
        WHEN days_overdue BETWEEN 1 AND 30 THEN 'PAR1_30'
        WHEN days_overdue BETWEEN 31 AND 60 THEN 'PAR31_60'
        WHEN days_overdue BETWEEN 61 AND 90 THEN 'PAR61_90'
        WHEN days_overdue BETWEEN 91 AND 180 THEN 'PAR91_180'
        WHEN days_overdue > 180 THEN 'PAR180_PLUS'
        ELSE 'CURRENT'
      END`,
      totalOutstanding: sql<number>`COALESCE(SUM(CAST(total_amount AS NUMERIC) - CAST(paid_amount AS NUMERIC)), 0)`,
      count: sql<number>`COUNT(*)`,
    }).from(installmentsTable)
      .where(and(
        eq(installmentsTable.tenantId, tenantId),
        sql`${installmentsTable.status} IN ('Pending', 'Overdue')`,
        lte(installmentsTable.dueDate, periodEnd)
      ))
      .groupBy(sql`CASE
        WHEN days_overdue BETWEEN 1 AND 30 THEN 'PAR1_30'
        WHEN days_overdue BETWEEN 31 AND 60 THEN 'PAR31_60'
        WHEN days_overdue BETWEEN 61 AND 90 THEN 'PAR61_90'
        WHEN days_overdue BETWEEN 91 AND 180 THEN 'PAR91_180'
        WHEN days_overdue > 180 THEN 'PAR180_PLUS'
        ELSE 'CURRENT'
      END`);

    const provisionRates: Record<string, number> = {
      CURRENT: 0.01, PAR1_30: 0.05, PAR31_60: 0.10,
      PAR61_90: 0.25, PAR91_180: 0.50, PAR180_PLUS: 1.00,
    };

    parBreakdown = {};
    for (const row of parRows) {
      const bucket = row.bucket;
      const outstanding = Number(row.totalOutstanding);
      const rate = provisionRates[bucket] || 0;
      const provision = Math.round(outstanding * rate * 100) / 100;
      parBreakdown[bucket] = { outstanding, count: Number(row.count), rate, provision };
      provisionForLosses += provision;
    }
    provisionForLosses = Math.round(provisionForLosses * 100) / 100;
  }

  if (periodType === "Annual") {
    let totalIncome = 0;
    let totalExpensesGL = 0;

    for (const row of trialBalanceRows) {
      if (row.accountType === "Income" || row.accountType === "Revenue") {
        totalIncome += Number(row.totalCredit) - Number(row.totalDebit);
      } else if (row.accountType === "Expense") {
        totalExpensesGL += Number(row.totalDebit) - Number(row.totalCredit);
      }
    }

    const netIncome = totalIncome - totalExpensesGL;
    retainedEarningsTransfer = Math.round(netIncome * 100) / 100;

    incomeStatement = {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpensesGL * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      provisionForLosses,
      netIncomeAfterProvision: Math.round((netIncome - provisionForLosses) * 100) / 100,
    };
  }

  return {
    totalCollected: Number(agg.totalCollected),
    totalDisbursed: Number(agg.totalDisbursed),
    totalExpenses: Number(agg.totalExpenses),
    expectedCash: Number(agg.expectedCash),
    actualCash: Number(agg.actualCash),
    discrepancy: Number(agg.discrepancy),
    dailyClosingsCount: Number(agg.closingsCount),
    trialBalance,
    accruedInterest: Number(interestAgg?.accrued || 0),
    accruedPenalties: Number(penaltyAgg?.accrued || 0),
    provisionForLosses,
    parBreakdown,
    retainedEarningsTransfer,
    incomeStatement,
  };
}

router.get("/", requireAuth, requireRole("TenantAdmin", "BranchManager", "Accountant", "Auditor", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const periodType = req.query.type as string || "Monthly";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);

    const whereClause = and(
      eq(periodicClosingsTable.tenantId, tenantId),
      eq(periodicClosingsTable.periodType, periodType)
    );

    const [rows, [{ count }]] = await Promise.all([
      db.select().from(periodicClosingsTable).where(whereClause)
        .orderBy(desc(periodicClosingsTable.periodStart))
        .limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(periodicClosingsTable).where(whereClause),
    ]);

    res.json({ data: rows.map(formatClosing), total: Number(count), page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/prepare", requireAuth, requireRole("TenantAdmin", "BranchManager", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { periodType, year, month, quarter } = req.body;

    if (!periodType || !year) {
      res.status(400).json({ error: "bad_request", message: "periodType and year are required" });
      return;
    }

    let dates;
    try { dates = computePeriodDates(periodType, year, month, quarter); }
    catch (e: any) { res.status(400).json({ error: "bad_request", message: e.message }); return; }

    const { periodStart, periodEnd, periodLabel } = dates;

    const [existing] = await db.select().from(periodicClosingsTable)
      .where(and(
        eq(periodicClosingsTable.tenantId, tenantId),
        eq(periodicClosingsTable.periodType, periodType),
        eq(periodicClosingsTable.periodStart, periodStart)
      )).limit(1);

    if (existing && existing.status === "Closed") {
      res.json({ ...formatClosing(existing), alreadyClosed: true });
      return;
    }

    const aggregates = await computeAggregates(tenantId, periodType, periodStart, periodEnd);

    res.json({
      periodType, periodStart, periodEnd, periodLabel,
      ...aggregates,
      status: existing ? existing.status : "Open",
      existingId: existing?.id || null,
      alreadyClosed: false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/close", requireAuth, requireRole("TenantAdmin", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { periodType, year, month, quarter, notes } = req.body;

    if (!periodType || !year) {
      res.status(400).json({ error: "bad_request", message: "periodType and year are required" });
      return;
    }

    let dates;
    try { dates = computePeriodDates(periodType, year, month, quarter); }
    catch (e: any) { res.status(400).json({ error: "bad_request", message: e.message }); return; }

    const { periodStart, periodEnd, periodLabel } = dates;

    const [existing] = await db.select().from(periodicClosingsTable)
      .where(and(
        eq(periodicClosingsTable.tenantId, tenantId),
        eq(periodicClosingsTable.periodType, periodType),
        eq(periodicClosingsTable.periodStart, periodStart)
      )).limit(1);

    if (existing && existing.status === "Closed") {
      res.status(400).json({ error: "already_closed", message: "This period is already closed" });
      return;
    }

    if (periodType === "Quarterly") {
      const startDate = new Date(periodStart);
      const qYear = startDate.getFullYear();
      const qStartMonth = startDate.getMonth() + 1;
      for (let m = qStartMonth; m < qStartMonth + 3; m++) {
        const mRange = getMonthRange(qYear, m);
        const [monthClosing] = await db.select().from(periodicClosingsTable)
          .where(and(
            eq(periodicClosingsTable.tenantId, tenantId),
            eq(periodicClosingsTable.periodType, "Monthly"),
            eq(periodicClosingsTable.periodStart, mRange.start)
          )).limit(1);
        if (!monthClosing || monthClosing.status !== "Closed") {
          res.status(400).json({
            error: "prerequisite_missing",
            message: `Monthly closing for ${qYear}-${String(m).padStart(2, '0')} must be completed before quarterly closing`,
          });
          return;
        }
      }
    }

    if (periodType === "Annual") {
      for (let q = 1; q <= 4; q++) {
        const qRange = getQuarterRange(year, q);
        const [qClosing] = await db.select().from(periodicClosingsTable)
          .where(and(
            eq(periodicClosingsTable.tenantId, tenantId),
            eq(periodicClosingsTable.periodType, "Quarterly"),
            eq(periodicClosingsTable.periodStart, qRange.start)
          )).limit(1);
        if (!qClosing || qClosing.status !== "Closed") {
          res.status(400).json({
            error: "prerequisite_missing",
            message: `Quarterly closing for Q${q} ${year} must be completed before annual closing`,
          });
          return;
        }
      }
    }

    const aggregates = await computeAggregates(tenantId, periodType, periodStart, periodEnd);

    let row;
    const closingData = {
      totalCollected: aggregates.totalCollected.toString(),
      totalDisbursed: aggregates.totalDisbursed.toString(),
      totalExpenses: aggregates.totalExpenses.toString(),
      expectedCash: aggregates.expectedCash.toString(),
      actualCash: aggregates.actualCash.toString(),
      discrepancy: aggregates.discrepancy.toString(),
      dailyClosingsCount: aggregates.dailyClosingsCount.toString(),
      trialBalance: aggregates.trialBalance || null,
      accruedInterest: aggregates.accruedInterest.toString(),
      accruedPenalties: aggregates.accruedPenalties.toString(),
      provisionForLosses: aggregates.provisionForLosses.toString(),
      parBreakdown: aggregates.parBreakdown || null,
      retainedEarningsTransfer: aggregates.retainedEarningsTransfer.toString(),
      incomeStatement: aggregates.incomeStatement || null,
      status: "Closed" as const,
      closedById: req.user!.id,
      closedByName: req.user!.fullName || "",
      closedAt: new Date(),
      notes: notes || null,
    };

    if (existing) {
      [row] = await db.update(periodicClosingsTable)
        .set(closingData)
        .where(eq(periodicClosingsTable.id, existing.id))
        .returning();
    } else {
      [row] = await db.insert(periodicClosingsTable).values({
        tenantId,
        periodType,
        periodStart,
        periodEnd,
        periodLabel,
        ...closingData,
      }).returning();
    }

    await logAudit({
      tenantId, userId: req.user!.id, userName: req.user!.fullName || "",
      action: "PERIODIC_CLOSE", entity: "PeriodicClosing", entityId: row.id,
      details: { periodType, periodLabel, totalCollected: aggregates.totalCollected, totalExpenses: aggregates.totalExpenses, provisionForLosses: aggregates.provisionForLosses, retainedEarningsTransfer: aggregates.retainedEarningsTransfer },
    });

    res.json(formatClosing(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/reopen", requireAuth, requireRole("SuperAdmin", "TenantAdmin"), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ error: "bad_request", message: "Reopen reason is required" });
      return;
    }

    let tenantFilter: string;
    if (req.user!.role === "SuperAdmin") {
      const [closing] = await db.select().from(periodicClosingsTable).where(eq(periodicClosingsTable.id, req.params.id)).limit(1);
      if (!closing) { res.status(404).json({ error: "not_found" }); return; }
      tenantFilter = closing.tenantId;
    } else {
      tenantFilter = req.user!.tenantId!;
      if (!tenantFilter) { res.status(403).json({ error: "forbidden" }); return; }
    }

    const [closing] = await db.select().from(periodicClosingsTable)
      .where(and(eq(periodicClosingsTable.id, req.params.id), eq(periodicClosingsTable.tenantId, tenantFilter))).limit(1);
    if (!closing) { res.status(404).json({ error: "not_found" }); return; }
    if (closing.status !== "Closed") {
      res.status(400).json({ error: "bad_request", message: "Only closed periods can be reopened" });
      return;
    }

    const [updated] = await db.update(periodicClosingsTable)
      .set({ status: "Reopened", notes: `REOPENED: ${reason}. Original notes: ${closing.notes || ""}` })
      .where(eq(periodicClosingsTable.id, closing.id)).returning();

    await logAudit({
      tenantId: tenantFilter, userId: req.user!.id, userName: req.user!.fullName || "",
      action: "REOPEN_PERIODIC_CLOSING", entity: "PeriodicClosing", entityId: closing.id,
      details: { periodType: closing.periodType, periodLabel: closing.periodLabel, reason },
    });

    res.json(formatClosing(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

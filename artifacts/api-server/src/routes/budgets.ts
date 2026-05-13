import { Router } from "express";
import { db, budgetsTable, budgetLinesTable, glAccountsTable, journalEntriesTable, journalItemsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();
const BUDGET_ROLES = ["TenantAdmin", "BranchManager", "Accountant", "FinancialController", "CFO"] as const;

router.get("/", requireAuth, requireRole(...BUDGET_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const year = req.query.year ? Number(req.query.year) : undefined;
    let where = eq(budgetsTable.tenantId, tenantId);
    if (year) where = and(where, eq(budgetsTable.fiscalYear, year)) as typeof where;
    const budgets = await db.select().from(budgetsTable).where(where).orderBy(desc(budgetsTable.createdAt));
    res.json({ data: budgets.map(b => ({ ...b, totalAmount: Number(b.totalAmount) })) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/", requireAuth, requireRole("TenantAdmin", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { name, nameAr, fiscalYear, period, branchId, notes } = req.body;
    if (!name || !fiscalYear) { res.status(400).json({ error: "bad_request", message: "name, fiscalYear required" }); return; }
    const [budget] = await db.insert(budgetsTable).values({
      tenantId, name, nameAr, fiscalYear, period: period || "Annual", branchId, notes, createdById: req.user!.id,
    }).returning();
    res.status(201).json({ ...budget, totalAmount: Number(budget.totalAmount) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/:id/lines", requireAuth, requireRole(...BUDGET_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const lines = await db.select().from(budgetLinesTable).where(and(eq(budgetLinesTable.budgetId, req.params.id), eq(budgetLinesTable.tenantId, tenantId)));
    res.json({
      data: lines.map(l => ({
        ...l,
        months: [l.month1, l.month2, l.month3, l.month4, l.month5, l.month6, l.month7, l.month8, l.month9, l.month10, l.month11, l.month12].map(Number),
        annualTotal: Number(l.annualTotal),
      })),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/:id/lines", requireAuth, requireRole("TenantAdmin", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { lines } = req.body;
    if (!Array.isArray(lines) || lines.length === 0) { res.status(400).json({ error: "bad_request", message: "lines array required" }); return; }

    let totalAmount = 0;
    for (const line of lines) {
      const months = line.months || Array(12).fill(0);
      const annual = months.reduce((s: number, m: number) => s + Number(m), 0);
      totalAmount += annual;
      await db.insert(budgetLinesTable).values({
        tenantId, budgetId: req.params.id, accountId: line.accountId,
        month1: months[0]?.toString() || "0", month2: months[1]?.toString() || "0",
        month3: months[2]?.toString() || "0", month4: months[3]?.toString() || "0",
        month5: months[4]?.toString() || "0", month6: months[5]?.toString() || "0",
        month7: months[6]?.toString() || "0", month8: months[7]?.toString() || "0",
        month9: months[8]?.toString() || "0", month10: months[9]?.toString() || "0",
        month11: months[10]?.toString() || "0", month12: months[11]?.toString() || "0",
        annualTotal: annual.toString(), notes: line.notes,
      });
    }
    await db.update(budgetsTable).set({ totalAmount: totalAmount.toString(), updatedAt: new Date() }).where(eq(budgetsTable.id, req.params.id));
    res.status(201).json({ message: "Budget lines saved", totalAmount });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id/approve", requireAuth, requireRole("TenantAdmin", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [budget] = await db.select().from(budgetsTable).where(and(eq(budgetsTable.id, req.params.id), eq(budgetsTable.tenantId, tenantId))).limit(1);
    if (!budget) { res.status(404).json({ error: "not_found" }); return; }
    if (budget.createdById === req.user!.id) { res.status(400).json({ error: "bad_request", message: "Cannot approve own budget (maker-checker)" }); return; }
    await db.update(budgetsTable).set({ status: "Approved", approvedById: req.user!.id, approvedAt: new Date(), updatedAt: new Date() }).where(eq(budgetsTable.id, budget.id));
    res.json({ message: "Budget approved" });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/:id/vs-actual", requireAuth, requireRole(...BUDGET_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [budget] = await db.select().from(budgetsTable).where(and(eq(budgetsTable.id, req.params.id), eq(budgetsTable.tenantId, tenantId))).limit(1);
    if (!budget) { res.status(404).json({ error: "not_found" }); return; }

    const lines = await db.select().from(budgetLinesTable).where(eq(budgetLinesTable.budgetId, budget.id));
    const dateFrom = `${budget.fiscalYear}-01-01`;
    const dateTo = `${budget.fiscalYear}-12-31`;

    const actuals = await db.select({
      accountId: sql<string>`ji.account_id`,
      totalDebit: sql<number>`COALESCE(SUM(CAST(ji.debit AS NUMERIC)), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(CAST(ji.credit AS NUMERIC)), 0)`,
    }).from(sql`journal_items ji`)
      .innerJoin(sql`journal_entries je ON je.id = ji.entry_id AND je.tenant_id = ${tenantId} AND je.transaction_date >= ${dateFrom} AND je.transaction_date <= ${dateTo}`)
      .groupBy(sql`ji.account_id`);

    const actualMap = new Map(actuals.map(a => [a.accountId, { debit: Number(a.totalDebit), credit: Number(a.totalCredit) }]));

    const accountIds = [...new Set(lines.map(l => l.accountId))];
    const accounts = accountIds.length > 0 ? await db.select().from(glAccountsTable)
      .where(sql`${glAccountsTable.id} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`,`)})`) : [];
    const accountMap = new Map(accounts.map(a => [a.id, a]));

    const comparison = lines.map(line => {
      const account = accountMap.get(line.accountId);
      const actual = actualMap.get(line.accountId) || { debit: 0, credit: 0 };
      const budgetTotal = Number(line.annualTotal);
      const actualAmount = account?.accountType === "Expense" ? actual.debit - actual.credit : actual.credit - actual.debit;
      const variance = budgetTotal - actualAmount;
      const variancePct = budgetTotal > 0 ? Math.round(variance / budgetTotal * 10000) / 100 : 0;
      return {
        accountId: line.accountId,
        accountCode: account?.accountCode,
        accountName: account?.accountName,
        accountNameAr: account?.accountNameAr,
        budgetAmount: budgetTotal,
        actualAmount: Math.round(actualAmount * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePct,
        status: variance >= 0 ? "UnderBudget" : "OverBudget",
      };
    });

    const totalBudget = comparison.reduce((s, c) => s + c.budgetAmount, 0);
    const totalActual = comparison.reduce((s, c) => s + c.actualAmount, 0);

    res.json({ budget: { id: budget.id, name: budget.name, fiscalYear: budget.fiscalYear }, lines: comparison, totalBudget, totalActual, totalVariance: totalBudget - totalActual });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

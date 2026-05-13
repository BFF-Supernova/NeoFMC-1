import { Router } from "express";
import { db, costCentersTable, journalEntriesTable, journalItemsTable, glAccountsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();
const CC_ROLES = ["TenantAdmin", "Accountant", "FinancialController", "CFO"] as const;

router.get("/", requireAuth, requireRole(...CC_ROLES, "BranchManager"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const centers = await db.select().from(costCentersTable).where(eq(costCentersTable.tenantId, tenantId));
    res.json({ data: centers });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/", requireAuth, requireRole("TenantAdmin", "FinancialController"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { code, name, nameAr, type, parentId, description } = req.body;
    if (!code || !name) { res.status(400).json({ error: "bad_request", message: "code, name required" }); return; }
    const [cc] = await db.insert(costCentersTable).values({ tenantId, code, name, nameAr, type: type || "Branch", parentId, description }).returning();
    res.status(201).json(cc);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id", requireAuth, requireRole("TenantAdmin", "FinancialController"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { name, nameAr, type, isActive, description } = req.body;
    const [updated] = await db.update(costCentersTable).set({ name, nameAr, type, isActive, description, updatedAt: new Date() })
      .where(and(eq(costCentersTable.id, req.params.id), eq(costCentersTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/pnl", requireAuth, requireRole(...CC_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    if (!dateFrom || !dateTo) { res.status(400).json({ error: "bad_request", message: "dateFrom, dateTo required" }); return; }

    const rows = await db.select({
      branchId: journalEntriesTable.branchId,
      accountType: glAccountsTable.accountType,
      totalDebit: sql<number>`COALESCE(SUM(CAST(ji.debit AS NUMERIC)), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(CAST(ji.credit AS NUMERIC)), 0)`,
    })
      .from(journalEntriesTable)
      .innerJoin(sql`journal_items ji ON ji.entry_id = ${journalEntriesTable.id}`)
      .innerJoin(glAccountsTable, eq(glAccountsTable.id, sql`ji.account_id`))
      .where(and(
        eq(journalEntriesTable.tenantId, tenantId),
        sql`${journalEntriesTable.transactionDate} >= ${dateFrom}`,
        sql`${journalEntriesTable.transactionDate} <= ${dateTo}`,
        sql`${glAccountsTable.accountType} IN ('Income', 'Revenue', 'Expense')`,
      ))
      .groupBy(journalEntriesTable.branchId, glAccountsTable.accountType);

    const branchPnl: Record<string, { income: number; expenses: number; netIncome: number }> = {};
    for (const row of rows) {
      const key = row.branchId || "unassigned";
      if (!branchPnl[key]) branchPnl[key] = { income: 0, expenses: 0, netIncome: 0 };
      const debit = Number(row.totalDebit);
      const credit = Number(row.totalCredit);
      if (row.accountType === "Income" || row.accountType === "Revenue") {
        branchPnl[key].income += credit - debit;
      } else if (row.accountType === "Expense") {
        branchPnl[key].expenses += debit - credit;
      }
    }
    for (const key of Object.keys(branchPnl)) {
      branchPnl[key].netIncome = Math.round((branchPnl[key].income - branchPnl[key].expenses) * 100) / 100;
      branchPnl[key].income = Math.round(branchPnl[key].income * 100) / 100;
      branchPnl[key].expenses = Math.round(branchPnl[key].expenses * 100) / 100;
    }
    res.json({ branchPnl, dateFrom, dateTo });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

import { Router } from "express";
import { db, glAccountsTable, journalEntriesTable, journalItemsTable } from "@workspace/db";
import { eq, and, sql, lte, gte } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

const FINANCE_ROLES = ["TenantAdmin", "BranchManager", "Accountant", "Auditor", "FinancialController", "CFO"] as const;

router.get("/trial-balance", requireAuth, requireRole(...FINANCE_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    if (!dateFrom || !dateTo) {
      res.status(400).json({ error: "bad_request", message: "dateFrom and dateTo required" });
      return;
    }

    const rows = await db.select({
      accountId: glAccountsTable.id,
      accountCode: glAccountsTable.accountCode,
      accountName: glAccountsTable.accountName,
      accountNameAr: glAccountsTable.accountNameAr,
      accountType: glAccountsTable.accountType,
      parentCode: glAccountsTable.parentCode,
      totalDebit: sql<number>`COALESCE(SUM(CAST(ji.debit AS NUMERIC)), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(CAST(ji.credit AS NUMERIC)), 0)`,
    })
      .from(glAccountsTable)
      .leftJoin(
        sql`journal_items ji ON ji.account_id = ${glAccountsTable.id} AND ji.tenant_id = ${tenantId} AND ji.entry_id IN (SELECT id FROM journal_entries WHERE tenant_id = ${tenantId} AND transaction_date >= ${dateFrom} AND transaction_date <= ${dateTo})`,
      )
      .where(eq(glAccountsTable.tenantId, tenantId))
      .groupBy(glAccountsTable.id, glAccountsTable.accountCode, glAccountsTable.accountName, glAccountsTable.accountNameAr, glAccountsTable.accountType, glAccountsTable.parentCode)
      .orderBy(glAccountsTable.accountCode);

    const accounts = rows.map(r => ({
      accountCode: r.accountCode,
      accountName: r.accountName,
      accountNameAr: r.accountNameAr,
      accountType: r.accountType,
      parentCode: r.parentCode,
      debit: Number(r.totalDebit),
      credit: Number(r.totalCredit),
      balance: Number(r.totalDebit) - Number(r.totalCredit),
    })).filter(r => r.debit !== 0 || r.credit !== 0);

    const totalDebit = accounts.reduce((s, a) => s + a.debit, 0);
    const totalCredit = accounts.reduce((s, a) => s + a.credit, 0);

    res.json({
      accounts,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      dateFrom, dateTo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/income-statement", requireAuth, requireRole(...FINANCE_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    if (!dateFrom || !dateTo) {
      res.status(400).json({ error: "bad_request", message: "dateFrom and dateTo required" });
      return;
    }

    const rows = await db.select({
      accountCode: glAccountsTable.accountCode,
      accountName: glAccountsTable.accountName,
      accountNameAr: glAccountsTable.accountNameAr,
      accountType: glAccountsTable.accountType,
      totalDebit: sql<number>`COALESCE(SUM(CAST(ji.debit AS NUMERIC)), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(CAST(ji.credit AS NUMERIC)), 0)`,
    })
      .from(glAccountsTable)
      .leftJoin(
        sql`journal_items ji ON ji.account_id = ${glAccountsTable.id} AND ji.tenant_id = ${tenantId} AND ji.entry_id IN (SELECT id FROM journal_entries WHERE tenant_id = ${tenantId} AND transaction_date >= ${dateFrom} AND transaction_date <= ${dateTo})`,
      )
      .where(and(
        eq(glAccountsTable.tenantId, tenantId),
        sql`${glAccountsTable.accountType} IN ('Income', 'Revenue', 'Expense')`
      ))
      .groupBy(glAccountsTable.accountCode, glAccountsTable.accountName, glAccountsTable.accountNameAr, glAccountsTable.accountType)
      .orderBy(glAccountsTable.accountCode);

    const incomeAccounts: any[] = [];
    const expenseAccounts: any[] = [];
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const row of rows) {
      const debit = Number(row.totalDebit);
      const credit = Number(row.totalCredit);
      if (debit === 0 && credit === 0) continue;

      if (row.accountType === "Income" || row.accountType === "Revenue") {
        const amount = credit - debit;
        incomeAccounts.push({
          accountCode: row.accountCode, accountName: row.accountName,
          accountNameAr: row.accountNameAr, amount: Math.round(amount * 100) / 100,
        });
        totalIncome += amount;
      } else if (row.accountType === "Expense") {
        const amount = debit - credit;
        expenseAccounts.push({
          accountCode: row.accountCode, accountName: row.accountName,
          accountNameAr: row.accountNameAr, amount: Math.round(amount * 100) / 100,
        });
        totalExpenses += amount;
      }
    }

    const netIncome = totalIncome - totalExpenses;

    res.json({
      incomeAccounts, expenseAccounts,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      dateFrom, dateTo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/balance-sheet", requireAuth, requireRole(...FINANCE_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const asOfDate = req.query.asOfDate as string;
    if (!asOfDate) {
      res.status(400).json({ error: "bad_request", message: "asOfDate required" });
      return;
    }

    const rows = await db.select({
      accountCode: glAccountsTable.accountCode,
      accountName: glAccountsTable.accountName,
      accountNameAr: glAccountsTable.accountNameAr,
      accountType: glAccountsTable.accountType,
      totalDebit: sql<number>`COALESCE(SUM(CAST(ji.debit AS NUMERIC)), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(CAST(ji.credit AS NUMERIC)), 0)`,
    })
      .from(glAccountsTable)
      .leftJoin(
        sql`journal_items ji ON ji.account_id = ${glAccountsTable.id} AND ji.tenant_id = ${tenantId} AND ji.entry_id IN (SELECT id FROM journal_entries WHERE tenant_id = ${tenantId} AND transaction_date <= ${asOfDate})`,
      )
      .where(eq(glAccountsTable.tenantId, tenantId))
      .groupBy(glAccountsTable.accountCode, glAccountsTable.accountName, glAccountsTable.accountNameAr, glAccountsTable.accountType)
      .orderBy(glAccountsTable.accountCode);

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    let retainedEarnings = 0;

    for (const row of rows) {
      const debit = Number(row.totalDebit);
      const credit = Number(row.totalCredit);
      if (debit === 0 && credit === 0) continue;

      if (row.accountType === "Asset") {
        const balance = debit - credit;
        assets.push({ accountCode: row.accountCode, accountName: row.accountName, accountNameAr: row.accountNameAr, balance: Math.round(balance * 100) / 100 });
        totalAssets += balance;
      } else if (row.accountType === "Liability") {
        const balance = credit - debit;
        liabilities.push({ accountCode: row.accountCode, accountName: row.accountName, accountNameAr: row.accountNameAr, balance: Math.round(balance * 100) / 100 });
        totalLiabilities += balance;
      } else if (row.accountType === "Equity") {
        const balance = credit - debit;
        equity.push({ accountCode: row.accountCode, accountName: row.accountName, accountNameAr: row.accountNameAr, balance: Math.round(balance * 100) / 100 });
        totalEquity += balance;
      } else if (row.accountType === "Income" || row.accountType === "Revenue") {
        retainedEarnings += (credit - debit);
      } else if (row.accountType === "Expense") {
        retainedEarnings -= (debit - credit);
      }
    }

    totalEquity += retainedEarnings;
    if (Math.abs(retainedEarnings) > 0.005) {
      equity.push({ accountCode: "RE", accountName: "Retained Earnings", accountNameAr: "الأرباح المحتجزة", balance: Math.round(retainedEarnings * 100) / 100 });
    }

    res.json({
      assets, liabilities, equity,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      isBalanced: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01,
      asOfDate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/cash-flow", requireAuth, requireRole(...FINANCE_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    if (!dateFrom || !dateTo) { res.status(400).json({ error: "bad_request", message: "dateFrom and dateTo required" }); return; }

    const rows = await db.select({
      referenceType: journalEntriesTable.referenceType,
      totalDebit: sql<number>`COALESCE(SUM(CAST(${journalEntriesTable.totalDebit} AS NUMERIC)), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(CAST(${journalEntriesTable.totalCredit} AS NUMERIC)), 0)`,
    })
      .from(journalEntriesTable)
      .where(and(
        eq(journalEntriesTable.tenantId, tenantId),
        sql`${journalEntriesTable.transactionDate} >= ${dateFrom}`,
        sql`${journalEntriesTable.transactionDate} <= ${dateTo}`,
      ))
      .groupBy(journalEntriesTable.referenceType);

    const refMap: Record<string, { debit: number; credit: number }> = {};
    for (const row of rows) {
      refMap[row.referenceType] = { debit: Number(row.totalDebit), credit: Number(row.totalCredit) };
    }

    const get = (key: string) => refMap[key] || { debit: 0, credit: 0 };

    const operating = {
      interestIncome: get("Repayment").credit,
      feeIncome: get("FeeIncome").credit,
      penaltyIncome: get("Penalty").credit,
      operatingExpenses: -(get("Expense").debit),
      payroll: -(get("Payroll").debit),
      netOperating: 0,
    };
    operating.netOperating = operating.interestIncome + operating.feeIncome + operating.penaltyIncome + operating.operatingExpenses + operating.payroll;

    const investing = {
      loanDisbursements: -(get("Disbursement").debit),
      loanCollections: get("Repayment").debit,
      assetPurchases: -(get("AssetPurchase").debit),
      assetDisposals: get("AssetDisposal").credit,
      netInvesting: 0,
    };
    investing.netInvesting = investing.loanDisbursements + investing.loanCollections + investing.assetPurchases + investing.assetDisposals;

    const financing = {
      facilityDrawdowns: get("FacilityDrawdown").credit,
      facilityRepayments: -(get("FacilityRepayment").debit),
      equityInjection: get("EquityInjection").credit,
      netFinancing: 0,
    };
    financing.netFinancing = financing.facilityDrawdowns + financing.facilityRepayments + financing.equityInjection;

    const netCashChange = operating.netOperating + investing.netInvesting + financing.netFinancing;

    res.json({
      operating, investing, financing,
      netCashChange: Math.round(netCashChange * 100) / 100,
      dateFrom, dateTo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/branch-pnl", requireAuth, requireRole(...FINANCE_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    if (!dateFrom || !dateTo) { res.status(400).json({ error: "bad_request", message: "dateFrom and dateTo required" }); return; }

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
      if (row.accountType === "Income" || row.accountType === "Revenue") branchPnl[key].income += Number(row.totalCredit) - Number(row.totalDebit);
      else if (row.accountType === "Expense") branchPnl[key].expenses += Number(row.totalDebit) - Number(row.totalCredit);
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

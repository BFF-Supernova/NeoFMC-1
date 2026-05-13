import { Router } from "express";
import { db, loansTable, installmentsTable, loanRequestsTable, fundProductsTable, branchesTable, usersTable } from "@workspace/db";
import { eq, and, sql, lt, lte, gt, ne } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const ALLOWED_ROLES = ["SuperAdmin", "TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer", "Auditor", "FinancialController", "CFO"];

function requireAgingRole(req: any, res: any, next: any) {
  if (!req.user || !ALLOWED_ROLES.includes(req.user.role)) {
    res.status(403).json({ error: "forbidden", message: "Insufficient permissions" });
    return;
  }
  next();
}

const router = Router();

router.use(requireAuth, requireAgingRole);

const AGING_BUCKETS = [
  { label: "Current", min: 0, max: 0 },
  { label: "1-30 days", min: 1, max: 30 },
  { label: "31-60 days", min: 31, max: 60 },
  { label: "61-90 days", min: 61, max: 90 },
  { label: "91-180 days", min: 91, max: 180 },
  { label: "181-365 days", min: 181, max: 365 },
  { label: "365+ days", min: 366, max: 999999 },
];

router.get("/summary", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const unpaidInstallments = await db.select({
      loanId: installmentsTable.loanId,
      totalAmount: installmentsTable.totalAmount,
      paidAmount: installmentsTable.paidAmount,
      dueDate: installmentsTable.dueDate,
      daysOverdue: installmentsTable.daysOverdue,
      status: installmentsTable.status,
    })
      .from(installmentsTable)
      .where(
        and(
          eq(installmentsTable.tenantId, tenantId),
          ne(installmentsTable.status, "Paid"),
        )
      );

    const totalPortfolio = await db.select({
      totalOutstanding: sql<string>`COALESCE(sum(outstanding_balance::numeric), 0)::text`,
      activeLoans: sql<number>`count(*)::int`,
    }).from(loansTable)
      .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")));

    const buckets = AGING_BUCKETS.map(bucket => {
      const installments = unpaidInstallments.filter(i => {
        const days = i.daysOverdue || 0;
        return days >= bucket.min && days <= bucket.max;
      });

      const overdueAmount = installments.reduce((sum, i) => {
        return sum + (Number(i.totalAmount) - Number(i.paidAmount));
      }, 0);

      const loanIds = [...new Set(installments.map(i => i.loanId))];

      return {
        ...bucket,
        count: loanIds.length,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        installmentCount: installments.length,
      };
    });

    const totalOutstanding = Number(totalPortfolio[0]?.totalOutstanding || 0);
    const totalOverdue = buckets.filter(b => b.min >= 1).reduce((s, b) => s + b.overdueAmount, 0);
    const par30 = buckets.filter(b => b.min >= 31).reduce((s, b) => s + b.overdueAmount, 0);
    const par90 = buckets.filter(b => b.min >= 91).reduce((s, b) => s + b.overdueAmount, 0);

    res.json({
      buckets,
      summary: {
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        activeLoans: totalPortfolio[0]?.activeLoans || 0,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        par30Ratio: totalOutstanding > 0 ? Math.round((par30 / totalOutstanding) * 10000) / 100 : 0,
        par90Ratio: totalOutstanding > 0 ? Math.round((par90 / totalOutstanding) * 10000) / 100 : 0,
      },
    });
  } catch (err) {
    console.error("Aging summary error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/by-branch", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const rows = await db.select({
      branchId: loansTable.assignedBranchId,
      branchName: branchesTable.name,
      totalOutstanding: sql<string>`sum(${loansTable.outstandingBalance}::numeric)::text`,
      activeLoans: sql<number>`count(*)::int`,
    })
      .from(loansTable)
      .leftJoin(branchesTable, eq(loansTable.assignedBranchId, branchesTable.id))
      .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")))
      .groupBy(loansTable.assignedBranchId, branchesTable.name);

    const branchData = [];
    for (const row of rows) {
      if (!row.branchId) continue;

      const overdueInstallments = await db.select({
        daysOverdue: installmentsTable.daysOverdue,
        totalAmount: installmentsTable.totalAmount,
        paidAmount: installmentsTable.paidAmount,
      })
        .from(installmentsTable)
        .innerJoin(loansTable, eq(installmentsTable.loanId, loansTable.id))
        .where(
          and(
            eq(installmentsTable.tenantId, tenantId),
            eq(loansTable.assignedBranchId, row.branchId),
            ne(installmentsTable.status, "Paid"),
            lt(installmentsTable.dueDate, sql`CURRENT_DATE`),
          )
        );

      const overdueAmount = overdueInstallments.reduce((sum, i) => {
        return sum + (Number(i.totalAmount) - Number(i.paidAmount));
      }, 0);

      const outstanding = Number(row.totalOutstanding || 0);
      branchData.push({
        branchId: row.branchId,
        branchName: row.branchName || "Unknown",
        totalOutstanding: Math.round(outstanding * 100) / 100,
        activeLoans: row.activeLoans,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        parRatio: outstanding > 0 ? Math.round((overdueAmount / outstanding) * 10000) / 100 : 0,
      });
    }

    res.json(branchData);
  } catch (err) {
    console.error("Aging by-branch error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/by-officer", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const rows = await db.select({
      officerId: loansTable.assignedOfficerId,
      officerName: usersTable.fullName,
      totalOutstanding: sql<string>`sum(${loansTable.outstandingBalance}::numeric)::text`,
      activeLoans: sql<number>`count(*)::int`,
    })
      .from(loansTable)
      .leftJoin(usersTable, eq(loansTable.assignedOfficerId, usersTable.id))
      .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")))
      .groupBy(loansTable.assignedOfficerId, usersTable.fullName);

    const officerData = [];
    for (const row of rows) {
      if (!row.officerId) continue;

      const overdueInstallments = await db.select({
        daysOverdue: installmentsTable.daysOverdue,
        totalAmount: installmentsTable.totalAmount,
        paidAmount: installmentsTable.paidAmount,
      })
        .from(installmentsTable)
        .innerJoin(loansTable, eq(installmentsTable.loanId, loansTable.id))
        .where(
          and(
            eq(installmentsTable.tenantId, tenantId),
            eq(loansTable.assignedOfficerId, row.officerId),
            ne(installmentsTable.status, "Paid"),
            lt(installmentsTable.dueDate, sql`CURRENT_DATE`),
          )
        );

      const overdueAmount = overdueInstallments.reduce((sum, i) => {
        return sum + (Number(i.totalAmount) - Number(i.paidAmount));
      }, 0);

      const outstanding = Number(row.totalOutstanding || 0);
      officerData.push({
        officerId: row.officerId,
        officerName: row.officerName || "Unknown",
        totalOutstanding: Math.round(outstanding * 100) / 100,
        activeLoans: row.activeLoans,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        parRatio: outstanding > 0 ? Math.round((overdueAmount / outstanding) * 10000) / 100 : 0,
      });
    }

    res.json(officerData);
  } catch (err) {
    console.error("Aging by-officer error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/by-product", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const rows = await db.select({
      productId: loanRequestsTable.productId,
      productName: fundProductsTable.productName,
      totalOutstanding: sql<string>`sum(${loansTable.outstandingBalance}::numeric)::text`,
      activeLoans: sql<number>`count(*)::int`,
    })
      .from(loansTable)
      .innerJoin(loanRequestsTable, eq(loansTable.requestId, loanRequestsTable.id))
      .leftJoin(fundProductsTable, eq(loanRequestsTable.productId, fundProductsTable.id))
      .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")))
      .groupBy(loanRequestsTable.productId, fundProductsTable.name);

    const productData = [];
    for (const row of rows) {
      if (!row.productId) continue;

      const overdueInstallments = await db.select({
        totalAmount: installmentsTable.totalAmount,
        paidAmount: installmentsTable.paidAmount,
      })
        .from(installmentsTable)
        .innerJoin(loansTable, eq(installmentsTable.loanId, loansTable.id))
        .innerJoin(loanRequestsTable, eq(loansTable.requestId, loanRequestsTable.id))
        .where(
          and(
            eq(installmentsTable.tenantId, tenantId),
            eq(loanRequestsTable.productId, row.productId),
            ne(installmentsTable.status, "Paid"),
            lt(installmentsTable.dueDate, sql`CURRENT_DATE`),
          )
        );

      const overdueAmount = overdueInstallments.reduce((sum, i) => {
        return sum + (Number(i.totalAmount) - Number(i.paidAmount));
      }, 0);

      const outstanding = Number(row.totalOutstanding || 0);
      productData.push({
        productId: row.productId,
        productName: row.productName || "Unknown",
        totalOutstanding: Math.round(outstanding * 100) / 100,
        activeLoans: row.activeLoans,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        parRatio: outstanding > 0 ? Math.round((overdueAmount / outstanding) * 10000) / 100 : 0,
      });
    }

    res.json(productData);
  } catch (err) {
    console.error("Aging by-product error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/trend", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const months = parseInt(req.query.months as string) || 6;

    const trendData = await db.select({
      month: sql<string>`to_char(${installmentsTable.dueDate}::date, 'YYYY-MM')`,
      totalDue: sql<string>`sum(${installmentsTable.totalAmount}::numeric)::text`,
      totalPaid: sql<string>`sum(${installmentsTable.paidAmount}::numeric)::text`,
      overdueCount: sql<number>`count(*) filter (where ${installmentsTable.status} != 'Paid' and ${installmentsTable.dueDate} < CURRENT_DATE)::int`,
      totalCount: sql<number>`count(*)::int`,
    })
      .from(installmentsTable)
      .where(
        and(
          eq(installmentsTable.tenantId, tenantId),
          gt(installmentsTable.dueDate, sql`(CURRENT_DATE - make_interval(months => ${months}))::date`),
        )
      )
      .groupBy(sql`to_char(${installmentsTable.dueDate}::date, 'YYYY-MM')`)
      .orderBy(sql`to_char(${installmentsTable.dueDate}::date, 'YYYY-MM')`);

    res.json(trendData.map(row => ({
      month: row.month,
      totalDue: Math.round(Number(row.totalDue || 0) * 100) / 100,
      totalPaid: Math.round(Number(row.totalPaid || 0) * 100) / 100,
      overdueAmount: Math.round((Number(row.totalDue || 0) - Number(row.totalPaid || 0)) * 100) / 100,
      overdueCount: row.overdueCount,
      totalCount: row.totalCount,
      collectionRate: Number(row.totalDue || 0) > 0
        ? Math.round((Number(row.totalPaid || 0) / Number(row.totalDue || 0)) * 10000) / 100
        : 0,
    })));
  } catch (err) {
    console.error("Aging trend error:", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

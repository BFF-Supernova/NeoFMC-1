import { Router } from "express";
import { db, loansTable, loanRequestsTable, installmentsTable, clientsTable, branchesTable, fundProductsTable, paymentsTable } from "@workspace/db";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const ALLOWED_ROLES = ["SuperAdmin", "TenantAdmin", "BranchManager", "Auditor", "FinancialController", "CFO"];

function requireAnalyticsRole(req: any, res: any, next: any) {
  if (!req.user || !ALLOWED_ROLES.includes(req.user.role)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  next();
}

const router = Router();
router.use(requireAuth, requireAnalyticsRole);

router.get("/vintage", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const months = Math.min(24, Number(req.query.months) || 12);

    const vintageData = await db.select({
      cohort: sql<string>`to_char(${loansTable.disbursedAt}, 'YYYY-MM')`,
      loanCount: sql<number>`count(*)::int`,
      totalDisbursed: sql<string>`COALESCE(sum(${loansTable.disbursedAmount}::numeric), 0)::text`,
      totalOutstanding: sql<string>`COALESCE(sum(${loansTable.outstandingBalance}::numeric), 0)::text`,
      totalPaid: sql<string>`COALESCE(sum(${loansTable.totalPaid}::numeric), 0)::text`,
      activeCount: sql<number>`count(*) filter (where ${loansTable.status} = 'Active')::int`,
      closedCount: sql<number>`count(*) filter (where ${loansTable.status} = 'Closed')::int`,
      writtenOffCount: sql<number>`count(*) filter (where ${loansTable.status} = 'WrittenOff')::int`,
    })
      .from(loansTable)
      .where(and(
        eq(loansTable.tenantId, tenantId),
        gte(loansTable.disbursedAt, sql`CURRENT_DATE - make_interval(months => ${months})`),
      ))
      .groupBy(sql`to_char(${loansTable.disbursedAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${loansTable.disbursedAt}, 'YYYY-MM')`);

    res.json({
      data: vintageData.map(v => ({
        ...v,
        totalDisbursed: Number(v.totalDisbursed),
        totalOutstanding: Number(v.totalOutstanding),
        totalPaid: Number(v.totalPaid),
        repaymentRate: Number(v.totalDisbursed) > 0
          ? Math.round((Number(v.totalPaid) / Number(v.totalDisbursed)) * 10000) / 100
          : 0,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/concentration", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const topBorrowers = await db.select({
      clientId: loanRequestsTable.clientId,
      clientName: clientsTable.fullNameAr,
      nationalId: clientsTable.nationalId,
      loanCount: sql<number>`count(*)::int`,
      totalOutstanding: sql<string>`COALESCE(sum(${loansTable.outstandingBalance}::numeric), 0)::text`,
      totalDisbursed: sql<string>`COALESCE(sum(${loansTable.disbursedAmount}::numeric), 0)::text`,
    })
      .from(loansTable)
      .innerJoin(loanRequestsTable, eq(loansTable.requestId, loanRequestsTable.id))
      .innerJoin(clientsTable, eq(loanRequestsTable.clientId, clientsTable.id))
      .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")))
      .groupBy(loanRequestsTable.clientId, clientsTable.fullNameAr, clientsTable.nationalId)
      .orderBy(desc(sql`sum(${loansTable.outstandingBalance}::numeric)`))
      .limit(20);

    const byBranch = await db.select({
      branchId: loansTable.assignedBranchId,
      branchName: branchesTable.nameAr,
      loanCount: sql<number>`count(*)::int`,
      totalOutstanding: sql<string>`COALESCE(sum(${loansTable.outstandingBalance}::numeric), 0)::text`,
    })
      .from(loansTable)
      .leftJoin(branchesTable, eq(loansTable.assignedBranchId, branchesTable.id))
      .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")))
      .groupBy(loansTable.assignedBranchId, branchesTable.nameAr)
      .orderBy(desc(sql`sum(${loansTable.outstandingBalance}::numeric)`));

    const byProduct = await db.select({
      productId: loanRequestsTable.productId,
      productName: fundProductsTable.productName,
      loanCount: sql<number>`count(*)::int`,
      totalOutstanding: sql<string>`COALESCE(sum(${loansTable.outstandingBalance}::numeric), 0)::text`,
    })
      .from(loansTable)
      .innerJoin(loanRequestsTable, eq(loansTable.requestId, loanRequestsTable.id))
      .leftJoin(fundProductsTable, eq(loanRequestsTable.productId, fundProductsTable.id))
      .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")))
      .groupBy(loanRequestsTable.productId, fundProductsTable.productName)
      .orderBy(desc(sql`sum(${loansTable.outstandingBalance}::numeric)`));

    const [totals] = await db.select({
      totalOutstanding: sql<string>`COALESCE(sum(${loansTable.outstandingBalance}::numeric), 0)::text`,
    }).from(loansTable).where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")));

    const totalPortfolio = Number(totals?.totalOutstanding || 0);

    res.json({
      topBorrowers: topBorrowers.map(b => ({
        ...b,
        totalOutstanding: Number(b.totalOutstanding),
        totalDisbursed: Number(b.totalDisbursed),
        concentrationPct: totalPortfolio > 0
          ? Math.round((Number(b.totalOutstanding) / totalPortfolio) * 10000) / 100
          : 0,
      })),
      byBranch: byBranch.map(b => ({
        ...b,
        totalOutstanding: Number(b.totalOutstanding),
        concentrationPct: totalPortfolio > 0
          ? Math.round((Number(b.totalOutstanding) / totalPortfolio) * 10000) / 100
          : 0,
      })),
      byProduct: byProduct.map(p => ({
        ...p,
        totalOutstanding: Number(p.totalOutstanding),
        concentrationPct: totalPortfolio > 0
          ? Math.round((Number(p.totalOutstanding) / totalPortfolio) * 10000) / 100
          : 0,
      })),
      totalPortfolio,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/trends", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const months = Math.min(24, Number(req.query.months) || 12);

    const disbursementTrend = await db.select({
      month: sql<string>`to_char(${loansTable.disbursedAt}, 'YYYY-MM')`,
      loanCount: sql<number>`count(*)::int`,
      totalDisbursed: sql<string>`COALESCE(sum(${loansTable.disbursedAmount}::numeric), 0)::text`,
    })
      .from(loansTable)
      .where(and(
        eq(loansTable.tenantId, tenantId),
        gte(loansTable.disbursedAt, sql`CURRENT_DATE - make_interval(months => ${months})`),
      ))
      .groupBy(sql`to_char(${loansTable.disbursedAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${loansTable.disbursedAt}, 'YYYY-MM')`);

    const collectionTrend = await db.select({
      month: sql<string>`to_char(${paymentsTable.createdAt}, 'YYYY-MM')`,
      paymentCount: sql<number>`count(*)::int`,
      totalCollected: sql<string>`COALESCE(sum(${paymentsTable.amount}::numeric), 0)::text`,
    })
      .from(paymentsTable)
      .where(and(
        eq(paymentsTable.tenantId, tenantId),
        gte(paymentsTable.createdAt, sql`CURRENT_DATE - make_interval(months => ${months})`),
      ))
      .groupBy(sql`to_char(${paymentsTable.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${paymentsTable.createdAt}, 'YYYY-MM')`);

    res.json({
      disbursement: disbursementTrend.map(d => ({
        ...d, totalDisbursed: Number(d.totalDisbursed),
      })),
      collection: collectionTrend.map(c => ({
        ...c, totalCollected: Number(c.totalCollected),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

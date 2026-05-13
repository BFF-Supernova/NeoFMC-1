import { Router } from "express";
import { db, loansTable, loanRequestsTable, clientsTable, installmentsTable, paymentsTable, fundProductsTable, branchesTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/quarterly-performance", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    if (!["TenantAdmin", "BranchManager", "Auditor", "FinancialController", "CFO", "SuperAdmin"].includes(req.user!.role)) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    const year = Number(req.query.year) || new Date().getFullYear();
    const quarter = Number(req.query.quarter) || Math.ceil((new Date().getMonth() + 1) / 3);
    const qStart = new Date(year, (quarter - 1) * 3, 1).toISOString().split("T")[0];
    const qEnd = new Date(year, quarter * 3, 0).toISOString().split("T")[0];

    const [totalLoans] = await db.select({ count: sql<number>`count(*)`, totalDisbursed: sql<number>`COALESCE(SUM(disbursed_amount), 0)`, totalOutstanding: sql<number>`COALESCE(SUM(outstanding_balance), 0)` }).from(loansTable).where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")));

    const [newDisbursements] = await db.select({ count: sql<number>`count(*)`, total: sql<number>`COALESCE(SUM(disbursed_amount), 0)` }).from(loansTable).where(and(eq(loansTable.tenantId, tenantId), gte(loansTable.disbursedAt, new Date(qStart)), lte(loansTable.disbursedAt, new Date(qEnd))));

    const [collections] = await db.select({ count: sql<number>`count(*)`, total: sql<number>`COALESCE(SUM(amount), 0)` }).from(paymentsTable).where(and(eq(paymentsTable.tenantId, tenantId), gte(paymentsTable.createdAt, new Date(qStart)), lte(paymentsTable.createdAt, new Date(qEnd))));

    const parBuckets = await db.select({
      bucket: sql<string>`CASE 
        WHEN days_overdue = 0 THEN 'Current'
        WHEN days_overdue BETWEEN 1 AND 30 THEN '1-30'
        WHEN days_overdue BETWEEN 31 AND 60 THEN '31-60'
        WHEN days_overdue BETWEEN 61 AND 90 THEN '61-90'
        WHEN days_overdue BETWEEN 91 AND 180 THEN '91-180'
        ELSE '180+' END`,
      count: sql<number>`count(*)`,
      total: sql<number>`COALESCE(SUM(remaining_amount), 0)`,
    }).from(installmentsTable).where(and(eq(installmentsTable.tenantId, tenantId), sql`status != 'Paid'`)).groupBy(sql`1`);

    const [totalClients] = await db.select({ count: sql<number>`count(*)` }).from(clientsTable).where(eq(clientsTable.tenantId, tenantId));
    const [activeClients] = await db.select({ count: sql<number>`count(DISTINCT client_id)` }).from(loansTable).where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")));

    const [writtenOff] = await db.select({ count: sql<number>`count(*)`, total: sql<number>`COALESCE(SUM(disbursed_amount), 0)` }).from(loansTable).where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "WrittenOff")));

    res.json({
      reportType: "FRA Quarterly Performance",
      period: { year, quarter, startDate: qStart, endDate: qEnd },
      portfolio: { activeLoanCount: Number(totalLoans.count), totalDisbursed: Number(totalLoans.totalDisbursed), totalOutstanding: Number(totalLoans.totalOutstanding) },
      quarterActivity: { newDisbursements: { count: Number(newDisbursements.count), total: Number(newDisbursements.total) }, collections: { count: Number(collections.count), total: Number(collections.total) } },
      parAnalysis: parBuckets.map(b => ({ bucket: b.bucket, count: Number(b.count), totalAmount: Number(b.total) })),
      clientMetrics: { totalRegistered: Number(totalClients.count), activeborrowrs: Number(activeClients.count) },
      writeOffs: { count: Number(writtenOff.count), totalAmount: Number(writtenOff.total) },
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/borrower-concentration", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    if (!["TenantAdmin", "Auditor", "FinancialController", "CFO", "SuperAdmin"].includes(req.user!.role)) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    const [portfolioTotal] = await db.select({ total: sql<number>`COALESCE(SUM(outstanding_balance), 0)` }).from(loansTable).where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")));

    const topBorrowers = await db.select({
      clientId: loansTable.requestId,
      clientNameAr: clientsTable.fullNameAr,
      clientNameEn: clientsTable.fullNameEn,
      nationalId: clientsTable.nationalId,
      totalOutstanding: sql<number>`SUM(${loansTable.outstandingBalance})`,
      loanCount: sql<number>`count(*)`,
    }).from(loansTable)
      .innerJoin(loanRequestsTable, eq(loansTable.requestId, loanRequestsTable.id))
      .innerJoin(clientsTable, eq(loanRequestsTable.clientId, clientsTable.id))
      .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")))
      .groupBy(loansTable.requestId, clientsTable.fullNameAr, clientsTable.fullNameEn, clientsTable.nationalId)
      .orderBy(sql`SUM(${loansTable.outstandingBalance}) DESC`)
      .limit(20);

    const total = Number(portfolioTotal.total);
    res.json({
      reportType: "FRA Borrower Concentration",
      portfolioTotal: total,
      topBorrowers: topBorrowers.map(b => ({
        ...b, totalOutstanding: Number(b.totalOutstanding), loanCount: Number(b.loanCount),
        percentOfPortfolio: total > 0 ? Math.round(Number(b.totalOutstanding) / total * 10000) / 100 : 0,
      })),
      top10Concentration: total > 0 ? Math.round(topBorrowers.slice(0, 10).reduce((s, b) => s + Number(b.totalOutstanding), 0) / total * 10000) / 100 : 0,
      top20Concentration: total > 0 ? Math.round(topBorrowers.reduce((s, b) => s + Number(b.totalOutstanding), 0) / total * 10000) / 100 : 0,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/gender-distribution", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const totalClients = await db.select({ count: sql<number>`count(*)` }).from(clientsTable).where(eq(clientsTable.tenantId, tenantId));
    const activeBorrowers = await db.select({
      count: sql<number>`count(DISTINCT ${loanRequestsTable.clientId})`,
      totalDisbursed: sql<number>`COALESCE(SUM(${loansTable.disbursedAmount}), 0)`,
    }).from(loansTable)
      .innerJoin(loanRequestsTable, eq(loansTable.requestId, loanRequestsTable.id))
      .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")));

    const byBranch = await db.select({
      branchId: loansTable.assignedBranchId,
      branchName: branchesTable.name,
      loanCount: sql<number>`count(*)`,
      totalOutstanding: sql<number>`COALESCE(SUM(${loansTable.outstandingBalance}), 0)`,
      clientCount: sql<number>`count(DISTINCT ${loanRequestsTable.clientId})`,
    }).from(loansTable)
      .innerJoin(loanRequestsTable, eq(loansTable.requestId, loanRequestsTable.id))
      .leftJoin(branchesTable, eq(loansTable.assignedBranchId, branchesTable.id))
      .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")))
      .groupBy(loansTable.assignedBranchId, branchesTable.name);

    const byProduct = await db.select({
      productId: loanRequestsTable.fundProductId,
      productName: fundProductsTable.nameAr,
      productNameEn: fundProductsTable.nameEn,
      loanCount: sql<number>`count(*)`,
      totalDisbursed: sql<number>`COALESCE(SUM(${loansTable.disbursedAmount}), 0)`,
    }).from(loansTable)
      .innerJoin(loanRequestsTable, eq(loansTable.requestId, loanRequestsTable.id))
      .leftJoin(fundProductsTable, eq(loanRequestsTable.fundProductId, fundProductsTable.id))
      .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")))
      .groupBy(loanRequestsTable.fundProductId, fundProductsTable.nameAr, fundProductsTable.nameEn);

    res.json({
      reportType: "FRA Geographic & Product Distribution",
      totalClients: Number(totalClients[0].count),
      activeBorrowers: Number(activeBorrowers[0].count),
      totalActiveDisbursed: Number(activeBorrowers[0].totalDisbursed),
      distributionByBranch: byBranch.map(b => ({ ...b, loanCount: Number(b.loanCount), totalOutstanding: Number(b.totalOutstanding), clientCount: Number(b.clientCount) })),
      distributionByProduct: byProduct.map(p => ({ ...p, loanCount: Number(p.loanCount), totalDisbursed: Number(p.totalDisbursed) })),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

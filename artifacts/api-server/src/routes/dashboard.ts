import { Router } from "express";
import { db, loansTable, clientsTable, loanRequestsTable, installmentsTable, paymentsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case "quarterly": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), qMonth, 1);
    }
    case "annual":
      return new Date(now.getFullYear(), 0, 1);
    case "monthly":
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

router.get("/kpis", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const validPeriods = ["monthly", "quarterly", "annual"] as const;
    const rawPeriod = (req.query.period as string) || "monthly";
    const period = validPeriods.includes(rawPeriod as any) ? rawPeriod : "monthly";
    if (!tenantId) {
      res.json({
        totalActiveLoans: 0, totalDisbursedAmount: 0, totalOutstandingBalance: 0,
        parRatio: 0, collectionRate: 0, totalClients: 0, newClientsPeriod: 0,
        pendingLoanRequests: 0, disbursedPeriod: 0, collectedPeriod: 0, period,
      });
      return;
    }

    const now = new Date();
    const periodStart = getPeriodStart(period);
    const startOfMonth = periodStart.toISOString();
    const today = now.toISOString().split("T")[0];

    const [
      [{ totalActiveLoans }],
      [{ totalDisbursedAmount }],
      [{ totalOutstandingBalance }],
      [{ totalClients }],
      [{ newClientsThisMonth }],
      [{ pendingLoanRequests }],
      [{ disbursedThisMonth }],
      [{ collectedThisMonth }],
      [{ overdueAmount }],
    ] = await Promise.all([
      db.select({ totalActiveLoans: sql<number>`count(*)` }).from(loansTable).where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active"))),
      db.select({ totalDisbursedAmount: sql<number>`coalesce(sum(disbursed_amount), 0)` }).from(loansTable).where(eq(loansTable.tenantId, tenantId)),
      db.select({ totalOutstandingBalance: sql<number>`coalesce(sum(outstanding_balance), 0)` }).from(loansTable).where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active"))),
      db.select({ totalClients: sql<number>`count(*)` }).from(clientsTable).where(eq(clientsTable.tenantId, tenantId)),
      db.select({ newClientsThisMonth: sql<number>`count(*)` }).from(clientsTable).where(and(eq(clientsTable.tenantId, tenantId), gte(clientsTable.createdAt, new Date(startOfMonth)))),
      db.select({ pendingLoanRequests: sql<number>`count(*)` }).from(loanRequestsTable).where(and(eq(loanRequestsTable.tenantId, tenantId), eq(loanRequestsTable.workflowStatus, "Draft"))),
      db.select({ disbursedThisMonth: sql<number>`coalesce(sum(disbursed_amount), 0)` }).from(loansTable).where(and(eq(loansTable.tenantId, tenantId), gte(loansTable.createdAt, new Date(startOfMonth)))),
      db.select({ collectedThisMonth: sql<number>`coalesce(sum(amount), 0)` }).from(paymentsTable).where(and(eq(paymentsTable.tenantId, tenantId), eq(paymentsTable.status, "Completed"), gte(paymentsTable.createdAt, new Date(startOfMonth)))),
      db.select({ overdueAmount: sql<number>`coalesce(sum(total_amount::numeric - paid_amount::numeric), 0)` }).from(installmentsTable).where(and(eq(installmentsTable.tenantId, tenantId), eq(installmentsTable.status, "Pending"), lte(installmentsTable.dueDate, today))),
    ]);

    const totalDisb = Number(totalDisbursedAmount);
    const totalOut = Number(totalOutstandingBalance);
    const overdueAmt = Number(overdueAmount);
    const parRatio = totalOut > 0 ? Math.round((overdueAmt / totalOut) * 1000) / 10 : 0;
    const collectedMonth = Number(collectedThisMonth);
    const collectionRate = totalDisb > 0 ? Math.round((collectedMonth / totalDisb) * 1000) / 10 : Math.min(100, 0);

    res.json({
      totalActiveLoans: Number(totalActiveLoans),
      totalDisbursedAmount: totalDisb,
      totalOutstandingBalance: totalOut,
      parRatio,
      collectionRate: Math.min(100, collectionRate),
      totalClients: Number(totalClients),
      newClientsThisMonth: Number(newClientsThisMonth),
      newClientsPeriod: Number(newClientsThisMonth),
      pendingLoanRequests: Number(pendingLoanRequests),
      disbursedThisMonth: Number(disbursedThisMonth),
      disbursedPeriod: Number(disbursedThisMonth),
      collectedThisMonth: collectedMonth,
      collectedPeriod: collectedMonth,
      period,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/par-aging", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.json({ current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days91to180: 0, days180plus: 0, totalPar: 0, parRatio: 0 });
      return;
    }

    const today = new Date();
    const pendingInstallments = await db.select().from(installmentsTable)
      .where(and(eq(installmentsTable.tenantId, tenantId), eq(installmentsTable.status, "Pending")));

    let current = 0, days1to30 = 0, days31to60 = 0, days61to90 = 0, days91to180 = 0, days180plus = 0;

    for (const inst of pendingInstallments) {
      const due = new Date(inst.dueDate);
      const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(inst.totalAmount) - Number(inst.paidAmount);

      if (diff <= 0) current += amount;
      else if (diff <= 30) days1to30 += amount;
      else if (diff <= 60) days31to60 += amount;
      else if (diff <= 90) days61to90 += amount;
      else if (diff <= 180) days91to180 += amount;
      else days180plus += amount;
    }

    const totalPar = days1to30 + days31to60 + days61to90 + days91to180 + days180plus;
    const totalPortfolio = current + totalPar;
    const parRatio = totalPortfolio > 0 ? Math.round((totalPar / totalPortfolio) * 1000) / 10 : 0;

    res.json({
      current: Math.round(current * 100) / 100,
      days1to30: Math.round(days1to30 * 100) / 100,
      days31to60: Math.round(days31to60 * 100) / 100,
      days61to90: Math.round(days61to90 * 100) / 100,
      days91to180: Math.round(days91to180 * 100) / 100,
      days180plus: Math.round(days180plus * 100) / 100,
      totalPar: Math.round(totalPar * 100) / 100,
      parRatio,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/officer-performance", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.json([]); return; }

    const role = req.user!.role;
    const userId = req.user!.id;
    const isManager = ["TenantAdmin", "BranchManager", "SuperAdmin", "FinancialController", "CFO"].includes(role);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const today = now.toISOString().split("T")[0];

    let officerFilter = "";
    if (!isManager) {
      officerFilter = `AND lr.assigned_officer_id = '${userId}'`;
    }

    const officers = await db.execute(sql`
      SELECT
        u.id as officer_id,
        u.full_name as officer_name,
        u.role as officer_role,
        COALESCE((SELECT COUNT(*) FROM loans l WHERE l.tenant_id = ${tenantId} AND l.assigned_officer_id = u.id AND l.created_at >= ${startOfMonth}::timestamp), 0) as loans_disbursed_count,
        COALESCE((SELECT SUM(l.disbursed_amount::numeric) FROM loans l WHERE l.tenant_id = ${tenantId} AND l.assigned_officer_id = u.id AND l.created_at >= ${startOfMonth}::timestamp), 0) as loans_disbursed_amount,
        COALESCE((SELECT SUM(p.amount::numeric) FROM payments p WHERE p.tenant_id = ${tenantId} AND p.collected_by_id = u.id AND p.status = 'Completed' AND p.created_at >= ${startOfMonth}::timestamp), 0) as collected_amount,
        COALESCE((SELECT COUNT(*) FROM payments p WHERE p.tenant_id = ${tenantId} AND p.collected_by_id = u.id AND p.status = 'Completed' AND p.created_at >= ${startOfMonth}::timestamp), 0) as payments_count,
        COALESCE((SELECT COUNT(*) FROM clients c WHERE c.tenant_id = ${tenantId} AND c.created_by_id = u.id AND c.created_at >= ${startOfMonth}::timestamp), 0) as clients_registered,
        COALESCE((SELECT SUM(i.total_amount::numeric - i.paid_amount::numeric) FROM installments i JOIN loans l2 ON i.loan_id = l2.id WHERE i.tenant_id = ${tenantId} AND l2.assigned_officer_id = u.id AND i.status = 'Pending' AND i.due_date < ${today}), 0) as overdue_amount
      FROM users u
      WHERE u.tenant_id = ${tenantId}
        AND u.role IN ('LoanOfficer', 'CollectionOfficer', 'BranchManager')
        AND u.is_active = true
        ${isManager ? sql`` : sql`AND u.id = ${userId}`}
      ORDER BY u.full_name
    `);

    const result = (officers.rows || []).map((o: any) => ({
      officerId: o.officer_id,
      officerName: o.officer_name,
      officerRole: o.officer_role,
      loansDisbursedCount: Number(o.loans_disbursed_count),
      loansDisbursedAmount: Number(o.loans_disbursed_amount),
      collectedAmount: Number(o.collected_amount),
      paymentsCount: Number(o.payments_count),
      clientsRegistered: Number(o.clients_registered),
      overdueAmount: Number(o.overdue_amount),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/role-kpis", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.json({}); return; }

    const role = req.user!.role;
    const userId = req.user!.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const today = now.toISOString().split("T")[0];

    const extras: Record<string, any> = {};

    if (["LoanOfficer", "CollectionOfficer"].includes(role)) {
      const [myTasks] = await db.select({
        count: sql<number>`count(*)`,
      }).from(installmentsTable)
        .where(and(
          eq(installmentsTable.tenantId, tenantId),
          sql`${installmentsTable.status} IN ('Pending', 'Overdue')`,
          lte(installmentsTable.dueDate, today)
        ));
      extras.myOverdueTasks = Number(myTasks?.count || 0);

      const [myCollected] = await db.select({
        total: sql<number>`COALESCE(SUM(amount::numeric), 0)`,
      }).from(paymentsTable)
        .where(and(
          eq(paymentsTable.tenantId, tenantId),
          eq(paymentsTable.collectedById, userId),
          eq(paymentsTable.status, "Completed"),
          gte(paymentsTable.createdAt, new Date(startOfMonth)),
        ));
      extras.myCollectedThisMonth = Number(myCollected?.total || 0);
    }

    if (["FinancialController", "CFO", "TenantAdmin"].includes(role)) {
      const [totalOutstanding] = await db.select({
        total: sql<number>`COALESCE(SUM(outstanding_balance::numeric), 0)`,
      }).from(loansTable).where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active")));

      const [totalDisbursed] = await db.select({
        total: sql<number>`COALESCE(SUM(disbursed_amount::numeric), 0)`,
      }).from(loansTable).where(eq(loansTable.tenantId, tenantId));

      const [totalCollectedAllTime] = await db.select({
        total: sql<number>`COALESCE(SUM(amount::numeric), 0)`,
      }).from(paymentsTable).where(and(eq(paymentsTable.tenantId, tenantId), eq(paymentsTable.status, "Completed")));

      const outstanding = Number(totalOutstanding?.total || 0);
      const disbursed = Number(totalDisbursed?.total || 0);
      const collected = Number(totalCollectedAllTime?.total || 0);

      extras.operationalSelfSufficiency = disbursed > 0 ? Math.round((collected / disbursed) * 100) : 0;
      extras.portfolioYield = outstanding > 0 ? Math.round((collected / outstanding) * 100) : 0;
    }

    if (["BranchManager"].includes(role)) {
      const branchId = req.user!.branchId;
      if (branchId) {
        const [branchLoans] = await db.select({
          count: sql<number>`count(*)`,
          total: sql<number>`COALESCE(SUM(outstanding_balance::numeric), 0)`,
        }).from(loansTable).where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.branchId, branchId), eq(loansTable.status, "Active")));
        extras.branchActiveLoans = Number(branchLoans?.count || 0);
        extras.branchOutstanding = Number(branchLoans?.total || 0);
      }
    }

    res.json(extras);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/financial-ratios", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.json({ ratios: {}, trends: [] }); return; }

    const role = req.user!.role;
    if (!["FinancialController", "CFO", "TenantAdmin", "SuperAdmin", "Auditor"].includes(role)) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    const portfolioData = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN l.status = 'Active' THEN l.outstanding_balance::numeric ELSE 0 END), 0) as total_outstanding,
        COALESCE(SUM(l.disbursed_amount::numeric), 0) as total_disbursed,
        COUNT(CASE WHEN l.status = 'Active' THEN 1 END) as active_loans,
        COUNT(DISTINCT lr.client_id) as total_borrowers
      FROM loans l
      JOIN loan_requests lr ON l.request_id = lr.id
      WHERE l.tenant_id = ${tenantId}
    `);

    const collectionData = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as total_collected
      FROM payments WHERE tenant_id = ${tenantId} AND status = 'Completed'
    `);

    const overdueData = await db.execute(sql`
      SELECT COALESCE(SUM(total_amount::numeric - paid_amount::numeric), 0) as overdue_amount
      FROM installments WHERE tenant_id = ${tenantId} AND status IN ('Overdue', 'Pending')
        AND due_date < CURRENT_DATE
    `);

    const expenseData = await db.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as total_expenses
      FROM expenses WHERE tenant_id = ${tenantId} AND status = 'Approved'
    `);

    const interestData = await db.execute(sql`
      SELECT COALESCE(SUM(interest_amount::numeric), 0) as total_interest_earned
      FROM installments WHERE tenant_id = ${tenantId} AND status = 'Paid'
    `);

    const p = (portfolioData.rows as any[])?.[0] || {};
    const c = (collectionData.rows as any[])?.[0] || {};
    const o = (overdueData.rows as any[])?.[0] || {};
    const e = (expenseData.rows as any[])?.[0] || {};
    const ir = (interestData.rows as any[])?.[0] || {};

    const totalOutstanding = Number(p.total_outstanding || 0);
    const totalDisbursed = Number(p.total_disbursed || 0);
    const totalCollected = Number(c.total_collected || 0);
    const overdueAmount = Number(o.overdue_amount || 0);
    const totalExpenses = Number(e.total_expenses || 0);
    const totalInterestEarned = Number(ir.total_interest_earned || 0);
    const totalBorrowers = Number(p.total_borrowers || 0);

    const oss = totalExpenses > 0 ? Math.round((totalInterestEarned / totalExpenses) * 100) : 0;
    const portfolioYield = totalOutstanding > 0 ? Math.round((totalInterestEarned / totalOutstanding) * 10000) / 100 : 0;
    const parRatio = totalOutstanding > 0 ? Math.round((overdueAmount / totalOutstanding) * 10000) / 100 : 0;
    const costPerBorrower = totalBorrowers > 0 ? Math.round(totalExpenses / totalBorrowers) : 0;
    const repaymentRate = totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 10000) / 100 : 0;

    const trendData = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', p.created_at), 'YYYY-MM') as month,
        COALESCE(SUM(p.amount::numeric), 0) as collected
      FROM payments p
      WHERE p.tenant_id = ${tenantId} AND p.status = 'Completed'
        AND p.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', p.created_at)
      ORDER BY month
    `);

    res.json({
      ratios: {
        operationalSelfSufficiency: oss,
        portfolioYield,
        parRatio,
        costPerBorrower,
        repaymentRate,
        totalOutstanding,
        totalDisbursed,
        totalCollected,
        totalBorrowers,
        activeLoans: Number(p.active_loans || 0),
      },
      trends: (trendData.rows || []).map((r: any) => ({
        month: r.month,
        collected: Number(r.collected),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/role-dashboard", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const role = req.user!.role;
    const userId = req.user!.id;
    const branchId = req.user!.branchId;
    if (!tenantId) { res.json({}); return; }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const today = now.toISOString().split("T")[0];
    const result: Record<string, any> = { role };

    if (["Cashier"].includes(role)) {
      const cashData = await db.execute(sql`
        SELECT
          COALESCE((SELECT SUM(p.amount::numeric) FROM payments p WHERE p.tenant_id = ${tenantId} AND p.collected_by_id = ${userId} AND p.status = 'Completed' AND p.created_at::date = CURRENT_DATE), 0) as today_receipts,
          COALESCE((SELECT COUNT(*) FROM payments p WHERE p.tenant_id = ${tenantId} AND p.collected_by_id = ${userId} AND p.status = 'Completed' AND p.created_at::date = CURRENT_DATE), 0) as today_receipt_count,
          COALESCE((SELECT SUM(p.amount::numeric) FROM payments p WHERE p.tenant_id = ${tenantId} AND p.collected_by_id = ${userId} AND p.status = 'Completed' AND p.created_at >= ${startOfMonth}::timestamp), 0) as month_receipts,
          COALESCE((SELECT COUNT(*) FROM payments p WHERE p.tenant_id = ${tenantId} AND p.collected_by_id = ${userId} AND p.status = 'Completed' AND p.created_at >= ${startOfMonth}::timestamp), 0) as month_receipt_count
      `);
      const cd = (cashData.rows as any[])?.[0] || {};
      result.todayReceipts = Number(cd.today_receipts || 0);
      result.todayReceiptCount = Number(cd.today_receipt_count || 0);
      result.monthReceipts = Number(cd.month_receipts || 0);
      result.monthReceiptCount = Number(cd.month_receipt_count || 0);

      const recentPayments = await db.execute(sql`
        SELECT p.id, p.amount, p.payment_method, p.created_at, p.status,
          COALESCE(c.full_name_ar, c.full_name_en, 'N/A') as client_name
        FROM payments p
        LEFT JOIN loans l ON p.loan_id = l.id
        LEFT JOIN loan_requests lr ON l.request_id = lr.id
        LEFT JOIN clients c ON lr.client_id = c.id
        WHERE p.tenant_id = ${tenantId} AND p.collected_by_id = ${userId}
        ORDER BY p.created_at DESC LIMIT 10
      `);
      result.recentPayments = (recentPayments.rows || []).map((r: any) => ({
        id: r.id, amount: Number(r.amount), method: r.payment_method,
        date: r.created_at, status: r.status, clientName: r.client_name,
      }));

      const closingStatus = await db.execute(sql`
        SELECT id, closing_date, status FROM daily_closings
        WHERE tenant_id = ${tenantId} AND closing_date = CURRENT_DATE
        LIMIT 1
      `);
      const cs = (closingStatus.rows as any[])?.[0];
      result.dailyClosingStatus = cs ? cs.status : "Not Started";
    }

    if (["DataEntry"].includes(role)) {
      const myData = await db.execute(sql`
        SELECT
          COALESCE((SELECT COUNT(*) FROM clients c WHERE c.tenant_id = ${tenantId} AND c.created_by_id = ${userId} AND c.created_at >= ${startOfMonth}::timestamp), 0) as clients_added_month,
          COALESCE((SELECT COUNT(*) FROM clients c WHERE c.tenant_id = ${tenantId} AND c.created_by_id = ${userId} AND c.created_at::date = CURRENT_DATE), 0) as clients_added_today,
          COALESCE((SELECT COUNT(*) FROM loan_requests lr WHERE lr.tenant_id = ${tenantId} AND lr.created_by_id = ${userId} AND lr.workflow_status = 'Draft'), 0) as my_pending_requests,
          COALESCE((SELECT COUNT(*) FROM loan_requests lr WHERE lr.tenant_id = ${tenantId} AND lr.created_by_id = ${userId} AND lr.created_at >= ${startOfMonth}::timestamp), 0) as requests_created_month
      `);
      const dd = (myData.rows as any[])?.[0] || {};
      result.clientsAddedMonth = Number(dd.clients_added_month || 0);
      result.clientsAddedToday = Number(dd.clients_added_today || 0);
      result.myPendingRequests = Number(dd.my_pending_requests || 0);
      result.requestsCreatedMonth = Number(dd.requests_created_month || 0);

      const recentClients = await db.execute(sql`
        SELECT id, full_name_ar, full_name_en, national_id, created_at, client_code
        FROM clients WHERE tenant_id = ${tenantId} AND created_by_id = ${userId}
        ORDER BY created_at DESC LIMIT 8
      `);
      result.recentClients = (recentClients.rows || []).map((r: any) => ({
        id: r.id, nameAr: r.full_name_ar, nameEn: r.full_name_en,
        nationalId: r.national_id, date: r.created_at, code: r.client_code,
      }));
    }

    if (["Auditor"].includes(role)) {
      const auditData = await db.execute(sql`
        SELECT
          COALESCE((SELECT COUNT(*) FROM audit_logs WHERE tenant_id = ${tenantId} AND created_at::date = CURRENT_DATE), 0) as audit_entries_today,
          COALESCE((SELECT COUNT(*) FROM approval_requests WHERE tenant_id = ${tenantId} AND status = 'Pending'), 0) as pending_approvals,
          COALESCE((SELECT COUNT(*) FROM loans WHERE tenant_id = ${tenantId} AND status = 'WrittenOff'), 0) as write_offs,
          COALESCE((SELECT COUNT(*) FROM loans WHERE tenant_id = ${tenantId} AND status = 'Active'), 0) as active_loans
      `);
      const ad = (auditData.rows as any[])?.[0] || {};
      result.auditEntriesToday = Number(ad.audit_entries_today || 0);
      result.pendingApprovals = Number(ad.pending_approvals || 0);
      result.writeOffs = Number(ad.write_offs || 0);
      result.activeLoans = Number(ad.active_loans || 0);

      const recentAudit = await db.execute(sql`
        SELECT id, entity_type, action, entity_id, created_at, user_name
        FROM audit_logs WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC LIMIT 10
      `);
      result.recentAuditLogs = (recentAudit.rows || []).map((r: any) => ({
        id: r.id, entityType: r.entity_type, action: r.action,
        entityId: r.entity_id, date: r.created_at, userName: r.user_name,
      }));
    }

    if (["Accountant"].includes(role)) {
      const acctData = await db.execute(sql`
        SELECT
          COALESCE((SELECT COUNT(*) FROM journal_entries WHERE tenant_id = ${tenantId} AND status = 'Draft'), 0) as unposted_journals,
          COALESCE((SELECT COUNT(*) FROM journal_entries WHERE tenant_id = ${tenantId} AND created_at >= ${startOfMonth}::timestamp), 0) as journals_this_month,
          COALESCE((SELECT SUM(amount::numeric) FROM expenses WHERE tenant_id = ${tenantId} AND status = 'Approved' AND created_at >= ${startOfMonth}::timestamp), 0) as expenses_this_month,
          COALESCE((SELECT COUNT(*) FROM expenses WHERE tenant_id = ${tenantId} AND status = 'Pending'), 0) as pending_expenses
      `);
      const acd = (acctData.rows as any[])?.[0] || {};
      result.unpostedJournals = Number(acd.unposted_journals || 0);
      result.journalsThisMonth = Number(acd.journals_this_month || 0);
      result.expensesThisMonth = Number(acd.expenses_this_month || 0);
      result.pendingExpenses = Number(acd.pending_expenses || 0);

      const recentJournalsData = await db.execute(sql`
        SELECT id, reference_number, description, status, total_debit, created_at
        FROM journal_entries WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC LIMIT 10
      `);
      result.recentJournals = (recentJournalsData.rows || []).map((r: any) => ({
        id: r.id,
        referenceNumber: r.reference_number,
        description: r.description,
        status: r.status,
        totalDebit: Number(r.total_debit || 0),
        date: r.created_at,
      }));

      const closingStatus = await db.execute(sql`
        SELECT id, closing_date, status FROM daily_closings
        WHERE tenant_id = ${tenantId}
        ORDER BY closing_date DESC LIMIT 1
      `);
      const lcs = (closingStatus.rows as any[])?.[0];
      result.lastClosingDate = lcs ? lcs.closing_date : null;
      result.lastClosingStatus = lcs ? lcs.status : "None";
    }

    if (["LoanOfficer"].includes(role)) {
      const loData = await db.execute(sql`
        SELECT
          COALESCE((SELECT COUNT(*) FROM loan_requests lr WHERE lr.tenant_id = ${tenantId} AND lr.assigned_officer_id = ${userId} AND lr.workflow_status NOT IN ('Disbursed','Rejected')), 0) as my_pending_requests,
          COALESCE((SELECT COUNT(*) FROM loans l WHERE l.tenant_id = ${tenantId} AND l.assigned_officer_id = ${userId} AND l.status = 'Active'), 0) as my_active_loans,
          COALESCE((SELECT COUNT(*) FROM clients c WHERE c.tenant_id = ${tenantId} AND c.created_by_id = ${userId}), 0) as my_total_clients,
          COALESCE((SELECT SUM(l.disbursed_amount::numeric) FROM loans l WHERE l.tenant_id = ${tenantId} AND l.assigned_officer_id = ${userId} AND l.created_at >= ${startOfMonth}::timestamp), 0) as my_disbursed_month,
          COALESCE((SELECT COUNT(*) FROM loans l WHERE l.tenant_id = ${tenantId} AND l.assigned_officer_id = ${userId} AND l.created_at >= ${startOfMonth}::timestamp), 0) as my_disbursed_count_month
      `);
      const ld = (loData.rows as any[])?.[0] || {};
      result.myPendingRequests = Number(ld.my_pending_requests || 0);
      result.myActiveLoans = Number(ld.my_active_loans || 0);
      result.myTotalClients = Number(ld.my_total_clients || 0);
      result.myDisbursedMonth = Number(ld.my_disbursed_month || 0);
      result.myDisbursedCountMonth = Number(ld.my_disbursed_count_month || 0);

      const myRequests = await db.execute(sql`
        SELECT lr.id, lr.requested_amount, lr.workflow_status, lr.created_at, lr.request_number,
          COALESCE(c.full_name_ar, c.full_name_en) as client_name
        FROM loan_requests lr
        JOIN clients c ON lr.client_id = c.id
        WHERE lr.tenant_id = ${tenantId} AND lr.assigned_officer_id = ${userId}
          AND lr.workflow_status NOT IN ('Disbursed','Rejected')
        ORDER BY lr.created_at DESC LIMIT 8
      `);
      result.myRecentRequests = (myRequests.rows || []).map((r: any) => ({
        id: r.id, amount: Number(r.requested_amount), status: r.workflow_status,
        date: r.created_at, clientName: r.client_name, requestNumber: r.request_number,
      }));
    }

    if (["CollectionOfficer"].includes(role)) {
      const coData = await db.execute(sql`
        SELECT
          COALESCE((SELECT COUNT(*) FROM installments i JOIN loans l ON i.loan_id = l.id WHERE i.tenant_id = ${tenantId} AND l.assigned_officer_id = ${userId} AND i.status = 'Pending' AND i.due_date < CURRENT_DATE), 0) as my_overdue_count,
          COALESCE((SELECT SUM(i.total_amount::numeric - i.paid_amount::numeric) FROM installments i JOIN loans l ON i.loan_id = l.id WHERE i.tenant_id = ${tenantId} AND l.assigned_officer_id = ${userId} AND i.status = 'Pending' AND i.due_date < CURRENT_DATE), 0) as my_overdue_amount,
          COALESCE((SELECT COUNT(*) FROM installments i JOIN loans l ON i.loan_id = l.id WHERE i.tenant_id = ${tenantId} AND l.assigned_officer_id = ${userId} AND i.status = 'Pending' AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'), 0) as my_upcoming_count,
          COALESCE((SELECT SUM(p.amount::numeric) FROM payments p WHERE p.tenant_id = ${tenantId} AND p.collected_by_id = ${userId} AND p.status = 'Completed' AND p.created_at >= ${startOfMonth}::timestamp), 0) as my_collected_month,
          COALESCE((SELECT COUNT(*) FROM payments p WHERE p.tenant_id = ${tenantId} AND p.collected_by_id = ${userId} AND p.status = 'Completed' AND p.created_at::date = CURRENT_DATE), 0) as my_payments_today
      `);
      const cd = (coData.rows as any[])?.[0] || {};
      result.myOverdueCount = Number(cd.my_overdue_count || 0);
      result.myOverdueAmount = Number(cd.my_overdue_amount || 0);
      result.myUpcomingCount = Number(cd.my_upcoming_count || 0);
      result.myCollectedMonth = Number(cd.my_collected_month || 0);
      result.myPaymentsToday = Number(cd.my_payments_today || 0);
    }

    if (["TenantAdmin", "SuperAdmin"].includes(role)) {
      const [pendingApprovalsRow] = await db.select({
        count: sql<number>`count(*)`,
      }).from(loanRequestsTable).where(and(
        eq(loanRequestsTable.tenantId, tenantId),
        sql`${loanRequestsTable.workflowStatus} IN ('Submitted','UnderReview')`,
      ));
      result.pendingApprovals = Number(pendingApprovalsRow?.count || 0);
    }

    if (["FinancialController", "CFO"].includes(role)) {
      const [pendingApprovalsRow] = await db.select({
        count: sql<number>`count(*)`,
      }).from(loanRequestsTable).where(and(
        eq(loanRequestsTable.tenantId, tenantId),
        sql`${loanRequestsTable.workflowStatus} IN ('Submitted','UnderReview')`,
      ));
      result.pendingApprovals = Number(pendingApprovalsRow?.count || 0);

      const finData = await db.execute(sql`
        SELECT
          COALESCE((SELECT SUM(amount::numeric) FROM expenses WHERE tenant_id = ${tenantId} AND status = 'Approved' AND created_at >= ${startOfMonth}::timestamp), 0) as expenses_this_month,
          COALESCE((SELECT SUM(amount::numeric) FROM payments WHERE tenant_id = ${tenantId} AND status = 'Completed' AND created_at >= ${startOfMonth}::timestamp), 0) as income_this_month
      `);
      const fd = (finData.rows as any[])?.[0] || {};
      result.expensesThisMonth = Number(fd.expenses_this_month || 0);
      result.incomeThisMonth = Number(fd.income_this_month || 0);
    }

    if (["BranchManager"].includes(role) && branchId) {
      const bmData = await db.execute(sql`
        SELECT
          COALESCE((SELECT COUNT(*) FROM loans l WHERE l.tenant_id = ${tenantId} AND l.branch_id = ${branchId} AND l.status = 'Active'), 0) as branch_active_loans,
          COALESCE((SELECT SUM(l.outstanding_balance::numeric) FROM loans l WHERE l.tenant_id = ${tenantId} AND l.branch_id = ${branchId} AND l.status = 'Active'), 0) as branch_outstanding,
          COALESCE((SELECT SUM(l.disbursed_amount::numeric) FROM loans l WHERE l.tenant_id = ${tenantId} AND l.branch_id = ${branchId} AND l.created_at >= ${startOfMonth}::timestamp), 0) as branch_disbursed_month,
          COALESCE((SELECT COUNT(*) FROM clients c WHERE c.tenant_id = ${tenantId} AND c.branch_id = ${branchId}), 0) as branch_clients,
          COALESCE((SELECT COUNT(*) FROM loan_requests lr WHERE lr.tenant_id = ${tenantId} AND lr.branch_id = ${branchId} AND lr.workflow_status NOT IN ('Disbursed','Rejected')), 0) as branch_pending_requests,
          COALESCE((SELECT COUNT(*) FROM approval_requests ar WHERE ar.tenant_id = ${tenantId} AND ar.status = 'Pending'), 0) as pending_approvals,
          COALESCE((SELECT SUM(i.total_amount::numeric - i.paid_amount::numeric) FROM installments i JOIN loans l ON i.loan_id = l.id WHERE i.tenant_id = ${tenantId} AND l.branch_id = ${branchId} AND i.status = 'Pending' AND i.due_date < CURRENT_DATE), 0) as branch_overdue_amount
      `);
      const bd = (bmData.rows as any[])?.[0] || {};
      result.branchActiveLoans = Number(bd.branch_active_loans || 0);
      result.branchOutstanding = Number(bd.branch_outstanding || 0);
      result.branchDisbursedMonth = Number(bd.branch_disbursed_month || 0);
      result.branchClients = Number(bd.branch_clients || 0);
      result.branchPendingRequests = Number(bd.branch_pending_requests || 0);
      result.pendingApprovals = Number(bd.pending_approvals || 0);
      result.branchOverdueAmount = Number(bd.branch_overdue_amount || 0);
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

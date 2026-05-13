import { Router } from "express";
import { db, loansTable, loanRequestsTable, installmentsTable, paymentsTable, clientsTable, fundProductsTable, collectionActivitiesTable, usersTable } from "@workspace/db";
import { eq, and, sql, lt, gt } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/exceptions", requireAuth, requireRole("TenantAdmin", "Auditor", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const today = new Date().toISOString().split("T")[0];

    const loansExceedingLimits = await db.execute(sql`
      SELECT l.id as loan_id, lr.client_name, lr.requested_amount::numeric as amount,
        fp.max_amount::numeric as max_allowed, fp.product_name
      FROM loans l
      JOIN loan_requests lr ON l.loan_request_id = lr.id
      JOIN fund_products fp ON lr.product_id = fp.id
      WHERE lr.tenant_id = ${tenantId}
        AND lr.requested_amount::numeric > fp.max_amount::numeric
      LIMIT 50
    `);

    const overdueWithoutActivity = await db.execute(sql`
      SELECT DISTINCT i.loan_id, i.due_date, i.total_amount::numeric as amount,
        (SELECT c.full_name_ar FROM clients c JOIN loans l2 ON l2.client_id = c.id WHERE l2.id = i.loan_id LIMIT 1) as client_name,
        EXTRACT(DAY FROM NOW() - i.due_date::timestamp) as days_overdue
      FROM installments i
      WHERE i.tenant_id = ${tenantId}
        AND i.status = 'Overdue'
        AND i.due_date < ${today}::date - INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM collection_activities ca
          WHERE ca.loan_id = i.loan_id AND ca.tenant_id = ${tenantId}
          AND ca.created_at > i.due_date::timestamp
        )
      ORDER BY i.due_date ASC
      LIMIT 50
    `);

    const largeUnapprovedExpenses = await db.execute(sql`
      SELECT COUNT(*) as count FROM approval_requests
      WHERE tenant_id = ${tenantId} AND status = 'Pending'
        AND created_at < NOW() - INTERVAL '7 days'
    `);

    const dormantLoans = await db.execute(sql`
      SELECT l.id as loan_id, l.outstanding_balance::numeric as balance,
        (SELECT c.full_name_ar FROM clients c WHERE c.id = l.client_id LIMIT 1) as client_name,
        l.updated_at,
        EXTRACT(DAY FROM NOW() - l.updated_at) as days_inactive
      FROM loans l
      WHERE l.tenant_id = ${tenantId}
        AND l.status = 'Active'
        AND l.updated_at < NOW() - INTERVAL '90 days'
      LIMIT 50
    `);

    const duplicateClients = await db.execute(sql`
      SELECT national_id, COUNT(*) as count,
        ARRAY_AGG(full_name_ar) as names
      FROM clients
      WHERE tenant_id = ${tenantId}
      GROUP BY national_id
      HAVING COUNT(*) > 1
      LIMIT 20
    `);

    const highConcentration = await db.execute(sql`
      SELECT c.id as client_id, c.full_name_ar,
        COUNT(l.id) as loan_count,
        COALESCE(SUM(l.outstanding_balance::numeric), 0) as total_exposure
      FROM clients c
      JOIN loans l ON l.client_id = c.id
      WHERE c.tenant_id = ${tenantId} AND l.status = 'Active'
      GROUP BY c.id, c.full_name_ar
      HAVING COUNT(l.id) >= 3 OR SUM(l.outstanding_balance::numeric) > 100000
      ORDER BY total_exposure DESC
      LIMIT 20
    `);

    res.json({
      loansExceedingLimits: loansExceedingLimits.rows || [],
      overdueWithoutFollowUp: overdueWithoutActivity.rows || [],
      stalePendingApprovals: Number((largeUnapprovedExpenses.rows as any)?.[0]?.count || 0),
      dormantActiveLoans: dormantLoans.rows || [],
      duplicateClients: duplicateClients.rows || [],
      highConcentrationClients: highConcentration.rows || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

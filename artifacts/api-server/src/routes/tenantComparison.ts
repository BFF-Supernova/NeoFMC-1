import { Router } from "express";
import { db, tenantsTable, usersTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const tenantIds = req.query.tenantIds
      ? (req.query.tenantIds as string).split(",")
      : undefined;

    const result = await db.execute(sql`
      SELECT
        t.id as tenant_id,
        t.company_name,
        t.company_name_ar,
        t.subscription_plan,
        t.is_active,
        t.created_at,
        COALESCE((SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.is_active = true), 0) as active_users,
        COALESCE((SELECT COUNT(*) FROM clients c WHERE c.tenant_id = t.id), 0) as total_clients,
        COALESCE((SELECT COUNT(*) FROM loans l WHERE l.tenant_id = t.id AND l.status = 'Active'), 0) as active_loans,
        COALESCE((SELECT SUM(l.disbursed_amount::numeric) FROM loans l WHERE l.tenant_id = t.id), 0) as total_disbursed,
        COALESCE((SELECT SUM(l.outstanding_balance::numeric) FROM loans l WHERE l.tenant_id = t.id AND l.status = 'Active'), 0) as outstanding_balance,
        COALESCE((SELECT SUM(p.amount::numeric) FROM payments p WHERE p.tenant_id = t.id AND p.status = 'Completed'), 0) as total_collected,
        COALESCE((SELECT SUM(i.total_amount::numeric - i.paid_amount::numeric) FROM installments i WHERE i.tenant_id = t.id AND i.status IN ('Pending','Overdue') AND i.due_date < CURRENT_DATE), 0) as overdue_amount,
        COALESCE((SELECT COUNT(*) FROM loans l WHERE l.tenant_id = t.id AND l.created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as loans_last_30d,
        COALESCE((SELECT COUNT(*) FROM clients c WHERE c.tenant_id = t.id AND c.created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as new_clients_30d
      FROM tenants t
      ${tenantIds ? sql`WHERE t.id = ANY(${tenantIds}::uuid[])` : sql``}
      ORDER BY t.company_name
    `);

    const tenants = (result.rows as any[]).map(r => {
      const outstanding = Number(r.outstanding_balance || 0);
      const overdue = Number(r.overdue_amount || 0);
      const totalDisbursed = Number(r.total_disbursed || 0);
      const totalCollected = Number(r.total_collected || 0);
      const par = outstanding > 0 ? Math.round((overdue / outstanding) * 1000) / 10 : 0;
      const collectionRate = totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 1000) / 10 : 0;

      return {
        tenantId: r.tenant_id,
        companyName: r.company_name,
        companyNameAr: r.company_name_ar,
        subscriptionPlan: r.subscription_plan,
        isActive: r.is_active,
        createdAt: r.created_at,
        activeUsers: Number(r.active_users),
        totalClients: Number(r.total_clients),
        activeLoans: Number(r.active_loans),
        totalDisbursed,
        outstandingBalance: outstanding,
        totalCollected,
        overdueAmount: overdue,
        parRatio: par,
        collectionRate,
        loansLast30Days: Number(r.loans_last_30d),
        newClientsLast30Days: Number(r.new_clients_30d),
      };
    });

    res.json({
      count: tenants.length,
      tenants,
      platformSummary: {
        totalTenants: tenants.length,
        activeTenants: tenants.filter(t => t.isActive).length,
        totalPortfolio: tenants.reduce((s, t) => s + t.outstandingBalance, 0),
        totalOverdue: tenants.reduce((s, t) => s + t.overdueAmount, 0),
        totalClients: tenants.reduce((s, t) => s + t.totalClients, 0),
        totalActiveUsers: tenants.reduce((s, t) => s + t.activeUsers, 0),
        avgPAR: tenants.length > 0
          ? Math.round(tenants.reduce((s, t) => s + t.parRatio, 0) / tenants.length * 10) / 10
          : 0,
      },
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

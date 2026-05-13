import { Router } from "express";
import { db, platformAlertsTable, platformAlertRulesTable, tenantsTable, usersTable, loansTable, installmentsTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../lib/auth";

const router = Router();

router.get("/rules", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const rules = await db.select().from(platformAlertRulesTable).orderBy(platformAlertRulesTable.name);
    res.json(rules);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/rules/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { threshold, isActive, config } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (threshold !== undefined) updates.threshold = threshold.toString();
    if (isActive !== undefined) updates.isActive = isActive;
    if (config !== undefined) updates.config = config;

    const [updated] = await db.update(platformAlertRulesTable)
      .set(updates)
      .where(eq(platformAlertRulesTable.id, req.params.id))
      .returning();

    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const severity = req.query.severity as string | undefined;
    const unreadOnly = req.query.unreadOnly === "true";

    let conditions: any[] = [eq(platformAlertsTable.isDismissed, false)];
    if (severity) conditions.push(eq(platformAlertsTable.severity, severity));
    if (unreadOnly) conditions.push(eq(platformAlertsTable.isRead, false));

    const alerts = await db.select({
      id: platformAlertsTable.id,
      tenantId: platformAlertsTable.tenantId,
      severity: platformAlertsTable.severity,
      title: platformAlertsTable.title,
      message: platformAlertsTable.message,
      ruleType: platformAlertsTable.ruleType,
      metricValue: platformAlertsTable.metricValue,
      isRead: platformAlertsTable.isRead,
      createdAt: platformAlertsTable.createdAt,
    }).from(platformAlertsTable)
      .where(and(...conditions))
      .orderBy(desc(platformAlertsTable.createdAt))
      .limit(100);

    res.json(alerts);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id/read", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    await db.update(platformAlertsTable).set({ isRead: true }).where(eq(platformAlertsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id/dismiss", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    await db.update(platformAlertsTable).set({ isDismissed: true }).where(eq(platformAlertsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/check", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const alerts: Array<{ tenantId: string; severity: string; title: string; message: string; ruleType: string; metricValue: number }> = [];

    const rules = await db.select().from(platformAlertRulesTable).where(eq(platformAlertRulesTable.isActive, true));
    const tenants = await db.select({
      id: tenantsTable.id,
      companyName: tenantsTable.companyName,
      isActive: tenantsTable.isActive,
      onboardingStatus: tenantsTable.onboardingStatus,
    }).from(tenantsTable);

    for (const tenant of tenants) {
      if (!tenant.isActive) continue;

      for (const rule of rules) {
        if (rule.ruleType === "par_threshold") {
          const threshold = Number(rule.threshold || 10);
          const parResult = await db.execute(sql`
            SELECT
              COALESCE(SUM(l.outstanding_balance::numeric), 0) as outstanding,
              COALESCE(SUM(CASE WHEN EXISTS(
                SELECT 1 FROM installments i WHERE i.loan_id = l.id AND i.status IN ('Pending','Overdue') AND i.due_date < CURRENT_DATE
              ) THEN l.outstanding_balance::numeric ELSE 0 END), 0) as at_risk
            FROM loans l WHERE l.tenant_id = ${tenant.id} AND l.status = 'Active'
          `);
          const row = (parResult.rows as any[])?.[0] || {};
          const outstanding = Number(row.outstanding || 0);
          const atRisk = Number(row.at_risk || 0);
          const par = outstanding > 0 ? (atRisk / outstanding) * 100 : 0;

          if (par > threshold) {
            alerts.push({
              tenantId: tenant.id,
              severity: par > threshold * 2 ? "critical" : "warning",
              title: `High PAR ratio for ${tenant.companyName}`,
              message: `PAR ratio is ${par.toFixed(1)}% (threshold: ${threshold}%). Outstanding: ${outstanding.toFixed(0)} EGP, At Risk: ${atRisk.toFixed(0)} EGP.`,
              ruleType: "par_threshold",
              metricValue: par,
            });
          }
        }

        if (rule.ruleType === "dormancy") {
          const days = Number(rule.threshold || 30);
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          const [loginCheck] = await db.select({ count: sql<number>`count(*)` })
            .from(usersTable)
            .where(and(
              eq(usersTable.tenantId, tenant.id),
              eq(usersTable.isActive, true),
              gte(usersTable.updatedAt, cutoff),
            ));
          if (Number(loginCheck.count) === 0) {
            alerts.push({
              tenantId: tenant.id,
              severity: "warning",
              title: `Dormant tenant: ${tenant.companyName}`,
              message: `No user activity detected in the last ${days} days.`,
              ruleType: "dormancy",
              metricValue: days,
            });
          }
        }

        if (rule.ruleType === "overdue_threshold") {
          const threshold = Number(rule.threshold || 1000000);
          const [overdueResult] = await db.execute(sql`
            SELECT COALESCE(SUM(total_amount::numeric - paid_amount::numeric), 0) as total_overdue
            FROM installments WHERE tenant_id = ${tenant.id} AND status IN ('Pending','Overdue') AND due_date < CURRENT_DATE
          `).then(r => r.rows as any[]);
          const totalOverdue = Number(overdueResult?.total_overdue || 0);

          if (totalOverdue > threshold) {
            alerts.push({
              tenantId: tenant.id,
              severity: totalOverdue > threshold * 2 ? "critical" : "warning",
              title: `Large overdue portfolio for ${tenant.companyName}`,
              message: `Total overdue amount: ${totalOverdue.toFixed(0)} EGP (threshold: ${threshold.toFixed(0)} EGP).`,
              ruleType: "overdue_threshold",
              metricValue: totalOverdue,
            });
          }
        }
      }
    }

    if (alerts.length > 0) {
      await db.insert(platformAlertsTable).values(
        alerts.map(a => ({
          tenantId: a.tenantId,
          severity: a.severity,
          title: a.title,
          message: a.message,
          ruleType: a.ruleType,
          metricValue: a.metricValue.toString(),
        }))
      );
    }

    res.json({ alertsGenerated: alerts.length, alerts });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

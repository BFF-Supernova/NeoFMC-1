import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { requireModule } from "../middlewares/featureGate";
import { predictChurn } from "../lib/ai/collectionOptimizer";

const router = Router();

router.use(requireAuth, requireModule("moduleChurnPrediction"));

router.get("/predict", requireRole("TenantAdmin", "BranchManager", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;

    const result = await db.execute(sql`
      SELECT c.id as client_id,
        COUNT(DISTINCT l.id) as loan_count,
        COALESCE(AVG(l.disbursed_amount), 0) as avg_loan_size,
        MAX(l.disbursement_date)::text as last_loan_date,
        COALESCE(
          SUM(CASE WHEN p.created_at <= i.due_date THEN 1 ELSE 0 END)::float /
          NULLIF(COUNT(p.id), 0), 0.5
        ) as on_time_rate,
        EXTRACT(DAY FROM NOW() - MAX(COALESCE(p.created_at, l.disbursement_date)))::int as days_since_last_activity,
        EXISTS(SELECT 1 FROM savings_accounts sa WHERE sa.client_id = c.id AND sa.status = 'Active') as has_savings,
        FALSE as has_insurance
      FROM clients c
      LEFT JOIN loans l ON l.client_id = c.id AND l.tenant_id = c.tenant_id
      LEFT JOIN installments i ON i.loan_id = l.id
      LEFT JOIN payments p ON p.loan_id = l.id AND p.installment_id = i.id
      WHERE c.tenant_id = ${tenantId}::uuid
      GROUP BY c.id
      HAVING COUNT(DISTINCT l.id) > 0
      ORDER BY MAX(COALESCE(p.created_at, l.disbursement_date)) ASC NULLS FIRST
      LIMIT 500
    `);

    const clients = (result.rows as any[]).map(row => ({
      clientId: row.client_id,
      loanCount: Number(row.loan_count),
      avgLoanSize: Number(row.avg_loan_size),
      lastLoanDate: row.last_loan_date || new Date().toISOString(),
      onTimeRate: Number(row.on_time_rate),
      daysSinceLastActivity: Number(row.days_since_last_activity) || 365,
      hasSavings: row.has_savings,
      hasInsurance: row.has_insurance,
    }));

    const predictions = predictChurn(clients);
    const summary = {
      totalAnalyzed: predictions.length,
      highRisk: predictions.filter(p => p.riskLevel === "high").length,
      mediumRisk: predictions.filter(p => p.riskLevel === "medium").length,
      lowRisk: predictions.filter(p => p.riskLevel === "low").length,
      avgChurnProbability: predictions.length > 0 ? Math.round(predictions.reduce((s, p) => s + p.churnProbability, 0) / predictions.length * 100) / 100 : 0,
    };

    res.json({ summary, predictions: predictions.slice(0, 100) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

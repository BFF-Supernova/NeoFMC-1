import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { requireModule } from "../middlewares/featureGate";
import { predictBranchCashFlow } from "../lib/ai/collectionOptimizer";

const router = Router();

router.use(requireAuth, requireModule("moduleCashFlowPrediction"));

router.get("/predict", requireRole("TenantAdmin", "BranchManager", "Cashier", "FinancialController", "CFO", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const branchId = req.query.branchId as string | undefined;
    const daysAhead = Number(req.query.days) || 14;

    let collectionsQuery = sql`
      SELECT DATE(p.created_at) as date, SUM(p.amount) as collections
      FROM payments p JOIN loans l ON p.loan_id = l.id
      WHERE l.tenant_id = ${tenantId}::uuid AND p.created_at >= CURRENT_DATE - INTERVAL '90 days'
    `;
    if (branchId) collectionsQuery = sql`${collectionsQuery} AND l.branch_id = ${branchId}::uuid`;
    collectionsQuery = sql`${collectionsQuery} GROUP BY DATE(p.created_at) ORDER BY date`;

    let disbursementsQuery = sql`
      SELECT DATE(l.disbursement_date) as date, SUM(l.disbursed_amount) as disbursements
      FROM loans l
      WHERE l.tenant_id = ${tenantId}::uuid AND l.disbursement_date >= CURRENT_DATE - INTERVAL '90 days'
    `;
    if (branchId) disbursementsQuery = sql`${disbursementsQuery} AND l.branch_id = ${branchId}::uuid`;
    disbursementsQuery = sql`${disbursementsQuery} GROUP BY DATE(l.disbursement_date) ORDER BY date`;

    const [collectionsResult, disbursementsResult] = await Promise.all([
      db.execute(collectionsQuery),
      db.execute(disbursementsQuery),
    ]);

    const dateMap: Record<string, { collections: number; disbursements: number }> = {};
    for (const row of collectionsResult.rows as any[]) {
      const d = new Date(row.date).toISOString().split("T")[0];
      if (!dateMap[d]) dateMap[d] = { collections: 0, disbursements: 0 };
      dateMap[d].collections = Number(row.collections);
    }
    for (const row of disbursementsResult.rows as any[]) {
      const d = new Date(row.date).toISOString().split("T")[0];
      if (!dateMap[d]) dateMap[d] = { collections: 0, disbursements: 0 };
      dateMap[d].disbursements = Number(row.disbursements);
    }

    const historical = Object.entries(dateMap).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date));
    const predictions = predictBranchCashFlow(historical, daysAhead);

    const totalExpectedCollections = predictions.reduce((s, p) => s + p.expectedCollections, 0);
    const totalExpectedDisbursements = predictions.reduce((s, p) => s + p.expectedDisbursements, 0);

    res.json({
      predictions,
      summary: {
        daysAhead,
        totalExpectedCollections: Math.round(totalExpectedCollections * 100) / 100,
        totalExpectedDisbursements: Math.round(totalExpectedDisbursements * 100) / 100,
        netCashFlow: Math.round((totalExpectedCollections - totalExpectedDisbursements) * 100) / 100,
        historicalDaysUsed: historical.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

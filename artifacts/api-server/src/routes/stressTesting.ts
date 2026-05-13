import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { requireModule } from "../middlewares/featureGate";
import { runStressTest } from "../lib/ai/collectionOptimizer";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.use(requireAuth, requireModule("moduleAIStressTesting"));

router.get("/scenarios", (_req, res) => {
  res.json([
    { id: "inflation_5pct", nameAr: "تضخم 5%", nameEn: "5% Inflation Increase" },
    { id: "inflation_10pct", nameAr: "تضخم 10%", nameEn: "10% Inflation Increase" },
    { id: "currency_devaluation", nameAr: "انخفاض قيمة الجنيه 20%", nameEn: "20% EGP Devaluation" },
    { id: "sector_downturn", nameAr: "تراجع قطاع التمويل الأصغر", nameEn: "Microfinance Sector Downturn" },
    { id: "natural_disaster", nameAr: "كارثة طبيعية", nameEn: "Natural Disaster in Key Governorate" },
    { id: "regulatory_change", nameAr: "تشديد تنظيمي", nameEn: "Regulatory Tightening" },
    { id: "pandemic", nameAr: "جائحة", nameEn: "Pandemic-Level Disruption" },
    { id: "competitor_entry", nameAr: "دخول منافس جديد", nameEn: "New Competitor Entry" },
  ]);
});

router.post("/run", requireRole("TenantAdmin", "CFO", "FinancialController", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { scenarios } = req.body;

    if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
      res.status(400).json({ error: "scenarios array is required" });
      return;
    }

    const portfolioResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(l.outstanding_balance), 0) as total_outstanding,
        COALESCE(SUM(CASE WHEN EXISTS (SELECT 1 FROM installments i WHERE i.loan_id = l.id AND i.status IN ('Pending', 'PartiallyPaid') AND i.due_date < CURRENT_DATE - INTERVAL '30 days') THEN l.outstanding_balance ELSE 0 END), 0) as par30,
        COALESCE(SUM(CASE WHEN EXISTS (SELECT 1 FROM installments i WHERE i.loan_id = l.id AND i.status IN ('Pending', 'PartiallyPaid') AND i.due_date < CURRENT_DATE - INTERVAL '90 days') THEN l.outstanding_balance ELSE 0 END), 0) as par90
      FROM loans l WHERE l.tenant_id = ${tenantId}::uuid AND l.status = 'Active'
    `);

    const totalOutstanding = Number(portfolioResult.rows[0]?.total_outstanding || 0);
    const par30 = Number(portfolioResult.rows[0]?.par30 || 0);
    const par90 = Number(portfolioResult.rows[0]?.par90 || 0);

    const collectionResult = await db.execute(sql`
      SELECT COALESCE(SUM(p.amount), 0) as collected,
        (SELECT COALESCE(SUM(i.total_amount), 0) FROM installments i JOIN loans l2 ON i.loan_id = l2.id WHERE l2.tenant_id = ${tenantId}::uuid AND i.due_date >= CURRENT_DATE - INTERVAL '90 days' AND i.due_date <= CURRENT_DATE) as due
      FROM payments p JOIN loans l ON p.loan_id = l.id
      WHERE l.tenant_id = ${tenantId}::uuid AND p.created_at >= CURRENT_DATE - INTERVAL '90 days'
    `);

    const collected = Number(collectionResult.rows[0]?.collected || 0);
    const due = Number(collectionResult.rows[0]?.due || 1);
    const collectionRate = due > 0 ? collected / due : 0.85;

    const eclEstimate = par30 * 0.05 + (par90 - par30) * 0.25 + (totalOutstanding - par90) * 0.01;

    const portfolio = { totalOutstanding, par30, par90, collectionRate, eclTotal: eclEstimate };
    const results = scenarios.map((s: string) => runStressTest(portfolio, s));

    await logAudit({ userId: req.user!.id, tenantId: tenantId!, action: "stress_test_run", entity: "portfolio", details: { scenarios, portfolioSize: totalOutstanding } });

    res.json({ portfolio, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { calculateCreditScore, segmentPortfolioRisk, type CreditFeatures } from "../lib/ai/creditScoring";
import { checkIdentityFraud, checkDisbursementFraud, calculateCollectionPropensity } from "../lib/ai/fraudDetection";
import { generateLoanAlerts, generatePortfolioAlerts, DEFAULT_EWS_CONFIG } from "../lib/ai/earlyWarning";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.post("/credit-score", requireAuth, requireRole("TenantAdmin", "LoanOfficer", "BranchManager", "CFO", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const features: CreditFeatures = req.body;
    const result = calculateCreditScore(features);

    await logAudit({
      userId: req.user!.id,
      tenantId,
      action: "ai_credit_scoring",
      entity: "loan_request",
      details: { score: result.score, decision: result.decision, riskBucket: result.riskBucket, modelVersion: result.modelVersion },
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/fraud-check/identity", requireAuth, requireRole("TenantAdmin", "LoanOfficer", "BranchManager", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const { nationalId, fullNameAr, phone, clientId } = req.body;

    const existingClients = await db.execute(sql`
      SELECT id, national_id, full_name_ar, phone FROM clients
      WHERE tenant_id = ${tenantId}::uuid
    `);

    const result = checkIdentityFraud(
      { nationalId, fullNameAr, phone, clientId, tenantId },
      existingClients.rows.map((r: any) => ({
        nationalId: r.national_id,
        fullNameAr: r.full_name_ar,
        id: r.id,
        phone: r.phone,
      }))
    );

    await logAudit({
      userId: req.user!.id,
      tenantId,
      action: "ai_fraud_check_identity",
      entity: "client",
      entityId: clientId,
      details: { checkId: result.checkId, riskLevel: result.riskLevel, signalCount: result.signals.length },
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/fraud-check/disbursement", requireAuth, requireRole("TenantAdmin", "BranchManager", "FinancialController", "SuperAdmin"), async (req, res) => {
  try {
    const result = checkDisbursementFraud(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/early-warning", requireAuth, requireRole("TenantAdmin", "CFO", "BranchManager", "CollectionOfficer", "Auditor", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const config = { ...DEFAULT_EWS_CONFIG };
    if (req.query.daysOverdueWarning) config.daysOverdueWarning = Number(req.query.daysOverdueWarning);
    if (req.query.daysOverdueCritical) config.daysOverdueCritical = Number(req.query.daysOverdueCritical);
    if (req.query.parRatioWarning) config.parRatioWarning = Number(req.query.parRatioWarning);

    const loansResult = await db.execute(sql`
      SELECT l.id as loan_id, l.client_id, c.full_name_ar as client_name,
             l.branch_id, l.outstanding_balance, c.risk_score,
             fp.product_name as product_type,
             COALESCE(
               (SELECT MAX(GREATEST(0, EXTRACT(DAY FROM NOW() - i.due_date)))
                FROM installments i
                WHERE i.loan_id = l.id AND i.status IN ('Pending', 'PartiallyPaid') AND i.due_date < NOW()),
               0
             ) as days_overdue,
             COALESCE(
               (SELECT COUNT(*) FROM installments i
                WHERE i.loan_id = l.id AND i.status IN ('Pending', 'PartiallyPaid') AND i.due_date < NOW()),
               0
             ) as missed_installments,
             (SELECT MAX(p.payment_date) FROM payments p WHERE p.loan_id = l.id) as last_payment_date
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      JOIN fund_products fp ON l.fund_product_id = fp.id
      WHERE l.tenant_id = ${tenantId}::uuid AND l.status IN ('Active', 'Overdue')
      ORDER BY days_overdue DESC
      LIMIT 500
    `);

    const allAlerts = [];
    for (const row of loansResult.rows) {
      const r = row as any;
      const alerts = generateLoanAlerts({
        loanId: r.loan_id,
        clientId: r.client_id,
        clientName: r.client_name,
        branchId: r.branch_id,
        outstandingBalance: Number(r.outstanding_balance) || 0,
        daysOverdue: Number(r.days_overdue) || 0,
        missedInstallments: Number(r.missed_installments) || 0,
        lastPaymentDate: r.last_payment_date?.toISOString(),
        riskScore: Number(r.risk_score) || 0,
        isRestructured: false,
        productType: r.product_type,
      }, config);
      allAlerts.push(...alerts);
    }

    allAlerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
    });

    res.json({
      alerts: allAlerts,
      summary: {
        total: allAlerts.length,
        critical: allAlerts.filter(a => a.severity === "critical").length,
        warning: allAlerts.filter(a => a.severity === "warning").length,
        info: allAlerts.filter(a => a.severity === "info").length,
      },
      config,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/collection-propensity", requireAuth, requireRole("TenantAdmin", "CollectionOfficer", "BranchManager", "SuperAdmin"), async (req, res) => {
  try {
    const result = calculateCollectionPropensity(req.body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/portfolio-risk-segmentation", requireAuth, requireRole("TenantAdmin", "CFO", "Auditor", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const loansResult = await db.execute(sql`
      SELECT l.id, l.outstanding_balance, c.risk_score
      FROM loans l
      JOIN clients c ON l.client_id = c.id
      WHERE l.tenant_id = ${tenantId}::uuid AND l.status IN ('Active', 'Overdue')
    `);

    const scores = loansResult.rows.map((row: any) => {
      const score = Number(row.risk_score) || 50;
      return {
        loanId: row.id,
        score,
        bucket: score >= 80 ? "very_low" : score >= 65 ? "low" : score >= 50 ? "medium" : score >= 35 ? "high" : "very_high",
        amount: Number(row.outstanding_balance) || 0,
      };
    });

    const segmentation = segmentPortfolioRisk(scores);
    res.json(segmentation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

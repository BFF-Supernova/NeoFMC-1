import { Router } from "express";
import { db, ifrs9ProvisionRunsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { calculateECL, calculatePortfolioProvisions, classifyStage, getCBEProvisioningMatrix, type LoanData } from "../lib/ifrs9Engine";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.get("/portfolio-provisions", requireAuth, requireRole("TenantAdmin", "CFO", "Accountant", "Auditor", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const loansResult = await db.execute(sql`
      SELECT l.id, l.outstanding_balance, l.loan_amount, l.status,
             l.disbursement_date, l.branch_id,
             fp.product_name as product_type, fp.interest_rate,
             fp.max_term_months as term_months,
             c.risk_score as client_risk_score,
             COALESCE(
               (SELECT MAX(GREATEST(0, EXTRACT(DAY FROM NOW() - i.due_date)))
                FROM installments i
                WHERE i.loan_id = l.id AND i.status IN ('Pending', 'PartiallyPaid') AND i.due_date < NOW()),
               0
             ) as days_overdue,
             COALESCE(
               (SELECT SUM(co.estimated_value) FROM collaterals co WHERE co.loan_id = l.id),
               0
             ) as collateral_value
      FROM loans l
      JOIN fund_products fp ON l.fund_product_id = fp.id
      JOIN clients c ON l.client_id = c.id
      WHERE l.tenant_id = ${tenantId}::uuid AND l.status IN ('Active', 'Overdue', 'Default', 'WrittenOff')
    `);

    const loans: LoanData[] = loansResult.rows.map((row: any) => ({
      id: row.id,
      outstandingBalance: Number(row.outstanding_balance) || 0,
      daysOverdue: Number(row.days_overdue) || 0,
      originalAmount: Number(row.loan_amount) || 0,
      interestRate: Number(row.interest_rate) || 0,
      termMonths: Number(row.term_months) || 12,
      disbursementDate: row.disbursement_date?.toISOString() || new Date().toISOString(),
      status: row.status,
      productType: row.product_type || "Unknown",
      branchId: row.branch_id || "Unknown",
      clientRiskScore: Number(row.client_risk_score) || 0,
      isRestructured: row.status === "Restructured",
      collateralValue: Number(row.collateral_value) || 0,
    }));

    const summary = calculatePortfolioProvisions(loans);

    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/loan-ecl/:loanId", requireAuth, requireRole("TenantAdmin", "CFO", "Accountant", "Auditor", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const loanResult = await db.execute(sql`
      SELECT l.id, l.outstanding_balance, l.loan_amount, l.status,
             l.disbursement_date, l.branch_id,
             fp.product_name as product_type, fp.interest_rate,
             fp.max_term_months as term_months,
             c.risk_score as client_risk_score,
             COALESCE(
               (SELECT MAX(GREATEST(0, EXTRACT(DAY FROM NOW() - i.due_date)))
                FROM installments i
                WHERE i.loan_id = l.id AND i.status IN ('Pending', 'PartiallyPaid') AND i.due_date < NOW()),
               0
             ) as days_overdue,
             COALESCE(
               (SELECT SUM(co.estimated_value) FROM collaterals co WHERE co.loan_id = l.id),
               0
             ) as collateral_value
      FROM loans l
      JOIN fund_products fp ON l.fund_product_id = fp.id
      JOIN clients c ON l.client_id = c.id
      WHERE l.id = ${req.params.loanId}::uuid AND l.tenant_id = ${tenantId}::uuid
    `);

    if (loanResult.rows.length === 0) { res.status(404).json({ error: "loan_not_found" }); return; }

    const row: any = loanResult.rows[0];
    const loanData: LoanData = {
      id: row.id,
      outstandingBalance: Number(row.outstanding_balance) || 0,
      daysOverdue: Number(row.days_overdue) || 0,
      originalAmount: Number(row.loan_amount) || 0,
      interestRate: Number(row.interest_rate) || 0,
      termMonths: Number(row.term_months) || 12,
      disbursementDate: row.disbursement_date?.toISOString() || new Date().toISOString(),
      status: row.status,
      productType: row.product_type || "Unknown",
      branchId: row.branch_id || "Unknown",
      clientRiskScore: Number(row.client_risk_score) || 0,
      isRestructured: false,
      collateralValue: Number(row.collateral_value) || 0,
    };

    const ecl = calculateECL(loanData);
    const staging = classifyStage(loanData);

    res.json({ ...ecl, staging });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/portfolio-provisions/snapshot", requireAuth, requireRole("TenantAdmin", "CFO", "Accountant", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const loanResult = await db.execute(sql`
      SELECT l.id, l.outstanding_balance, l.loan_amount, l.status,
             l.disbursement_date, l.branch_id,
             fp.product_name as product_type, fp.interest_rate,
             fp.max_term_months as term_months,
             c.risk_score as client_risk_score,
             COALESCE(
               (SELECT MAX(GREATEST(0, EXTRACT(DAY FROM NOW() - i.due_date)))
                FROM installments i
                WHERE i.loan_id = l.id AND i.status IN ('Pending', 'PartiallyPaid') AND i.due_date < NOW()),
               0
             ) as days_overdue,
             COALESCE(
               (SELECT SUM(co.estimated_value) FROM collaterals co WHERE co.loan_id = l.id),
               0
             ) as collateral_value
      FROM loans l
      JOIN fund_products fp ON l.fund_product_id = fp.id
      JOIN clients c ON l.client_id = c.id
      WHERE l.tenant_id = ${tenantId}::uuid AND l.status NOT IN ('WrittenOff', 'Closed')
    `);

    const loans: LoanData[] = loanResult.rows.map((row: any) => ({
      id: row.id,
      outstandingBalance: Number(row.outstanding_balance) || 0,
      daysOverdue: Number(row.days_overdue) || 0,
      originalAmount: Number(row.loan_amount) || 0,
      interestRate: Number(row.interest_rate) || 0,
      termMonths: Number(row.term_months) || 12,
      disbursementDate: row.disbursement_date?.toISOString() || new Date().toISOString(),
      status: row.status,
      productType: row.product_type || "Unknown",
      branchId: row.branch_id || "Unknown",
      clientRiskScore: Number(row.client_risk_score) || 0,
      isRestructured: row.status === "Restructured",
      collateralValue: Number(row.collateral_value) || 0,
    }));

    const summary = calculatePortfolioProvisions(loans);

    const [record] = await db.insert(ifrs9ProvisionRunsTable).values({
      tenantId,
      totalPortfolio: summary.totalPortfolio.toFixed(2),
      totalECL: summary.totalECL.toFixed(2),
      coverageRatio: summary.provisionCoverageRatio.toFixed(4),
      loanCount: loans.length,
      stageBreakdown: summary.byStage,
      cbeBreakdown: summary.byCBECategory,
      calculatedBy: req.user!.id,
    }).returning();

    await logAudit({
      userId: req.user!.id,
      tenantId,
      action: "ifrs9_provision_snapshot",
      entity: "portfolio",
      details: { runId: record.id, loanCount: loans.length, totalECL: summary.totalECL },
    });

    res.status(201).json({ runId: record.id, ...summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/cbe-matrix", requireAuth, async (_req, res) => {
  res.json(getCBEProvisioningMatrix());
});

export default router;

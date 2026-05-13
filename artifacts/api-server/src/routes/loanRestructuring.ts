import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { requireModule } from "../middlewares/featureGate";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.use(requireAuth, requireModule("moduleLoanRestructuring"));

router.post("/simulate", requireRole("TenantAdmin", "BranchManager", "LoanOfficer", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { loanId, restructureType, graceMonths, termExtensionMonths, newRate, capitalizeArrears } = req.body;

    if (!loanId || !restructureType) {
      res.status(400).json({ error: "loanId and restructureType are required" });
      return;
    }

    const [loan] = (await db.execute(sql`
      SELECT l.*, fp.interest_rate, fp.max_term_months FROM loans l
      JOIN fund_products fp ON l.fund_product_id = fp.id
      WHERE l.id = ${loanId}::uuid AND l.tenant_id = ${tenantId}::uuid
    `)).rows;
    if (!loan) { res.status(404).json({ error: "loan_not_found" }); return; }

    const outstandingBalance = Number(loan.outstanding_balance);
    const currentRate = Number(loan.interest_rate || loan.interest_rate);
    const effectiveRate = newRate !== undefined ? Number(newRate) : currentRate;
    const grace = graceMonths || 0;
    const extension = termExtensionMonths || 0;

    let arrears = 0;
    if (capitalizeArrears) {
      const arrearsResult = await db.execute(sql`
        SELECT COALESCE(SUM(total_amount - paid_amount), 0) as total_arrears
        FROM installments WHERE loan_id = ${loanId}::uuid AND status IN ('Pending', 'PartiallyPaid') AND due_date < NOW()
      `);
      arrears = Number(arrearsResult.rows[0]?.total_arrears || 0);
    }

    const newPrincipal = outstandingBalance + arrears;
    const remainingResult = await db.execute(sql`
      SELECT COUNT(*) as remaining FROM installments WHERE loan_id = ${loanId}::uuid AND status IN ('Pending', 'PartiallyPaid')
    `);
    const remainingMonths = Number(remainingResult.rows[0]?.remaining || 12) + extension;

    const monthlyRate = effectiveRate / 100 / 12;
    let monthlyPayment: number;
    if (monthlyRate > 0) {
      monthlyPayment = (newPrincipal * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) / (Math.pow(1 + monthlyRate, remainingMonths) - 1);
    } else {
      monthlyPayment = newPrincipal / remainingMonths;
    }

    const newSchedule = [];
    let balance = newPrincipal;
    for (let i = 1; i <= remainingMonths + grace; i++) {
      if (i <= grace) {
        newSchedule.push({ installment: i, type: "grace", principal: 0, interest: balance * monthlyRate, total: balance * monthlyRate, balance });
      } else {
        const interest = balance * monthlyRate;
        const principal = monthlyPayment - interest;
        balance = Math.max(0, balance - principal);
        newSchedule.push({ installment: i, type: "regular", principal: Math.round(principal * 100) / 100, interest: Math.round(interest * 100) / 100, total: Math.round(monthlyPayment * 100) / 100, balance: Math.round(balance * 100) / 100 });
      }
    }

    const totalPayments = newSchedule.reduce((sum, s) => sum + s.total, 0);
    const totalInterest = totalPayments - newPrincipal;

    res.json({
      simulation: {
        restructureType,
        originalBalance: outstandingBalance,
        capitalizedArrears: arrears,
        newPrincipal,
        effectiveRate,
        graceMonths: grace,
        termExtensionMonths: extension,
        newTotalMonths: remainingMonths + grace,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalPayments: Math.round(totalPayments * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        ifrs9Impact: { currentStage: "Stage 2", reason: "Restructured loans must remain Stage 2 for minimum 12 months per CBE regulation", minimumMonitoringPeriod: 12 },
      },
      schedule: newSchedule,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/execute", requireRole("TenantAdmin", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { loanId, restructureType, graceMonths, termExtensionMonths, newRate, capitalizeArrears, reason } = req.body;

    if (!loanId || !restructureType || !reason) {
      res.status(400).json({ error: "loanId, restructureType, and reason are required" });
      return;
    }

    const [loan] = (await db.execute(sql`
      SELECT * FROM loans WHERE id = ${loanId}::uuid AND tenant_id = ${tenantId}::uuid AND status = 'Active'
    `)).rows;
    if (!loan) { res.status(404).json({ error: "active_loan_not_found" }); return; }

    const [record] = (await db.execute(sql`
      INSERT INTO loan_restructuring_history (tenant_id, loan_id, restructure_type, grace_months, term_extension_months, new_rate, capitalize_arrears, reason, performed_by, original_balance, original_rate, ifrs9_stage_at_restructure)
      VALUES (${tenantId}::uuid, ${loanId}::uuid, ${restructureType}, ${graceMonths || 0}, ${termExtensionMonths || 0}, ${newRate || null}, ${capitalizeArrears || false}, ${reason}, ${req.user!.id}::uuid, ${loan.outstanding_balance}, ${loan.interest_rate || null}, 2)
      RETURNING *
    `)).rows;

    await db.execute(sql`UPDATE loans SET status = 'Restructured', updated_at = NOW() WHERE id = ${loanId}::uuid`);

    await logAudit({ userId: req.user!.id, tenantId: tenantId!, action: "loan_restructured", entity: "loan", entityId: loanId, details: { restructureType, reason, recordId: record.id } });
    res.status(201).json({ message: "Loan restructured successfully", record, ifrs9Note: "Loan classified as IFRS 9 Stage 2. Will remain Stage 2 for minimum 12 months per CBE regulation." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/history/:loanId", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await db.execute(sql`
      SELECT lrh.*, u.full_name as performed_by_name FROM loan_restructuring_history lrh
      LEFT JOIN users u ON lrh.performed_by = u.id
      WHERE lrh.loan_id = ${req.params.loanId}::uuid AND lrh.tenant_id = ${tenantId}::uuid
      ORDER BY lrh.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

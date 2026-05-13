import { Router } from "express";
import { db, approvalRequestsTable, loansTable, loanRequestsTable, clientsTable, installmentsTable, journalEntriesTable, fundProductsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { logAudit } from "../lib/auditLog";
import { generateAmortizationSchedule } from "../lib/installmentEngine";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const status = req.query.status as string | undefined;

    let whereClause = eq(approvalRequestsTable.tenantId, tenantId);
    if (status) {
      whereClause = and(whereClause, eq(approvalRequestsTable.status, status)) as typeof whereClause;
    }

    const rows = await db.select().from(approvalRequestsTable)
      .where(whereClause)
      .orderBy(desc(approvalRequestsTable.createdAt));
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { requestType, referenceId, referenceLabel, data } = req.body;
    if (!requestType || !referenceId) {
      res.status(400).json({ error: "bad_request", message: "requestType and referenceId required" });
      return;
    }

    const validTypes = ["Settlement", "Reschedule", "WriteOff", "LoanModification", "FeeWaiver", "Disbursement", "PenaltyWaiver"];
    if (!validTypes.includes(requestType)) {
      res.status(400).json({ error: "bad_request", message: `requestType must be one of: ${validTypes.join(", ")}` });
      return;
    }

    const [existing] = await db.select({ id: approvalRequestsTable.id }).from(approvalRequestsTable)
      .where(and(
        eq(approvalRequestsTable.tenantId, tenantId),
        eq(approvalRequestsTable.referenceId, referenceId),
        eq(approvalRequestsTable.requestType, requestType),
        eq(approvalRequestsTable.status, "Pending")
      )).limit(1);
    if (existing) {
      res.status(409).json({ error: "duplicate", message: "A pending request of the same type already exists for this reference" });
      return;
    }

    const [row] = await db.insert(approvalRequestsTable).values({
      tenantId,
      requestType,
      referenceId,
      referenceLabel: referenceLabel || null,
      status: "Pending",
      requestedById: req.user!.id,
      requestedByName: req.user!.fullName || req.user!.email || "",
      data: data || null,
    }).returning();

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

async function executeApprovedOperation(request: typeof approvalRequestsTable.$inferSelect) {
  const { requestType, referenceId, tenantId, data } = request;
  const opData = (data || {}) as Record<string, any>;

  switch (requestType) {
    case "WriteOff": {
      const [loan] = await db.select().from(loansTable)
        .where(and(eq(loansTable.id, referenceId), eq(loansTable.tenantId, tenantId))).limit(1);
      if (!loan) throw new Error("Loan not found");
      if (loan.status !== "Active") throw new Error("Loan is not active");

      await db.update(loansTable)
        .set({ status: "WrittenOff", writeOffReason: opData.reason || "Approved write-off", updatedAt: new Date() })
        .where(eq(loansTable.id, loan.id));

      await db.insert(journalEntriesTable).values({
        tenantId, referenceType: "WriteOff", referenceId: loan.id,
        description: `Loan written off: ${opData.reason || ""}. ${opData.notes || ""}`,
        totalDebit: loan.outstandingBalance, totalCredit: loan.outstandingBalance,
      });
      break;
    }

    case "Reschedule": {
      const [loan] = await db.select().from(loansTable)
        .where(and(eq(loansTable.id, referenceId), eq(loansTable.tenantId, tenantId))).limit(1);
      if (!loan) throw new Error("Loan not found");
      if (loan.status !== "Active") throw new Error("Loan is not active");

      const newTermMonths = opData.newTermMonths;
      const reason = opData.reason || "Approved reschedule";

      await db.update(installmentsTable)
        .set({ status: "Cancelled" })
        .where(and(eq(installmentsTable.loanId, loan.id), eq(installmentsTable.status, "Pending")));

      const outstandingBalance = Number(loan.outstandingBalance);
      const [lr] = await db.select().from(loanRequestsTable).where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
      const [product] = lr ? await db.select().from(fundProductsTable).where(eq(fundProductsTable.id, lr.productId)).limit(1) : [null];
      const interestRate = lr?.interestRate ? Number(lr.interestRate) : (product ? Number(product.interestRate) : 0);

      const schedule = generateAmortizationSchedule({
        principal: outstandingBalance,
        annualInterestRate: interestRate,
        termMonths: newTermMonths,
        method: product?.amortizationMethod || "Monthly",
        disbursementDate: new Date(),
        gracePeriodDays: 0,
      });

      for (const inst of schedule) {
        await db.insert(installmentsTable).values({
          tenantId,
          loanId: loan.id,
          installmentNumber: inst.installmentNumber,
          dueDate: inst.dueDate,
          principalAmount: inst.principalAmount.toString(),
          interestAmount: inst.interestAmount.toString(),
          totalAmount: inst.totalAmount.toString(),
          paidAmount: "0.00",
          penaltyAmount: "0.00",
          status: "Pending",
        });
      }

      await db.update(loansTable)
        .set({ status: "Active", updatedAt: new Date() })
        .where(eq(loansTable.id, loan.id));

      await db.insert(journalEntriesTable).values({
        tenantId, referenceType: "Rescheduling", referenceId: loan.id,
        description: `Loan rescheduled: ${reason}. New term: ${newTermMonths} months`,
        totalDebit: "0", totalCredit: "0",
      });
      break;
    }

    case "Settlement": {
      const [loan] = await db.select().from(loansTable)
        .where(and(eq(loansTable.id, referenceId), eq(loansTable.tenantId, tenantId))).limit(1);
      if (!loan) throw new Error("Loan not found");

      await db.update(installmentsTable)
        .set({ status: "Settled" })
        .where(and(eq(installmentsTable.loanId, loan.id), eq(installmentsTable.status, "Pending")));

      await db.update(loansTable)
        .set({ status: "Closed", outstandingBalance: "0.00", updatedAt: new Date() })
        .where(eq(loansTable.id, loan.id));

      await db.insert(journalEntriesTable).values({
        tenantId, referenceType: "EarlySettlement", referenceId: loan.id,
        description: `Early settlement approved. Settlement amount: ${opData.totalDue || "N/A"}`,
        totalDebit: (opData.totalDue || 0).toString(), totalCredit: (opData.totalDue || 0).toString(),
      });
      break;
    }

    case "Disbursement": {
      const [loanReq] = await db.select().from(loanRequestsTable)
        .where(and(eq(loanRequestsTable.id, referenceId), eq(loanRequestsTable.tenantId, tenantId))).limit(1);
      if (!loanReq) throw new Error("Loan request not found");

      const [existingLoan] = await db.select({ id: loansTable.id }).from(loansTable)
        .where(eq(loansTable.requestId, loanReq.id)).limit(1);
      if (existingLoan) break;

      await db.update(loanRequestsTable)
        .set({ workflowStatus: "Disbursed", updatedAt: new Date() })
        .where(eq(loanRequestsTable.id, loanReq.id));

      const [product] = await db.select().from(fundProductsTable).where(eq(fundProductsTable.id, loanReq.productId)).limit(1);
      const amount = Number(loanReq.requestedAmount);
      const termMonths = loanReq.termMonths || (product ? product.maxTermMonths : 12);
      const interestRate = loanReq.interestRate ? Number(loanReq.interestRate) : (product ? Number(product.interestRate) : 0);

      const [loan] = await db.insert(loansTable).values({
        tenantId,
        requestId: loanReq.id,
        disbursedAmount: loanReq.requestedAmount,
        outstandingBalance: loanReq.requestedAmount,
        totalPaid: "0.00",
        status: "Active",
        disbursedAt: new Date(),
      }).returning();

      const schedule = generateAmortizationSchedule({
        principal: amount,
        annualInterestRate: interestRate,
        termMonths,
        method: product?.amortizationMethod || "Monthly",
        disbursementDate: new Date(),
        gracePeriodDays: product?.gracePeriodDays || 0,
      });

      for (const inst of schedule) {
        await db.insert(installmentsTable).values({
          tenantId,
          loanId: loan.id,
          installmentNumber: inst.installmentNumber,
          dueDate: inst.dueDate,
          principalAmount: inst.principalAmount.toString(),
          interestAmount: inst.interestAmount.toString(),
          totalAmount: inst.totalAmount.toString(),
          paidAmount: "0.00",
          penaltyAmount: "0.00",
          status: "Pending",
        });
      }
      break;
    }

    case "PenaltyWaiver": {
      const installmentId = opData.installmentId;
      if (!installmentId) throw new Error("installmentId required");
      const [inst] = await db.select().from(installmentsTable)
        .where(and(eq(installmentsTable.id, installmentId), eq(installmentsTable.tenantId, tenantId))).limit(1);
      if (!inst) throw new Error("Installment not found");

      const waiverAmount = opData.waiverAmount ? Number(opData.waiverAmount) : Number(inst.penaltyAmount);
      const currentPenalty = Number(inst.penaltyAmount);
      const newPenalty = Math.max(0, currentPenalty - waiverAmount);

      await db.update(installmentsTable)
        .set({ penaltyAmount: newPenalty.toString(), updatedAt: new Date() })
        .where(eq(installmentsTable.id, installmentId));

      await logAudit({
        tenantId, userId: request.requestedById, userName: request.requestedByName,
        action: "PENALTY_WAIVER", entity: "Installment", entityId: installmentId,
        details: { originalPenalty: currentPenalty, waivedAmount: waiverAmount, newPenalty, reason: opData.reason },
      });
      break;
    }

    default:
      break;
  }
}

router.put("/:id/approve", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const role = req.user!.role;
    if (!["TenantAdmin", "BranchManager", "FinancialController", "CFO"].includes(role || "")) {
      res.status(403).json({ error: "forbidden", message: "Only admins, managers, and senior finance roles can approve" });
      return;
    }

    const [existing] = await db.select().from(approvalRequestsTable)
      .where(and(eq(approvalRequestsTable.id, req.params.id), eq(approvalRequestsTable.tenantId, tenantId))).limit(1);
    if (!existing) { res.status(404).json({ error: "not_found" }); return; }
    if (existing.status !== "Pending") {
      res.status(400).json({ error: "bad_request", message: "Request already resolved" }); return;
    }
    if (existing.requestedById === req.user!.id) {
      res.status(400).json({ error: "bad_request", message: "Cannot approve your own request" }); return;
    }

    try {
      await executeApprovedOperation(existing);
    } catch (opErr: any) {
      res.status(400).json({ error: "execution_failed", message: opErr.message });
      return;
    }

    const [updated] = await db.update(approvalRequestsTable).set({
      status: "Approved",
      approvedById: req.user!.id,
      approvedByName: req.user!.fullName || req.user!.email || "",
      resolvedAt: new Date(),
    }).where(eq(approvalRequestsTable.id, req.params.id)).returning();

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/reject", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const role = req.user!.role;
    if (!["TenantAdmin", "BranchManager", "FinancialController", "CFO"].includes(role || "")) {
      res.status(403).json({ error: "forbidden", message: "Only admins, managers, and senior finance roles can reject" });
      return;
    }

    const [existing] = await db.select().from(approvalRequestsTable)
      .where(and(eq(approvalRequestsTable.id, req.params.id), eq(approvalRequestsTable.tenantId, tenantId))).limit(1);
    if (!existing) { res.status(404).json({ error: "not_found" }); return; }
    if (existing.status !== "Pending") {
      res.status(400).json({ error: "bad_request", message: "Request already resolved" }); return;
    }
    if (existing.requestedById === req.user!.id) {
      res.status(400).json({ error: "bad_request", message: "Cannot reject your own request" }); return;
    }

    const [updated] = await db.update(approvalRequestsTable).set({
      status: "Rejected",
      approvedById: req.user!.id,
      approvedByName: req.user!.fullName || req.user!.email || "",
      rejectionReason: req.body.rejectionReason || null,
      resolvedAt: new Date(),
    }).where(eq(approvalRequestsTable.id, req.params.id)).returning();

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [{ pending }] = await db.select({ pending: sql<number>`count(*) filter (where status = 'Pending')` })
      .from(approvalRequestsTable).where(eq(approvalRequestsTable.tenantId, tenantId));
    const [{ approved }] = await db.select({ approved: sql<number>`count(*) filter (where status = 'Approved')` })
      .from(approvalRequestsTable).where(eq(approvalRequestsTable.tenantId, tenantId));
    const [{ rejected }] = await db.select({ rejected: sql<number>`count(*) filter (where status = 'Rejected')` })
      .from(approvalRequestsTable).where(eq(approvalRequestsTable.tenantId, tenantId));

    res.json({ pending: Number(pending), approved: Number(approved), rejected: Number(rejected) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/by-reference/:referenceId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const rows = await db.select().from(approvalRequestsTable)
      .where(and(
        eq(approvalRequestsTable.tenantId, tenantId),
        eq(approvalRequestsTable.referenceId, req.params.referenceId)
      ))
      .orderBy(desc(approvalRequestsTable.createdAt));

    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/withdraw", requireAuth, requireRole("SuperAdmin", "TenantAdmin", "FinancialController", "CFO"), async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ error: "bad_request", message: "Withdrawal reason is required" });
      return;
    }

    let tenantFilter: any;
    if (userRole === "SuperAdmin") {
      const [approval] = await db.select().from(approvalRequestsTable).where(eq(approvalRequestsTable.id, req.params.id)).limit(1);
      if (!approval) { res.status(404).json({ error: "not_found" }); return; }
      tenantFilter = approval.tenantId;
    } else {
      tenantFilter = req.user!.tenantId;
      if (!tenantFilter) { res.status(403).json({ error: "forbidden" }); return; }
    }

    const [approval] = await db.select().from(approvalRequestsTable)
      .where(and(eq(approvalRequestsTable.id, req.params.id), eq(approvalRequestsTable.tenantId, tenantFilter))).limit(1);
    if (!approval) { res.status(404).json({ error: "not_found" }); return; }
    if (approval.status === "Withdrawn") {
      res.status(400).json({ error: "bad_request", message: "Approval already withdrawn" });
      return;
    }
    if (approval.status !== "Approved" && approval.status !== "Pending") {
      res.status(400).json({ error: "bad_request", message: "Only Approved or Pending approvals can be withdrawn" });
      return;
    }

    const supportedRollbackTypes = ["WriteOff", "Settlement"];
    if (approval.status === "Approved" && !supportedRollbackTypes.includes(approval.requestType)) {
      res.status(400).json({ error: "bad_request", message: `Cannot withdraw approved ${approval.requestType} — rollback not supported for this type` });
      return;
    }

    const wasApproved = approval.status === "Approved";

    if (wasApproved) {
      const { requestType, referenceId } = approval;

      if (requestType === "WriteOff") {
        await db.update(loansTable)
          .set({ status: "Active", writeOffReason: null, updatedAt: new Date() })
          .where(and(eq(loansTable.id, referenceId), eq(loansTable.tenantId, tenantFilter)));
      }

      if (requestType === "Settlement") {
        const installments = await db.select().from(installmentsTable)
          .where(and(eq(installmentsTable.loanId, referenceId), eq(installmentsTable.tenantId, tenantFilter), eq(installmentsTable.status, "Settled")));

        for (const inst of installments) {
          await db.update(installmentsTable)
            .set({ status: "Pending", updatedAt: new Date() })
            .where(eq(installmentsTable.id, inst.id));
        }

        const [{ remaining }] = await db.select({ remaining: sql<number>`coalesce(sum(total_amount::numeric + penalty_amount::numeric - paid_amount::numeric), 0)` })
          .from(installmentsTable).where(and(eq(installmentsTable.loanId, referenceId), eq(installmentsTable.tenantId, tenantFilter), eq(installmentsTable.status, "Pending")));

        await db.update(loansTable)
          .set({ status: "Active", outstandingBalance: Math.max(0, Number(remaining)).toString(), updatedAt: new Date() })
          .where(and(eq(loansTable.id, referenceId), eq(loansTable.tenantId, tenantFilter)));
      }
    }

    const [updated] = await db.update(approvalRequestsTable).set({
      status: "Withdrawn",
      rejectionReason: `WITHDRAWN: ${reason}`,
      resolvedAt: new Date(),
      approvedById: userId,
      approvedByName: req.user!.fullName || "",
    }).where(eq(approvalRequestsTable.id, approval.id)).returning();

    await logAudit({
      tenantId: tenantFilter, userId, userName: req.user!.fullName || "",
      action: "WITHDRAW_APPROVAL", entity: "ApprovalRequest", entityId: approval.id,
      details: { requestType: approval.requestType, referenceId: approval.referenceId, previousStatus: approval.status, reason, withdrawnBy: userRole },
    });

    res.json({ success: true, message: "Approval withdrawn successfully", approval: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

import { Router } from "express";
import { db, loanRequestsTable, clientsTable, fundProductsTable, loansTable, installmentsTable, commissionsTable, salesAgentsTable, productCommissionsTable, journalEntriesTable, creditLimitsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { generateAmortizationSchedule } from "../lib/installmentEngine";
import { generateRefNumber, getBranchSeq } from "../lib/refGenerator";
import { notifyByRoles, createUserNotification } from "../lib/userNotifications";
import { logAudit } from "../lib/auditLog";

const WORKFLOW_ROLE_MAP: Record<string, string[]> = {
  "CreditReview": ["TenantAdmin", "BranchManager", "LoanOfficer", "DataEntry"],
  "FieldVisit": ["TenantAdmin", "BranchManager", "LoanOfficer"],
  "Approved": ["TenantAdmin", "BranchManager"],
  "Disbursed": ["TenantAdmin"],
  "Rejected": ["TenantAdmin", "BranchManager", "LoanOfficer"],
};

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const status = req.query.status as string | undefined;
    const offset = (page - 1) * limit;

    let whereClause = eq(loanRequestsTable.tenantId, tenantId);
    if (status) {
      whereClause = and(whereClause, eq(loanRequestsTable.workflowStatus, status)) as typeof whereClause;
    }

    const [requests, clients, products, [{ count }]] = await Promise.all([
      db.select().from(loanRequestsTable).where(whereClause).orderBy(desc(loanRequestsTable.createdAt)).limit(limit).offset(offset),
      db.select({ id: clientsTable.id, fullNameAr: clientsTable.fullNameAr }).from(clientsTable).where(eq(clientsTable.tenantId, tenantId)),
      db.select({ id: fundProductsTable.id, productName: fundProductsTable.productName }).from(fundProductsTable).where(eq(fundProductsTable.tenantId, tenantId)),
      db.select({ count: sql<number>`count(*)` }).from(loanRequestsTable).where(whereClause),
    ]);

    const clientMap = new Map(clients.map(c => [c.id, c.fullNameAr]));
    const productMap = new Map(products.map(p => [p.id, p.productName]));

    const data = [];
    for (const r of requests) {
      let salesAgentName: string | null = null;
      if (r.salesAgentId) {
        const [agent] = await db.select({ agentName: salesAgentsTable.agentName }).from(salesAgentsTable).where(eq(salesAgentsTable.id, r.salesAgentId)).limit(1);
        salesAgentName = agent?.agentName || null;
      }
      data.push(formatLoanRequest(r, clientMap.get(r.clientId) || "", productMap.get(r.productId) || "", salesAgentName));
    }

    res.json({ data, total: Number(count), page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { clientId, productId, requestedAmount, termMonths, salesAgentId, notes } = req.body;
    if (!clientId || !productId || !requestedAmount) {
      res.status(400).json({ error: "bad_request", message: "clientId, productId, requestedAmount required" });
      return;
    }

    const [product] = await db.select().from(fundProductsTable).where(eq(fundProductsTable.id, productId)).limit(1);

    const interestRate = product ? (product.isZeroInterest ? 0 : Number(product.interestRate)) : null;
    const adminFee = product ? Math.round(Number(requestedAmount) * Number(product.adminFeePct) / 100 * 100) / 100 : null;
    const insuranceFee = product ? Math.round(Number(requestedAmount) * Number(product.insuranceFeePct) / 100 * 100) / 100 : null;
    const stampDuty = product ? Math.round(Number(requestedAmount) * Number(product.stampDutyPct || 0) / 100 * 100) / 100 : null;

    const userBranchId = req.user!.branchId || "";
    const branchSeqStr = await getBranchSeq(userBranchId);
    const requestNumber = await generateRefNumber("LR", "loan_requests", "request_number", tenantId, branchSeqStr);

    const [lr] = await db.insert(loanRequestsTable).values({
      tenantId, clientId, productId,
      requestNumber,
      requestedAmount: requestedAmount.toString(),
      termMonths: termMonths || (product ? product.maxTermMonths : null),
      interestRate: interestRate?.toString() || null,
      adminFee: adminFee?.toString() || null,
      insuranceFee: insuranceFee?.toString() || null,
      stampDuty: stampDuty?.toString() || null,
      salesAgentId: salesAgentId || null,
      workflowStatus: "Draft",
      assignedOfficerId: req.user!.id,
      notes,
    }).returning();

    const [client] = await db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);

    let salesAgentName: string | null = null;
    if (salesAgentId) {
      const [agent] = await db.select({ agentName: salesAgentsTable.agentName }).from(salesAgentsTable).where(eq(salesAgentsTable.id, salesAgentId)).limit(1);
      salesAgentName = agent?.agentName || null;
    }

    await notifyByRoles(tenantId, ["TenantAdmin", "BranchManager"], {
      type: "new_loan_request",
      title: `New Loan Request ${lr.requestNumber}`,
      titleAr: `طلب تمويل جديد ${lr.requestNumber}`,
      message: `${client?.fullNameAr || "Client"} — ${Number(requestedAmount).toLocaleString()} EGP`,
      messageAr: `${client?.fullNameAr || "عميل"} — ${Number(requestedAmount).toLocaleString()} ج.م`,
      severity: "info",
      linkUrl: "/loan-requests",
      metadata: { requestId: lr.id, requestNumber: lr.requestNumber },
    });

    res.status(201).json(formatLoanRequest(lr, client?.fullNameAr || "", product?.productName || "", salesAgentName));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [lr] = await db.select().from(loanRequestsTable)
      .where(and(eq(loanRequestsTable.id, req.params.id), eq(loanRequestsTable.tenantId, tenantId))).limit(1);
    if (!lr) { res.status(404).json({ error: "not_found" }); return; }
    const [[client], [product]] = await Promise.all([
      db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable).where(eq(clientsTable.id, lr.clientId)).limit(1),
      db.select({ productName: fundProductsTable.productName }).from(fundProductsTable).where(eq(fundProductsTable.id, lr.productId)).limit(1),
    ]);
    let salesAgentName: string | null = null;
    if (lr.salesAgentId) {
      const [agent] = await db.select({ agentName: salesAgentsTable.agentName }).from(salesAgentsTable).where(eq(salesAgentsTable.id, lr.salesAgentId)).limit(1);
      salesAgentName = agent?.agentName || null;
    }
    res.json(formatLoanRequest(lr, client?.fullNameAr || "", product?.productName || "", salesAgentName));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/status", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { workflowStatus, notes, rejectionReason } = req.body;
    if (!workflowStatus) { res.status(400).json({ error: "bad_request", message: "workflowStatus required" }); return; }

    const allowedRoles = WORKFLOW_ROLE_MAP[workflowStatus];
    if (allowedRoles && !allowedRoles.includes(req.user!.role)) {
      const roleLabels: Record<string, string> = {
        "CreditReview": "Loan Officer / Branch Manager",
        "FieldVisit": "Branch Manager",
        "Approved": "Branch Manager",
        "Disbursed": "Tenant Admin",
        "Rejected": "Loan Officer / Branch Manager",
      };
      res.status(403).json({
        error: "forbidden",
        message: `Only ${roleLabels[workflowStatus] || allowedRoles.join(", ")} can advance to ${workflowStatus}`,
      });
      return;
    }

    const updateData: Record<string, unknown> = { workflowStatus, updatedAt: new Date() };
    if (notes !== undefined) updateData.notes = notes;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;

    const [existing] = await db.select({
      workflowStatus: loanRequestsTable.workflowStatus,
      requestNumber: loanRequestsTable.requestNumber,
      clientId: loanRequestsTable.clientId,
      requestedAmount: loanRequestsTable.requestedAmount,
      iscoreChecked: loanRequestsTable.iscoreChecked,
      iscoreResult: loanRequestsTable.iscoreResult,
      blacklistChecked: loanRequestsTable.blacklistChecked,
      blacklistClear: loanRequestsTable.blacklistClear,
    }).from(loanRequestsTable)
      .where(and(eq(loanRequestsTable.id, req.params.id), eq(loanRequestsTable.tenantId, tenantId))).limit(1);

    const [updated] = await db.update(loanRequestsTable)
      .set(updateData)
      .where(and(eq(loanRequestsTable.id, req.params.id), eq(loanRequestsTable.tenantId, tenantId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }

    const auditDetails: Record<string, unknown> = {
      previousStatus: existing?.workflowStatus || "Unknown",
      newStatus: workflowStatus,
      requestNumber: updated.requestNumber,
      requestedAmount: Number(updated.requestedAmount),
    };
    if (workflowStatus === "Approved" || workflowStatus === "Disbursed") {
      auditDetails.riskContext = {
        iscoreChecked: existing?.iscoreChecked || false,
        iscoreResult: existing?.iscoreResult || null,
        blacklistChecked: existing?.blacklistChecked || false,
        blacklistClear: existing?.blacklistClear ?? null,
      };
    }
    if (workflowStatus === "Rejected") {
      auditDetails.rejectionReason = rejectionReason || null;
    }
    await logAudit({
      tenantId,
      userId: req.user!.id,
      userName: req.user!.fullName || "",
      action: `LOAN_REQUEST_${workflowStatus.toUpperCase()}`,
      entity: "LoanRequest",
      entityId: updated.id,
      details: auditDetails,
    });

    const statusLabels: Record<string, { en: string; ar: string; severity: string }> = {
      "CreditReview": { en: "Credit Review", ar: "مراجعة ائتمانية", severity: "info" },
      "FieldVisit": { en: "Field Visit", ar: "زيارة ميدانية", severity: "info" },
      "Approved": { en: "Approved", ar: "تمت الموافقة", severity: "success" },
      "Rejected": { en: "Rejected", ar: "مرفوض", severity: "warning" },
      "Disbursed": { en: "Disbursed", ar: "تم الصرف", severity: "success" },
    };
    const label = statusLabels[workflowStatus] || { en: workflowStatus, ar: workflowStatus, severity: "info" };

    if (updated.assignedOfficerId && updated.assignedOfficerId !== req.user!.id) {
      await createUserNotification({
        tenantId,
        userId: updated.assignedOfficerId,
        type: "request_status_change",
        title: `Request ${updated.requestNumber} — ${label.en}`,
        titleAr: `طلب ${updated.requestNumber} — ${label.ar}`,
        message: `Status changed to ${label.en} by ${req.user!.fullName}`,
        messageAr: `تم تغيير الحالة إلى ${label.ar} بواسطة ${req.user!.fullName}`,
        severity: label.severity,
        linkUrl: "/loan-requests",
        metadata: { requestId: updated.id, status: workflowStatus },
      });
    }

    if (workflowStatus === "Approved" || workflowStatus === "Rejected" || workflowStatus === "Disbursed") {
      await notifyByRoles(tenantId, ["TenantAdmin"], {
        type: "request_status_change",
        title: `Request ${updated.requestNumber} — ${label.en}`,
        titleAr: `طلب ${updated.requestNumber} — ${label.ar}`,
        message: `${label.en} by ${req.user!.fullName}`,
        messageAr: `${label.ar} بواسطة ${req.user!.fullName}`,
        severity: label.severity,
        linkUrl: "/loan-requests",
        metadata: { requestId: updated.id, status: workflowStatus },
      });
    }

    if (workflowStatus === "Disbursed") {
      const [existingLoan] = await db.select({ id: loansTable.id }).from(loansTable)
        .where(and(eq(loansTable.requestId, updated.id), eq(loansTable.tenantId, tenantId))).limit(1);
      if (existingLoan) {
        const [[client2], [product2]] = await Promise.all([
          db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable).where(eq(clientsTable.id, updated.clientId)).limit(1),
          db.select({ productName: fundProductsTable.productName }).from(fundProductsTable).where(eq(fundProductsTable.id, updated.productId)).limit(1),
        ]);
        res.json(formatLoanRequest(updated, client2?.fullNameAr || "", product2?.productName || "", null));
        return;
      }

      const [product] = await db.select().from(fundProductsTable).where(eq(fundProductsTable.id, updated.productId)).limit(1);
      const amount = Number(updated.requestedAmount);
      const termMonths = updated.termMonths || (product ? product.maxTermMonths : 12);
      const interestRate = updated.interestRate ? Number(updated.interestRate) : (product ? Number(product.interestRate) : 0);
      const gracePeriodDays = product ? product.gracePeriodDays : 0;

      const loanBranchSeq = await getBranchSeq(req.user!.branchId || "");
      const loanNumber = await generateRefNumber("LN", "loans", "loan_number", tenantId, loanBranchSeq);

      const [loan] = await db.insert(loansTable).values({
        tenantId,
        loanNumber,
        requestId: updated.id,
        disbursedAmount: updated.requestedAmount,
        outstandingBalance: updated.requestedAmount,
        totalPaid: "0.00",
        status: "Active",
        assignedBranchId: req.user!.branchId || null,
        disbursedAt: new Date(),
      }).returning();

      const schedule = generateAmortizationSchedule({
        principal: amount,
        annualInterestRate: interestRate,
        termMonths,
        method: product?.amortizationMethod || "Monthly",
        disbursementDate: new Date(),
        gracePeriodDays,
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

      if (loan.nextInstallmentDate === null && schedule.length > 0) {
        await db.update(loansTable).set({ nextInstallmentDate: schedule[0].dueDate }).where(eq(loansTable.id, loan.id));
      }

      if (updated.salesAgentId) {
        let commissionPct = product ? Number(product.defaultCommissionPct) : 0;
        const [customPc] = await db.select().from(productCommissionsTable)
          .where(and(eq(productCommissionsTable.productId, updated.productId), eq(productCommissionsTable.agentId, updated.salesAgentId), eq(productCommissionsTable.tenantId, tenantId))).limit(1);
        if (customPc) commissionPct = Number(customPc.commissionPct);

        if (commissionPct > 0) {
          const commissionAmount = Math.round(amount * commissionPct / 100 * 100) / 100;
          await db.insert(commissionsTable).values({
            tenantId,
            agentId: updated.salesAgentId,
            loanId: loan.id,
            disbursedAmount: updated.requestedAmount,
            commissionPct: commissionPct.toString(),
            commissionAmount: commissionAmount.toString(),
            status: "Pending",
          });
        }
      }

      await db.insert(journalEntriesTable).values({
        tenantId, referenceType: "Disbursement", referenceId: loan.id,
        description: `Loan disbursement of ${amount} EGP`,
        totalDebit: updated.requestedAmount, totalCredit: updated.requestedAmount,
      });

      const activeCreditLimits = await db.select().from(creditLimitsTable)
        .where(and(
          eq(creditLimitsTable.tenantId, tenantId),
          eq(creditLimitsTable.clientId, updated.clientId),
          eq(creditLimitsTable.status, "Active")
        ))
        .orderBy(desc(creditLimitsTable.createdAt))
        .limit(1);

      if (activeCreditLimits.length > 0) {
        const cl = activeCreditLimits[0];
        const consumeAmount = Math.min(amount, Number(cl.availableBalance));
        if (consumeAmount > 0) {
          await db.update(creditLimitsTable).set({
            usedAmount: (Number(cl.usedAmount) + consumeAmount).toString(),
            availableBalance: (Number(cl.availableBalance) - consumeAmount).toString(),
            activeLoanCount: cl.activeLoanCount + 1,
            updatedAt: new Date(),
          }).where(eq(creditLimitsTable.id, cl.id));

          await db.insert(journalEntriesTable).values({
            tenantId, referenceType: "CreditLimitConsumption", referenceId: loan.id,
            description: `Credit limit auto-consumed ${consumeAmount} EGP for loan disbursement`,
            totalDebit: consumeAmount.toString(), totalCredit: consumeAmount.toString(),
          });
        }
      }
    }

    const [[client], [product]] = await Promise.all([
      db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable).where(eq(clientsTable.id, updated.clientId)).limit(1),
      db.select({ productName: fundProductsTable.productName }).from(fundProductsTable).where(eq(fundProductsTable.id, updated.productId)).limit(1),
    ]);

    let salesAgentName: string | null = null;
    if (updated.salesAgentId) {
      const [agent] = await db.select({ agentName: salesAgentsTable.agentName }).from(salesAgentsTable).where(eq(salesAgentsTable.id, updated.salesAgentId)).limit(1);
      salesAgentName = agent?.agentName || null;
    }

    res.json(formatLoanRequest(updated, client?.fullNameAr || "", product?.productName || "", salesAgentName));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

function formatLoanRequest(lr: typeof loanRequestsTable.$inferSelect, clientName: string, productName: string, salesAgentName: string | null = null) {
  return {
    id: lr.id,
    requestNumber: lr.requestNumber || lr.id.slice(0, 8).toUpperCase(),
    tenantId: lr.tenantId,
    clientId: lr.clientId,
    clientName,
    productId: lr.productId,
    productName,
    requestedAmount: Number(lr.requestedAmount),
    termMonths: lr.termMonths,
    interestRate: lr.interestRate ? Number(lr.interestRate) : null,
    adminFee: lr.adminFee ? Number(lr.adminFee) : null,
    insuranceFee: lr.insuranceFee ? Number(lr.insuranceFee) : null,
    stampDuty: lr.stampDuty ? Number(lr.stampDuty) : null,
    workflowStatus: lr.workflowStatus,
    assignedOfficerId: lr.assignedOfficerId,
    salesAgentId: lr.salesAgentId,
    salesAgentName,
    rejectionReason: lr.rejectionReason,
    notes: lr.notes,
    iscoreChecked: lr.iscoreChecked,
    iscoreResult: lr.iscoreResult,
    blacklistChecked: lr.blacklistChecked,
    blacklistClear: lr.blacklistClear,
    createdAt: lr.createdAt,
    updatedAt: lr.updatedAt,
  };
}

export default router;

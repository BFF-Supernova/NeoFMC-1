import { Router } from "express";
import { db, loansTable, loanRequestsTable, clientsTable, installmentsTable, paymentsTable, fundProductsTable, approvalRequestsTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte, ne } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { logAudit } from "../lib/auditLog";
import { formatInstallment } from "./installments";

const router = Router();

function classifyPAR(maxDaysOverdue: number): string {
  if (maxDaysOverdue <= 0) return "Current";
  if (maxDaysOverdue <= 30) return "PAR1-30";
  if (maxDaysOverdue <= 60) return "PAR31-60";
  if (maxDaysOverdue <= 90) return "PAR61-90";
  if (maxDaysOverdue <= 180) return "PAR91-180";
  if (maxDaysOverdue <= 365) return "PAR181-365";
  return "PAR365+";
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const status = req.query.status as string | undefined;
    const branchId = req.query.branchId as string | undefined;
    const officerId = req.query.officerId as string | undefined;
    const productId = req.query.productId as string | undefined;
    const parClass = req.query.parClass as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const offset = (page - 1) * limit;

    let conditions: any[] = [eq(loansTable.tenantId, tenantId)];
    if (status) conditions.push(eq(loansTable.status, status));
    if (branchId) conditions.push(eq(loansTable.assignedBranchId, branchId));
    if (officerId) conditions.push(eq(loansTable.assignedOfficerId, officerId));
    if (dateFrom) conditions.push(gte(loansTable.disbursedAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(loansTable.disbursedAt, new Date(dateTo)));

    let query = db.select({
      loan: loansTable,
      clientId: loanRequestsTable.clientId,
      clientName: clientsTable.fullNameAr,
      productId: loanRequestsTable.productId,
      productName: fundProductsTable.productName,
    })
      .from(loansTable)
      .innerJoin(loanRequestsTable, eq(loansTable.requestId, loanRequestsTable.id))
      .leftJoin(clientsTable, eq(loanRequestsTable.clientId, clientsTable.id))
      .leftJoin(fundProductsTable, eq(loanRequestsTable.productId, fundProductsTable.id));

    if (productId) conditions.push(eq(loanRequestsTable.productId, productId));

    const whereClause = and(...conditions);

    const [rows, [{ count }]] = await Promise.all([
      query.where(whereClause).orderBy(desc(loansTable.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(loansTable)
        .innerJoin(loanRequestsTable, eq(loansTable.requestId, loanRequestsTable.id))
        .where(whereClause),
    ]);

    let data = [];
    for (const row of rows) {
      const maxOverdue = await db.select({
        maxDays: sql<number>`COALESCE(max(days_overdue), 0)::int`,
      }).from(installmentsTable)
        .where(and(eq(installmentsTable.loanId, row.loan.id), ne(installmentsTable.status, "Paid")));

      const maxDays = maxOverdue[0]?.maxDays || 0;
      const par = classifyPAR(maxDays);

      data.push({
        ...formatLoan(row.loan, row.clientId || "", row.clientName || ""),
        productId: row.productId,
        productName: row.productName,
        maxDaysOverdue: maxDays,
        parClass: par,
      });
    }

    if (parClass) {
      data = data.filter(d => d.parClass === parClass);
    }

    res.json({ data, total: Number(count), page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [loan] = await db.select().from(loansTable)
      .where(and(eq(loansTable.id, req.params.id), eq(loansTable.tenantId, tenantId))).limit(1);
    if (!loan) { res.status(404).json({ error: "not_found" }); return; }

    const [lr] = await db.select({ clientId: loanRequestsTable.clientId }).from(loanRequestsTable).where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
    const clientId = lr?.clientId || "";
    const [client] = clientId ? await db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1) : [null];

    const today = new Date().toISOString().split("T")[0];
    const installments = await db.select().from(installmentsTable)
      .where(eq(installmentsTable.loanId, loan.id)).orderBy(installmentsTable.installmentNumber);

    const payments = await db.select().from(paymentsTable)
      .where(and(eq(paymentsTable.loanId, loan.id), eq(paymentsTable.tenantId, tenantId)))
      .orderBy(desc(paymentsTable.createdAt));

    const pendingApprovals = await db.select().from(approvalRequestsTable)
      .where(and(
        eq(approvalRequestsTable.tenantId, tenantId),
        eq(approvalRequestsTable.referenceId, loan.id),
        eq(approvalRequestsTable.status, "Pending")
      ))
      .orderBy(desc(approvalRequestsTable.createdAt));

    res.json({
      loan: formatLoan(loan, clientId, client?.fullNameAr || ""),
      installments: installments.map(inst => {
        const daysOverdue = inst.status === "Pending" && inst.dueDate < today
          ? Math.floor((new Date().getTime() - new Date(inst.dueDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return formatInstallment(inst, daysOverdue);
      }),
      payments: payments.map(p => ({
        id: p.id, loanId: p.loanId, installmentId: p.installmentId,
        amount: Number(p.amount), paymentMethod: p.paymentMethod,
        referenceNumber: p.referenceNumber, status: p.status, notes: p.notes, createdAt: p.createdAt,
      })),
      pendingApprovals: pendingApprovals.map(a => ({
        id: a.id, requestType: a.requestType, status: a.status,
        requestedByName: a.requestedByName, createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/early-settlement", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [loan] = await db.select().from(loansTable)
      .where(and(eq(loansTable.id, req.params.id), eq(loansTable.tenantId, tenantId))).limit(1);
    if (!loan) { res.status(404).json({ error: "not_found" }); return; }

    const pendingInstallments = await db.select().from(installmentsTable)
      .where(and(eq(installmentsTable.loanId, loan.id), eq(installmentsTable.status, "Pending")));

    const outstandingPrincipal = pendingInstallments.reduce((s, i) => s + Number(i.principalAmount) - Number(i.paidAmount), 0);
    const outstandingInterest = pendingInstallments.reduce((s, i) => s + Number(i.interestAmount), 0);

    const [lr] = await db.select({ productId: loanRequestsTable.productId }).from(loanRequestsTable).where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
    let earlyFeePct = 0;
    if (lr) {
      const [product] = await db.select({ earlyPaymentFeePct: fundProductsTable.earlyPaymentFeePct }).from(fundProductsTable).where(eq(fundProductsTable.id, lr.productId)).limit(1);
      earlyFeePct = product?.earlyPaymentFeePct ? Number(product.earlyPaymentFeePct) : 0;
    }

    const earlySettlementFee = Math.round(outstandingPrincipal * earlyFeePct / 100 * 100) / 100;
    const totalDue = Math.round((outstandingPrincipal + earlySettlementFee) * 100) / 100;

    const [lrFull] = await db.select({ clientId: loanRequestsTable.clientId }).from(loanRequestsTable).where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
    const [client] = lrFull ? await db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable).where(eq(clientsTable.id, lrFull.clientId)).limit(1) : [null];

    res.json({
      outstandingPrincipal: Math.round(outstandingPrincipal * 100) / 100,
      outstandingInterest: Math.round(outstandingInterest * 100) / 100,
      earlySettlementFee,
      totalDue,
      loan: formatLoan(loan, lrFull?.clientId || "", client?.fullNameAr || ""),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/request-settlement", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [loan] = await db.select().from(loansTable)
      .where(and(eq(loansTable.id, req.params.id), eq(loansTable.tenantId, tenantId))).limit(1);
    if (!loan) { res.status(404).json({ error: "not_found" }); return; }
    if (loan.status !== "Active") { res.status(400).json({ error: "bad_request", message: "Loan is not active" }); return; }

    const [existing] = await db.select({ id: approvalRequestsTable.id }).from(approvalRequestsTable)
      .where(and(
        eq(approvalRequestsTable.tenantId, tenantId),
        eq(approvalRequestsTable.referenceId, loan.id),
        eq(approvalRequestsTable.requestType, "Settlement"),
        eq(approvalRequestsTable.status, "Pending")
      )).limit(1);
    if (existing) { res.status(409).json({ error: "duplicate", message: "Settlement request already pending" }); return; }

    const [lrFull] = await db.select({ clientId: loanRequestsTable.clientId }).from(loanRequestsTable).where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
    const [client] = lrFull ? await db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable).where(eq(clientsTable.id, lrFull.clientId)).limit(1) : [null];

    const [row] = await db.insert(approvalRequestsTable).values({
      tenantId,
      requestType: "Settlement",
      referenceId: loan.id,
      referenceLabel: `${client?.fullNameAr || "Unknown"} - Settlement`,
      status: "Pending",
      requestedById: req.user!.id,
      requestedByName: req.user!.fullName || req.user!.email || "",
      data: { totalDue: req.body.totalDue, outstandingPrincipal: req.body.outstandingPrincipal },
    }).returning();

    res.status(201).json(row);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/request-reschedule", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { newTermMonths, reason } = req.body;
    if (!newTermMonths || !reason) { res.status(400).json({ error: "bad_request", message: "newTermMonths and reason required" }); return; }

    const [loan] = await db.select().from(loansTable)
      .where(and(eq(loansTable.id, req.params.id), eq(loansTable.tenantId, tenantId))).limit(1);
    if (!loan) { res.status(404).json({ error: "not_found" }); return; }
    if (loan.status !== "Active") { res.status(400).json({ error: "bad_request", message: "Loan is not active" }); return; }

    const [existing] = await db.select({ id: approvalRequestsTable.id }).from(approvalRequestsTable)
      .where(and(
        eq(approvalRequestsTable.tenantId, tenantId),
        eq(approvalRequestsTable.referenceId, loan.id),
        eq(approvalRequestsTable.requestType, "Reschedule"),
        eq(approvalRequestsTable.status, "Pending")
      )).limit(1);
    if (existing) { res.status(409).json({ error: "duplicate", message: "Reschedule request already pending" }); return; }

    const [lrFull] = await db.select({ clientId: loanRequestsTable.clientId }).from(loanRequestsTable).where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
    const [client] = lrFull ? await db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable).where(eq(clientsTable.id, lrFull.clientId)).limit(1) : [null];

    const [row] = await db.insert(approvalRequestsTable).values({
      tenantId,
      requestType: "Reschedule",
      referenceId: loan.id,
      referenceLabel: `${client?.fullNameAr || "Unknown"} - Reschedule (${newTermMonths} months)`,
      status: "Pending",
      requestedById: req.user!.id,
      requestedByName: req.user!.fullName || req.user!.email || "",
      data: { newTermMonths, reason },
    }).returning();

    res.status(201).json(row);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/request-writeoff", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { reason, notes } = req.body;
    if (!reason) { res.status(400).json({ error: "bad_request", message: "reason required" }); return; }

    const [loan] = await db.select().from(loansTable)
      .where(and(eq(loansTable.id, req.params.id), eq(loansTable.tenantId, tenantId))).limit(1);
    if (!loan) { res.status(404).json({ error: "not_found" }); return; }
    if (loan.status !== "Active") { res.status(400).json({ error: "bad_request", message: "Loan is not active" }); return; }

    const [existing] = await db.select({ id: approvalRequestsTable.id }).from(approvalRequestsTable)
      .where(and(
        eq(approvalRequestsTable.tenantId, tenantId),
        eq(approvalRequestsTable.referenceId, loan.id),
        eq(approvalRequestsTable.requestType, "WriteOff"),
        eq(approvalRequestsTable.status, "Pending")
      )).limit(1);
    if (existing) { res.status(409).json({ error: "duplicate", message: "Write-off request already pending" }); return; }

    const [lrFull] = await db.select({ clientId: loanRequestsTable.clientId }).from(loanRequestsTable).where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
    const [client] = lrFull ? await db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable).where(eq(clientsTable.id, lrFull.clientId)).limit(1) : [null];

    const [row] = await db.insert(approvalRequestsTable).values({
      tenantId,
      requestType: "WriteOff",
      referenceId: loan.id,
      referenceLabel: `${client?.fullNameAr || "Unknown"} - Write-Off`,
      status: "Pending",
      requestedById: req.user!.id,
      requestedByName: req.user!.fullName || req.user!.email || "",
      data: { reason, notes, outstandingBalance: Number(loan.outstandingBalance) },
    }).returning();

    res.status(201).json(row);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/reschedule", requireAuth, async (_req, res) => {
  res.status(403).json({ error: "forbidden", message: "Reschedule must go through maker-checker approval. Use /request-reschedule instead." });
});

router.post("/:id/write-off", requireAuth, async (_req, res) => {
  res.status(403).json({ error: "forbidden", message: "Write-off must go through maker-checker approval. Use /request-writeoff instead." });
});

const ROLLBACK_MAP: Record<string, string> = {
  "WrittenOff": "Active",
  "Closed": "Active",
  "Active": "Active",
};

router.post("/:id/rollback-status", requireAuth, requireRole("SuperAdmin", "TenantAdmin"), async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ error: "bad_request", message: "Rollback reason is required" });
      return;
    }

    let tenantFilter: any;
    if (userRole === "SuperAdmin") {
      const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, req.params.id)).limit(1);
      if (!loan) { res.status(404).json({ error: "not_found" }); return; }
      tenantFilter = loan.tenantId;
    } else {
      tenantFilter = req.user!.tenantId;
      if (!tenantFilter) { res.status(403).json({ error: "forbidden" }); return; }
    }

    const [loan] = await db.select().from(loansTable)
      .where(and(eq(loansTable.id, req.params.id), eq(loansTable.tenantId, tenantFilter))).limit(1);
    if (!loan) { res.status(404).json({ error: "not_found" }); return; }

    const previousStatus = loan.status || "Active";
    const newStatus = ROLLBACK_MAP[previousStatus];
    if (!newStatus || previousStatus === "Active") {
      res.status(400).json({ error: "bad_request", message: `Cannot rollback loan with status '${previousStatus}'` });
      return;
    }

    const updates: any = { status: newStatus, updatedAt: new Date() };
    if (previousStatus === "WrittenOff") {
      updates.writeOffReason = null;
    }
    if (previousStatus === "Closed") {
      const settledInstallments = await db.select().from(installmentsTable)
        .where(and(eq(installmentsTable.loanId, loan.id), eq(installmentsTable.tenantId, tenantFilter), eq(installmentsTable.status, "Settled")));

      if (settledInstallments.length === 0) {
        res.status(400).json({ error: "bad_request", message: "Cannot rollback a loan that was closed via full payment (no settled installments to revert)" });
        return;
      }

      for (const inst of settledInstallments) {
        await db.update(installmentsTable)
          .set({ status: "Pending", updatedAt: new Date() })
          .where(eq(installmentsTable.id, inst.id));
      }

      const [{ totalInstallments }] = await db.select({ totalInstallments: sql<number>`coalesce(sum(total_amount::numeric + penalty_amount::numeric - paid_amount::numeric), 0)` })
        .from(installmentsTable).where(and(eq(installmentsTable.loanId, loan.id), eq(installmentsTable.tenantId, tenantFilter), eq(installmentsTable.status, "Pending")));
      updates.outstandingBalance = Math.max(0, Number(totalInstallments)).toString();
    }

    await db.update(loansTable).set(updates).where(eq(loansTable.id, loan.id));

    await logAudit({
      tenantId: tenantFilter, userId, userName: req.user!.fullName || "",
      action: "ROLLBACK_LOAN_STATUS", entity: "Loan", entityId: loan.id,
      details: { previousStatus, newStatus, reason, rolledBackBy: userRole },
    });

    res.json({ success: true, message: `Loan status rolled back from '${previousStatus}' to '${newStatus}'`, previousStatus, newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id/contract-data", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [loan] = await db.select().from(loansTable)
      .where(and(eq(loansTable.id, req.params.id), eq(loansTable.tenantId, tenantId))).limit(1);
    if (!loan) { res.status(404).json({ error: "not_found" }); return; }

    const [lr] = await db.select().from(loanRequestsTable)
      .where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
    if (!lr) { res.status(404).json({ error: "loan_request_not_found" }); return; }

    const [client] = await db.select().from(clientsTable)
      .where(eq(clientsTable.id, lr.clientId)).limit(1);

    const [product] = lr.productId ? await db.select().from(fundProductsTable)
      .where(eq(fundProductsTable.id, lr.productId)).limit(1) : [null];

    const installments = await db.select().from(installmentsTable)
      .where(eq(installmentsTable.loanId, loan.id))
      .orderBy(installmentsTable.installmentNumber);

    const { guaranteesTable } = await import("@workspace/db");
    const guarantees = await db.select().from(guaranteesTable)
      .where(and(eq(guaranteesTable.loanId, loan.id), eq(guaranteesTable.tenantId, tenantId)));

    res.json({
      loan: {
        id: loan.id,
        disbursedAmount: Number(loan.disbursedAmount),
        outstandingBalance: Number(loan.outstandingBalance),
        status: loan.status,
        disbursedAt: loan.disbursedAt,
      },
      request: {
        requestedAmount: Number(lr.requestedAmount),
        approvedAmount: lr.approvedAmount ? Number(lr.approvedAmount) : null,
        interestRate: lr.interestRate ? Number(lr.interestRate) : null,
        tenure: lr.tenure,
        repaymentFrequency: lr.repaymentFrequency,
        purpose: lr.purpose,
      },
      client: client ? {
        fullNameAr: client.fullNameAr,
        fullNameEn: client.fullNameEn,
        nationalId: client.nationalId,
        phone: client.phone,
        address: client.address,
      } : null,
      product: product ? {
        productName: product.productName,
      } : null,
      installments: installments.map(i => ({
        installmentNumber: i.installmentNumber,
        dueDate: i.dueDate,
        totalAmount: Number(i.totalAmount),
        principalAmount: Number(i.principalAmount),
        interestAmount: Number(i.interestAmount),
      })),
      guarantors: guarantees.map(g => ({
        guarantorName: g.guarantorName,
        guarantorNationalId: g.guarantorNationalId,
        guarantorPhone: g.guarantorPhone,
        guarantorAddress: g.guarantorAddress,
        relationToClient: g.relationToClient,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

function formatLoan(l: typeof loansTable.$inferSelect, clientId: string, clientName: string) {
  return {
    id: l.id, loanNumber: l.loanNumber || null, tenantId: l.tenantId, requestId: l.requestId, clientId, clientName,
    disbursedAmount: Number(l.disbursedAmount), outstandingBalance: Number(l.outstandingBalance),
    totalPaid: Number(l.totalPaid), status: l.status, writeOffReason: l.writeOffReason,
    assignedOfficerId: l.assignedOfficerId, assignedBranchId: l.assignedBranchId,
    nextInstallmentDate: l.nextInstallmentDate, disbursedAt: l.disbursedAt, createdAt: l.createdAt,
  };
}

export default router;

import { Router } from "express";
import { db, paymentsTable, installmentsTable, loansTable, journalEntriesTable, savingsAccountsTable, savingsTransactionsTable, savingsProductsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { loanId, installmentId, amount, paymentMethod, referenceNumber, notes } = req.body;
    if (!loanId || !amount || !paymentMethod) {
      res.status(400).json({ error: "bad_request", message: "loanId, amount, paymentMethod required" });
      return;
    }
    if (Number(amount) <= 0 || isNaN(Number(amount))) {
      res.status(400).json({ error: "bad_request", message: "Amount must be a positive number" });
      return;
    }

    const [loan] = await db.select().from(loansTable)
      .where(and(eq(loansTable.id, loanId), eq(loansTable.tenantId, tenantId))).limit(1);
    if (!loan) { res.status(404).json({ error: "not_found", message: "Loan not found" }); return; }

    if (installmentId) {
      const [instCheck] = await db.select().from(installmentsTable)
        .where(and(eq(installmentsTable.id, installmentId), eq(installmentsTable.loanId, loanId), eq(installmentsTable.tenantId, tenantId))).limit(1);
      if (!instCheck) { res.status(404).json({ error: "not_found", message: "Installment not found for this loan" }); return; }
    }

    const [payment] = await db.insert(paymentsTable).values({
      tenantId, loanId, installmentId: installmentId || null,
      amount: amount.toString(),
      paymentMethod, referenceNumber, notes,
      collectedById: req.user!.id,
      status: "Completed",
    }).returning();

    let remainingPayment = Number(amount);

    if (installmentId) {
      const [inst] = await db.select().from(installmentsTable)
        .where(and(eq(installmentsTable.id, installmentId), eq(installmentsTable.tenantId, tenantId))).limit(1);
      if (inst) {
        const newPaid = Number(inst.paidAmount) + remainingPayment;
        const total = Number(inst.totalAmount) + Number(inst.penaltyAmount);
        const status = newPaid >= total ? "Paid" : "PartiallyPaid";
        await db.update(installmentsTable)
          .set({ paidAmount: newPaid.toString(), status, paidDate: status === "Paid" ? new Date().toISOString().split("T")[0] : null, updatedAt: new Date() })
          .where(and(eq(installmentsTable.id, installmentId), eq(installmentsTable.tenantId, tenantId)));
      }
    } else {
      const pendingInstallments = await db.select().from(installmentsTable)
        .where(and(eq(installmentsTable.loanId, loanId), eq(installmentsTable.tenantId, tenantId), eq(installmentsTable.status, "Pending")))
        .orderBy(installmentsTable.installmentNumber);

      for (const inst of pendingInstallments) {
        if (remainingPayment <= 0) break;
        const due = Number(inst.totalAmount) + Number(inst.penaltyAmount) - Number(inst.paidAmount);
        const payForThis = Math.min(remainingPayment, due);
        const newPaid = Number(inst.paidAmount) + payForThis;
        const status = newPaid >= (Number(inst.totalAmount) + Number(inst.penaltyAmount)) ? "Paid" : "PartiallyPaid";
        await db.update(installmentsTable)
          .set({ paidAmount: newPaid.toString(), status, paidDate: status === "Paid" ? new Date().toISOString().split("T")[0] : null, updatedAt: new Date() })
          .where(and(eq(installmentsTable.id, inst.id), eq(installmentsTable.tenantId, tenantId)));
        remainingPayment -= payForThis;
      }
    }

    const newTotalPaid = Number(loan.totalPaid) + Number(amount);
    const newOutstanding = Math.max(0, Number(loan.outstandingBalance) - Number(amount));
    const loanStatus = newOutstanding <= 0 ? "Closed" : "Active";

    const allInstallments = await db.select().from(installmentsTable)
      .where(and(eq(installmentsTable.loanId, loanId), eq(installmentsTable.tenantId, tenantId), eq(installmentsTable.status, "Pending")))
      .orderBy(installmentsTable.dueDate).limit(1);
    const nextDate = allInstallments.length > 0 ? allInstallments[0].dueDate : null;

    await db.update(loansTable)
      .set({ totalPaid: newTotalPaid.toString(), outstandingBalance: newOutstanding.toString(), status: loanStatus, nextInstallmentDate: nextDate, updatedAt: new Date() })
      .where(and(eq(loansTable.id, loanId), eq(loansTable.tenantId, tenantId)));

    await db.insert(journalEntriesTable).values({
      tenantId, referenceType: "Repayment", referenceId: loanId,
      description: `Payment of ${amount} EGP via ${paymentMethod}`,
      totalDebit: amount.toString(), totalCredit: amount.toString(),
    });

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName || "", action: "RECORD_PAYMENT", entity: "Payment", entityId: payment.id, details: { loanId, amount, paymentMethod, loanStatus } });

    try {
      const compulsoryAccounts = await db.select({
        account: savingsAccountsTable,
        mandatoryAmount: savingsProductsTable.mandatoryAmount,
      }).from(savingsAccountsTable)
        .innerJoin(savingsProductsTable, eq(savingsAccountsTable.productId, savingsProductsTable.id))
        .where(and(
          eq(savingsAccountsTable.tenantId, tenantId),
          eq(savingsAccountsTable.loanId, loanId),
          eq(savingsAccountsTable.accountType, "Compulsory"),
          eq(savingsAccountsTable.status, "Active"),
        ));

      for (const { account, mandatoryAmount } of compulsoryAccounts) {
        const deductAmount = Number(mandatoryAmount) || 0;
        if (deductAmount <= 0) continue;

        const newBalance = Number(account.balance) + deductAmount;
        const newTotalDeposits = Number(account.totalDeposits) + deductAmount;
        const today = new Date().toISOString().split("T")[0];

        await db.update(savingsAccountsTable).set({
          balance: newBalance.toString(),
          totalDeposits: newTotalDeposits.toString(),
          lastTransactionDate: today,
          updatedAt: new Date(),
        }).where(eq(savingsAccountsTable.id, account.id));

        await db.insert(savingsTransactionsTable).values({
          tenantId, accountId: account.id, transactionType: "Deposit",
          amount: deductAmount.toString(), balanceAfter: newBalance.toString(),
          paymentMethod: "AutoDeduct", description: `Compulsory savings deduction from loan payment`,
          performedById: req.user!.id, performedByName: req.user!.fullName,
        });
      }
    } catch (savErr) {
      console.error("Compulsory savings auto-deduct error (non-blocking):", savErr);
    }

    res.status(201).json(formatPayment(payment));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/loan/:loanId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const payments = await db.select().from(paymentsTable)
      .where(and(eq(paymentsTable.loanId, req.params.loanId), eq(paymentsTable.tenantId, tenantId)))
      .orderBy(desc(paymentsTable.createdAt));
    res.json(payments.map(formatPayment));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/reverse", requireAuth, requireRole("SuperAdmin", "TenantAdmin"), async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ error: "bad_request", message: "Reversal reason is required" });
      return;
    }

    let tenantFilter: any;
    if (userRole === "SuperAdmin") {
      const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, req.params.id)).limit(1);
      if (!payment) { res.status(404).json({ error: "not_found" }); return; }
      tenantFilter = payment.tenantId;
    } else {
      tenantFilter = req.user!.tenantId;
      if (!tenantFilter) { res.status(403).json({ error: "forbidden" }); return; }
    }

    const [payment] = await db.select().from(paymentsTable)
      .where(and(eq(paymentsTable.id, req.params.id), eq(paymentsTable.tenantId, tenantFilter))).limit(1);
    if (!payment) { res.status(404).json({ error: "not_found" }); return; }
    if (payment.status === "Reversed") {
      res.status(400).json({ error: "bad_request", message: "Payment already reversed" });
      return;
    }

    const paymentAmount = Number(payment.amount);

    if (payment.installmentId) {
      const [inst] = await db.select().from(installmentsTable)
        .where(and(eq(installmentsTable.id, payment.installmentId), eq(installmentsTable.tenantId, tenantFilter))).limit(1);
      if (inst) {
        const newPaid = Math.max(0, Number(inst.paidAmount) - paymentAmount);
        const total = Number(inst.totalAmount) + Number(inst.penaltyAmount);
        const status = newPaid <= 0 ? "Pending" : newPaid >= total ? "Paid" : "PartiallyPaid";
        await db.update(installmentsTable)
          .set({ paidAmount: newPaid.toString(), status, paidDate: status === "Paid" ? inst.paidDate : null, updatedAt: new Date() })
          .where(eq(installmentsTable.id, inst.id));
      }
    } else {
      const allInstallments = await db.select().from(installmentsTable)
        .where(and(eq(installmentsTable.loanId, payment.loanId), eq(installmentsTable.tenantId, tenantFilter)))
        .orderBy(desc(installmentsTable.installmentNumber));

      let remaining = paymentAmount;
      for (const inst of allInstallments) {
        if (remaining <= 0) break;
        const paid = Number(inst.paidAmount);
        if (paid <= 0) continue;
        const deduct = Math.min(remaining, paid);
        const newPaid = Math.max(0, paid - deduct);
        const total = Number(inst.totalAmount) + Number(inst.penaltyAmount);
        const status = newPaid <= 0 ? "Pending" : newPaid >= total ? "Paid" : "PartiallyPaid";
        await db.update(installmentsTable)
          .set({ paidAmount: newPaid.toString(), status, paidDate: status === "Paid" ? inst.paidDate : null, updatedAt: new Date() })
          .where(eq(installmentsTable.id, inst.id));
        remaining -= deduct;
      }
    }

    const [loan] = await db.select().from(loansTable)
      .where(and(eq(loansTable.id, payment.loanId), eq(loansTable.tenantId, tenantFilter))).limit(1);
    if (loan) {
      const newTotalPaid = Math.max(0, Number(loan.totalPaid) - paymentAmount);
      const newOutstanding = Number(loan.outstandingBalance) + paymentAmount;
      const loanStatus = loan.status === "Closed" ? "Active" : loan.status;
      await db.update(loansTable)
        .set({ totalPaid: newTotalPaid.toString(), outstandingBalance: newOutstanding.toString(), status: loanStatus, updatedAt: new Date() })
        .where(eq(loansTable.id, loan.id));
    }

    await db.update(paymentsTable)
      .set({ status: "Reversed", notes: `REVERSED: ${reason}. Original notes: ${payment.notes || ""}` })
      .where(eq(paymentsTable.id, payment.id));

    await db.insert(journalEntriesTable).values({
      tenantId: tenantFilter,
      referenceType: "PaymentReversal",
      referenceId: payment.loanId,
      description: `Payment reversal of ${paymentAmount} EGP. Reason: ${reason}`,
      totalDebit: payment.amount, totalCredit: payment.amount,
    });

    await logAudit({
      tenantId: tenantFilter, userId, userName: req.user!.fullName || "",
      action: "REVERSE_PAYMENT", entity: "Payment", entityId: payment.id,
      details: { loanId: payment.loanId, amount: paymentAmount, reason, reversedBy: userRole },
    });

    res.json({ success: true, message: "Payment reversed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

function formatPayment(p: typeof paymentsTable.$inferSelect) {
  return {
    id: p.id,
    loanId: p.loanId,
    installmentId: p.installmentId,
    amount: Number(p.amount),
    paymentMethod: p.paymentMethod,
    referenceNumber: p.referenceNumber,
    status: p.status,
    notes: p.notes,
    createdAt: p.createdAt,
  };
}

export default router;

import { Router } from "express";
import { db, clientsTable, loansTable, loanRequestsTable, installmentsTable, paymentsTable, savingsAccountsTable, savingsTransactionsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

router.post("/lookup", async (req, res) => {
  try {
    const { nationalId, phone } = req.body;
    if (!nationalId || !phone) {
      res.status(400).json({ error: "bad_request", message: "nationalId and phone required" });
      return;
    }

    const [client] = await db.select({
      id: clientsTable.id,
      tenantId: clientsTable.tenantId,
      fullNameAr: clientsTable.fullNameAr,
      nationalId: clientsTable.nationalId,
      phone: clientsTable.phone,
    }).from(clientsTable)
      .where(and(eq(clientsTable.nationalId, nationalId), eq(clientsTable.phone, phone)))
      .limit(1);

    if (!client) {
      res.status(404).json({ error: "not_found", message: "Client not found" });
      return;
    }

    res.json({ clientId: client.id, tenantId: client.tenantId, fullNameAr: client.fullNameAr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:clientId/loans", async (req, res) => {
  try {
    const { nationalId } = req.query;
    if (!nationalId) { res.status(401).json({ error: "unauthorized", message: "nationalId required" }); return; }

    const [client] = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.id, req.params.clientId), eq(clientsTable.nationalId, String(nationalId))))
      .limit(1);
    if (!client) { res.status(404).json({ error: "not_found" }); return; }

    const loanReqs = await db.select().from(loanRequestsTable)
      .where(eq(loanRequestsTable.clientId, client.id))
      .orderBy(desc(loanRequestsTable.createdAt));

    const loans = [];
    for (const lr of loanReqs) {
      const [loan] = await db.select().from(loansTable)
        .where(eq(loansTable.requestId, lr.id)).limit(1);
      if (!loan) continue;

      const installments = await db.select({
        installmentNumber: installmentsTable.installmentNumber,
        dueDate: installmentsTable.dueDate,
        totalAmount: installmentsTable.totalAmount,
        paidAmount: installmentsTable.paidAmount,
        status: installmentsTable.status,
      }).from(installmentsTable)
        .where(eq(installmentsTable.loanId, loan.id))
        .orderBy(installmentsTable.installmentNumber);

      loans.push({
        id: loan.id,
        disbursedAmount: Number(loan.disbursedAmount),
        outstandingBalance: Number(loan.outstandingBalance),
        totalPaid: Number(loan.totalPaid),
        status: loan.status,
        disbursedAt: loan.disbursedAt,
        nextInstallmentDate: loan.nextInstallmentDate,
        installments: installments.map(i => ({
          ...i,
          totalAmount: Number(i.totalAmount),
          paidAmount: Number(i.paidAmount),
        })),
      });
    }

    res.json({ loans });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:clientId/payments", async (req, res) => {
  try {
    const { nationalId } = req.query;
    if (!nationalId) { res.status(401).json({ error: "unauthorized" }); return; }

    const [client] = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.id, req.params.clientId), eq(clientsTable.nationalId, String(nationalId))))
      .limit(1);
    if (!client) { res.status(404).json({ error: "not_found" }); return; }

    const payments = await db.select({
      id: paymentsTable.id,
      loanId: paymentsTable.loanId,
      amount: paymentsTable.amount,
      paymentMethod: paymentsTable.paymentMethod,
      referenceNumber: paymentsTable.referenceNumber,
      createdAt: paymentsTable.createdAt,
    }).from(paymentsTable)
      .innerJoin(loansTable, eq(paymentsTable.loanId, loansTable.id))
      .innerJoin(loanRequestsTable, eq(loansTable.requestId, loanRequestsTable.id))
      .where(eq(loanRequestsTable.clientId, client.id))
      .orderBy(desc(paymentsTable.createdAt))
      .limit(100);

    res.json({
      payments: payments.map(p => ({ ...p, amount: Number(p.amount) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:clientId/savings", async (req, res) => {
  try {
    const { nationalId } = req.query;
    if (!nationalId) { res.status(401).json({ error: "unauthorized" }); return; }

    const [client] = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.id, req.params.clientId), eq(clientsTable.nationalId, String(nationalId))))
      .limit(1);
    if (!client) { res.status(404).json({ error: "not_found" }); return; }

    const accounts = await db.select().from(savingsAccountsTable)
      .where(eq(savingsAccountsTable.clientId, client.id));

    const result = [];
    for (const acc of accounts) {
      const recentTxns = await db.select({
        id: savingsTransactionsTable.id,
        transactionType: savingsTransactionsTable.transactionType,
        amount: savingsTransactionsTable.amount,
        balanceAfter: savingsTransactionsTable.balanceAfter,
        createdAt: savingsTransactionsTable.createdAt,
      }).from(savingsTransactionsTable)
        .where(eq(savingsTransactionsTable.accountId, acc.id))
        .orderBy(desc(savingsTransactionsTable.createdAt))
        .limit(20);

      result.push({
        id: acc.id,
        accountNumber: acc.accountNumber,
        balance: Number(acc.balance),
        status: acc.status,
        transactions: recentTxns.map(t => ({
          ...t,
          amount: Number(t.amount),
          balanceAfter: Number(t.balanceAfter),
        })),
      });
    }

    res.json({ accounts: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

import { Router } from "express";
import { db, installmentsTable, loansTable, loanRequestsTable, clientsTable, fundProductsTable } from "@workspace/db";
import { eq, and, lte, gte, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

async function calculatePenalty(inst: typeof installmentsTable.$inferSelect): Promise<number> {
  if (inst.status !== "Pending") return Number(inst.penaltyAmount) || 0;
  const today = new Date();
  const dueDate = new Date(inst.dueDate);
  if (today <= dueDate) return 0;
  const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysOverdue <= 0) return 0;

  try {
    const [loan] = await db.select({ requestId: loansTable.requestId }).from(loansTable).where(eq(loansTable.id, inst.loanId)).limit(1);
    if (!loan) return 0;
    const [lr] = await db.select({ productId: loanRequestsTable.productId }).from(loanRequestsTable).where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
    if (!lr?.productId) return 0;
    const [product] = await db.select({ penaltyRatePerDay: fundProductsTable.penaltyRatePerDay }).from(fundProductsTable).where(eq(fundProductsTable.id, lr.productId)).limit(1);
    if (!product?.penaltyRatePerDay) return 0;

    const rate = Number(product.penaltyRatePerDay);
    const remaining = Number(inst.totalAmount) - Number(inst.paidAmount);
    const penalty = Math.round(remaining * (rate / 100) * daysOverdue * 100) / 100;
    return penalty;
  } catch {
    return 0;
  }
}

const router = Router();

router.get("/overdue", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const overdueBeforeDate = yesterday.toISOString().split("T")[0];

    const overdueInstallments = await db.select()
      .from(installmentsTable)
      .where(and(
        eq(installmentsTable.tenantId, tenantId),
        eq(installmentsTable.status, "Pending"),
        lte(installmentsTable.dueDate, overdueBeforeDate),
      ))
      .orderBy(installmentsTable.dueDate)
      .limit(limit).offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(installmentsTable)
      .where(and(
        eq(installmentsTable.tenantId, tenantId),
        eq(installmentsTable.status, "Pending"),
        lte(installmentsTable.dueDate, overdueBeforeDate),
      ));

    const data = [];
    for (const inst of overdueInstallments) {
      const [loan] = await db.select({ requestId: loansTable.requestId }).from(loansTable).where(eq(loansTable.id, inst.loanId)).limit(1);
      let clientName = "";
      let nationalId = "";
      let clientId = "";
      if (loan) {
        const [lr] = await db.select({ clientId: loanRequestsTable.clientId }).from(loanRequestsTable).where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
        if (lr) {
          clientId = lr.clientId;
          const [client] = await db.select({ fullNameAr: clientsTable.fullNameAr, nationalId: clientsTable.nationalId }).from(clientsTable).where(eq(clientsTable.id, lr.clientId)).limit(1);
          clientName = client?.fullNameAr || "";
          nationalId = client?.nationalId || "";
        }
      }
      const daysOverdue = Math.floor((new Date().getTime() - new Date(inst.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const calculatedPenalty = await calculatePenalty(inst);
      data.push({
        installment: { ...formatInstallment(inst, daysOverdue), calculatedPenalty },
        clientName,
        clientId,
        loanId: inst.loanId,
        nationalId,
      });
    }

    res.json({ data, total: Number(count), page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/upcoming", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const days = Number(req.query.days) || 7;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const today = new Date().toISOString().split("T")[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const upcoming = await db.select()
      .from(installmentsTable)
      .where(and(
        eq(installmentsTable.tenantId, tenantId),
        eq(installmentsTable.status, "Pending"),
        gte(installmentsTable.dueDate, today),
        lte(installmentsTable.dueDate, futureDateStr),
      ))
      .orderBy(installmentsTable.dueDate)
      .limit(limit).offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(installmentsTable)
      .where(and(
        eq(installmentsTable.tenantId, tenantId),
        eq(installmentsTable.status, "Pending"),
        gte(installmentsTable.dueDate, today),
        lte(installmentsTable.dueDate, futureDateStr),
      ));

    const data = [];
    for (const inst of upcoming) {
      const [loan] = await db.select({ requestId: loansTable.requestId }).from(loansTable).where(eq(loansTable.id, inst.loanId)).limit(1);
      let clientName = "";
      let clientId = "";
      if (loan) {
        const [lr] = await db.select({ clientId: loanRequestsTable.clientId }).from(loanRequestsTable).where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
        if (lr) {
          clientId = lr.clientId;
          const [client] = await db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable).where(eq(clientsTable.id, lr.clientId)).limit(1);
          clientName = client?.fullNameAr || "";
        }
      }
      data.push({ installment: formatInstallment(inst, 0), clientName, clientId, loanId: inst.loanId });
    }

    res.json({ data, total: Number(count), page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/my-tasks", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const today = new Date().toISOString().split("T")[0];
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    const weekLaterStr = weekLater.toISOString().split("T")[0];

    const installments = await db.select()
      .from(installmentsTable)
      .where(and(
        eq(installmentsTable.tenantId, tenantId),
        eq(installmentsTable.status, "Pending"),
        lte(installmentsTable.dueDate, weekLaterStr),
      ))
      .orderBy(installmentsTable.dueDate)
      .limit(100);

    const tasks: any[] = [];
    for (const inst of installments) {
      const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, inst.loanId)).limit(1);
      if (!loan) continue;
      const [lr] = await db.select().from(loanRequestsTable).where(eq(loanRequestsTable.id, loan.requestId)).limit(1);
      if (!lr) continue;
      if (lr.assignedOfficerId !== userId && req.user!.role === "LoanOfficer") continue;

      const [client] = await db.select({ fullNameAr: clientsTable.fullNameAr, phone: clientsTable.phone, address: clientsTable.address, nationalId: clientsTable.nationalId })
        .from(clientsTable).where(eq(clientsTable.id, lr.clientId)).limit(1);

      const daysOverdue = Math.max(0, Math.floor((new Date().getTime() - new Date(inst.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
      const isOverdue = new Date(inst.dueDate) < new Date(today);
      const calculatedPenalty = await calculatePenalty(inst);

      tasks.push({
        installment: { ...formatInstallment(inst, daysOverdue), calculatedPenalty },
        loanId: inst.loanId,
        clientId: lr.clientId,
        clientName: client?.fullNameAr || "",
        phone: client?.phone || "",
        address: client?.address || "",
        nationalId: client?.nationalId || "",
        isOverdue,
        priority: isOverdue ? "High" : "Normal",
      });
    }

    tasks.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return new Date(a.installment.dueDate).getTime() - new Date(b.installment.dueDate).getTime();
    });

    res.json({ data: tasks, total: tasks.length });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

function formatInstallment(inst: typeof installmentsTable.$inferSelect, daysOverdue: number) {
  return {
    id: inst.id,
    loanId: inst.loanId,
    installmentNumber: inst.installmentNumber,
    dueDate: inst.dueDate,
    principalAmount: Number(inst.principalAmount),
    interestAmount: Number(inst.interestAmount),
    totalAmount: Number(inst.totalAmount),
    paidAmount: Number(inst.paidAmount),
    penaltyAmount: Number(inst.penaltyAmount),
    status: inst.status,
    paidDate: inst.paidDate,
    daysOverdue: Math.max(0, daysOverdue),
  };
}

export default router;
export { formatInstallment };

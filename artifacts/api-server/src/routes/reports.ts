import { Router } from "express";
import { db, loansTable, paymentsTable, clientsTable, installmentsTable, loanRequestsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import * as XLSX from "xlsx";

const router = Router();

router.get("/portfolio", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [
      loans,
      [{ totalDisbursed }],
      [{ totalOutstanding }],
      [{ totalCollected }],
    ] = await Promise.all([
      db.select().from(loansTable).where(eq(loansTable.tenantId, tenantId)),
      db.select({ totalDisbursed: sql<number>`coalesce(sum(disbursed_amount), 0)` }).from(loansTable).where(eq(loansTable.tenantId, tenantId)),
      db.select({ totalOutstanding: sql<number>`coalesce(sum(outstanding_balance), 0)` }).from(loansTable).where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active"))),
      db.select({ totalCollected: sql<number>`coalesce(sum(total_paid), 0)` }).from(loansTable).where(eq(loansTable.tenantId, tenantId)),
    ]);

    const td = Number(totalDisbursed);
    const to = Number(totalOutstanding);
    const parRatio = td > 0 ? Math.round((to / td) * 1000) / 10 : 0;

    res.json({
      totalLoans: loans.length,
      totalDisbursed: td,
      totalOutstanding: to,
      totalCollected: Number(totalCollected),
      parRatio,
      byProduct: [],
      byBranch: [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/collection", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const payments = await db.select().from(paymentsTable)
      .where(eq(paymentsTable.tenantId, tenantId))
      .orderBy(desc(paymentsTable.createdAt));

    const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const methodMap = new Map<string, { amount: number; count: number }>();
    for (const p of payments) {
      const current = methodMap.get(p.paymentMethod) || { amount: 0, count: 0 };
      current.amount += Number(p.amount);
      current.count += 1;
      methodMap.set(p.paymentMethod, current);
    }

    const [{ totalExpected }] = await db.select({ totalExpected: sql<number>`coalesce(sum(total_amount), 0)` })
      .from(installmentsTable).where(eq(installmentsTable.tenantId, tenantId));

    res.json({
      totalCollected,
      totalExpected: Number(totalExpected),
      collectionRate: Number(totalExpected) > 0 ? Math.round((totalCollected / Number(totalExpected)) * 1000) / 10 : 0,
      byMethod: Array.from(methodMap.entries()).map(([method, data]) => ({ method, amount: data.amount, count: data.count })),
      byDay: [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/fra-monthly", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const month = req.query.month as string || new Date().toISOString().substring(0, 7);

    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr);
    const mon = parseInt(monthStr);
    const monthStart = new Date(year, mon - 1, 1);
    const monthEnd = new Date(year, mon, 0, 23, 59, 59, 999);
    const monthEndDate = monthEnd.toISOString().split("T")[0];

    const [
      [{ activeLoans }],
      [{ totalDisbursed }],
      [{ totalOutstanding }],
      [{ totalClients }],
      [{ totalCollected }],
      [{ writeOffs }],
      [{ writeOffAmount }],
      [{ newLoans }],
      [{ newClients }],
      [{ disbursedInMonth }],
      [{ collectedInMonth }],
    ] = await Promise.all([
      db.select({ activeLoans: sql<number>`count(*)` }).from(loansTable)
        .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active"), lte(loansTable.createdAt, monthEnd))),
      db.select({ totalDisbursed: sql<number>`coalesce(sum(disbursed_amount), 0)` }).from(loansTable)
        .where(and(eq(loansTable.tenantId, tenantId), lte(loansTable.createdAt, monthEnd))),
      db.select({ totalOutstanding: sql<number>`coalesce(sum(outstanding_balance), 0)` }).from(loansTable)
        .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active"), lte(loansTable.createdAt, monthEnd))),
      db.select({ totalClients: sql<number>`count(*)` }).from(clientsTable)
        .where(and(eq(clientsTable.tenantId, tenantId), lte(clientsTable.createdAt, monthEnd))),
      db.select({ totalCollected: sql<number>`coalesce(sum(total_paid), 0)` }).from(loansTable)
        .where(and(eq(loansTable.tenantId, tenantId), lte(loansTable.createdAt, monthEnd))),
      db.select({ writeOffs: sql<number>`count(*)` }).from(loansTable)
        .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "WrittenOff"), lte(loansTable.updatedAt, monthEnd))),
      db.select({ writeOffAmount: sql<number>`coalesce(sum(outstanding_balance), 0)` }).from(loansTable)
        .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "WrittenOff"), lte(loansTable.updatedAt, monthEnd))),
      db.select({ newLoans: sql<number>`count(*)` }).from(loansTable)
        .where(and(eq(loansTable.tenantId, tenantId), gte(loansTable.createdAt, monthStart), lte(loansTable.createdAt, monthEnd))),
      db.select({ newClients: sql<number>`count(*)` }).from(clientsTable)
        .where(and(eq(clientsTable.tenantId, tenantId), gte(clientsTable.createdAt, monthStart), lte(clientsTable.createdAt, monthEnd))),
      db.select({ disbursedInMonth: sql<number>`coalesce(sum(disbursed_amount), 0)` }).from(loansTable)
        .where(and(eq(loansTable.tenantId, tenantId), gte(loansTable.createdAt, monthStart), lte(loansTable.createdAt, monthEnd))),
      db.select({ collectedInMonth: sql<number>`coalesce(sum(amount), 0)` }).from(paymentsTable)
        .where(and(eq(paymentsTable.tenantId, tenantId), eq(paymentsTable.status, "Completed"), gte(paymentsTable.createdAt, monthStart), lte(paymentsTable.createdAt, monthEnd))),
    ]);

    const [{ totalOverdue }] = await db.select({ totalOverdue: sql<number>`coalesce(sum(total_amount - paid_amount::numeric), 0)` })
      .from(installmentsTable)
      .where(and(eq(installmentsTable.tenantId, tenantId), eq(installmentsTable.status, "Pending"), lte(installmentsTable.dueDate, monthEndDate)));

    const bucketCaseExpr = sql`
      CASE
        WHEN (${monthEndDate}::date - due_date::date) BETWEEN 1 AND 30 THEN '1-30'
        WHEN (${monthEndDate}::date - due_date::date) BETWEEN 31 AND 60 THEN '31-60'
        WHEN (${monthEndDate}::date - due_date::date) BETWEEN 61 AND 90 THEN '61-90'
        WHEN (${monthEndDate}::date - due_date::date) > 90 THEN '90+'
        ELSE 'current'
      END`;

    const delinquencyBuckets = await db.select({
      bucket: bucketCaseExpr.as("bucket"),
      count: sql<number>`count(*)`,
      amount: sql<number>`coalesce(sum(total_amount - paid_amount::numeric), 0)`,
    }).from(installmentsTable)
      .where(and(eq(installmentsTable.tenantId, tenantId), eq(installmentsTable.status, "Pending"), lte(installmentsTable.dueDate, monthEndDate)))
      .groupBy(bucketCaseExpr);

    const writeOffsByType = await db.select({
      writeOffType: sql<string>`coalesce(write_off_type, 'unspecified')`,
      count: sql<number>`count(*)`,
      amount: sql<number>`coalesce(sum(outstanding_balance), 0)`,
    }).from(loansTable)
      .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "WrittenOff"), lte(loansTable.updatedAt, monthEnd)))
      .groupBy(sql`coalesce(write_off_type, 'unspecified')`);

    const td = Number(totalDisbursed);
    const to = Number(totalOutstanding);

    const bucketMap: Record<string, { count: number; amount: number }> = {
      "current": { count: 0, amount: 0 },
      "1-30": { count: 0, amount: 0 },
      "31-60": { count: 0, amount: 0 },
      "61-90": { count: 0, amount: 0 },
      "90+": { count: 0, amount: 0 },
    };
    for (const b of delinquencyBuckets) {
      const key = typeof b.bucket === 'string' ? b.bucket : String(b.bucket);
      if (bucketMap[key]) {
        bucketMap[key] = { count: Number(b.count), amount: Number(b.amount) };
      }
    }

    res.json({
      month,
      totalActiveLoans: Number(activeLoans),
      totalNewLoans: Number(newLoans),
      totalDisbursed: td,
      totalCollected: Number(totalCollected),
      disbursedInMonth: Number(disbursedInMonth),
      collectedInMonth: Number(collectedInMonth),
      totalOutstanding: to,
      totalOverdue: Number(totalOverdue),
      parRatio: td > 0 ? Math.round((to / td) * 1000) / 10 : 0,
      totalClients: Number(totalClients),
      newClients: Number(newClients),
      writeOffs: Number(writeOffs),
      writeOffAmount: Number(writeOffAmount),
      delinquencyBuckets: bucketMap,
      writeOffsByType: writeOffsByType.map(w => ({
        type: w.writeOffType,
        count: Number(w.count),
        amount: Number(w.amount),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/export/portfolio", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const format = (req.query.format as string || "xlsx").toLowerCase();
    const lang = (req.query.lang as string || "en").toLowerCase();
    const isAr = lang === "ar";

    const loans = await db.select().from(loansTable).where(eq(loansTable.tenantId, tenantId));
    const rows = loans.map(l => {
      const row: Record<string, any> = {};
      row[isAr ? "رقم القرض" : "Loan ID"] = l.id.slice(0, 8);
      row[isAr ? "الحالة" : "Status"] = l.status;
      row[isAr ? "المبلغ المنصرف" : "Disbursed Amount"] = Number(l.disbursedAmount);
      row[isAr ? "الرصيد القائم" : "Outstanding Balance"] = Number(l.outstandingBalance);
      row[isAr ? "إجمالي المدفوع" : "Total Paid"] = Number(l.totalPaid);
      row[isAr ? "العملة" : "Currency"] = l.currency;
      row[isAr ? "تاريخ الصرف" : "Disbursed At"] = l.disbursedAt ? new Date(l.disbursedAt).toLocaleDateString() : "";
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, isAr ? "المحفظة" : "Portfolio");

    const buf = XLSX.write(wb, { type: "buffer", bookType: format === "csv" ? "csv" : "xlsx" });
    const ext = format === "csv" ? "csv" : "xlsx";
    const mime = format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename=portfolio_report.${ext}`);
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/export/collection", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const format = (req.query.format as string || "xlsx").toLowerCase();
    const lang = (req.query.lang as string || "en").toLowerCase();
    const isAr = lang === "ar";

    const payments = await db.select().from(paymentsTable)
      .where(eq(paymentsTable.tenantId, tenantId))
      .orderBy(desc(paymentsTable.createdAt));

    const rows = payments.map(p => {
      const row: Record<string, any> = {};
      row[isAr ? "رقم الدفعة" : "Payment ID"] = p.id.slice(0, 8);
      row[isAr ? "رقم القرض" : "Loan ID"] = p.loanId.slice(0, 8);
      row[isAr ? "المبلغ (ج.م)" : "Amount (EGP)"] = Number(p.amount);
      row[isAr ? "طريقة الدفع" : "Method"] = p.paymentMethod;
      row[isAr ? "المرجع" : "Reference"] = p.referenceNumber || "";
      row[isAr ? "الحالة" : "Status"] = p.status;
      row[isAr ? "التاريخ" : "Date"] = new Date(p.createdAt).toLocaleDateString();
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, isAr ? "التحصيل" : "Collections");

    const buf = XLSX.write(wb, { type: "buffer", bookType: format === "csv" ? "csv" : "xlsx" });
    const ext = format === "csv" ? "csv" : "xlsx";
    const mime = format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename=collection_report.${ext}`);
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/export/installments", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const lang = (req.query.lang as string || "en").toLowerCase();
    const isAr = lang === "ar";

    const installs = await db.select().from(installmentsTable)
      .where(eq(installmentsTable.tenantId, tenantId))
      .orderBy(installmentsTable.dueDate);

    const rows = installs.map(i => {
      const row: Record<string, any> = {};
      row[isAr ? "رقم القرض" : "Loan ID"] = i.loanId.slice(0, 8);
      row[isAr ? "رقم القسط" : "Installment #"] = i.installmentNumber;
      row[isAr ? "تاريخ الاستحقاق" : "Due Date"] = i.dueDate;
      row[isAr ? "أصل الدين" : "Principal"] = Number(i.principalAmount);
      row[isAr ? "الفائدة" : "Interest"] = Number(i.interestAmount);
      row[isAr ? "المبلغ الإجمالي" : "Total Amount"] = Number(i.totalAmount);
      row[isAr ? "المبلغ المدفوع" : "Paid Amount"] = Number(i.paidAmount);
      row[isAr ? "الغرامة" : "Penalty"] = Number(i.penaltyAmount);
      row[isAr ? "الحالة" : "Status"] = i.status;
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, isAr ? "الأقساط" : "Installments");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=installments_report.xlsx");
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

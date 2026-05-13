import { Router } from "express";
import { db, bulkOperationsTable, loanRequestsTable, clientsTable, fundProductsTable, paymentsTable, loansTable, installmentsTable, glAccountsTable, journalEntriesTable, journalItemsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { parseCSV } from "../lib/fileHandler";
import * as XLSX from "xlsx";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);

    const [ops, [{ count }]] = await Promise.all([
      db.select().from(bulkOperationsTable).where(eq(bulkOperationsTable.tenantId, tenantId)).orderBy(desc(bulkOperationsTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(bulkOperationsTable).where(eq(bulkOperationsTable.tenantId, tenantId)),
    ]);

    res.json({ data: ops, total: Number(count), page, limit });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/loan-requests", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { requests } = req.body;
    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      res.status(400).json({ error: "bad_request", message: "requests array required" });
      return;
    }

    const [bulkOp] = await db.insert(bulkOperationsTable).values({
      tenantId, operationType: "BulkLoanRequest", status: "Processing",
      totalRecords: requests.length, createdById: req.user!.id, createdByName: req.user!.fullName,
    }).returning();

    let successCount = 0;
    let failedCount = 0;
    const errors: unknown[] = [];

    for (let i = 0; i < requests.length; i++) {
      try {
        const r = requests[i];
        if (!r.clientId || !r.productId || !r.requestedAmount) {
          errors.push({ row: i + 1, error: "Missing required fields" });
          failedCount++;
          continue;
        }

        const [product] = await db.select().from(fundProductsTable).where(eq(fundProductsTable.id, r.productId)).limit(1);
        const interestRate = product ? (product.isZeroInterest ? 0 : Number(product.interestRate)) : null;
        const adminFee = product ? Math.round(Number(r.requestedAmount) * Number(product.adminFeePct) / 100 * 100) / 100 : null;

        await db.insert(loanRequestsTable).values({
          tenantId, clientId: r.clientId, productId: r.productId,
          requestedAmount: r.requestedAmount.toString(),
          termMonths: r.termMonths || (product ? product.maxTermMonths : null),
          interestRate: interestRate?.toString() || null,
          adminFee: adminFee?.toString() || null,
          workflowStatus: "Draft",
          assignedOfficerId: req.user!.id,
          notes: r.notes || null,
        });
        successCount++;
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message });
        failedCount++;
      }
    }

    await db.update(bulkOperationsTable).set({
      status: "Completed",
      processedRecords: requests.length,
      successRecords: successCount,
      failedRecords: failedCount,
      errorLog: errors.length > 0 ? errors : null,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(bulkOperationsTable.id, bulkOp.id));

    res.status(201).json({ bulkOperationId: bulkOp.id, totalRecords: requests.length, success: successCount, failed: failedCount, errors });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/payments", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { payments } = req.body;
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      res.status(400).json({ error: "bad_request", message: "payments array required" });
      return;
    }

    const [bulkOp] = await db.insert(bulkOperationsTable).values({
      tenantId, operationType: "BulkPayment", status: "Processing",
      totalRecords: payments.length, createdById: req.user!.id, createdByName: req.user!.fullName,
    }).returning();

    let successCount = 0;
    let failedCount = 0;
    const errors: unknown[] = [];

    for (let i = 0; i < payments.length; i++) {
      try {
        const p = payments[i];
        if (!p.loanId || !p.amount || !p.paymentMethod) {
          errors.push({ row: i + 1, error: "Missing required fields" });
          failedCount++;
          continue;
        }

        const [loan] = await db.select().from(loansTable)
          .where(and(eq(loansTable.id, p.loanId), eq(loansTable.tenantId, tenantId))).limit(1);
        if (!loan) {
          errors.push({ row: i + 1, error: "Loan not found" });
          failedCount++;
          continue;
        }

        await db.insert(paymentsTable).values({
          tenantId, loanId: p.loanId,
          amount: p.amount.toString(),
          paymentMethod: p.paymentMethod,
          referenceNumber: p.referenceNumber || null,
          collectedById: req.user!.id,
          status: "Completed",
          notes: p.notes || null,
        });

        let remainingPayment = Number(p.amount);
        const pendingInstallments = await db.select().from(installmentsTable)
          .where(and(eq(installmentsTable.loanId, p.loanId), eq(installmentsTable.tenantId, tenantId), eq(installmentsTable.status, "Pending")))
          .orderBy(installmentsTable.installmentNumber);

        for (const inst of pendingInstallments) {
          if (remainingPayment <= 0) break;
          const due = Number(inst.totalAmount) + Number(inst.penaltyAmount) - Number(inst.paidAmount);
          const payForThis = Math.min(remainingPayment, due);
          const newPaid = Number(inst.paidAmount) + payForThis;
          const instStatus = newPaid >= (Number(inst.totalAmount) + Number(inst.penaltyAmount)) ? "Paid" : "PartiallyPaid";
          await db.update(installmentsTable).set({
            paidAmount: newPaid.toString(), status: instStatus,
            paidDate: instStatus === "Paid" ? new Date().toISOString().split("T")[0] : null,
            updatedAt: new Date(),
          }).where(eq(installmentsTable.id, inst.id));
          remainingPayment -= payForThis;
        }

        const newTotalPaid = Number(loan.totalPaid) + Number(p.amount);
        const newOutstanding = Math.max(0, Number(loan.outstandingBalance) - Number(p.amount));
        await db.update(loansTable).set({
          totalPaid: newTotalPaid.toString(),
          outstandingBalance: newOutstanding.toString(),
          status: newOutstanding <= 0 ? "Closed" : "Active",
          updatedAt: new Date(),
        }).where(eq(loansTable.id, loan.id));

        successCount++;
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message });
        failedCount++;
      }
    }

    await db.update(bulkOperationsTable).set({
      status: "Completed", processedRecords: payments.length,
      successRecords: successCount, failedRecords: failedCount,
      errorLog: errors.length > 0 ? errors : null,
      completedAt: new Date(), updatedAt: new Date(),
    }).where(eq(bulkOperationsTable.id, bulkOp.id));

    res.status(201).json({ bulkOperationId: bulkOp.id, totalRecords: payments.length, success: successCount, failed: failedCount, errors });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/clients", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { clients } = req.body;
    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      res.status(400).json({ error: "bad_request", message: "clients array required" });
      return;
    }

    const [bulkOp] = await db.insert(bulkOperationsTable).values({
      tenantId, operationType: "BulkClientUpload", status: "Processing",
      totalRecords: clients.length, createdById: req.user!.id, createdByName: req.user!.fullName,
    }).returning();

    let successCount = 0;
    let failedCount = 0;
    const errors: unknown[] = [];

    for (let i = 0; i < clients.length; i++) {
      try {
        const c = clients[i];
        if (!c.nationalId || !c.fullNameAr) {
          errors.push({ row: i + 1, error: "Missing nationalId or fullNameAr" });
          failedCount++;
          continue;
        }

        await db.insert(clientsTable).values({
          tenantId, nationalId: c.nationalId, fullNameAr: c.fullNameAr,
          fullNameEn: c.fullNameEn || null, phone: c.phone || null,
          address: c.address || null,
        });
        successCount++;
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message });
        failedCount++;
      }
    }

    await db.update(bulkOperationsTable).set({
      status: "Completed", processedRecords: clients.length,
      successRecords: successCount, failedRecords: failedCount,
      errorLog: errors.length > 0 ? errors : null,
      completedAt: new Date(), updatedAt: new Date(),
    }).where(eq(bulkOperationsTable.id, bulkOp.id));

    res.status(201).json({ bulkOperationId: bulkOp.id, totalRecords: clients.length, success: successCount, failed: failedCount, errors });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/upload-csv", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { csvContent, operationType } = req.body;
    if (!csvContent || !operationType) {
      res.status(400).json({ error: "bad_request", message: "csvContent, operationType required" });
      return;
    }

    const rows = parseCSV(csvContent);
    if (rows.length === 0) {
      res.status(400).json({ error: "bad_request", message: "No data found in CSV" });
      return;
    }

    res.json({ parsedRows: rows.length, sampleRow: rows[0], headers: Object.keys(rows[0]) });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/upload-excel", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { base64Content, operationType } = req.body;
    if (!base64Content || !operationType) {
      res.status(400).json({ error: "bad_request", message: "base64Content, operationType required" });
      return;
    }

    const buffer = Buffer.from(base64Content, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      res.status(400).json({ error: "bad_request", message: "No sheets found in Excel file" });
      return;
    }

    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    if (rows.length === 0) {
      res.status(400).json({ error: "bad_request", message: "No data found in Excel file" });
      return;
    }

    res.json({ parsedRows: rows.length, sampleRow: rows[0], headers: Object.keys(rows[0]), sheetName });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/gl-opening-balances", requireAuth, requireRole("TenantAdmin", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { balances, dryRun } = req.body;
    if (!balances || !Array.isArray(balances) || balances.length === 0) {
      res.status(400).json({ error: "bad_request", message: "balances array required" });
      return;
    }

    const validationErrors: any[] = [];
    const validatedRows: { accountId: string; accountCode: string; debit: number; credit: number }[] = [];

    for (let i = 0; i < balances.length; i++) {
      const b = balances[i];
      if (!b.accountCode) {
        validationErrors.push({ row: i + 1, error: "Missing accountCode" });
        continue;
      }

      const [account] = await db.select({ id: glAccountsTable.id, accountCode: glAccountsTable.accountCode })
        .from(glAccountsTable)
        .where(and(eq(glAccountsTable.tenantId, tenantId), eq(glAccountsTable.accountCode, String(b.accountCode))))
        .limit(1);

      if (!account) {
        validationErrors.push({ row: i + 1, error: `Account code '${b.accountCode}' not found` });
        continue;
      }

      const debit = Number(b.debit || 0);
      const credit = Number(b.credit || 0);
      if (debit === 0 && credit === 0) {
        validationErrors.push({ row: i + 1, error: "Both debit and credit are zero" });
        continue;
      }

      validatedRows.push({ accountId: account.id, accountCode: account.accountCode, debit, credit });
    }

    const totalDebit = validatedRows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = validatedRows.reduce((s, r) => s + r.credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    if (dryRun) {
      res.json({
        dryRun: true,
        validRows: validatedRows.length,
        errors: validationErrors,
        totalDebit,
        totalCredit,
        isBalanced,
      });
      return;
    }

    if (!isBalanced) {
      res.status(400).json({ error: "unbalanced", message: `Total debit (${totalDebit.toFixed(2)}) does not equal total credit (${totalCredit.toFixed(2)})`, totalDebit, totalCredit });
      return;
    }

    const [bulkOp] = await db.insert(bulkOperationsTable).values({
      tenantId, operationType: "GLOpeningBalance", status: "Processing",
      totalRecords: balances.length, createdById: req.user!.id, createdByName: req.user!.fullName,
    }).returning();

    const today = new Date().toISOString().split("T")[0];
    const [entry] = await db.insert(journalEntriesTable).values({
      tenantId,
      referenceType: "OpeningBalance",
      referenceId: bulkOp.id,
      transactionDate: today,
      description: "GL Opening Balances Import",
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
    }).returning();

    for (const row of validatedRows) {
      await db.insert(journalItemsTable).values({
        tenantId,
        entryId: entry.id,
        accountId: row.accountId,
        debit: row.debit.toFixed(2),
        credit: row.credit.toFixed(2),
      });
    }

    await db.update(bulkOperationsTable).set({
      status: "Completed",
      processedRecords: balances.length,
      successRecords: validatedRows.length,
      failedRecords: validationErrors.length,
      errorLog: validationErrors.length > 0 ? validationErrors : null,
      completedAt: new Date(), updatedAt: new Date(),
    }).where(eq(bulkOperationsTable.id, bulkOp.id));

    res.status(201).json({
      bulkOperationId: bulkOp.id,
      journalEntryId: entry.id,
      totalRecords: balances.length,
      success: validatedRows.length,
      failed: validationErrors.length,
      errors: validationErrors,
      totalDebit, totalCredit,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/loan-portfolio-import", requireAuth, requireRole("TenantAdmin", "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { loans: loanData, dryRun } = req.body;
    if (!loanData || !Array.isArray(loanData) || loanData.length === 0) {
      res.status(400).json({ error: "bad_request", message: "loans array required" });
      return;
    }

    const validationErrors: any[] = [];
    const validatedRows: any[] = [];

    for (let i = 0; i < loanData.length; i++) {
      const l = loanData[i];
      const rowErrors: string[] = [];

      if (!l.clientNationalId) rowErrors.push("Missing clientNationalId");
      if (!l.productId) rowErrors.push("Missing productId");
      if (!l.disbursedAmount || Number(l.disbursedAmount) <= 0) rowErrors.push("Invalid disbursedAmount");
      if (!l.outstandingBalance && l.outstandingBalance !== 0) rowErrors.push("Missing outstandingBalance");

      if (rowErrors.length > 0) {
        validationErrors.push({ row: i + 1, error: rowErrors.join("; ") });
        continue;
      }

      const [client] = await db.select({ id: clientsTable.id }).from(clientsTable)
        .where(and(eq(clientsTable.tenantId, tenantId), eq(clientsTable.nationalId, String(l.clientNationalId))))
        .limit(1);

      if (!client) {
        validationErrors.push({ row: i + 1, error: `Client with national ID '${l.clientNationalId}' not found` });
        continue;
      }

      validatedRows.push({
        clientId: client.id,
        productId: l.productId,
        disbursedAmount: l.disbursedAmount,
        outstandingBalance: l.outstandingBalance,
        totalPaid: l.totalPaid || "0",
        termMonths: l.termMonths || 12,
        interestRate: l.interestRate || "0",
        disbursedAt: l.disbursedAt || new Date().toISOString().split("T")[0],
        status: l.status || "Active",
      });
    }

    if (dryRun) {
      res.json({
        dryRun: true,
        validRows: validatedRows.length,
        errors: validationErrors,
        totalPortfolio: validatedRows.reduce((s, r) => s + Number(r.outstandingBalance), 0),
      });
      return;
    }

    const [bulkOp] = await db.insert(bulkOperationsTable).values({
      tenantId, operationType: "LoanPortfolioImport", status: "Processing",
      totalRecords: loanData.length, createdById: req.user!.id, createdByName: req.user!.fullName,
    }).returning();

    let successCount = 0;
    for (const row of validatedRows) {
      try {
        await db.insert(loansTable).values({
          tenantId,
          clientId: row.clientId,
          loanRequestId: null,
          disbursedAmount: row.disbursedAmount.toString(),
          outstandingBalance: row.outstandingBalance.toString(),
          totalPaid: row.totalPaid.toString(),
          status: row.status,
          disbursedAt: new Date(row.disbursedAt),
        });
        successCount++;
      } catch (err: any) {
        validationErrors.push({ row: 'insert', error: err.message });
      }
    }

    await db.update(bulkOperationsTable).set({
      status: "Completed",
      processedRecords: loanData.length,
      successRecords: successCount,
      failedRecords: validationErrors.length,
      errorLog: validationErrors.length > 0 ? validationErrors : null,
      completedAt: new Date(), updatedAt: new Date(),
    }).where(eq(bulkOperationsTable.id, bulkOp.id));

    res.status(201).json({
      bulkOperationId: bulkOp.id,
      totalRecords: loanData.length,
      success: successCount,
      failed: validationErrors.length,
      errors: validationErrors,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/templates/:type", requireAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const templates: Record<string, { headers: string[]; sampleRows: string[][] }> = {
      clients: {
        headers: ["nationalId", "fullNameAr", "fullNameEn", "phone", "address"],
        sampleRows: [["29001011234567", "أحمد محمد علي", "Ahmed Mohamed Ali", "01012345678", "القاهرة"]],
      },
      "loan-requests": {
        headers: ["clientId", "productId", "requestedAmount", "termMonths", "notes"],
        sampleRows: [["uuid-here", "product-uuid", "15000", "12", "Business loan"]],
      },
      payments: {
        headers: ["loanId", "amount", "paymentMethod", "referenceNumber", "notes"],
        sampleRows: [["loan-uuid", "1500", "Cash", "", "Monthly installment"]],
      },
      "gl-opening-balances": {
        headers: ["accountCode", "accountName", "accountType", "debit", "credit"],
        sampleRows: [["1101", "Cash on Hand", "Asset", "50000", "0"], ["3101", "Retained Earnings", "Equity", "0", "50000"]],
      },
      "loan-portfolio": {
        headers: ["clientNationalId", "productId", "disbursedAmount", "outstandingBalance", "totalPaid", "termMonths", "interestRate", "disbursedAt", "status"],
        sampleRows: [["29001011234567", "product-uuid", "25000", "18000", "7000", "12", "18", "2025-01-15", "Active"]],
      },
    };

    const tmpl = templates[type];
    if (!tmpl) {
      res.status(404).json({ error: "Template not found", availableTypes: Object.keys(templates) });
      return;
    }

    const format = req.query.format || "csv";

    if (format === "xlsx") {
      const ws = XLSX.utils.aoa_to_sheet([tmpl.headers, ...tmpl.sampleRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=template_${type}.xlsx`);
      res.send(buf);
    } else {
      const bom = "\uFEFF";
      const csv = [tmpl.headers.join(","), ...tmpl.sampleRows.map(r => r.map(c => /[,"\n]/.test(c) || /[\u0600-\u06FF]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=template_${type}.csv`);
      res.send(bom + csv);
    }
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

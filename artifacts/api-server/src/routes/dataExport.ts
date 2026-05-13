import { Router } from "express";
import { db, clientsTable, loansTable, loanRequestsTable, installmentsTable, paymentsTable, expensesTable, guaranteesTable, collectionActivitiesTable, savingsAccountsTable, savingsTransactionsTable, collateralsTable, journalEntriesTable, journalItemsTable, auditLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.get("/entities", requireAuth, async (req, res) => {
  if (!["TenantAdmin", "SuperAdmin"].includes(req.user!.role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }
  res.json({
    entities: [
      { key: "clients", nameEn: "Clients", nameAr: "العملاء" },
      { key: "loans", nameEn: "Loans", nameAr: "القروض" },
      { key: "loan_requests", nameEn: "Loan Requests", nameAr: "طلبات التمويل" },
      { key: "installments", nameEn: "Installments", nameAr: "الأقساط" },
      { key: "payments", nameEn: "Payments", nameAr: "المدفوعات" },
      { key: "expenses", nameEn: "Expenses", nameAr: "المصروفات" },
      { key: "guarantees", nameEn: "Guarantees", nameAr: "الضمانات" },
      { key: "collection_activities", nameEn: "Collection Activities", nameAr: "أنشطة التحصيل" },
      { key: "savings_accounts", nameEn: "Savings Accounts", nameAr: "حسابات الادخار" },
      { key: "savings_transactions", nameEn: "Savings Transactions", nameAr: "معاملات الادخار" },
      { key: "collaterals", nameEn: "Collaterals", nameAr: "الضمانات العينية" },
      { key: "journal_entries", nameEn: "Journal Entries", nameAr: "القيود المحاسبية" },
      { key: "audit_logs", nameEn: "Audit Logs", nameAr: "سجل التدقيق" },
    ],
  });
});

router.get("/download/:entity", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    if (!["TenantAdmin", "SuperAdmin"].includes(req.user!.role)) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    const entity = req.params.entity;
    const tableMap: Record<string, any> = {
      clients: clientsTable,
      loans: loansTable,
      loan_requests: loanRequestsTable,
      installments: installmentsTable,
      payments: paymentsTable,
      expenses: expensesTable,
      guarantees: guaranteesTable,
      collection_activities: collectionActivitiesTable,
      savings_accounts: savingsAccountsTable,
      savings_transactions: savingsTransactionsTable,
      collaterals: collateralsTable,
      journal_entries: journalEntriesTable,
      audit_logs: auditLogsTable,
    };

    const table = tableMap[entity];
    if (!table) { res.status(400).json({ error: "bad_request", message: "Unknown entity" }); return; }

    const data = await db.select().from(table).where(eq(table.tenantId, tenantId));

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName, action: "EXPORT", entity: "DataExport", details: { entity, recordCount: data.length } });

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${entity}_export_${new Date().toISOString().split("T")[0]}.json"`);
    res.json({ entity, exportDate: new Date().toISOString(), recordCount: data.length, data });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/full-backup", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    if (!["TenantAdmin", "SuperAdmin"].includes(req.user!.role)) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    const [clients, loans, loanReqs, installments, payments, expenses, guarantees, collActivities, savAccounts, savTxns, collaterals, journalEntries, auditLogs] = await Promise.all([
      db.select().from(clientsTable).where(eq(clientsTable.tenantId, tenantId)),
      db.select().from(loansTable).where(eq(loansTable.tenantId, tenantId)),
      db.select().from(loanRequestsTable).where(eq(loanRequestsTable.tenantId, tenantId)),
      db.select().from(installmentsTable).where(eq(installmentsTable.tenantId, tenantId)),
      db.select().from(paymentsTable).where(eq(paymentsTable.tenantId, tenantId)),
      db.select().from(expensesTable).where(eq(expensesTable.tenantId, tenantId)),
      db.select().from(guaranteesTable).where(eq(guaranteesTable.tenantId, tenantId)),
      db.select().from(collectionActivitiesTable).where(eq(collectionActivitiesTable.tenantId, tenantId)),
      db.select().from(savingsAccountsTable).where(eq(savingsAccountsTable.tenantId, tenantId)),
      db.select().from(savingsTransactionsTable).where(eq(savingsTransactionsTable.tenantId, tenantId)),
      db.select().from(collateralsTable).where(eq(collateralsTable.tenantId, tenantId)),
      db.select().from(journalEntriesTable).where(eq(journalEntriesTable.tenantId, tenantId)),
      db.select().from(auditLogsTable).where(eq(auditLogsTable.tenantId, tenantId)),
    ]);

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName, action: "FULL_BACKUP", entity: "DataExport" });

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="full_backup_${new Date().toISOString().split("T")[0]}.json"`);
    res.json({
      exportDate: new Date().toISOString(),
      tenantId,
      data: { clients, loans, loanRequests: loanReqs, installments, payments, expenses, guarantees, collectionActivities: collActivities, savingsAccounts: savAccounts, savingsTransactions: savTxns, collaterals, journalEntries, auditLogs },
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

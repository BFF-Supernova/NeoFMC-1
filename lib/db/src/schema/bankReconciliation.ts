import { pgTable, uuid, varchar, decimal, text, timestamp, date } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";

export const bankReconciliationTable = pgTable("bank_reconciliation", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  reconciliationDate: date("reconciliation_date").notNull(),
  bankAccountName: varchar("bank_account_name", { length: 255 }).notNull(),
  statementBalance: decimal("statement_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  systemBalance: decimal("system_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  matchedCount: varchar("matched_count", { length: 20 }).notNull().default("0"),
  unmatchedCount: varchar("unmatched_count", { length: 20 }).notNull().default("0"),
  discrepancy: decimal("discrepancy", { precision: 15, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 20 }).notNull().default("Draft"),
  notes: text("notes"),
  reconciledById: uuid("reconciled_by_id"),
  reconciledByName: varchar("reconciled_by_name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bankReconciliationItemsTable = pgTable("bank_reconciliation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  reconciliationId: uuid("reconciliation_id").notNull().references(() => bankReconciliationTable.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  transactionDate: date("transaction_date").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("Debit"),
  source: varchar("source", { length: 20 }).notNull().default("Bank"),
  matchStatus: varchar("match_status", { length: 20 }).notNull().default("Unmatched"),
  matchedPaymentId: uuid("matched_payment_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

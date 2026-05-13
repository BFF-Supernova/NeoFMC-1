import { pgTable, uuid, varchar, decimal, boolean, date, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";
import { glAccountsTable } from "./glAccounts.ts";

export const journalEntriesTable = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  referenceType: varchar("reference_type", { length: 50 }).notNull(),
  referenceId: uuid("reference_id"),
  transactionDate: date("transaction_date").notNull().defaultNow(),
  description: text("description").notNull(),
  totalDebit: decimal("total_debit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalCredit: decimal("total_credit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  isReconciled: boolean("is_reconciled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const journalItemsTable = pgTable("journal_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  entryId: uuid("entry_id").notNull().references(() => journalEntriesTable.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => glAccountsTable.id),
  debit: decimal("debit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  credit: decimal("credit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntriesTable.$inferSelect;
export type JournalItem = typeof journalItemsTable.$inferSelect;

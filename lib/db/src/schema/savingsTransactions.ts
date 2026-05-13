import { pgTable, uuid, varchar, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { savingsAccountsTable } from "./savingsAccounts.ts";

export const savingsTransactionsTable = pgTable("savings_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  accountId: uuid("account_id").notNull().references(() => savingsAccountsTable.id),
  transactionType: varchar("transaction_type", { length: 30 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 30 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  description: text("description"),
  performedById: uuid("performed_by_id"),
  performedByName: varchar("performed_by_name", { length: 255 }),
  journalEntryId: uuid("journal_entry_id"),
  reversedTransactionId: uuid("reversed_transaction_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSavingsTransactionSchema = createInsertSchema(savingsTransactionsTable).omit({ id: true, createdAt: true });
export type InsertSavingsTransaction = z.infer<typeof insertSavingsTransactionSchema>;
export type SavingsTransaction = typeof savingsTransactionsTable.$inferSelect;

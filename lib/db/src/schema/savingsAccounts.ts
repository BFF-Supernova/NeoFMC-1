import { pgTable, uuid, varchar, decimal, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { clientsTable } from "./clients.ts";
import { savingsProductsTable } from "./savingsProducts.ts";
import { branchesTable } from "./branches.ts";

export const savingsAccountsTable = pgTable("savings_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  clientId: uuid("client_id").notNull().references(() => clientsTable.id),
  productId: uuid("product_id").notNull().references(() => savingsProductsTable.id),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  loanId: uuid("loan_id"),
  accountType: varchar("account_type", { length: 30 }).default("Voluntary"),
  accountNumber: varchar("account_number", { length: 30 }).notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  accruedInterest: decimal("accrued_interest", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalDeposits: decimal("total_deposits", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalWithdrawals: decimal("total_withdrawals", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalInterestEarned: decimal("total_interest_earned", { precision: 15, scale: 2 }).notNull().default("0.00"),
  status: varchar("status", { length: 30 }).notNull().default("Active"),
  maturityDate: date("maturity_date"),
  lastInterestAccrualDate: date("last_interest_accrual_date"),
  lastTransactionDate: date("last_transaction_date"),
  dormantSince: date("dormant_since"),
  withdrawalsThisMonth: decimal("withdrawals_this_month", { precision: 3, scale: 0 }).notNull().default("0"),
  isBlocked: boolean("is_blocked").notNull().default(false),
  blockReason: varchar("block_reason", { length: 255 }),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSavingsAccountSchema = createInsertSchema(savingsAccountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSavingsAccount = z.infer<typeof insertSavingsAccountSchema>;
export type SavingsAccount = typeof savingsAccountsTable.$inferSelect;

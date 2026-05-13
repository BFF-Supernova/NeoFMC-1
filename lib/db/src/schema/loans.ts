import { pgTable, uuid, varchar, decimal, date, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { loanRequestsTable } from "./loanRequests.ts";

export const loansTable = pgTable("loans", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  loanNumber: varchar("loan_number", { length: 30 }),
  requestId: uuid("request_id").notNull().references(() => loanRequestsTable.id),
  disbursedAmount: decimal("disbursed_amount", { precision: 15, scale: 2 }).notNull(),
  outstandingBalance: decimal("outstanding_balance", { precision: 15, scale: 2 }).notNull(),
  totalPaid: decimal("total_paid", { precision: 15, scale: 2 }).notNull().default("0.00"),
  status: varchar("status", { length: 50 }).notNull().default("Active"),
  writeOffReason: varchar("write_off_reason", { length: 100 }),
  writeOffType: varchar("write_off_type", { length: 50 }),
  assignedOfficerId: uuid("assigned_officer_id"),
  assignedBranchId: uuid("assigned_branch_id"),
  nextInstallmentDate: date("next_installment_date"),
  disbursedAt: timestamp("disbursed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLoanSchema = createInsertSchema(loansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loansTable.$inferSelect;

import { pgTable, uuid, varchar, decimal, date, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { loansTable } from "./loans.ts";

export const installmentsTable = pgTable("installments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  loanId: uuid("loan_id").notNull().references(() => loansTable.id),
  installmentNumber: integer("installment_number").notNull(),
  dueDate: date("due_date").notNull(),
  principalAmount: decimal("principal_amount", { precision: 15, scale: 2 }).notNull(),
  interestAmount: decimal("interest_amount", { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  penaltyAmount: decimal("penalty_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  paidDate: date("paid_date"),
  daysOverdue: integer("days_overdue").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInstallmentSchema = createInsertSchema(installmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInstallment = z.infer<typeof insertInstallmentSchema>;
export type Installment = typeof installmentsTable.$inferSelect;

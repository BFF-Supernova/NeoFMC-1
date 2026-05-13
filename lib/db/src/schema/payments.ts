import { pgTable, uuid, varchar, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { loansTable } from "./loans.ts";
import { installmentsTable } from "./installments.ts";
import { usersTable } from "./users.ts";
import { branchesTable } from "./branches.ts";

export const paymentsTable = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  loanId: uuid("loan_id").notNull().references(() => loansTable.id),
  installmentId: uuid("installment_id").references(() => installmentsTable.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 30 }).notNull().default("Cash"),
  referenceNumber: varchar("reference_number", { length: 100 }),
  collectedById: uuid("collected_by_id").references(() => usersTable.id),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  notes: text("notes"),
  status: varchar("status", { length: 30 }).notNull().default("Completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;

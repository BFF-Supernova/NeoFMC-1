import { pgTable, uuid, varchar, decimal, text, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";
import { usersTable } from "./users.ts";

export const expensesTable = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").notNull().references(() => branchesTable.id),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  transactionDate: date("transaction_date").notNull().defaultNow(),
  referenceNumber: varchar("reference_number", { length: 100 }),
  documentUrls: text("document_urls").array(),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  createdById: uuid("created_by_id").notNull().references(() => usersTable.id),
  createdByName: varchar("created_by_name", { length: 255 }),
  verifiedById: uuid("verified_by_id").references(() => usersTable.id),
  verifiedByName: varchar("verified_by_name", { length: 255 }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  glSynced: boolean("gl_synced").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const revenuesTable = pgTable("revenues", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").notNull().references(() => branchesTable.id),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  transactionDate: date("transaction_date").notNull().defaultNow(),
  referenceNumber: varchar("reference_number", { length: 100 }),
  documentUrls: text("document_urls").array(),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  createdById: uuid("created_by_id").notNull().references(() => usersTable.id),
  createdByName: varchar("created_by_name", { length: 255 }),
  verifiedById: uuid("verified_by_id").references(() => usersTable.id),
  verifiedByName: varchar("verified_by_name", { length: 255 }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  glSynced: boolean("gl_synced").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expenseClaimsTable = pgTable("expense_claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  employeeId: uuid("employee_id").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  receiptUrl: text("receipt_url"),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  approvedById: uuid("approved_by_id").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;

export const insertRevenueSchema = createInsertSchema(revenuesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRevenue = z.infer<typeof insertRevenueSchema>;
export type Revenue = typeof revenuesTable.$inferSelect;

export const insertExpenseClaimSchema = createInsertSchema(expenseClaimsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExpenseClaim = z.infer<typeof insertExpenseClaimSchema>;
export type ExpenseClaim = typeof expenseClaimsTable.$inferSelect;

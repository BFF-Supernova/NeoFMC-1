import { pgTable, uuid, varchar, decimal, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";
import { usersTable } from "./users.ts";
import { glAccountsTable } from "./glAccounts.ts";

export const budgetsTable = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }),
  fiscalYear: integer("fiscal_year").notNull(),
  period: varchar("period", { length: 20 }).notNull().default("Annual"),
  status: varchar("status", { length: 30 }).notNull().default("Draft"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => usersTable.id),
  approvedById: uuid("approved_by_id").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const budgetLinesTable = pgTable("budget_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  budgetId: uuid("budget_id").notNull().references(() => budgetsTable.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => glAccountsTable.id),
  month1: decimal("month_1", { precision: 15, scale: 2 }).notNull().default("0.00"),
  month2: decimal("month_2", { precision: 15, scale: 2 }).notNull().default("0.00"),
  month3: decimal("month_3", { precision: 15, scale: 2 }).notNull().default("0.00"),
  month4: decimal("month_4", { precision: 15, scale: 2 }).notNull().default("0.00"),
  month5: decimal("month_5", { precision: 15, scale: 2 }).notNull().default("0.00"),
  month6: decimal("month_6", { precision: 15, scale: 2 }).notNull().default("0.00"),
  month7: decimal("month_7", { precision: 15, scale: 2 }).notNull().default("0.00"),
  month8: decimal("month_8", { precision: 15, scale: 2 }).notNull().default("0.00"),
  month9: decimal("month_9", { precision: 15, scale: 2 }).notNull().default("0.00"),
  month10: decimal("month_10", { precision: 15, scale: 2 }).notNull().default("0.00"),
  month11: decimal("month_11", { precision: 15, scale: 2 }).notNull().default("0.00"),
  month12: decimal("month_12", { precision: 15, scale: 2 }).notNull().default("0.00"),
  annualTotal: decimal("annual_total", { precision: 15, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBudgetSchema = createInsertSchema(budgetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgetsTable.$inferSelect;

export const insertBudgetLineSchema = createInsertSchema(budgetLinesTable).omit({ id: true, createdAt: true });
export type InsertBudgetLine = z.infer<typeof insertBudgetLineSchema>;
export type BudgetLine = typeof budgetLinesTable.$inferSelect;

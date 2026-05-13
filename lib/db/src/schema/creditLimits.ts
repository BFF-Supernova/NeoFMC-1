import { pgTable, uuid, varchar, decimal, text, boolean, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { clientsTable } from "./clients.ts";
import { fundProductsTable } from "./fundProducts.ts";

export const creditLimitsTable = pgTable("credit_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  clientId: uuid("client_id").notNull().references(() => clientsTable.id),
  productId: uuid("product_id").references(() => fundProductsTable.id),
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }).notNull(),
  availableBalance: decimal("available_balance", { precision: 15, scale: 2 }).notNull(),
  usedAmount: decimal("used_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  interestRate: decimal("interest_rate", { precision: 8, scale: 4 }),
  gracePeriodDays: integer("grace_period_days").notNull().default(0),
  expiryDate: date("expiry_date"),
  status: varchar("status", { length: 30 }).notNull().default("Active"),
  isRevolving: boolean("is_revolving").notNull().default(true),
  maxConcurrentLoans: integer("max_concurrent_loans").notNull().default(1),
  activeLoanCount: integer("active_loan_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creditDrawsTable = pgTable("credit_draws", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  creditLimitId: uuid("credit_limit_id").notNull().references(() => creditLimitsTable.id),
  clientId: uuid("client_id").notNull().references(() => clientsTable.id),
  drawAmount: decimal("draw_amount", { precision: 15, scale: 2 }).notNull(),
  outstandingAmount: decimal("outstanding_amount", { precision: 15, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 8, scale: 4 }),
  status: varchar("status", { length: 30 }).notNull().default("Active"),
  drawDate: date("draw_date").notNull().defaultNow(),
  dueDate: date("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCreditLimitSchema = createInsertSchema(creditLimitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCreditLimit = z.infer<typeof insertCreditLimitSchema>;
export type CreditLimit = typeof creditLimitsTable.$inferSelect;

export const insertCreditDrawSchema = createInsertSchema(creditDrawsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCreditDraw = z.infer<typeof insertCreditDrawSchema>;
export type CreditDraw = typeof creditDrawsTable.$inferSelect;

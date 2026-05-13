import { pgTable, uuid, varchar, decimal, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";

export const savingsProductsTable = pgTable("savings_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  nameAr: varchar("name_ar", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }),
  productType: varchar("product_type", { length: 50 }).notNull().default("Voluntary"),
  annualInterestRate: decimal("annual_interest_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
  compoundingFrequency: varchar("compounding_frequency", { length: 20 }).notNull().default("Monthly"),
  minimumBalance: decimal("minimum_balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  minimumOpeningAmount: decimal("minimum_opening_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  maximumBalance: decimal("maximum_balance", { precision: 15, scale: 2 }),
  withdrawalLimitPerMonth: integer("withdrawal_limit_per_month"),
  earlyWithdrawalPenaltyRate: decimal("early_withdrawal_penalty_rate", { precision: 5, scale: 2 }).default("0.00"),
  lockInPeriodDays: integer("lock_in_period_days").default(0),
  dormancyPeriodDays: integer("dormancy_period_days").default(365),
  mandatoryAmount: decimal("mandatory_amount", { precision: 15, scale: 2 }),
  mandatoryFrequency: varchar("mandatory_frequency", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  descriptionAr: text("description_ar"),
  glDepositAccountId: uuid("gl_deposit_account_id"),
  glInterestExpenseAccountId: uuid("gl_interest_expense_account_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSavingsProductSchema = createInsertSchema(savingsProductsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSavingsProduct = z.infer<typeof insertSavingsProductSchema>;
export type SavingsProduct = typeof savingsProductsTable.$inferSelect;

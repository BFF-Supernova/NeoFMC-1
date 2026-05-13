import { pgTable, uuid, varchar, decimal, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";

export const fundProductsTable = pgTable("fund_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  productName: varchar("product_name", { length: 255 }).notNull(),
  interestRateType: varchar("interest_rate_type", { length: 50 }).notNull().default("Fixed"),
  interestRate: decimal("interest_rate", { precision: 8, scale: 4 }).notNull().default("0.00"),
  adminFeePct: decimal("admin_fee_pct", { precision: 5, scale: 2 }).notNull().default("0.00"),
  insuranceFeePct: decimal("insurance_fee_pct", { precision: 5, scale: 2 }).notNull().default("0.00"),
  stampDutyPct: decimal("stamp_duty_pct", { precision: 5, scale: 2 }).notNull().default("0.00"),
  amortizationMethod: varchar("amortization_method", { length: 50 }).notNull().default("Monthly"),
  amortizationFrequency: varchar("amortization_frequency", { length: 20 }).notNull().default("monthly"),
  isZeroInterest: boolean("is_zero_interest").notNull().default(false),
  minAmount: decimal("min_amount", { precision: 15, scale: 2 }).notNull(),
  maxAmount: decimal("max_amount", { precision: 15, scale: 2 }).notNull(),
  minTermMonths: integer("min_term_months").notNull().default(1),
  maxTermMonths: integer("max_term_months").notNull().default(24),
  gracePeriodDays: integer("grace_period_days").notNull().default(0),
  penaltyRatePerDay: decimal("penalty_rate_per_day", { precision: 8, scale: 4 }).notNull().default("0.00"),
  penaltyCapPct: decimal("penalty_cap_pct", { precision: 5, scale: 2 }),
  penaltyLogic: jsonb("penalty_logic"),
  earlyPaymentFeePct: decimal("early_payment_fee_pct", { precision: 5, scale: 2 }),
  rescheduleFeePct: decimal("reschedule_fee_pct", { precision: 5, scale: 2 }),
  defaultCommissionPct: decimal("default_commission_pct", { precision: 5, scale: 2 }).notNull().default("0.00"),
  requiresGuarantor: boolean("requires_guarantor").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  variableInterestRate: boolean("variable_interest_rate").notNull().default(false),
  variableRateMargin: decimal("variable_rate_margin", { precision: 8, scale: 4 }),
  productType: varchar("product_type", { length: 50 }).notNull().default("Standard"),
  isCreditLine: boolean("is_credit_line").notNull().default(false),
  maxConcurrentLoans: integer("max_concurrent_loans").notNull().default(1),
  renewalConditions: jsonb("renewal_conditions"),
  repaymentPriority: jsonb("repayment_priority"),
  workflowAmountSegments: jsonb("workflow_amount_segments"),
  linkedBankFacilityId: uuid("linked_bank_facility_id"),
  linkedInsuranceCompanyId: uuid("linked_insurance_company_id"),
  regionRestricted: boolean("region_restricted").notNull().default(false),
  sectorRestricted: boolean("sector_restricted").notNull().default(false),
  facilityLimitMonitoring: boolean("facility_limit_monitoring").notNull().default(false),
  arrearsTolerance: decimal("arrears_tolerance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  holidayHandling: varchar("holiday_handling", { length: 30 }).notNull().default("next_business_day"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFundProductSchema = createInsertSchema(fundProductsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFundProduct = z.infer<typeof insertFundProductSchema>;
export type FundProduct = typeof fundProductsTable.$inferSelect;

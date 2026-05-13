import { pgTable, uuid, varchar, decimal, text, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";

export const periodicClosingsTable = pgTable("periodic_closings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  periodType: varchar("period_type", { length: 20 }).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  periodLabel: varchar("period_label", { length: 50 }).notNull(),
  totalCollected: decimal("total_collected", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalDisbursed: decimal("total_disbursed", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalExpenses: decimal("total_expenses", { precision: 15, scale: 2 }).notNull().default("0.00"),
  expectedCash: decimal("expected_cash", { precision: 15, scale: 2 }).notNull().default("0.00"),
  actualCash: decimal("actual_cash", { precision: 15, scale: 2 }).notNull().default("0.00"),
  discrepancy: decimal("discrepancy", { precision: 15, scale: 2 }).notNull().default("0.00"),
  dailyClosingsCount: decimal("daily_closings_count", { precision: 10, scale: 0 }).notNull().default("0"),
  trialBalance: jsonb("trial_balance"),
  accruedInterest: decimal("accrued_interest", { precision: 15, scale: 2 }).notNull().default("0.00"),
  accruedPenalties: decimal("accrued_penalties", { precision: 15, scale: 2 }).notNull().default("0.00"),
  provisionForLosses: decimal("provision_for_losses", { precision: 15, scale: 2 }).notNull().default("0.00"),
  parBreakdown: jsonb("par_breakdown"),
  retainedEarningsTransfer: decimal("retained_earnings_transfer", { precision: 15, scale: 2 }).notNull().default("0.00"),
  incomeStatement: jsonb("income_statement"),
  status: varchar("status", { length: 30 }).notNull().default("Open"),
  closedById: uuid("closed_by_id"),
  closedByName: varchar("closed_by_name", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export type PeriodicClosing = typeof periodicClosingsTable.$inferSelect;

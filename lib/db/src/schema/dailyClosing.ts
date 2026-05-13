import { pgTable, uuid, varchar, decimal, text, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";

export const dailyClosingsTable = pgTable("daily_closings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").notNull().references(() => branchesTable.id),
  closingDate: date("closing_date").notNull(),
  totalCollected: decimal("total_collected", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalDisbursed: decimal("total_disbursed", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalExpenses: decimal("total_expenses", { precision: 15, scale: 2 }).notNull().default("0.00"),
  expectedCash: decimal("expected_cash", { precision: 15, scale: 2 }).notNull().default("0.00"),
  actualCash: decimal("actual_cash", { precision: 15, scale: 2 }).notNull().default("0.00"),
  discrepancy: decimal("discrepancy", { precision: 15, scale: 2 }).notNull().default("0.00"),
  denominationBreakdown: jsonb("denomination_breakdown"),
  status: varchar("status", { length: 30 }).notNull().default("Open"),
  closedById: uuid("closed_by_id"),
  closedByName: varchar("closed_by_name", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export type DailyClosing = typeof dailyClosingsTable.$inferSelect;

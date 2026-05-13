import { pgTable, uuid, varchar, decimal, integer, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";

export const branchesTable = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  branchNameAr: varchar("branch_name_ar", { length: 255 }).notNull(),
  branchNameEn: varchar("branch_name_en", { length: 255 }),
  mainCashBoxBalance: decimal("main_cash_box_balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  secondaryCashBoxBalance: decimal("secondary_cash_box_balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  tertiaryCashBoxBalance: decimal("tertiary_cash_box_balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  spendingLimit: decimal("spending_limit", { precision: 15, scale: 2 }),
  monthlySpendingLimit: decimal("monthly_spending_limit", { precision: 15, scale: 2 }),
  yearlySpendingLimit: decimal("yearly_spending_limit", { precision: 15, scale: 2 }),
  currentMonthSpending: decimal("current_month_spending", { precision: 15, scale: 2 }).notNull().default("0.00"),
  currentYearSpending: decimal("current_year_spending", { precision: 15, scale: 2 }).notNull().default("0.00"),
  branchCode: varchar("branch_code", { length: 30 }),
  branchSeq: integer("branch_seq"),
  region: varchar("region", { length: 255 }),
  regionAr: varchar("region_ar", { length: 255 }),
  locationData: jsonb("location_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBranchSchema = createInsertSchema(branchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branchesTable.$inferSelect;

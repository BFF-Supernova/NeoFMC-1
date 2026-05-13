import { pgTable, uuid, varchar, numeric, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";

export const ifrs9ProvisionRunsTable = pgTable("ifrs9_provision_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  runDate: timestamp("run_date").notNull().defaultNow(),
  totalPortfolio: numeric("total_portfolio", { precision: 18, scale: 2 }).notNull(),
  totalECL: numeric("total_ecl", { precision: 18, scale: 2 }).notNull(),
  coverageRatio: numeric("coverage_ratio", { precision: 8, scale: 4 }),
  loanCount: integer("loan_count").notNull(),
  stageBreakdown: jsonb("stage_breakdown"),
  cbeBreakdown: jsonb("cbe_breakdown"),
  calculatedBy: uuid("calculated_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiRiskScoreHistoryTable = pgTable("ai_risk_score_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  clientId: uuid("client_id"),
  loanId: uuid("loan_id"),
  scoreType: varchar("score_type", { length: 50 }).notNull(),
  score: numeric("score", { precision: 8, scale: 4 }).notNull(),
  factors: jsonb("factors"),
  modelVersion: varchar("model_version", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

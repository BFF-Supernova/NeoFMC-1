import { pgTable, uuid, varchar, integer, boolean, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";

export const riskCriteriaTable = pgTable("risk_criteria", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  criteriaName: varchar("criteria_name", { length: 255 }).notNull(),
  criteriaNameAr: varchar("criteria_name_ar", { length: 255 }),
  criteriaType: varchar("criteria_type", { length: 50 }).notNull(),
  weight: integer("weight").notNull().default(1),
  rules: jsonb("rules").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRiskCriteriaSchema = createInsertSchema(riskCriteriaTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRiskCriteria = z.infer<typeof insertRiskCriteriaSchema>;
export type RiskCriteria = typeof riskCriteriaTable.$inferSelect;

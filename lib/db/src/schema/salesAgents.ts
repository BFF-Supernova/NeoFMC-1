import { pgTable, uuid, varchar, decimal, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";

export const salesAgentsTable = pgTable("sales_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  agentName: varchar("agent_name", { length: 255 }).notNull(),
  agentNameAr: varchar("agent_name_ar", { length: 255 }),
  agentType: varchar("agent_type", { length: 50 }).notNull().default("External"),
  companyName: varchar("company_name", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  nationalId: varchar("national_id", { length: 14 }),
  defaultCommissionPct: decimal("default_commission_pct", { precision: 5, scale: 2 }).notNull().default("0.00"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSalesAgentSchema = createInsertSchema(salesAgentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSalesAgent = z.infer<typeof insertSalesAgentSchema>;
export type SalesAgent = typeof salesAgentsTable.$inferSelect;

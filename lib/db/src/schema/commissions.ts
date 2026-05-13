import { pgTable, uuid, varchar, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { salesAgentsTable } from "./salesAgents.ts";
import { loansTable } from "./loans.ts";

export const commissionsTable = pgTable("commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  agentId: uuid("agent_id").notNull().references(() => salesAgentsTable.id),
  loanId: uuid("loan_id").notNull().references(() => loansTable.id),
  disbursedAmount: decimal("disbursed_amount", { precision: 15, scale: 2 }).notNull(),
  commissionPct: decimal("commission_pct", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 15, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productCommissionsTable = pgTable("product_commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  productId: uuid("product_id").notNull(),
  agentId: uuid("agent_id").notNull().references(() => salesAgentsTable.id),
  commissionPct: decimal("commission_pct", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommissionSchema = createInsertSchema(commissionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissionsTable.$inferSelect;
export type ProductCommission = typeof productCommissionsTable.$inferSelect;

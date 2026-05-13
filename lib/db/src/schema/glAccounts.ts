import { pgTable, uuid, varchar, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";

export const glAccountsTable = pgTable("gl_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  accountCode: varchar("account_code", { length: 50 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountNameAr: varchar("account_name_ar", { length: 255 }),
  accountType: varchar("account_type", { length: 50 }).notNull(),
  costCenterId: varchar("cost_center_id", { length: 50 }),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGlAccountSchema = createInsertSchema(glAccountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGlAccount = z.infer<typeof insertGlAccountSchema>;
export type GlAccount = typeof glAccountsTable.$inferSelect;

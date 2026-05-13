import { pgTable, uuid, varchar, decimal, text, date, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { clientsTable } from "./clients.ts";
import { loansTable } from "./loans.ts";

export const collateralsTable = pgTable("collaterals", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  clientId: uuid("client_id").notNull().references(() => clientsTable.id),
  loanId: uuid("loan_id").references(() => loansTable.id),
  collateralType: varchar("collateral_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  descriptionAr: text("description_ar"),
  estimatedValue: decimal("estimated_value", { precision: 15, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).notNull(),
  registrationNumber: varchar("registration_number", { length: 100 }),
  location: text("location"),
  status: varchar("status", { length: 30 }).notNull().default("Active"),
  lastValuationDate: date("last_valuation_date"),
  nextValuationDate: date("next_valuation_date"),
  valuationHistory: jsonb("valuation_history"),
  insurancePolicyNumber: varchar("insurance_policy_number", { length: 100 }),
  insuranceExpiryDate: date("insurance_expiry_date"),
  documentUrls: jsonb("document_urls"),
  notes: text("notes"),
  createdById: uuid("created_by_id"),
  createdByName: varchar("created_by_name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCollateralSchema = createInsertSchema(collateralsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCollateral = z.infer<typeof insertCollateralSchema>;
export type Collateral = typeof collateralsTable.$inferSelect;

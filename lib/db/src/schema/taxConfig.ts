import { pgTable, uuid, varchar, decimal, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { usersTable } from "./users.ts";

export const taxCodesTable = pgTable("tax_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  code: varchar("code", { length: 30 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }),
  type: varchar("type", { length: 30 }).notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const incomeTaxBracketsTable = pgTable("income_tax_brackets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  fromAmount: decimal("from_amount", { precision: 15, scale: 2 }).notNull(),
  toAmount: decimal("to_amount", { precision: 15, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  orderIndex: integer("order_index").notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const etaSubmissionsTable = pgTable("eta_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  internalId: varchar("internal_id", { length: 100 }).notNull(),
  submissionId: varchar("submission_id", { length: 100 }),
  uuid: varchar("uuid", { length: 100 }),
  longId: varchar("long_id", { length: 255 }),
  invoiceType: varchar("invoice_type", { length: 5 }).notNull().default("I"),
  receiverName: varchar("receiver_name", { length: 255 }),
  receiverTaxId: varchar("receiver_tax_id", { length: 50 }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalTaxAmount: decimal("total_tax_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  errors: text("errors"),
  submittedById: uuid("submitted_by_id").references(() => usersTable.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaxCodeSchema = createInsertSchema(taxCodesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaxCode = z.infer<typeof insertTaxCodeSchema>;
export type TaxCode = typeof taxCodesTable.$inferSelect;

export const insertIncomeTaxBracketSchema = createInsertSchema(incomeTaxBracketsTable).omit({ id: true, createdAt: true });
export type InsertIncomeTaxBracket = z.infer<typeof insertIncomeTaxBracketSchema>;
export type IncomeTaxBracket = typeof incomeTaxBracketsTable.$inferSelect;

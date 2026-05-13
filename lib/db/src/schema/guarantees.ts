import { pgTable, uuid, varchar, decimal, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { loansTable } from "./loans.ts";
import { clientsTable } from "./clients.ts";

export const guaranteesTable = pgTable("guarantees", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  guaranteeNumber: varchar("guarantee_number", { length: 30 }),
  clientId: uuid("client_id").references(() => clientsTable.id),
  loanId: uuid("loan_id").references(() => loansTable.id),
  loanRequestId: uuid("loan_request_id"),
  guaranteeType: varchar("guarantee_type", { length: 50 }).notNull(),
  guarantorName: varchar("guarantor_name", { length: 255 }).notNull(),
  guarantorNameAr: varchar("guarantor_name_ar", { length: 255 }),
  guarantorNationalId: varchar("guarantor_national_id", { length: 14 }),
  guarantorPhone: varchar("guarantor_phone", { length: 20 }),
  guarantorAddress: text("guarantor_address"),
  guarantorJobTitle: varchar("guarantor_job_title", { length: 255 }),
  guarantorProfessionLicenseId: varchar("guarantor_profession_license_id", { length: 100 }),
  guarantorAgriculturalLandId: varchar("guarantor_agricultural_land_id", { length: 100 }),
  guarantorTaxId: varchar("guarantor_tax_id", { length: 100 }),
  guarantorCommercialRegistrationNo: varchar("guarantor_commercial_registration_no", { length: 100 }),
  guarantorIdIssuanceDate: date("guarantor_id_issuance_date"),
  guarantorIdExpiryDate: date("guarantor_id_expiry_date"),
  guaranteeValue: decimal("guarantee_value", { precision: 15, scale: 2 }),
  assetDescription: text("asset_description"),
  expiryDate: date("expiry_date"),
  status: varchar("status", { length: 30 }).notNull().default("Active"),
  documentUrls: text("document_urls").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGuaranteeSchema = createInsertSchema(guaranteesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGuarantee = z.infer<typeof insertGuaranteeSchema>;
export type Guarantee = typeof guaranteesTable.$inferSelect;

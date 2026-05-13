import { pgTable, uuid, varchar, decimal, text, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";

export const bankFacilitiesTable = pgTable("bank_facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  bankNameAr: varchar("bank_name_ar", { length: 255 }),
  facilityType: varchar("facility_type", { length: 100 }).notNull(),
  facilityLimit: decimal("facility_limit", { precision: 15, scale: 2 }).notNull(),
  usedAmount: decimal("used_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  availableAmount: decimal("available_amount", { precision: 15, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 8, scale: 4 }),
  startDate: date("start_date"),
  expiryDate: date("expiry_date"),
  accountNumber: varchar("account_number", { length: 100 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  status: varchar("status", { length: 30 }).notNull().default("Active"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insuranceCompaniesTable = pgTable("insurance_companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  companyNameAr: varchar("company_name_ar", { length: 255 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  policyType: varchar("policy_type", { length: 100 }),
  premiumRate: decimal("premium_rate", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBankFacilitySchema = createInsertSchema(bankFacilitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBankFacility = z.infer<typeof insertBankFacilitySchema>;
export type BankFacility = typeof bankFacilitiesTable.$inferSelect;

export const insertInsuranceCompanySchema = createInsertSchema(insuranceCompaniesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInsuranceCompany = z.infer<typeof insertInsuranceCompanySchema>;
export type InsuranceCompany = typeof insuranceCompaniesTable.$inferSelect;

import { pgTable, uuid, varchar, integer, boolean, text, jsonb, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";

export const clientsTable = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  clientCode: varchar("client_code", { length: 30 }),
  nationalId: varchar("national_id", { length: 14 }),
  fullNameAr: varchar("full_name_ar", { length: 255 }).notNull(),
  fullNameEn: varchar("full_name_en", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  primaryAddress: text("primary_address"),
  secondaryAddress: text("secondary_address"),
  jobTitle: varchar("job_title", { length: 255 }),
  professionLicenseId: varchar("profession_license_id", { length: 100 }),
  agriculturalLandId: varchar("agricultural_land_id", { length: 100 }),
  taxId: varchar("tax_id", { length: 100 }),
  commercialRegistrationNo: varchar("commercial_registration_no", { length: 100 }),
  idIssuanceDate: date("id_issuance_date"),
  idExpiryDate: date("id_expiry_date"),
  riskScore: integer("risk_score"),
  isBlacklisted: boolean("is_blacklisted").notNull().default(false),
  blacklistReason: text("blacklist_reason"),
  iScoreData: jsonb("i_score_data"),
  kycStatus: varchar("kyc_status", { length: 30 }).default("Pending"),
  kycNotes: text("kyc_notes"),
  kycVerifiedAt: timestamp("kyc_verified_at", { withTimezone: true }),
  kycVerifiedById: uuid("kyc_verified_by_id"),
  photoUrl: text("photo_url"),
  idFrontUrl: text("id_front_url"),
  idBackUrl: text("id_back_url"),
  customerCategory: varchar("customer_category", { length: 50 }).default("Individual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;

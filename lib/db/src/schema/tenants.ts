import { pgTable, uuid, varchar, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tenantsTable = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  companyNameAr: varchar("company_name_ar", { length: 255 }),
  fraLicenseNumber: varchar("fra_license_number", { length: 100 }),
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).notNull().default("Basic"),
  logoUrl: varchar("logo_url", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  iscoreEnabled: boolean("iscore_enabled").notNull().default(false),
  epaymentFawryEnabled: boolean("epayment_fawry_enabled").notNull().default(false),
  epaymentOpayEnabled: boolean("epayment_opay_enabled").notNull().default(false),
  epaymentKhaznaEnabled: boolean("epayment_khazna_enabled").notNull().default(false),
  epaymentMeezaEnabled: boolean("epayment_meeza_enabled").notNull().default(false),
  moduleCoreBasic: boolean("module_core_basic").notNull().default(true),
  moduleCoreEdge: boolean("module_core_edge").notNull().default(true),
  moduleAdvancedLending: boolean("module_advanced_lending").notNull().default(false),
  moduleFinancialSettlements: boolean("module_financial_settlements").notNull().default(false),
  moduleSavings: boolean("module_savings").notNull().default(false),
  moduleHRPayroll: boolean("module_hr_payroll").notNull().default(false),
  moduleInsurance: boolean("module_insurance").notNull().default(false),
  moduleAgentBanking: boolean("module_agent_banking").notNull().default(false),
  moduleLoanRestructuring: boolean("module_loan_restructuring").notNull().default(false),
  moduleOCR: boolean("module_ocr").notNull().default(false),
  moduleWhatsApp: boolean("module_whatsapp").notNull().default(false),
  moduleMobileField: boolean("module_mobile_field").notNull().default(false),
  moduleClientApp: boolean("module_client_app").notNull().default(false),
  moduleMobileWallet: boolean("module_mobile_wallet").notNull().default(false),
  moduleAICollection: boolean("module_ai_collection").notNull().default(false),
  moduleDynamicPricing: boolean("module_dynamic_pricing").notNull().default(false),
  moduleCashFlowPrediction: boolean("module_cash_flow_prediction").notNull().default(false),
  moduleAIStressTesting: boolean("module_ai_stress_testing").notNull().default(false),
  moduleNLPReporting: boolean("module_nlp_reporting").notNull().default(false),
  moduleChurnPrediction: boolean("module_churn_prediction").notNull().default(false),
  moduleIFRS9: boolean("module_ifrs9").notNull().default(false),
  moduleAIRisk: boolean("module_ai_risk").notNull().default(false),
  moduleFRAReporting: boolean("module_fra_reporting").notNull().default(false),
  moduleIScorelive: boolean("module_iscore_live").notNull().default(false),
  modulePDPL: boolean("module_pdpl").notNull().default(false),
  moduleAML: boolean("module_aml").notNull().default(false),
  moduleEKYC: boolean("module_ekyc").notNull().default(false),
  moduleETA: boolean("module_eta").notNull().default(false),
  onboardingStatus: varchar("onboarding_status", { length: 30 }).notNull().default("Approved"),
  primaryColor: varchar("primary_color", { length: 20 }),
  secondaryColor: varchar("secondary_color", { length: 20 }),
  faviconUrl: varchar("favicon_url", { length: 500 }),
  customDomain: varchar("custom_domain", { length: 255 }),
  allowedDomains: varchar("allowed_domains", { length: 1000 }),
  requiredIdentifications: jsonb("required_identifications").$type<{
    nationalId: boolean;
    jobTitle: boolean;
    professionLicenseId: boolean;
    agriculturalLandId: boolean;
    taxId: boolean;
    commercialRegistrationNo: boolean;
  }>().default({ nationalId: true, jobTitle: false, professionLicenseId: false, agriculturalLandId: false, taxId: false, commercialRegistrationNo: false }),
  hiddenFields: jsonb("hidden_fields").$type<Record<string, boolean>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;

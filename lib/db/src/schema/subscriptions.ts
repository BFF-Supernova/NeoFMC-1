import { pgTable, uuid, varchar, boolean, numeric, integer, timestamp, text, unique } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";

export const modulePricingTable = pgTable("module_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleKey: varchar("module_key", { length: 100 }).notNull().unique(),
  moduleName: varchar("module_name", { length: 255 }).notNull(),
  moduleNameAr: varchar("module_name_ar", { length: 255 }),
  description: text("description"),
  descriptionAr: text("description_ar"),
  monthlyPrice: numeric("monthly_price", { precision: 12, scale: 2 }).notNull().default("0"),
  annualPrice: numeric("annual_price", { precision: 12, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userTypePricingTable = pgTable("user_type_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  userType: varchar("user_type", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  displayNameAr: varchar("display_name_ar", { length: 100 }),
  monthlyPricePerUser: numeric("monthly_price_per_user", { precision: 12, scale: 2 }).notNull().default("0"),
  annualPricePerUser: numeric("annual_price_per_user", { precision: 12, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantModuleSubscriptionsTable = pgTable("tenant_module_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  moduleKey: varchar("module_key", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("monthly"),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  customMonthlyPrice: numeric("custom_monthly_price", { precision: 12, scale: 2 }),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("uq_tenant_module").on(table.tenantId, table.moduleKey)]);

export const tenantUserLimitsTable = pgTable("tenant_user_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  userType: varchar("user_type", { length: 50 }).notNull(),
  maxUsers: integer("max_users").notNull().default(0),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  customPricePerUser: numeric("custom_price_per_user", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("uq_tenant_user_type").on(table.tenantId, table.userType)]);

export type ModulePricing = typeof modulePricingTable.$inferSelect;
export type UserTypePricing = typeof userTypePricingTable.$inferSelect;
export type TenantModuleSubscription = typeof tenantModuleSubscriptionsTable.$inferSelect;
export type TenantUserLimit = typeof tenantUserLimitsTable.$inferSelect;

import { pgTable, uuid, varchar, decimal, text, date, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";
import { usersTable } from "./users.ts";
import { glAccountsTable } from "./glAccounts.ts";

export const assetCategoriesTable = pgTable("asset_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }),
  depreciationMethod: varchar("depreciation_method", { length: 30 }).notNull().default("StraightLine"),
  defaultUsefulLifeMonths: integer("default_useful_life_months").notNull().default(60),
  assetAccountId: uuid("asset_account_id").references(() => glAccountsTable.id),
  depreciationAccountId: uuid("depreciation_account_id").references(() => glAccountsTable.id),
  accumulatedDepAccountId: uuid("accumulated_dep_account_id").references(() => glAccountsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fixedAssetsTable = pgTable("fixed_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").notNull().references(() => branchesTable.id),
  categoryId: uuid("category_id").references(() => assetCategoriesTable.id),
  assetCode: varchar("asset_code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }),
  description: text("description"),
  serialNumber: varchar("serial_number", { length: 100 }),
  purchaseDate: date("purchase_date").notNull(),
  purchaseCost: decimal("purchase_cost", { precision: 15, scale: 2 }).notNull(),
  salvageValue: decimal("salvage_value", { precision: 15, scale: 2 }).notNull().default("0.00"),
  usefulLifeMonths: integer("useful_life_months").notNull().default(60),
  depreciationMethod: varchar("depreciation_method", { length: 30 }).notNull().default("StraightLine"),
  accumulatedDepreciation: decimal("accumulated_depreciation", { precision: 15, scale: 2 }).notNull().default("0.00"),
  netBookValue: decimal("net_book_value", { precision: 15, scale: 2 }).notNull().default("0.00"),
  status: varchar("status", { length: 30 }).notNull().default("Active"),
  disposalDate: date("disposal_date"),
  disposalAmount: decimal("disposal_amount", { precision: 15, scale: 2 }),
  disposalMethod: varchar("disposal_method", { length: 50 }),
  disposalGainLoss: decimal("disposal_gain_loss", { precision: 15, scale: 2 }),
  location: varchar("location", { length: 255 }),
  assignedToId: uuid("assigned_to_id").references(() => usersTable.id),
  warrantyExpiry: date("warranty_expiry"),
  documentUrls: text("document_urls").array(),
  lastDepreciationDate: date("last_depreciation_date"),
  createdById: uuid("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const depreciationEntriesTable = pgTable("depreciation_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  assetId: uuid("asset_id").notNull().references(() => fixedAssetsTable.id),
  periodDate: date("period_date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  accumulatedTotal: decimal("accumulated_total", { precision: 15, scale: 2 }).notNull(),
  netBookValue: decimal("net_book_value", { precision: 15, scale: 2 }).notNull(),
  journalEntryId: uuid("journal_entry_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssetCategorySchema = createInsertSchema(assetCategoriesTable).omit({ id: true, createdAt: true });
export type InsertAssetCategory = z.infer<typeof insertAssetCategorySchema>;
export type AssetCategory = typeof assetCategoriesTable.$inferSelect;

export const insertFixedAssetSchema = createInsertSchema(fixedAssetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFixedAsset = z.infer<typeof insertFixedAssetSchema>;
export type FixedAsset = typeof fixedAssetsTable.$inferSelect;

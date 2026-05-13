import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { fundProductsTable } from "./fundProducts.ts";

export const productRegionsTable = pgTable("product_regions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  productId: uuid("product_id").notNull().references(() => fundProductsTable.id, { onDelete: "cascade" }),
  regionName: varchar("region_name", { length: 255 }).notNull(),
  regionNameAr: varchar("region_name_ar", { length: 255 }),
  isAllowed: boolean("is_allowed").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productSectorsTable = pgTable("product_sectors", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  productId: uuid("product_id").notNull().references(() => fundProductsTable.id, { onDelete: "cascade" }),
  sectorName: varchar("sector_name", { length: 255 }).notNull(),
  sectorNameAr: varchar("sector_name_ar", { length: 255 }),
  isAllowed: boolean("is_allowed").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductRegionSchema = createInsertSchema(productRegionsTable).omit({ id: true, createdAt: true });
export type InsertProductRegion = z.infer<typeof insertProductRegionSchema>;
export type ProductRegion = typeof productRegionsTable.$inferSelect;

export const insertProductSectorSchema = createInsertSchema(productSectorsTable).omit({ id: true, createdAt: true });
export type InsertProductSector = z.infer<typeof insertProductSectorSchema>;
export type ProductSector = typeof productSectorsTable.$inferSelect;

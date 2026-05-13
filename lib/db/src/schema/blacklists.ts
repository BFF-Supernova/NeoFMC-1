import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";

export const blacklistsTable = pgTable("blacklists", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  nationalId: varchar("national_id", { length: 14 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  listType: varchar("list_type", { length: 30 }).notNull().default("unfavorable"),
  reason: text("reason"),
  source: varchar("source", { length: 100 }),
  addedById: uuid("added_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Blacklist = typeof blacklistsTable.$inferSelect;

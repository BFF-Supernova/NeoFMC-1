import { pgTable, uuid, varchar, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";
import { clientsTable } from "./clients.ts";
import { branchesTable } from "./branches.ts";

export const officerCheckinsTable = pgTable("officer_checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  officerId: uuid("officer_id").notNull(),
  clientId: uuid("client_id").references(() => clientsTable.id),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  visitType: varchar("visit_type", { length: 30 }).notNull().default("Collection"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OfficerCheckin = typeof officerCheckinsTable.$inferSelect;

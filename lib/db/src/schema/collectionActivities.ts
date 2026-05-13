import { pgTable, uuid, varchar, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { loansTable } from "./loans.ts";
import { clientsTable } from "./clients.ts";

export const collectionActivitiesTable = pgTable("collection_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  loanId: uuid("loan_id").notNull().references(() => loansTable.id),
  clientId: uuid("client_id").references(() => clientsTable.id),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 30 }).notNull().default("Phone"),
  contactDate: date("contact_date").notNull().defaultNow(),
  outcome: varchar("outcome", { length: 50 }),
  notes: text("notes"),
  nextFollowUpDate: date("next_follow_up_date"),
  assignedCollectorId: uuid("assigned_collector_id"),
  assignedCollectorName: varchar("assigned_collector_name", { length: 255 }),
  thirdPartyCompany: varchar("third_party_company", { length: 255 }),
  region: varchar("region", { length: 255 }),
  createdById: uuid("created_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCollectionActivitySchema = createInsertSchema(collectionActivitiesTable).omit({ id: true, createdAt: true });
export type InsertCollectionActivity = z.infer<typeof insertCollectionActivitySchema>;
export type CollectionActivity = typeof collectionActivitiesTable.$inferSelect;

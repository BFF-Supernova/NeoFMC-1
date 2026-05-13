import { pgTable, uuid, varchar, decimal, text, integer, jsonb, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";

export const offloadingBatchesTable = pgTable("offloading_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  batchName: varchar("batch_name", { length: 255 }).notNull(),
  description: text("description"),
  totalLoans: integer("total_loans").notNull().default(0),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  thirdPartyName: varchar("third_party_name", { length: 255 }),
  thirdPartyContact: varchar("third_party_contact", { length: 255 }),
  offloadDate: date("offload_date").notNull().defaultNow(),
  status: varchar("status", { length: 30 }).notNull().default("Draft"),
  offloadTerms: jsonb("offload_terms"),
  createdById: uuid("created_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const offloadingItemsTable = pgTable("offloading_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  batchId: uuid("batch_id").notNull().references(() => offloadingBatchesTable.id, { onDelete: "cascade" }),
  loanId: uuid("loan_id").notNull(),
  clientName: varchar("client_name", { length: 255 }),
  outstandingAmount: decimal("outstanding_amount", { precision: 15, scale: 2 }).notNull(),
  offloadPrice: decimal("offload_price", { precision: 15, scale: 2 }),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOffloadingBatchSchema = createInsertSchema(offloadingBatchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOffloadingBatch = z.infer<typeof insertOffloadingBatchSchema>;
export type OffloadingBatch = typeof offloadingBatchesTable.$inferSelect;

export type OffloadingItem = typeof offloadingItemsTable.$inferSelect;

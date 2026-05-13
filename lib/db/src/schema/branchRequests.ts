import { pgTable, uuid, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";
import { usersTable } from "./users.ts";

export const branchRequestsTable = pgTable("branch_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").notNull().references(() => branchesTable.id),
  requestType: varchar("request_type", { length: 50 }).notNull(),
  referenceId: uuid("reference_id"),
  referenceLabel: varchar("reference_label", { length: 255 }),
  description: text("description"),
  data: jsonb("data"),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  requestedById: uuid("requested_by_id").notNull().references(() => usersTable.id),
  requestedByName: varchar("requested_by_name", { length: 255 }),
  reviewedById: uuid("reviewed_by_id").references(() => usersTable.id),
  reviewedByName: varchar("reviewed_by_name", { length: 255 }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBranchRequestSchema = createInsertSchema(branchRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBranchRequest = z.infer<typeof insertBranchRequestSchema>;
export type BranchRequest = typeof branchRequestsTable.$inferSelect;

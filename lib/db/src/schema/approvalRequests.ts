import { pgTable, uuid, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";

export const approvalRequestsTable = pgTable("approval_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  requestType: varchar("request_type", { length: 50 }).notNull(),
  referenceId: uuid("reference_id").notNull(),
  referenceLabel: varchar("reference_label", { length: 255 }),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  requestedById: uuid("requested_by_id").notNull(),
  requestedByName: varchar("requested_by_name", { length: 255 }),
  approvedById: uuid("approved_by_id"),
  approvedByName: varchar("approved_by_name", { length: 255 }),
  rejectionReason: text("rejection_reason"),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export type ApprovalRequest = typeof approvalRequestsTable.$inferSelect;

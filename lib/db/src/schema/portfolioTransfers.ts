import { pgTable, uuid, varchar, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";

export const portfolioTransfersTable = pgTable("portfolio_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  transferType: varchar("transfer_type", { length: 30 }).default("officer_to_officer"),
  fromOfficerId: uuid("from_officer_id"),
  toOfficerId: uuid("to_officer_id"),
  fromBranchId: uuid("from_branch_id"),
  toBranchId: uuid("to_branch_id"),
  loanCount: integer("loan_count").notNull().default(0),
  loanIds: jsonb("loan_ids").$type<string[]>().default([]),
  reason: text("reason"),
  status: varchar("status", { length: 30 }).default("Completed"),
  approvedById: uuid("approved_by_id"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  transferredById: uuid("transferred_by_id").notNull(),
  transferredByName: varchar("transferred_by_name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PortfolioTransfer = typeof portfolioTransfersTable.$inferSelect;

import { pgTable, uuid, varchar, decimal, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";

export const branchCashTransfersTable = pgTable("branch_cash_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  fromBranchId: uuid("from_branch_id").notNull().references(() => branchesTable.id),
  toBranchId: uuid("to_branch_id").notNull().references(() => branchesTable.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  reason: text("reason"),
  approvedById: uuid("approved_by_id"),
  approvedByName: varchar("approved_by_name", { length: 255 }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  receivedById: uuid("received_by_id"),
  receivedByName: varchar("received_by_name", { length: 255 }),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  notes: text("notes"),
  requestedById: uuid("requested_by_id"),
  requestedByName: varchar("requested_by_name", { length: 255 }),
  journalEntryId: uuid("journal_entry_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBranchCashTransferSchema = createInsertSchema(branchCashTransfersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBranchCashTransfer = z.infer<typeof insertBranchCashTransferSchema>;
export type BranchCashTransfer = typeof branchCashTransfersTable.$inferSelect;

import { pgTable, uuid, varchar, decimal, text, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { loansTable } from "./loans.ts";
import { branchesTable } from "./branches.ts";

export const wireTransfersTable = pgTable("wire_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  loanId: uuid("loan_id").references(() => loansTable.id),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  transferType: varchar("transfer_type", { length: 30 }).notNull().default("Incoming"),
  senderBank: varchar("sender_bank", { length: 255 }),
  senderAccountNumber: varchar("sender_account_number", { length: 100 }),
  senderName: varchar("sender_name", { length: 255 }),
  recipientBank: varchar("recipient_bank", { length: 255 }),
  recipientAccountNumber: varchar("recipient_account_number", { length: 100 }),
  recipientName: varchar("recipient_name", { length: 255 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("EGP"),
  referenceNumber: varchar("reference_number", { length: 100 }),
  bankReferenceNumber: varchar("bank_reference_number", { length: 100 }),
  transferDate: date("transfer_date").notNull(),
  valueDate: date("value_date"),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  reconciliationStatus: varchar("reconciliation_status", { length: 30 }).notNull().default("Unreconciled"),
  reconciledAt: timestamp("reconciled_at", { withTimezone: true }),
  reconciledById: uuid("reconciled_by_id"),
  glReconciled: boolean("gl_reconciled").notNull().default(false),
  notes: text("notes"),
  createdById: uuid("created_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWireTransferSchema = createInsertSchema(wireTransfersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWireTransfer = z.infer<typeof insertWireTransferSchema>;
export type WireTransfer = typeof wireTransfersTable.$inferSelect;

import { pgTable, uuid, varchar, decimal, text, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { loansTable } from "./loans.ts";
import { clientsTable } from "./clients.ts";
import { branchesTable } from "./branches.ts";
import { guaranteesTable } from "./guarantees.ts";

export const chequesTable = pgTable("cheques", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  loanId: uuid("loan_id").references(() => loansTable.id),
  clientId: uuid("client_id").references(() => clientsTable.id),
  guaranteeId: uuid("guarantee_id").references(() => guaranteesTable.id),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  chequeType: varchar("cheque_type", { length: 30 }).notNull().default("PDC"),
  assignedTo: varchar("assigned_to", { length: 30 }).notNull().default("Customer"),
  customerCategory: varchar("customer_category", { length: 50 }).default("Individual"),
  chequeNumber: varchar("cheque_number", { length: 50 }).notNull(),
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  bankBranch: varchar("bank_branch", { length: 255 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("EGP"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  drawerName: varchar("drawer_name", { length: 255 }).notNull(),
  drawerNationalId: varchar("drawer_national_id", { length: 14 }),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  presentedDate: date("presented_date"),
  clearedDate: date("cleared_date"),
  bouncedDate: date("bounced_date"),
  bounceReason: text("bounce_reason"),
  glReconciled: boolean("gl_reconciled").notNull().default(false),
  notes: text("notes"),
  createdById: uuid("created_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChequeSchema = createInsertSchema(chequesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCheque = z.infer<typeof insertChequeSchema>;
export type Cheque = typeof chequesTable.$inferSelect;

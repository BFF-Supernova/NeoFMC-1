import { pgTable, uuid, varchar, decimal, text, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";
import { usersTable } from "./users.ts";

export const cashSettlementsTable = pgTable("cash_settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").notNull().references(() => branchesTable.id),
  settlementType: varchar("settlement_type", { length: 50 }).notNull(),
  cashBoxType: varchar("cash_box_type", { length: 30 }).notNull().default("Main"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("EGP"),
  settlementDate: date("settlement_date").notNull().defaultNow(),
  fromBranchId: uuid("from_branch_id").references(() => branchesTable.id),
  toBranchId: uuid("to_branch_id").references(() => branchesTable.id),
  tellerId: uuid("teller_id").references(() => usersTable.id),
  tellerName: varchar("teller_name", { length: 255 }),
  commissionAmount: decimal("commission_amount", { precision: 15, scale: 2 }).default("0.00"),
  commissionPct: decimal("commission_pct", { precision: 5, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  approvedById: uuid("approved_by_id").references(() => usersTable.id),
  approvedByName: varchar("approved_by_name", { length: 255 }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  glReconciled: boolean("gl_reconciled").notNull().default(false),
  referenceNumber: varchar("reference_number", { length: 100 }),
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cashBoxesTable = pgTable("cash_boxes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").notNull().references(() => branchesTable.id),
  boxType: varchar("box_type", { length: 30 }).notNull().default("Main"),
  boxName: varchar("box_name", { length: 255 }).notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 10 }).notNull().default("EGP"),
  assignedToId: uuid("assigned_to_id").references(() => usersTable.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCashSettlementSchema = createInsertSchema(cashSettlementsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCashSettlement = z.infer<typeof insertCashSettlementSchema>;
export type CashSettlement = typeof cashSettlementsTable.$inferSelect;

export const insertCashBoxSchema = createInsertSchema(cashBoxesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCashBox = z.infer<typeof insertCashBoxSchema>;
export type CashBox = typeof cashBoxesTable.$inferSelect;

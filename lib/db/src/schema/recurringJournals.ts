import { pgTable, uuid, varchar, decimal, text, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";
import { glAccountsTable } from "./glAccounts.ts";

export const recurringJournalTemplatesTable = pgTable("recurring_journal_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }),
  description: text("description"),
  frequency: varchar("frequency", { length: 20 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  lastRunDate: date("last_run_date"),
  nextRunDate: date("next_run_date"),
  isAutoReverse: boolean("is_auto_reverse").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  totalDebit: decimal("total_debit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalCredit: decimal("total_credit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recurringJournalLinesTable = pgTable("recurring_journal_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  templateId: uuid("template_id").notNull().references(() => recurringJournalTemplatesTable.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => glAccountsTable.id),
  description: text("description"),
  debit: decimal("debit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  credit: decimal("credit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRecurringJournalTemplateSchema = createInsertSchema(recurringJournalTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRecurringJournalTemplate = z.infer<typeof insertRecurringJournalTemplateSchema>;
export type RecurringJournalTemplate = typeof recurringJournalTemplatesTable.$inferSelect;

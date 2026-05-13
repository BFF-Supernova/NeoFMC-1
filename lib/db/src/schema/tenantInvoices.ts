import { pgTable, uuid, varchar, numeric, integer, timestamp, text, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";

export const tenantInvoicesTable = pgTable("tenant_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  modulesAmount: numeric("modules_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  usersAmount: numeric("users_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 30 }).notNull().default("Draft"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 255 }),
  notes: text("notes"),
  lineItems: jsonb("line_items").$type<Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    category: string;
  }>>().default([]),
  activeModulesCount: integer("active_modules_count").notNull().default(0),
  activeUsersCount: integer("active_users_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TenantInvoice = typeof tenantInvoicesTable.$inferSelect;

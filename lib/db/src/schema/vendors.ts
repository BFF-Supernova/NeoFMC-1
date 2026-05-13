import { pgTable, uuid, varchar, decimal, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";
import { usersTable } from "./users.ts";
import { glAccountsTable } from "./glAccounts.ts";

export const vendorsTable = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  vendorCode: varchar("vendor_code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }),
  taxId: varchar("tax_id", { length: 50 }),
  commercialRegNo: varchar("commercial_reg_no", { length: 50 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  bankName: varchar("bank_name", { length: 255 }),
  bankAccountNo: varchar("bank_account_no", { length: 100 }),
  bankIban: varchar("bank_iban", { length: 50 }),
  paymentTermsDays: varchar("payment_terms_days", { length: 10 }).default("30"),
  category: varchar("category", { length: 100 }),
  status: varchar("status", { length: 30 }).notNull().default("Active"),
  totalPurchases: decimal("total_purchases", { precision: 15, scale: 2 }).notNull().default("0.00"),
  outstandingBalance: decimal("outstanding_balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseInvoicesTable = pgTable("purchase_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").notNull().references(() => branchesTable.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendorsTable.id),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
  invoiceDate: varchar("invoice_date", { length: 10 }).notNull(),
  dueDate: varchar("due_date", { length: 10 }).notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  withholdingTax: decimal("withholding_tax", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  documentUrls: text("document_urls").array(),
  glSynced: boolean("gl_synced").notNull().default(false),
  createdById: uuid("created_by_id").references(() => usersTable.id),
  approvedById: uuid("approved_by_id").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vendorPaymentsTable = pgTable("vendor_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendorsTable.id),
  invoiceId: uuid("invoice_id").references(() => purchaseInvoicesTable.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: varchar("payment_date", { length: 10 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  referenceNumber: varchar("reference_number", { length: 100 }),
  notes: text("notes"),
  createdById: uuid("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;

export const insertPurchaseInvoiceSchema = createInsertSchema(purchaseInvoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPurchaseInvoice = z.infer<typeof insertPurchaseInvoiceSchema>;
export type PurchaseInvoice = typeof purchaseInvoicesTable.$inferSelect;

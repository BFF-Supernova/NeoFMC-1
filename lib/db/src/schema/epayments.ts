import { pgTable, uuid, varchar, decimal, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { loansTable } from "./loans.ts";

export const epaymentConfigsTable = pgTable("epayment_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  gateway: varchar("gateway", { length: 50 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  merchantId: varchar("merchant_id", { length: 255 }),
  apiKey: text("api_key"),
  secretKey: text("secret_key"),
  callbackUrl: text("callback_url"),
  webhookSecret: text("webhook_secret"),
  environment: varchar("environment", { length: 20 }).notNull().default("sandbox"),
  isActive: boolean("is_active").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const epaymentTransactionsTable = pgTable("epayment_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  configId: uuid("config_id").references(() => epaymentConfigsTable.id),
  loanId: uuid("loan_id").references(() => loansTable.id),
  gateway: varchar("gateway", { length: 50 }).notNull(),
  transactionType: varchar("transaction_type", { length: 30 }).notNull().default("Payment"),
  externalTransactionId: varchar("external_transaction_id", { length: 255 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("EGP"),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  customerPhone: varchar("customer_phone", { length: 20 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerName: varchar("customer_name", { length: 255 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  failureReason: text("failure_reason"),
  refundAmount: decimal("refund_amount", { precision: 15, scale: 2 }),
  refundReason: text("refund_reason"),
  gatewayResponse: jsonb("gateway_response"),
  glReconciled: boolean("gl_reconciled").notNull().default(false),
  reconciledAt: timestamp("reconciled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEpaymentConfigSchema = createInsertSchema(epaymentConfigsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEpaymentConfig = z.infer<typeof insertEpaymentConfigSchema>;
export type EpaymentConfig = typeof epaymentConfigsTable.$inferSelect;

export const insertEpaymentTransactionSchema = createInsertSchema(epaymentTransactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEpaymentTransaction = z.infer<typeof insertEpaymentTransactionSchema>;
export type EpaymentTransaction = typeof epaymentTransactionsTable.$inferSelect;

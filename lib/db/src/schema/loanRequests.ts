import { pgTable, uuid, varchar, decimal, integer, boolean, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { clientsTable } from "./clients.ts";
import { fundProductsTable } from "./fundProducts.ts";
import { usersTable } from "./users.ts";

export const loanRequestsTable = pgTable("loan_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  requestNumber: varchar("request_number", { length: 30 }),
  clientId: uuid("client_id").notNull().references(() => clientsTable.id),
  productId: uuid("product_id").notNull().references(() => fundProductsTable.id),
  requestedAmount: decimal("requested_amount", { precision: 15, scale: 2 }).notNull(),
  termMonths: integer("term_months"),
  interestRate: decimal("interest_rate", { precision: 8, scale: 4 }),
  adminFee: decimal("admin_fee", { precision: 15, scale: 2 }),
  insuranceFee: decimal("insurance_fee", { precision: 15, scale: 2 }),
  stampDuty: decimal("stamp_duty", { precision: 15, scale: 2 }),
  workflowStatus: varchar("workflow_status", { length: 50 }).notNull().default("Draft"),
  assignedOfficerId: uuid("assigned_officer_id").references(() => usersTable.id),
  salesAgentId: uuid("sales_agent_id"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  documentUrls: text("document_urls").array(),
  iscoreChecked: boolean("iscore_checked").notNull().default(false),
  iscoreResult: jsonb("iscore_result"),
  blacklistChecked: boolean("blacklist_checked").notNull().default(false),
  blacklistClear: boolean("blacklist_clear").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLoanRequestSchema = createInsertSchema(loanRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLoanRequest = z.infer<typeof insertLoanRequestSchema>;
export type LoanRequest = typeof loanRequestsTable.$inferSelect;

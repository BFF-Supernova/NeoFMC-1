import { pgTable, uuid, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";
import { clientsTable } from "./clients.ts";

export const iscoreChecksTable = pgTable("iscore_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  clientId: uuid("client_id").notNull().references(() => clientsTable.id),
  nationalId: varchar("national_id", { length: 14 }).notNull(),
  score: integer("score"),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  result: varchar("result", { length: 30 }),
  responseData: jsonb("response_data"),
  checkedById: uuid("checked_by_id"),
  loanRequestId: uuid("loan_request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type IScoreCheck = typeof iscoreChecksTable.$inferSelect;

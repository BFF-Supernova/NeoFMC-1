import { pgTable, uuid, varchar, boolean, timestamp, text, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";
import { clientsTable } from "./clients.ts";

export const pdplConsentsTable = pgTable("pdpl_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  clientId: uuid("client_id").notNull().references(() => clientsTable.id),
  purpose: varchar("purpose", { length: 100 }).notNull(),
  granted: boolean("granted").notNull().default(false),
  consentDate: timestamp("consent_date").defaultNow(),
  revokedDate: timestamp("revoked_date"),
  expiresAt: timestamp("expires_at"),
  collectionMethod: varchar("collection_method", { length: 50 }),
  legalBasis: varchar("legal_basis", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dsarRequestsTable = pgTable("dsar_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  clientId: uuid("client_id").notNull().references(() => clientsTable.id),
  requestType: varchar("request_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("received"),
  requestedBy: uuid("requested_by"),
  assignedTo: uuid("assigned_to"),
  deadline: timestamp("deadline"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  responseData: jsonb("response_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

import { pgTable, uuid, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { clientsTable } from "./clients.ts";
import { loanRequestsTable } from "./loanRequests.ts";

export const documentsTable = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  clientId: uuid("client_id").references(() => clientsTable.id),
  guaranteeId: uuid("guarantee_id"),
  loanRequestId: uuid("loan_request_id").references(() => loanRequestsTable.id),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  documentName: varchar("document_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  version: integer("version").notNull().default(1),
  replacedById: uuid("replaced_by_id"),
  uploadedById: uuid("uploaded_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;

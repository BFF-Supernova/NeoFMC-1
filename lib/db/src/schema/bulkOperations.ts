import { pgTable, uuid, varchar, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";

export const bulkOperationsTable = pgTable("bulk_operations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  operationType: varchar("operation_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  fileName: varchar("file_name", { length: 255 }),
  totalRecords: integer("total_records").notNull().default(0),
  processedRecords: integer("processed_records").notNull().default(0),
  successRecords: integer("success_records").notNull().default(0),
  failedRecords: integer("failed_records").notNull().default(0),
  errorLog: jsonb("error_log"),
  resultData: jsonb("result_data"),
  createdById: uuid("created_by_id"),
  createdByName: varchar("created_by_name", { length: 255 }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBulkOperationSchema = createInsertSchema(bulkOperationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBulkOperation = z.infer<typeof insertBulkOperationSchema>;
export type BulkOperation = typeof bulkOperationsTable.$inferSelect;

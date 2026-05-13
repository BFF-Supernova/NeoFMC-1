import { pgTable, uuid, varchar, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";

export const webhooksTable = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  url: text("url").notNull(),
  events: jsonb("events").notNull().default([]),
  secret: varchar("secret", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdById: uuid("created_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookDeliveriesTable = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  webhookId: uuid("webhook_id").notNull().references(() => webhooksTable.id),
  event: varchar("event", { length: 100 }).notNull(),
  payload: jsonb("payload").notNull().default({}),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Webhook = typeof webhooksTable.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveriesTable.$inferSelect;

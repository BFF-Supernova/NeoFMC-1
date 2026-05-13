import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";

export const notificationTemplatesTable = pgTable("notification_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  templateType: varchar("template_type", { length: 30 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull().default("SMS"),
  subject: varchar("subject", { length: 255 }),
  bodyTemplate: text("body_template").notNull(),
  bodyTemplateAr: text("body_template_ar"),
  triggerEvent: varchar("trigger_event", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  variables: text("variables").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  templateId: uuid("template_id").references(() => notificationTemplatesTable.id),
  channel: varchar("channel", { length: 20 }).notNull(),
  recipientType: varchar("recipient_type", { length: 30 }).notNull().default("Client"),
  recipientId: uuid("recipient_id"),
  recipientContact: varchar("recipient_contact", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  body: text("body").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
export type NotificationTemplate = typeof notificationTemplatesTable.$inferSelect;

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;

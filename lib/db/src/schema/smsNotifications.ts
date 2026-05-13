import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";

export const smsNotificationsTable = pgTable("sms_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  recipientPhone: varchar("recipient_phone", { length: 20 }).notNull(),
  message: text("message").notNull(),
  templateKey: varchar("template_key", { length: 100 }),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  provider: varchar("provider", { length: 50 }),
  providerMessageId: varchar("provider_message_id", { length: 255 }),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdById: uuid("created_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SmsNotification = typeof smsNotificationsTable.$inferSelect;

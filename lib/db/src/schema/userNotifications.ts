import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";
import { usersTable } from "./users.ts";

export const userNotificationsTable = pgTable("user_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  titleAr: varchar("title_ar", { length: 255 }),
  message: text("message").notNull(),
  messageAr: text("message_ar"),
  severity: varchar("severity", { length: 20 }).notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  linkUrl: varchar("link_url", { length: 500 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

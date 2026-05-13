import { pgTable, uuid, varchar, boolean, numeric, timestamp, text, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";

export const platformAlertRulesTable = pgTable("platform_alert_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ruleType: varchar("rule_type", { length: 50 }).notNull(),
  threshold: numeric("threshold", { precision: 12, scale: 2 }),
  thresholdUnit: varchar("threshold_unit", { length: 30 }),
  isActive: boolean("is_active").notNull().default(true),
  config: jsonb("config").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const platformAlertsTable = pgTable("platform_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleId: uuid("rule_id").references(() => platformAlertRulesTable.id),
  tenantId: uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }),
  severity: varchar("severity", { length: 20 }).notNull().default("warning"),
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message"),
  ruleType: varchar("rule_type", { length: 50 }).notNull(),
  metricValue: numeric("metric_value", { precision: 15, scale: 4 }),
  isRead: boolean("is_read").notNull().default(false),
  isDismissed: boolean("is_dismissed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformAlertRule = typeof platformAlertRulesTable.$inferSelect;
export type PlatformAlert = typeof platformAlertsTable.$inferSelect;

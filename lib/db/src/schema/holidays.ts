import { pgTable, uuid, varchar, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";

export const holidaysTable = pgTable("holidays", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }),
  holidayDate: date("holiday_date").notNull(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

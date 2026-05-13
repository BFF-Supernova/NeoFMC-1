import { pgTable, uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";

export const clientGroupsTable = pgTable("client_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  groupName: varchar("group_name", { length: 255 }).notNull(),
  groupNameAr: varchar("group_name_ar", { length: 255 }),
  leaderId: uuid("leader_id"),
  leaderName: varchar("leader_name", { length: 255 }),
  maxMembers: integer("max_members").notNull().default(7),
  status: varchar("status", { length: 30 }).notNull().default("Active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientGroupMembersTable = pgTable("client_group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => clientGroupsTable.id),
  clientId: uuid("client_id").notNull(),
  clientName: varchar("client_name", { length: 255 }),
  role: varchar("role", { length: 30 }).notNull().default("Member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ClientGroup = typeof clientGroupsTable.$inferSelect;
export type ClientGroupMember = typeof clientGroupMembersTable.$inferSelect;

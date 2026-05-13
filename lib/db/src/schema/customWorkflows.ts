import { pgTable, uuid, varchar, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";

export const customWorkflowsTable = pgTable("custom_workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  workflowName: varchar("workflow_name", { length: 255 }).notNull(),
  workflowNameAr: varchar("workflow_name_ar", { length: 255 }),
  description: text("description"),
  entityType: varchar("entity_type", { length: 50 }).notNull().default("LoanRequest"),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowStepsTable = pgTable("workflow_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  workflowId: uuid("workflow_id").notNull().references(() => customWorkflowsTable.id, { onDelete: "cascade" }),
  stepName: varchar("step_name", { length: 255 }).notNull(),
  stepNameAr: varchar("step_name_ar", { length: 255 }),
  stepOrder: integer("step_order").notNull(),
  allowedRoles: text("allowed_roles").array(),
  allowedActions: text("allowed_actions").array(),
  viewableFields: text("viewable_fields").array(),
  editableFields: text("editable_fields").array(),
  requiredFields: text("required_fields").array(),
  autoTransitionTo: varchar("auto_transition_to", { length: 255 }),
  conditions: jsonb("conditions"),
  disbursementType: varchar("disbursement_type", { length: 50 }),
  isTerminal: boolean("is_terminal").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowInstancesTable = pgTable("workflow_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  workflowId: uuid("workflow_id").notNull().references(() => customWorkflowsTable.id),
  currentStepId: uuid("current_step_id").references(() => workflowStepsTable.id),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("InProgress"),
  history: jsonb("history"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomWorkflowSchema = createInsertSchema(customWorkflowsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomWorkflow = z.infer<typeof insertCustomWorkflowSchema>;
export type CustomWorkflow = typeof customWorkflowsTable.$inferSelect;

export const insertWorkflowStepSchema = createInsertSchema(workflowStepsTable).omit({ id: true, createdAt: true });
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;
export type WorkflowStep = typeof workflowStepsTable.$inferSelect;

export type WorkflowInstance = typeof workflowInstancesTable.$inferSelect;

import { pgTable, uuid, varchar, decimal, text, date, boolean, integer, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants.ts";
import { branchesTable } from "./branches.ts";
import { usersTable } from "./users.ts";

export const employeesTable = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").notNull().references(() => branchesTable.id),
  userId: uuid("user_id").references(() => usersTable.id),
  employeeCode: varchar("employee_code", { length: 50 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  fullNameAr: varchar("full_name_ar", { length: 255 }),
  nationalId: varchar("national_id", { length: 20 }),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 10 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  department: varchar("department", { length: 100 }),
  jobTitle: varchar("job_title", { length: 100 }),
  grade: varchar("grade", { length: 50 }),
  hireDate: date("hire_date").notNull(),
  contractType: varchar("contract_type", { length: 30 }).notNull().default("FullTime"),
  probationEndDate: date("probation_end_date"),
  confirmationDate: date("confirmation_date"),
  terminationDate: date("termination_date"),
  terminationReason: text("termination_reason"),
  status: varchar("status", { length: 30 }).notNull().default("Active"),
  basicSalary: decimal("basic_salary", { precision: 15, scale: 2 }).notNull().default("0.00"),
  housingAllowance: decimal("housing_allowance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  transportAllowance: decimal("transport_allowance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  phoneAllowance: decimal("phone_allowance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  otherAllowances: decimal("other_allowances", { precision: 15, scale: 2 }).notNull().default("0.00"),
  socialInsuranceNo: varchar("social_insurance_no", { length: 50 }),
  socialInsuranceSalary: decimal("social_insurance_salary", { precision: 15, scale: 2 }).notNull().default("0.00"),
  taxExemptions: decimal("tax_exemptions", { precision: 15, scale: 2 }).notNull().default("0.00"),
  bankName: varchar("bank_name", { length: 255 }),
  bankAccountNo: varchar("bank_account_no", { length: 100 }),
  bankIban: varchar("bank_iban", { length: 50 }),
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),
  annualLeaveBalance: decimal("annual_leave_balance", { precision: 5, scale: 1 }).notNull().default("21.0"),
  sickLeaveBalance: decimal("sick_leave_balance", { precision: 5, scale: 1 }).notNull().default("30.0"),
  documentUrls: text("document_urls").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("uq_tenant_employee_code").on(table.tenantId, table.employeeCode)]);

export const payrollConfigTable = pgTable("payroll_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  siEmployeeRate: decimal("si_employee_rate", { precision: 5, scale: 4 }).notNull().default("0.1100"),
  siEmployerRate: decimal("si_employer_rate", { precision: 5, scale: 4 }).notNull().default("0.1875"),
  siCeiling: decimal("si_ceiling", { precision: 15, scale: 2 }).notNull().default("12600.00"),
  siFloor: decimal("si_floor", { precision: 15, scale: 2 }).notNull().default("2000.00"),
  personalExemption: decimal("personal_exemption", { precision: 15, scale: 2 }).notNull().default("20000.00"),
  stampDutyEnabled: boolean("stamp_duty_enabled").notNull().default(false),
  stampDutyRate: decimal("stamp_duty_rate", { precision: 5, scale: 4 }).notNull().default("0.0000"),
  overtimeRate: decimal("overtime_rate", { precision: 5, scale: 2 }).notNull().default("1.50"),
  currency: varchar("currency", { length: 10 }).notNull().default("EGP"),
  payFrequency: varchar("pay_frequency", { length: 20 }).notNull().default("Monthly"),
  effectiveYear: integer("effective_year").notNull().default(2026),
  updatedById: uuid("updated_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("uq_payroll_config_tenant").on(table.tenantId)]);

export const payrollRunsTable = pgTable("payroll_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  branchId: uuid("branch_id").references(() => branchesTable.id),
  periodMonth: integer("period_month").notNull(),
  periodYear: integer("period_year").notNull(),
  totalGross: decimal("total_gross", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalDeductions: decimal("total_deductions", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalNet: decimal("total_net", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalSocialInsuranceEmployer: decimal("total_si_employer", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalSocialInsuranceEmployee: decimal("total_si_employee", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalIncomeTax: decimal("total_income_tax", { precision: 15, scale: 2 }).notNull().default("0.00"),
  employeeCount: integer("employee_count").notNull().default(0),
  status: varchar("status", { length: 30 }).notNull().default("Draft"),
  glSynced: boolean("gl_synced").notNull().default(false),
  processedById: uuid("processed_by_id").references(() => usersTable.id),
  submittedById: uuid("submitted_by_id").references(() => usersTable.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedById: uuid("approved_by_id").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  postedById: uuid("posted_by_id").references(() => usersTable.id),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payrollItemsTable = pgTable("payroll_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  payrollRunId: uuid("payroll_run_id").notNull().references(() => payrollRunsTable.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => employeesTable.id),
  basicSalary: decimal("basic_salary", { precision: 15, scale: 2 }).notNull(),
  allowances: decimal("allowances", { precision: 15, scale: 2 }).notNull().default("0.00"),
  overtime: decimal("overtime", { precision: 15, scale: 2 }).notNull().default("0.00"),
  grossSalary: decimal("gross_salary", { precision: 15, scale: 2 }).notNull(),
  socialInsuranceEmployee: decimal("si_employee", { precision: 15, scale: 2 }).notNull().default("0.00"),
  socialInsuranceEmployer: decimal("si_employer", { precision: 15, scale: 2 }).notNull().default("0.00"),
  incomeTax: decimal("income_tax", { precision: 15, scale: 2 }).notNull().default("0.00"),
  loanDeduction: decimal("loan_deduction", { precision: 15, scale: 2 }).notNull().default("0.00"),
  otherDeductions: decimal("other_deductions", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalDeductions: decimal("total_deductions", { precision: 15, scale: 2 }).notNull(),
  netSalary: decimal("net_salary", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leaveRequestsTable = pgTable("leave_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  employeeId: uuid("employee_id").notNull().references(() => employeesTable.id),
  leaveType: varchar("leave_type", { length: 30 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  days: decimal("days", { precision: 5, scale: 1 }).notNull(),
  reason: text("reason"),
  attachmentUrl: text("attachment_url"),
  status: varchar("status", { length: 30 }).notNull().default("Pending"),
  approvedById: uuid("approved_by_id").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendanceRecordsTable = pgTable("attendance_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  employeeId: uuid("employee_id").notNull().references(() => employeesTable.id),
  date: date("date").notNull(),
  clockIn: timestamp("clock_in", { withTimezone: true }),
  clockOut: timestamp("clock_out", { withTimezone: true }),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }).notNull().default("0.00"),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).notNull().default("0.00"),
  status: varchar("status", { length: 30 }).notNull().default("Present"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("uq_attendance_employee_date").on(table.tenantId, table.employeeId, table.date)]);

export const endOfServiceSettlementsTable = pgTable("end_of_service_settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
  employeeId: uuid("employee_id").notNull().references(() => employeesTable.id),
  lastWorkingDate: date("last_working_date").notNull(),
  yearsOfService: decimal("years_of_service", { precision: 5, scale: 2 }).notNull(),
  basicSalary: decimal("basic_salary", { precision: 15, scale: 2 }).notNull(),
  totalAllowances: decimal("total_allowances", { precision: 15, scale: 2 }).notNull().default("0.00"),
  eosAmount: decimal("eos_amount", { precision: 15, scale: 2 }).notNull(),
  accruedLeaveAmount: decimal("accrued_leave_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  pendingExpenseAmount: decimal("pending_expense_amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalSettlement: decimal("total_settlement", { precision: 15, scale: 2 }).notNull(),
  terminationReason: varchar("termination_reason", { length: 50 }).notNull().default("Resignation"),
  status: varchar("status", { length: 30 }).notNull().default("Draft"),
  approvedById: uuid("approved_by_id").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  glSynced: boolean("gl_synced").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;

export const insertPayrollConfigSchema = createInsertSchema(payrollConfigTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayrollConfig = z.infer<typeof insertPayrollConfigSchema>;
export type PayrollConfig = typeof payrollConfigTable.$inferSelect;

export const insertPayrollRunSchema = createInsertSchema(payrollRunsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayrollRun = z.infer<typeof insertPayrollRunSchema>;
export type PayrollRun = typeof payrollRunsTable.$inferSelect;

export const insertLeaveRequestSchema = createInsertSchema(leaveRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequestsTable.$inferSelect;

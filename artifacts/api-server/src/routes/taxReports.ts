import { Router } from "express";
import { db, payrollRunsTable, payrollItemsTable, employeesTable, payrollConfigTable, incomeTaxBracketsTable, glAccountsTable, journalEntriesTable, journalItemsTable } from "@workspace/db";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();
const FINANCE_ROLES = ["TenantAdmin", "Accountant", "FinancialController", "CFO", "HRManager"] as const;

router.get("/payroll-tax-report", requireAuth, requireRole(...FINANCE_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) { res.status(400).json({ error: "bad_request", message: "month and year required" }); return; }

    const runs = await db.select({ id: payrollRunsTable.id })
      .from(payrollRunsTable)
      .where(and(
        eq(payrollRunsTable.tenantId, tenantId),
        eq(payrollRunsTable.periodMonth, month),
        eq(payrollRunsTable.periodYear, year),
        sql`${payrollRunsTable.status} IN ('Approved', 'Posted')`,
      ));

    if (runs.length === 0) {
      res.json({ data: [], summary: { totalGross: 0, totalTax: 0, totalSI: 0, totalNet: 0, employeeCount: 0 }, month, year }); return;
    }

    const runIds = runs.map(r => r.id);
    const items = await db.select({
      employeeId: payrollItemsTable.employeeId,
      employeeName: employeesTable.fullName,
      employeeCode: employeesTable.employeeCode,
      nationalId: employeesTable.nationalId,
      socialInsuranceNo: employeesTable.socialInsuranceNo,
      department: employeesTable.department,
      grossSalary: payrollItemsTable.grossSalary,
      socialInsuranceEmployee: payrollItemsTable.socialInsuranceEmployee,
      socialInsuranceEmployer: payrollItemsTable.socialInsuranceEmployer,
      incomeTax: payrollItemsTable.incomeTax,
      netSalary: payrollItemsTable.netSalary,
    }).from(payrollItemsTable)
      .innerJoin(employeesTable, eq(payrollItemsTable.employeeId, employeesTable.id))
      .where(and(
        eq(payrollItemsTable.tenantId, tenantId),
        sql`${payrollItemsTable.payrollRunId} IN (${sql.join(runIds.map(id => sql`${id}`), sql`,`)})`,
      ));

    const data = items.map(i => ({
      ...i,
      grossSalary: Number(i.grossSalary),
      socialInsuranceEmployee: Number(i.socialInsuranceEmployee),
      socialInsuranceEmployer: Number(i.socialInsuranceEmployer),
      incomeTax: Number(i.incomeTax),
      netSalary: Number(i.netSalary),
    }));

    const summary = {
      totalGross: data.reduce((s, i) => s + i.grossSalary, 0),
      totalTax: data.reduce((s, i) => s + i.incomeTax, 0),
      totalSIEmployee: data.reduce((s, i) => s + i.socialInsuranceEmployee, 0),
      totalSIEmployer: data.reduce((s, i) => s + i.socialInsuranceEmployer, 0),
      totalNet: data.reduce((s, i) => s + i.netSalary, 0),
      employeeCount: data.length,
    };

    res.json({ data, summary, month, year });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/social-insurance-report", requireAuth, requireRole(...FINANCE_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) { res.status(400).json({ error: "bad_request", message: "month and year required" }); return; }

    const runs = await db.select({ id: payrollRunsTable.id })
      .from(payrollRunsTable)
      .where(and(
        eq(payrollRunsTable.tenantId, tenantId),
        eq(payrollRunsTable.periodMonth, month),
        eq(payrollRunsTable.periodYear, year),
        sql`${payrollRunsTable.status} IN ('Approved', 'Posted')`,
      ));

    if (runs.length === 0) {
      res.json({ data: [], summary: { totalEmployeeContribution: 0, totalEmployerContribution: 0, totalContribution: 0 }, month, year }); return;
    }

    const runIds = runs.map(r => r.id);
    const items = await db.select({
      employeeId: payrollItemsTable.employeeId,
      employeeName: employeesTable.fullName,
      employeeCode: employeesTable.employeeCode,
      nationalId: employeesTable.nationalId,
      socialInsuranceNo: employeesTable.socialInsuranceNo,
      basicSalary: payrollItemsTable.basicSalary,
      siEmployee: payrollItemsTable.socialInsuranceEmployee,
      siEmployer: payrollItemsTable.socialInsuranceEmployer,
    }).from(payrollItemsTable)
      .innerJoin(employeesTable, eq(payrollItemsTable.employeeId, employeesTable.id))
      .where(and(
        eq(payrollItemsTable.tenantId, tenantId),
        sql`${payrollItemsTable.payrollRunId} IN (${sql.join(runIds.map(id => sql`${id}`), sql`,`)})`,
      ));

    const data = items.map(i => ({
      ...i,
      basicSalary: Number(i.basicSalary),
      siEmployee: Number(i.siEmployee),
      siEmployer: Number(i.siEmployer),
      totalContribution: Number(i.siEmployee) + Number(i.siEmployer),
    }));

    const summary = {
      totalEmployeeContribution: data.reduce((s, i) => s + i.siEmployee, 0),
      totalEmployerContribution: data.reduce((s, i) => s + i.siEmployer, 0),
      totalContribution: data.reduce((s, i) => s + i.totalContribution, 0),
      employeeCount: data.length,
    };

    res.json({ data, summary, month, year });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/annual-tax-summary", requireAuth, requireRole(...FINANCE_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const year = Number(req.query.year);
    if (!year) { res.status(400).json({ error: "bad_request", message: "year required" }); return; }

    const items = await db.select({
      employeeId: payrollItemsTable.employeeId,
      employeeName: employeesTable.fullName,
      employeeCode: employeesTable.employeeCode,
      nationalId: employeesTable.nationalId,
      totalGross: sql<number>`COALESCE(SUM(CAST(${payrollItemsTable.grossSalary} AS NUMERIC)), 0)`,
      totalSI: sql<number>`COALESCE(SUM(CAST(${payrollItemsTable.socialInsuranceEmployee} AS NUMERIC)), 0)`,
      totalTax: sql<number>`COALESCE(SUM(CAST(${payrollItemsTable.incomeTax} AS NUMERIC)), 0)`,
      totalNet: sql<number>`COALESCE(SUM(CAST(${payrollItemsTable.netSalary} AS NUMERIC)), 0)`,
      monthsWorked: sql<number>`COUNT(DISTINCT ${payrollItemsTable.payrollRunId})`,
    }).from(payrollItemsTable)
      .innerJoin(employeesTable, eq(payrollItemsTable.employeeId, employeesTable.id))
      .innerJoin(payrollRunsTable, eq(payrollItemsTable.payrollRunId, payrollRunsTable.id))
      .where(and(
        eq(payrollItemsTable.tenantId, tenantId),
        eq(payrollRunsTable.periodYear, year),
        sql`${payrollRunsTable.status} IN ('Approved', 'Posted')`,
      ))
      .groupBy(payrollItemsTable.employeeId, employeesTable.fullName, employeesTable.employeeCode, employeesTable.nationalId);

    const data = items.map(i => ({
      ...i,
      totalGross: Number(i.totalGross),
      totalSI: Number(i.totalSI),
      totalTax: Number(i.totalTax),
      totalNet: Number(i.totalNet),
      monthsWorked: Number(i.monthsWorked),
    }));

    const summary = {
      totalGross: data.reduce((s, i) => s + i.totalGross, 0),
      totalTax: data.reduce((s, i) => s + i.totalTax, 0),
      totalSI: data.reduce((s, i) => s + i.totalSI, 0),
      totalNet: data.reduce((s, i) => s + i.totalNet, 0),
      employeeCount: data.length,
    };

    res.json({ data, summary, year });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/vat-return", requireAuth, requireRole(...FINANCE_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    if (!dateFrom || !dateTo) { res.status(400).json({ error: "bad_request", message: "dateFrom and dateTo required" }); return; }

    const glAccounts = await db.select().from(glAccountsTable).where(eq(glAccountsTable.tenantId, tenantId));
    const taxPayableAccount = glAccounts.find(a => a.accountCode === "2300");

    if (!taxPayableAccount) {
      res.json({
        taxCollected: 0, taxPaid: 0, netVatPayable: 0, dateFrom, dateTo,
        entries: [],
      }); return;
    }

    const entries = await db.select({
      entryId: journalEntriesTable.id,
      description: journalEntriesTable.description,
      referenceType: journalEntriesTable.referenceType,
      transactionDate: journalEntriesTable.transactionDate,
      debit: journalItemsTable.debit,
      credit: journalItemsTable.credit,
    }).from(journalItemsTable)
      .innerJoin(journalEntriesTable, eq(journalItemsTable.entryId, journalEntriesTable.id))
      .where(and(
        eq(journalItemsTable.tenantId, tenantId),
        eq(journalItemsTable.accountId, taxPayableAccount.id),
        gte(journalEntriesTable.transactionDate, new Date(dateFrom)),
        lte(journalEntriesTable.transactionDate, new Date(dateTo)),
      ));

    const taxCollected = entries.reduce((s, e) => s + Number(e.credit), 0);
    const taxPaid = entries.reduce((s, e) => s + Number(e.debit), 0);

    res.json({
      taxCollected: Math.round(taxCollected * 100) / 100,
      taxPaid: Math.round(taxPaid * 100) / 100,
      netVatPayable: Math.round((taxCollected - taxPaid) * 100) / 100,
      dateFrom, dateTo,
      entries: entries.map(e => ({
        ...e, debit: Number(e.debit), credit: Number(e.credit),
      })),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/withholding-tax", requireAuth, requireRole(...FINANCE_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    if (!dateFrom || !dateTo) { res.status(400).json({ error: "bad_request", message: "dateFrom and dateTo required" }); return; }

    const glAccounts = await db.select().from(glAccountsTable).where(eq(glAccountsTable.tenantId, tenantId));
    const taxPayableAccount = glAccounts.find(a => a.accountCode === "2300");

    if (!taxPayableAccount) {
      res.json({ entries: [], totalWithheld: 0, dateFrom, dateTo }); return;
    }

    const entries = await db.select({
      entryId: journalEntriesTable.id,
      description: journalEntriesTable.description,
      referenceType: journalEntriesTable.referenceType,
      transactionDate: journalEntriesTable.transactionDate,
      credit: journalItemsTable.credit,
    }).from(journalItemsTable)
      .innerJoin(journalEntriesTable, eq(journalItemsTable.entryId, journalEntriesTable.id))
      .where(and(
        eq(journalItemsTable.tenantId, tenantId),
        eq(journalItemsTable.accountId, taxPayableAccount.id),
        gte(journalEntriesTable.transactionDate, new Date(dateFrom)),
        lte(journalEntriesTable.transactionDate, new Date(dateTo)),
        sql`CAST(${journalItemsTable.credit} AS NUMERIC) > 0`,
      ));

    const totalWithheld = entries.reduce((s, e) => s + Number(e.credit), 0);

    res.json({
      entries: entries.map(e => ({ ...e, credit: Number(e.credit) })),
      totalWithheld: Math.round(totalWithheld * 100) / 100,
      dateFrom, dateTo,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

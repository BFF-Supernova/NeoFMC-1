import { Router } from "express";
import { db, employeesTable, endOfServiceSettlementsTable, leaveRequestsTable, expenseClaimsTable, journalEntriesTable, journalItemsTable, glAccountsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();
const HR_ROLES = ["TenantAdmin", "BranchManager", "HR", "HRManager"] as const;

function calculateEOSAmount(yearsOfService: number, monthlySalary: number): number {
  if (yearsOfService <= 0) return 0;
  const firstFiveYears = Math.min(yearsOfService, 5);
  const remainingYears = Math.max(0, yearsOfService - 5);
  const eos = (firstFiveYears * monthlySalary * 0.5) + (remainingYears * monthlySalary);
  return Math.round(eos * 100) / 100;
}

router.post("/calculate/:employeeId", requireAuth, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [emp] = await db.select().from(employeesTable)
      .where(and(eq(employeesTable.id, req.params.employeeId), eq(employeesTable.tenantId, tenantId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found" }); return; }

    const { lastWorkingDate, terminationReason, notes } = req.body;
    if (!lastWorkingDate) { res.status(400).json({ error: "bad_request", message: "lastWorkingDate required" }); return; }

    const [existingSettlement] = await db.select({ id: endOfServiceSettlementsTable.id })
      .from(endOfServiceSettlementsTable)
      .where(and(
        eq(endOfServiceSettlementsTable.tenantId, tenantId),
        eq(endOfServiceSettlementsTable.employeeId, emp.id),
        sql`${endOfServiceSettlementsTable.status} IN ('Draft', 'Approved')`,
      )).limit(1);
    if (existingSettlement) {
      res.status(400).json({ error: "bad_request", message: "An active settlement already exists for this employee. Please complete or cancel it first." }); return;
    }

    const hireDate = new Date(emp.hireDate);
    const endDate = new Date(lastWorkingDate);
    const diffMs = endDate.getTime() - hireDate.getTime();
    const yearsOfService = Math.round((diffMs / (365.25 * 86400000)) * 100) / 100;

    if (yearsOfService < 0) {
      res.status(400).json({ error: "bad_request", message: "lastWorkingDate cannot be before hireDate" }); return;
    }

    const basicSalary = Number(emp.basicSalary);
    const allowances = Number(emp.housingAllowance) + Number(emp.transportAllowance) + Number(emp.phoneAllowance) + Number(emp.otherAllowances);
    const monthlySalary = basicSalary + allowances;

    const eosAmount = calculateEOSAmount(yearsOfService, monthlySalary);

    const annualLeaveBalance = Number(emp.annualLeaveBalance);
    const dailyRate = monthlySalary / 30;
    const accruedLeaveAmount = Math.round(annualLeaveBalance * dailyRate * 100) / 100;

    const pendingExpenses = await db.select({
      total: sql<number>`COALESCE(SUM(CAST(${expenseClaimsTable.amount} AS NUMERIC)), 0)`,
    }).from(expenseClaimsTable)
      .where(and(
        eq(expenseClaimsTable.tenantId, tenantId),
        eq(expenseClaimsTable.employeeId, emp.id),
        eq(expenseClaimsTable.status, "Approved"),
      ));
    const pendingExpenseAmount = Number(pendingExpenses[0]?.total || 0);

    const totalSettlement = Math.round((eosAmount + accruedLeaveAmount + pendingExpenseAmount) * 100) / 100;

    const [settlement] = await db.insert(endOfServiceSettlementsTable).values({
      tenantId, employeeId: emp.id, lastWorkingDate,
      yearsOfService: yearsOfService.toString(),
      basicSalary: basicSalary.toString(),
      totalAllowances: allowances.toString(),
      eosAmount: eosAmount.toString(),
      accruedLeaveAmount: accruedLeaveAmount.toString(),
      pendingExpenseAmount: pendingExpenseAmount.toString(),
      totalSettlement: totalSettlement.toString(),
      terminationReason: terminationReason || "Resignation",
      notes,
    }).returning();

    await logAudit({
      tenantId, userId: req.user!.id, userName: req.user!.fullName || "",
      action: "EOS_CALCULATED", entity: "Employee", entityId: emp.id,
      details: {
        settlementId: settlement.id, yearsOfService, eosAmount,
        accruedLeaveAmount, pendingExpenseAmount, totalSettlement,
        terminationReason: terminationReason || "Resignation",
      },
    });

    res.status(201).json({
      ...settlement,
      yearsOfService: Number(settlement.yearsOfService),
      basicSalary: Number(settlement.basicSalary),
      totalAllowances: Number(settlement.totalAllowances),
      eosAmount: Number(settlement.eosAmount),
      accruedLeaveAmount: Number(settlement.accruedLeaveAmount),
      pendingExpenseAmount: Number(settlement.pendingExpenseAmount),
      totalSettlement: Number(settlement.totalSettlement),
      employeeName: emp.fullName,
      employeeCode: emp.employeeCode,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/", requireAuth, requireRole(...HR_ROLES, "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const settlements = await db.select({
      settlement: endOfServiceSettlementsTable,
      employeeName: employeesTable.fullName,
      employeeCode: employeesTable.employeeCode,
    }).from(endOfServiceSettlementsTable)
      .innerJoin(employeesTable, eq(endOfServiceSettlementsTable.employeeId, employeesTable.id))
      .where(eq(endOfServiceSettlementsTable.tenantId, tenantId))
      .orderBy(sql`${endOfServiceSettlementsTable.createdAt} DESC`).limit(50);

    res.json({
      data: settlements.map(({ settlement: s, employeeName, employeeCode }) => ({
        ...s,
        yearsOfService: Number(s.yearsOfService), basicSalary: Number(s.basicSalary),
        totalAllowances: Number(s.totalAllowances), eosAmount: Number(s.eosAmount),
        accruedLeaveAmount: Number(s.accruedLeaveAmount), pendingExpenseAmount: Number(s.pendingExpenseAmount),
        totalSettlement: Number(s.totalSettlement), employeeName, employeeCode,
      })),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id/approve", requireAuth, requireRole("TenantAdmin", "HRManager", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [settlement] = await db.select().from(endOfServiceSettlementsTable)
      .where(and(eq(endOfServiceSettlementsTable.id, req.params.id), eq(endOfServiceSettlementsTable.tenantId, tenantId))).limit(1);
    if (!settlement) { res.status(404).json({ error: "not_found" }); return; }
    if (settlement.status !== "Draft") { res.status(400).json({ error: "bad_request", message: "Only Draft settlements can be approved" }); return; }

    await db.transaction(async (tx) => {
      await tx.update(endOfServiceSettlementsTable).set({
        status: "Approved", approvedById: req.user!.id, approvedAt: new Date(), updatedAt: new Date(),
      }).where(eq(endOfServiceSettlementsTable.id, settlement.id));

      await tx.update(employeesTable).set({
        status: "Terminated",
        terminationDate: settlement.lastWorkingDate,
        terminationReason: settlement.terminationReason,
        updatedAt: new Date(),
      }).where(eq(employeesTable.id, settlement.employeeId));
    });

    await logAudit({
      tenantId, userId: req.user!.id, userName: req.user!.fullName || "",
      action: "EOS_APPROVED", entity: "Employee", entityId: settlement.employeeId,
      details: { settlementId: settlement.id, totalSettlement: Number(settlement.totalSettlement) },
    });

    res.json({ message: "Settlement approved, employee terminated" });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id/post", requireAuth, requireRole("TenantAdmin", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [settlement] = await db.select().from(endOfServiceSettlementsTable)
      .where(and(eq(endOfServiceSettlementsTable.id, req.params.id), eq(endOfServiceSettlementsTable.tenantId, tenantId))).limit(1);
    if (!settlement) { res.status(404).json({ error: "not_found" }); return; }
    if (settlement.status !== "Approved") { res.status(400).json({ error: "bad_request", message: "Only Approved settlements can be posted" }); return; }
    if (settlement.glSynced) { res.status(400).json({ error: "bad_request", message: "Already posted to GL" }); return; }

    const glAccounts = await db.select().from(glAccountsTable).where(eq(glAccountsTable.tenantId, tenantId));
    const findAccount = (code: string) => glAccounts.find(a => a.accountCode === code);
    const salariesAccount = findAccount("5001");
    const cashAtBankAccount = findAccount("1002");

    if (!salariesAccount || !cashAtBankAccount) {
      res.status(400).json({ error: "bad_request", message: "Required GL accounts not found (5001, 1002)" }); return;
    }

    const totalSettlement = Number(settlement.totalSettlement);

    await db.transaction(async (tx) => {
      const [entry] = await tx.insert(journalEntriesTable).values({
        tenantId, referenceType: "EndOfService", referenceId: settlement.id,
        description: `End-of-service settlement: ${totalSettlement.toFixed(2)} EGP`,
        totalDebit: totalSettlement.toFixed(2),
        totalCredit: totalSettlement.toFixed(2),
      }).returning();

      await tx.insert(journalItemsTable).values([
        { tenantId, entryId: entry.id, accountId: salariesAccount.id, debit: totalSettlement.toFixed(2), credit: "0.00" },
        { tenantId, entryId: entry.id, accountId: cashAtBankAccount.id, debit: "0.00", credit: totalSettlement.toFixed(2) },
      ]);

      await tx.update(endOfServiceSettlementsTable).set({
        status: "Posted", glSynced: true, updatedAt: new Date(),
      }).where(eq(endOfServiceSettlementsTable.id, settlement.id));
    });

    res.json({ message: "Settlement posted to GL" });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

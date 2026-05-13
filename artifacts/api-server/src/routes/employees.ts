import { Router } from "express";
import { db, employeesTable, payrollRunsTable, payrollItemsTable, payrollConfigTable, leaveRequestsTable, journalEntriesTable, journalItemsTable, glAccountsTable, usersTable, branchesTable, expenseClaimsTable, incomeTaxBracketsTable, attendanceRecordsTable } from "@workspace/db";
import { eq, and, desc, asc, sql, isNull, notInArray, inArray, gte, lte } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { generateFileName, validateFile, getUploadDir } from "../lib/fileHandler";
import fs from "fs";
import path from "path";

const router = Router();
const HR_ROLES = ["TenantAdmin", "BranchManager", "HR", "HRManager"] as const;
const PAYROLL_ROLES = ["TenantAdmin", "Accountant", "FinancialController", "CFO", "HR", "HRManager"] as const;

async function getNextEmployeeCode(tenantId: string, txOrDb: typeof db = db): Promise<string> {
  const [result] = await txOrDb.select({
    maxNum: sql<number>`COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(${employeesTable.employeeCode}, '^EMP-', ''), '') AS INTEGER)), 0)`
  }).from(employeesTable).where(
    and(eq(employeesTable.tenantId, tenantId), sql`${employeesTable.employeeCode} ~ '^EMP-[0-9]+$'`)
  );

  const nextNum = (Number(result?.maxNum) || 0) + 1;
  return `EMP-${String(nextNum).padStart(4, '0')}`;
}

router.get("/next-code", requireAuth, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const code = await getNextEmployeeCode(tenantId);
    res.json({ code });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/", requireAuth, requireRole(...HR_ROLES, "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const status = req.query.status as string | undefined;
    const branchId = req.query.branchId as string | undefined;

    let where = eq(employeesTable.tenantId, tenantId);
    if (status) where = and(where, eq(employeesTable.status, status)) as typeof where;
    if (branchId) where = and(where, eq(employeesTable.branchId, branchId)) as typeof where;

    const [employees, [{ count }]] = await Promise.all([
      db.select({
        employee: employeesTable,
        userName: usersTable.fullName,
        userEmail: usersTable.email,
        userRole: usersTable.role,
        userIsActive: usersTable.isActive,
      }).from(employeesTable)
        .leftJoin(usersTable, eq(employeesTable.userId, usersTable.id))
        .where(where).orderBy(desc(employeesTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(employeesTable).where(where),
    ]);
    res.json({
      data: employees.map(({ employee: e, userRole, userIsActive }) => ({
        ...e, basicSalary: Number(e.basicSalary), housingAllowance: Number(e.housingAllowance),
        transportAllowance: Number(e.transportAllowance), phoneAllowance: Number(e.phoneAllowance),
        otherAllowances: Number(e.otherAllowances), annualLeaveBalance: Number(e.annualLeaveBalance),
        sickLeaveBalance: Number(e.sickLeaveBalance),
        hasSystemAccess: !!e.userId,
        systemRole: userRole || null,
      })), total: Number(count), page, limit,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/", requireAuth, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const b = req.body;
    if (!b.branchId || !b.fullName || !b.hireDate) {
      res.status(400).json({ error: "bad_request", message: "branchId, fullName, hireDate required" }); return;
    }

    const emp = await db.transaction(async (tx) => {
      let validatedUserId = undefined;
      if (b.userId) {
        const [targetUser] = await tx.select({ id: usersTable.id, tenantId: usersTable.tenantId }).from(usersTable)
          .where(and(eq(usersTable.id, b.userId), eq(usersTable.tenantId, tenantId), eq(usersTable.isActive, true))).limit(1);
        if (!targetUser) throw new Error("INVALID_USER");
        const [alreadyLinked] = await tx.select({ id: employeesTable.id }).from(employeesTable)
          .where(and(eq(employeesTable.userId, b.userId), eq(employeesTable.tenantId, tenantId))).limit(1);
        if (alreadyLinked) throw new Error("USER_CONFLICT");
        validatedUserId = b.userId;
      }

      if (b.nationalId) {
        const [existingByNationalId] = await tx.select({ id: employeesTable.id, employeeCode: employeesTable.employeeCode, status: employeesTable.status })
          .from(employeesTable)
          .where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.nationalId, b.nationalId))).limit(1);
        if (existingByNationalId) {
          if (existingByNationalId.status === 'Terminated') {
            const [reactivated] = await tx.update(employeesTable).set({
              status: 'Active', branchId: b.branchId, userId: validatedUserId,
              fullName: b.fullName, fullNameAr: b.fullNameAr,
              phone: b.phone, email: b.email, address: b.address,
              department: b.department, jobTitle: b.jobTitle, grade: b.grade,
              hireDate: b.hireDate, contractType: b.contractType || 'FullTime',
              terminationDate: null, terminationReason: null,
              basicSalary: (b.basicSalary || 0).toString(),
              housingAllowance: (b.housingAllowance || 0).toString(),
              transportAllowance: (b.transportAllowance || 0).toString(),
              phoneAllowance: (b.phoneAllowance || 0).toString(),
              otherAllowances: (b.otherAllowances || 0).toString(),
              socialInsuranceNo: b.socialInsuranceNo,
              socialInsuranceSalary: (b.socialInsuranceSalary || 0).toString(),
              bankName: b.bankName, bankAccountNo: b.bankAccountNo, bankIban: b.bankIban,
              emergencyContactName: b.emergencyContactName, emergencyContactPhone: b.emergencyContactPhone,
              notes: b.notes, updatedAt: new Date(),
            }).where(eq(employeesTable.id, existingByNationalId.id)).returning();
            return { ...reactivated, _reactivated: true, _originalCode: existingByNationalId.employeeCode };
          }
          throw new Error("NATIONAL_ID_DUPLICATE");
        }
      }

      const employeeCode = await getNextEmployeeCode(tenantId, tx);

      const [dupCheck] = await tx.select({ id: employeesTable.id }).from(employeesTable)
        .where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.employeeCode, employeeCode))).limit(1);
      if (dupCheck) throw new Error("CODE_CONFLICT");

      const [created] = await tx.insert(employeesTable).values({
        tenantId, branchId: b.branchId, userId: validatedUserId, employeeCode,
        fullName: b.fullName, fullNameAr: b.fullNameAr, nationalId: b.nationalId,
        dateOfBirth: b.dateOfBirth, gender: b.gender, phone: b.phone, email: b.email,
        address: b.address, department: b.department, jobTitle: b.jobTitle, grade: b.grade,
        hireDate: b.hireDate, contractType: b.contractType || "FullTime",
        probationEndDate: b.probationEndDate, basicSalary: (b.basicSalary || 0).toString(),
        housingAllowance: (b.housingAllowance || 0).toString(),
        transportAllowance: (b.transportAllowance || 0).toString(),
        phoneAllowance: (b.phoneAllowance || 0).toString(),
        otherAllowances: (b.otherAllowances || 0).toString(),
        socialInsuranceNo: b.socialInsuranceNo,
        socialInsuranceSalary: (b.socialInsuranceSalary || 0).toString(),
        bankName: b.bankName, bankAccountNo: b.bankAccountNo, bankIban: b.bankIban,
        emergencyContactName: b.emergencyContactName, emergencyContactPhone: b.emergencyContactPhone,
        documentUrls: b.documentUrls || null, notes: b.notes,
      }).returning();
      return created;
    });

    if ((emp as any)._reactivated) {
      res.status(200).json({ ...emp, basicSalary: Number(emp.basicSalary), reactivated: true, employeeCode: (emp as any)._originalCode });
      return;
    }
    res.status(201).json({ ...emp, basicSalary: Number(emp.basicSalary) });
  } catch (err: any) {
    if (err.message === 'INVALID_USER') { res.status(400).json({ error: "bad_request", message: "Invalid userId — user not found in this tenant" }); return; }
    if (err.message === 'USER_CONFLICT') { res.status(409).json({ error: "conflict", message: "This user already has an employee record" }); return; }
    if (err.message === 'NATIONAL_ID_DUPLICATE') { res.status(409).json({ error: "conflict", message: "An active employee with this National ID already exists" }); return; }
    if (err.message === 'CODE_CONFLICT') { res.status(409).json({ error: "conflict", message: "Employee code conflict. Please try again." }); return; }
    if (err.code === '23505' && err.constraint === 'uq_tenant_employee_code') {
      res.status(409).json({ error: "conflict", message: "Employee code already exists. Please try again." }); return;
    }
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const b = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const fields = ["fullName", "fullNameAr", "nationalId", "dateOfBirth", "gender", "phone", "email", "address", "department", "jobTitle", "grade", "contractType", "status", "terminationDate", "terminationReason", "bankName", "bankAccountNo", "bankIban", "emergencyContactName", "emergencyContactPhone", "notes"];
    for (const f of fields) if (b[f] !== undefined) updateData[f] = b[f];
    const numFields = ["basicSalary", "housingAllowance", "transportAllowance", "phoneAllowance", "otherAllowances", "socialInsuranceSalary", "taxExemptions"];
    for (const f of numFields) if (b[f] !== undefined) updateData[f] = Number(b[f]).toString();
    const [updated] = await db.update(employeesTable).set(updateData)
      .where(and(eq(employeesTable.id, req.params.id), eq(employeesTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ ...updated, basicSalary: Number(updated.basicSalary) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/unlinked-users", requireAuth, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const linkedUserIds = await db.select({ userId: employeesTable.userId }).from(employeesTable)
      .where(and(eq(employeesTable.tenantId, tenantId), sql`${employeesTable.userId} IS NOT NULL`));
    const linkedIds = linkedUserIds.map(r => r.userId!).filter(Boolean);

    let usersWhere = and(eq(usersTable.tenantId, tenantId), eq(usersTable.isActive, true));
    if (linkedIds.length > 0) {
      usersWhere = and(usersWhere, notInArray(usersTable.id, linkedIds)) as typeof usersWhere;
    }
    const users = await db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email, role: usersTable.role, branchId: usersTable.branchId }).from(usersTable).where(usersWhere!);
    res.json({ data: users });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/sync-users", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const branches = await db.select().from(branchesTable).where(eq(branchesTable.tenantId, tenantId)).limit(1);
    const defaultBranchId = branches[0]?.id;
    if (!defaultBranchId) {
      res.status(400).json({ error: "bad_request", message: "No branches found. Create at least one branch before syncing users." });
      return;
    }

    const created = await db.transaction(async (tx) => {
      const linkedUserIds = await tx.select({ userId: employeesTable.userId }).from(employeesTable)
        .where(and(eq(employeesTable.tenantId, tenantId), sql`${employeesTable.userId} IS NOT NULL`));
      const linkedIds = linkedUserIds.map(r => r.userId!).filter(Boolean);

      let usersWhere = and(eq(usersTable.tenantId, tenantId), eq(usersTable.isActive, true));
      if (linkedIds.length > 0) {
        usersWhere = and(usersWhere, notInArray(usersTable.id, linkedIds)) as typeof usersWhere;
      }
      const unlinkedUsers = await tx.select().from(usersTable).where(usersWhere!);

      if (unlinkedUsers.length === 0) return [];

      const [maxResult] = await tx.select({
        maxNum: sql<number>`COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(${employeesTable.employeeCode}, '^EMP-', ''), '') AS INTEGER)), 0)`
      }).from(employeesTable).where(
        and(eq(employeesTable.tenantId, tenantId), sql`${employeesTable.employeeCode} ~ '^EMP-[0-9]+$'`)
      );
      let seqNum = Number(maxResult?.maxNum) || 0;

      const names: string[] = [];
      for (const user of unlinkedUsers) {
        const alreadyLinked = await tx.select({ id: employeesTable.id }).from(employeesTable)
          .where(and(eq(employeesTable.userId, user.id), eq(employeesTable.tenantId, tenantId))).limit(1);
        if (alreadyLinked.length > 0) continue;

        seqNum++;
        const code = `EMP-${String(seqNum).padStart(4, '0')}`;
        const branchId = user.branchId || defaultBranchId;

        await tx.insert(employeesTable).values({
          tenantId,
          branchId,
          userId: user.id,
          employeeCode: code,
          fullName: user.fullName,
          email: user.email,
          department: user.role,
          jobTitle: user.role,
          hireDate: new Date().toISOString().split('T')[0],
          status: "Active",
        });
        names.push(user.fullName);
      }
      return names;
    });

    if (created.length === 0) {
      res.json({ message: "All active users already have employee records", synced: 0 });
    } else {
      res.json({ message: `Synced ${created.length} users as employees`, synced: created.length, employees: created });
    }
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/leave-requests", requireAuth, requireRole(...HR_ROLES, ...PAYROLL_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const leaves = await db.select({
      leave: leaveRequestsTable,
      employeeName: employeesTable.fullName,
      employeeNameAr: employeesTable.fullNameAr,
      employeeCode: employeesTable.employeeCode,
    }).from(leaveRequestsTable)
      .leftJoin(employeesTable, eq(leaveRequestsTable.employeeId, employeesTable.id))
      .where(eq(leaveRequestsTable.tenantId, tenantId))
      .orderBy(desc(leaveRequestsTable.createdAt)).limit(100);
    res.json({ data: leaves.map(({ leave: l, employeeName, employeeNameAr, employeeCode }) => ({ ...l, days: Number(l.days), employeeName, employeeNameAr, employeeCode })) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/leave-requests", requireAuth, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { employeeId, leaveType, startDate, endDate, days, reason } = req.body;
    if (!employeeId || !leaveType || !startDate || !endDate || !days) {
      res.status(400).json({ error: "bad_request", message: "employeeId, leaveType, startDate, endDate, days required" }); return;
    }
    const [leave] = await db.insert(leaveRequestsTable).values({
      tenantId, employeeId, leaveType, startDate, endDate, days: Number(days).toString(), reason,
    }).returning();
    res.status(201).json({ ...leave, days: Number(leave.days) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/leave-requests/:id/approve", requireAuth, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { action, rejectionReason } = req.body;
    const [leave] = await db.select().from(leaveRequestsTable)
      .where(and(eq(leaveRequestsTable.id, req.params.id), eq(leaveRequestsTable.tenantId, tenantId))).limit(1);
    if (!leave) { res.status(404).json({ error: "not_found" }); return; }

    if (leave.status !== "Pending") { res.status(400).json({ error: "bad_request", message: "Can only approve/reject pending requests" }); return; }
    if (action === "approve") {
      await db.update(leaveRequestsTable).set({ status: "Approved", approvedById: req.user!.id, approvedAt: new Date(), updatedAt: new Date() }).where(eq(leaveRequestsTable.id, leave.id));
      const leaveField = leave.leaveType === "Annual" ? "annualLeaveBalance" : leave.leaveType === "Casual" ? "sickLeaveBalance" : null;
      if (leaveField) {
        await db.update(employeesTable).set({ [leaveField]: sql`CAST(${leaveField === "annualLeaveBalance" ? sql.raw("annual_leave_balance") : sql.raw("sick_leave_balance")} AS NUMERIC) - ${Number(leave.days)}`, updatedAt: new Date() }).where(eq(employeesTable.id, leave.employeeId));
      }
    } else if (action === "reject") {
      await db.update(leaveRequestsTable).set({ status: "Rejected", rejectionReason, updatedAt: new Date() }).where(eq(leaveRequestsTable.id, leave.id));
    } else {
      res.status(400).json({ error: "bad_request", message: "action must be 'approve' or 'reject'" }); return;
    }
    res.json({ message: `Leave ${action === "approve" ? "approved" : "rejected"}` });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/payroll-config", requireAuth, requireRole("TenantAdmin", "HRManager"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    let [config] = await db.select().from(payrollConfigTable).where(eq(payrollConfigTable.tenantId, tenantId)).limit(1);
    if (!config) {
      [config] = await db.insert(payrollConfigTable).values({ tenantId }).returning();
    }
    res.json({
      ...config,
      siEmployeeRate: Number(config.siEmployeeRate),
      siEmployerRate: Number(config.siEmployerRate),
      siCeiling: Number(config.siCeiling),
      siFloor: Number(config.siFloor),
      personalExemption: Number(config.personalExemption),
      stampDutyRate: Number(config.stampDutyRate),
      overtimeRate: Number(config.overtimeRate),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/payroll-config", requireAuth, requireRole("TenantAdmin", "HRManager"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { siEmployeeRate, siEmployerRate, siCeiling, siFloor, personalExemption, stampDutyEnabled, stampDutyRate, overtimeRate, currency, payFrequency, effectiveYear } = req.body;
    const rateFields = { siEmployeeRate, siEmployerRate, stampDutyRate, overtimeRate };
    for (const [k, v] of Object.entries(rateFields)) {
      if (v !== undefined && (typeof v !== 'number' || v < 0 || v > 100)) {
        res.status(400).json({ error: "bad_request", message: `${k} must be a number between 0 and 100` }); return;
      }
    }
    const amountFields = { siCeiling, siFloor, personalExemption };
    for (const [k, v] of Object.entries(amountFields)) {
      if (v !== undefined && (typeof v !== 'number' || v < 0)) {
        res.status(400).json({ error: "bad_request", message: `${k} must be a non-negative number` }); return;
      }
    }
    if (siCeiling !== undefined && siFloor !== undefined && siFloor > siCeiling) {
      res.status(400).json({ error: "bad_request", message: "SI floor cannot exceed SI ceiling" }); return;
    }
    const updates: Record<string, any> = { updatedAt: new Date(), updatedById: req.user!.id };
    if (siEmployeeRate !== undefined) updates.siEmployeeRate = siEmployeeRate.toString();
    if (siEmployerRate !== undefined) updates.siEmployerRate = siEmployerRate.toString();
    if (siCeiling !== undefined) updates.siCeiling = siCeiling.toString();
    if (siFloor !== undefined) updates.siFloor = siFloor.toString();
    if (personalExemption !== undefined) updates.personalExemption = personalExemption.toString();
    if (stampDutyEnabled !== undefined) updates.stampDutyEnabled = stampDutyEnabled;
    if (stampDutyRate !== undefined) updates.stampDutyRate = stampDutyRate.toString();
    if (overtimeRate !== undefined) updates.overtimeRate = overtimeRate.toString();
    if (currency) updates.currency = currency;
    if (payFrequency) updates.payFrequency = payFrequency;
    if (effectiveYear) updates.effectiveYear = effectiveYear;

    let [existing] = await db.select().from(payrollConfigTable).where(eq(payrollConfigTable.tenantId, tenantId)).limit(1);
    if (existing) {
      await db.update(payrollConfigTable).set(updates).where(eq(payrollConfigTable.id, existing.id));
    } else {
      await db.insert(payrollConfigTable).values({ tenantId, ...updates });
    }
    res.json({ message: "Payroll config updated" });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/tax-brackets", requireAuth, requireRole("TenantAdmin", "HRManager", ...PAYROLL_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const year = Number(req.query.year) || new Date().getFullYear();
    const brackets = await db.select().from(incomeTaxBracketsTable)
      .where(and(eq(incomeTaxBracketsTable.tenantId, tenantId), eq(incomeTaxBracketsTable.fiscalYear, year)))
      .orderBy(asc(incomeTaxBracketsTable.orderIndex));
    res.json({ data: brackets.map(b => ({ ...b, fromAmount: Number(b.fromAmount), toAmount: Number(b.toAmount), rate: Number(b.rate) })) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/tax-brackets", requireAuth, requireRole("TenantAdmin", "HRManager"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { brackets, fiscalYear } = req.body;
    if (!Array.isArray(brackets) || !fiscalYear) { res.status(400).json({ error: "bad_request" }); return; }
    for (const b of brackets) {
      if (typeof b.fromAmount !== 'number' || typeof b.toAmount !== 'number' || typeof b.rate !== 'number') {
        res.status(400).json({ error: "bad_request", message: "Each bracket must have numeric fromAmount, toAmount, and rate" }); return;
      }
      if (b.toAmount <= b.fromAmount) {
        res.status(400).json({ error: "bad_request", message: `Invalid bracket: toAmount (${b.toAmount}) must be greater than fromAmount (${b.fromAmount})` }); return;
      }
      if (b.rate < 0 || b.rate > 100) {
        res.status(400).json({ error: "bad_request", message: `Invalid rate: ${b.rate}. Must be between 0 and 100` }); return;
      }
    }
    await db.transaction(async (tx) => {
      await tx.delete(incomeTaxBracketsTable).where(and(eq(incomeTaxBracketsTable.tenantId, tenantId), eq(incomeTaxBracketsTable.fiscalYear, fiscalYear)));
      if (brackets.length > 0) {
        await tx.insert(incomeTaxBracketsTable).values(brackets.map((b: any, i: number) => ({
          tenantId, fromAmount: b.fromAmount.toString(), toAmount: b.toAmount.toString(),
          rate: b.rate.toString(), orderIndex: i + 1, fiscalYear,
        })));
      }
    });
    res.json({ message: "Tax brackets updated" });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/payroll", requireAuth, requireRole(...PAYROLL_ROLES, ...HR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const runs = await db.select().from(payrollRunsTable).where(eq(payrollRunsTable.tenantId, tenantId)).orderBy(desc(payrollRunsTable.createdAt)).limit(50);
    res.json({ data: runs.map(r => ({ ...r, totalGross: Number(r.totalGross), totalDeductions: Number(r.totalDeductions), totalNet: Number(r.totalNet), totalSocialInsuranceEmployer: Number(r.totalSocialInsuranceEmployer), totalSocialInsuranceEmployee: Number(r.totalSocialInsuranceEmployee), totalIncomeTax: Number(r.totalIncomeTax) })) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

function calculateTaxFromBrackets(annualTaxable: number, brackets: { fromAmount: number; toAmount: number; rate: number }[]): number {
  let totalTax = 0;
  for (const b of brackets) {
    if (annualTaxable <= b.fromAmount) break;
    const taxableInBracket = Math.min(annualTaxable, b.toAmount) - b.fromAmount;
    if (taxableInBracket > 0) totalTax += taxableInBracket * (b.rate / 100);
  }
  return totalTax;
}

router.post("/payroll/run", requireAuth, requireRole(...PAYROLL_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { periodMonth, periodYear, branchId } = req.body;
    if (!periodMonth || !periodYear) { res.status(400).json({ error: "bad_request", message: "periodMonth, periodYear required" }); return; }

    let [config] = await db.select().from(payrollConfigTable).where(eq(payrollConfigTable.tenantId, tenantId)).limit(1);
    if (!config) {
      [config] = await db.insert(payrollConfigTable).values({ tenantId }).returning();
    }
    const siEmpRate = Number(config.siEmployeeRate);
    const siErRate = Number(config.siEmployerRate);
    const siCeiling = Number(config.siCeiling);
    const siFloor = Number(config.siFloor);
    const personalExemption = Number(config.personalExemption);
    const overtimeMultiplier = Number(config.overtimeRate) || 1.5;

    const startDate = `${periodYear}-${String(periodMonth).padStart(2, "0")}-01`;
    const endDate = `${periodYear}-${String(periodMonth).padStart(2, "0")}-${new Date(periodYear, periodMonth, 0).getDate()}`;

    const overtimeData = await db.select({
      employeeId: attendanceRecordsTable.employeeId,
      totalOvertimeHours: sql<number>`COALESCE(SUM(CAST(${attendanceRecordsTable.overtimeHours} AS NUMERIC)), 0)`,
    }).from(attendanceRecordsTable)
      .where(and(
        eq(attendanceRecordsTable.tenantId, tenantId),
        gte(attendanceRecordsTable.date, startDate),
        lte(attendanceRecordsTable.date, endDate),
      ))
      .groupBy(attendanceRecordsTable.employeeId);
    const overtimeMap = new Map(overtimeData.map(o => [o.employeeId, Number(o.totalOvertimeHours)]));

    const rawBrackets = await db.select().from(incomeTaxBracketsTable)
      .where(and(eq(incomeTaxBracketsTable.tenantId, tenantId), eq(incomeTaxBracketsTable.fiscalYear, periodYear)))
      .orderBy(asc(incomeTaxBracketsTable.orderIndex));
    const brackets = rawBrackets.map(b => ({ fromAmount: Number(b.fromAmount), toAmount: Number(b.toAmount), rate: Number(b.rate) }));

    let empWhere = and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.status, "Active"));
    if (branchId) empWhere = and(empWhere, eq(employeesTable.branchId, branchId)) as typeof empWhere;
    const employees = await db.select().from(employeesTable).where(empWhere!);
    if (employees.length === 0) { res.status(400).json({ error: "bad_request", message: "No active employees found" }); return; }

    const [run] = await db.insert(payrollRunsTable).values({
      tenantId, branchId, periodMonth, periodYear, employeeCount: employees.length,
      processedById: req.user!.id,
    }).returning();

    let totalGross = 0, totalDeductions = 0, totalNet = 0, totalSiEmp = 0, totalSiEr = 0, totalTax = 0;

    const payrollItems: (typeof payrollItemsTable.$inferInsert)[] = [];
    for (const emp of employees) {
      const basic = Number(emp.basicSalary);
      const allowances = Number(emp.housingAllowance) + Number(emp.transportAllowance) + Number(emp.phoneAllowance) + Number(emp.otherAllowances);
      const overtimeHours = overtimeMap.get(emp.id) || 0;
      const hourlyRate = basic / (30 * 8);
      const overtimePay = Math.round(overtimeHours * hourlyRate * overtimeMultiplier * 100) / 100;
      const gross = basic + allowances + overtimePay;

      let siBase = Number(emp.socialInsuranceSalary) || basic;
      siBase = Math.max(siFloor, Math.min(siCeiling, siBase));
      const siEmployee = Math.round(siBase * siEmpRate * 100) / 100;
      const siEmployer = Math.round(siBase * siErRate * 100) / 100;

      const annualGross = (gross - siEmployee) * 12;
      const annualTaxable = Math.max(0, annualGross - personalExemption - Number(emp.taxExemptions) * 12);

      let monthlyTax = 0;
      if (brackets.length > 0) {
        const annualTax = calculateTaxFromBrackets(annualTaxable, brackets);
        monthlyTax = Math.round(annualTax / 12 * 100) / 100;
      } else {
        let annualTax = 0;
        if (annualTaxable > 1200000) annualTax = (annualTaxable - 1200000) * 0.275 + 212500;
        else if (annualTaxable > 900000) annualTax = (annualTaxable - 900000) * 0.25 + 137500;
        else if (annualTaxable > 700000) annualTax = (annualTaxable - 700000) * 0.225 + 92500;
        else if (annualTaxable > 400000) annualTax = (annualTaxable - 400000) * 0.20 + 32500;
        else if (annualTaxable > 200000) annualTax = (annualTaxable - 200000) * 0.15 + 2500;
        else if (annualTaxable > 40000) annualTax = (annualTaxable - 40000) * 0.10;
        monthlyTax = Math.round(annualTax / 12 * 100) / 100;
      }

      const totalDed = siEmployee + monthlyTax;
      const net = Math.round((gross - totalDed) * 100) / 100;

      payrollItems.push({
        tenantId, payrollRunId: run.id, employeeId: emp.id,
        basicSalary: basic.toString(), allowances: allowances.toString(),
        overtime: overtimePay.toString(),
        grossSalary: gross.toString(), socialInsuranceEmployee: siEmployee.toString(),
        socialInsuranceEmployer: siEmployer.toString(), incomeTax: monthlyTax.toString(),
        totalDeductions: totalDed.toString(), netSalary: net.toString(),
      });
      totalGross += gross; totalDeductions += totalDed; totalNet += net;
      totalSiEmp += siEmployee; totalSiEr += siEmployer; totalTax += monthlyTax;
    }

    if (payrollItems.length > 0) {
      await db.insert(payrollItemsTable).values(payrollItems);
    }

    await db.update(payrollRunsTable).set({
      totalGross: totalGross.toString(), totalDeductions: totalDeductions.toString(),
      totalNet: totalNet.toString(), totalSocialInsuranceEmployer: totalSiEr.toString(),
      totalSocialInsuranceEmployee: totalSiEmp.toString(), totalIncomeTax: totalTax.toString(),
      updatedAt: new Date(),
    }).where(eq(payrollRunsTable.id, run.id));

    res.status(201).json({ payrollRunId: run.id, employeeCount: employees.length, totalGross: Math.round(totalGross * 100) / 100, totalNet: Math.round(totalNet * 100) / 100, status: "Draft" });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/payroll/:id/items", requireAuth, requireRole(...PAYROLL_ROLES, ...HR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const items = await db.select({
      item: payrollItemsTable,
      employeeName: employeesTable.fullName,
      employeeNameAr: employeesTable.fullNameAr,
      employeeCode: employeesTable.employeeCode,
      department: employeesTable.department,
    }).from(payrollItemsTable)
      .leftJoin(employeesTable, eq(payrollItemsTable.employeeId, employeesTable.id))
      .where(and(eq(payrollItemsTable.payrollRunId, req.params.id), eq(payrollItemsTable.tenantId, tenantId)));
    res.json({
      data: items.map(({ item: i, employeeName, employeeNameAr, employeeCode, department }) => ({
        ...i, basicSalary: Number(i.basicSalary), allowances: Number(i.allowances),
        overtime: Number(i.overtime), grossSalary: Number(i.grossSalary),
        socialInsuranceEmployee: Number(i.socialInsuranceEmployee),
        socialInsuranceEmployer: Number(i.socialInsuranceEmployer), incomeTax: Number(i.incomeTax),
        loanDeduction: Number(i.loanDeduction), otherDeductions: Number(i.otherDeductions),
        totalDeductions: Number(i.totalDeductions), netSalary: Number(i.netSalary),
        employeeName, employeeNameAr, employeeCode, department,
      })),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/payroll/:id/submit", requireAuth, requireRole(...PAYROLL_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [run] = await db.select().from(payrollRunsTable).where(and(eq(payrollRunsTable.id, req.params.id), eq(payrollRunsTable.tenantId, tenantId))).limit(1);
    if (!run) { res.status(404).json({ error: "not_found" }); return; }
    if (run.status !== "Draft") { res.status(400).json({ error: "bad_request", message: "Only Draft payroll can be submitted" }); return; }
    await db.update(payrollRunsTable).set({ status: "Submitted", submittedById: req.user!.id, submittedAt: new Date(), updatedAt: new Date() }).where(eq(payrollRunsTable.id, run.id));
    res.json({ message: "Payroll submitted for approval" });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/payroll/:id/approve", requireAuth, requireRole("TenantAdmin", "HRManager", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [run] = await db.select().from(payrollRunsTable).where(and(eq(payrollRunsTable.id, req.params.id), eq(payrollRunsTable.tenantId, tenantId))).limit(1);
    if (!run) { res.status(404).json({ error: "not_found" }); return; }
    if (run.status !== "Submitted") { res.status(400).json({ error: "bad_request", message: "Only Submitted payroll can be approved" }); return; }
    if (run.processedById === req.user!.id || run.submittedById === req.user!.id) {
      res.status(400).json({ error: "bad_request", message: "Cannot approve own payroll (maker-checker separation)" }); return;
    }
    await db.update(payrollRunsTable).set({ status: "Approved", approvedById: req.user!.id, approvedAt: new Date(), updatedAt: new Date() }).where(eq(payrollRunsTable.id, run.id));
    res.json({ message: "Payroll approved" });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/payroll/:id/reject", requireAuth, requireRole("TenantAdmin", "HRManager", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { reason } = req.body;
    const [run] = await db.select().from(payrollRunsTable).where(and(eq(payrollRunsTable.id, req.params.id), eq(payrollRunsTable.tenantId, tenantId))).limit(1);
    if (!run) { res.status(404).json({ error: "not_found" }); return; }
    if (run.status !== "Submitted") { res.status(400).json({ error: "bad_request", message: "Only Submitted payroll can be rejected" }); return; }
    await db.update(payrollRunsTable).set({ status: "Rejected", rejectionReason: reason || "Rejected by approver", updatedAt: new Date() }).where(eq(payrollRunsTable.id, run.id));
    res.json({ message: "Payroll rejected" });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/payroll/:id/post", requireAuth, requireRole("TenantAdmin", "HRManager", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [run] = await db.select().from(payrollRunsTable).where(and(eq(payrollRunsTable.id, req.params.id), eq(payrollRunsTable.tenantId, tenantId))).limit(1);
    if (!run) { res.status(404).json({ error: "not_found" }); return; }
    if (run.status !== "Approved") { res.status(400).json({ error: "bad_request", message: "Only Approved payroll can be posted to finance" }); return; }
    if (run.glSynced) { res.status(400).json({ error: "bad_request", message: "Already posted to GL" }); return; }

    const totalGross = Number(run.totalGross);
    const totalSIEmployee = Number(run.totalSocialInsuranceEmployee);
    const totalSIEmployer = Number(run.totalSocialInsuranceEmployer);
    const totalTax = Number(run.totalIncomeTax);
    const totalNet = Number(run.totalNet);
    const totalDebitAmount = totalGross + totalSIEmployer;

    const glAccounts = await db.select().from(glAccountsTable).where(eq(glAccountsTable.tenantId, tenantId));
    const findAccount = (code: string) => glAccounts.find(a => a.accountCode === code);
    const salariesAccount = findAccount("5001");
    const taxPayableAccount = findAccount("2300");
    const accruedExpensesAccount = findAccount("2200");
    const cashAtBankAccount = findAccount("1002");

    if (!salariesAccount || !cashAtBankAccount) {
      res.status(400).json({ error: "bad_request", message: "Required GL accounts not found (5001 Salaries, 1002 Cash at Bank). Please seed chart of accounts first." }); return;
    }

    await db.transaction(async (tx) => {
      const [journalEntry] = await tx.insert(journalEntriesTable).values({
        tenantId, branchId: run.branchId, referenceType: "Payroll", referenceId: run.id,
        description: `Payroll ${run.periodMonth}/${run.periodYear} — Gross: ${totalGross.toFixed(2)} | SI(ER): ${totalSIEmployer.toFixed(2)} | Tax: ${totalTax.toFixed(2)} | Net: ${totalNet.toFixed(2)}`,
        totalDebit: totalDebitAmount.toFixed(2),
        totalCredit: totalDebitAmount.toFixed(2),
      }).returning();

      const journalItems: Array<{ tenantId: string; entryId: string; accountId: string; debit: string; credit: string }> = [];
      journalItems.push({ tenantId, entryId: journalEntry.id, accountId: salariesAccount.id, debit: totalDebitAmount.toFixed(2), credit: "0.00" });
      if (taxPayableAccount && totalTax > 0) {
        journalItems.push({ tenantId, entryId: journalEntry.id, accountId: taxPayableAccount.id, debit: "0.00", credit: totalTax.toFixed(2) });
      }
      if (accruedExpensesAccount && (totalSIEmployee + totalSIEmployer) > 0) {
        journalItems.push({ tenantId, entryId: journalEntry.id, accountId: accruedExpensesAccount.id, debit: "0.00", credit: (totalSIEmployee + totalSIEmployer).toFixed(2) });
      }
      const remainingCredit = totalDebitAmount - totalTax - totalSIEmployee - totalSIEmployer;
      if (cashAtBankAccount && remainingCredit > 0) {
        journalItems.push({ tenantId, entryId: journalEntry.id, accountId: cashAtBankAccount.id, debit: "0.00", credit: remainingCredit.toFixed(2) });
      }

      if (journalItems.length > 0) {
        await tx.insert(journalItemsTable).values(journalItems);
      }

      await tx.update(payrollRunsTable).set({ status: "Posted", glSynced: true, postedById: req.user!.id, postedAt: new Date(), updatedAt: new Date() }).where(eq(payrollRunsTable.id, run.id));

      res.json({ message: "Payroll posted to finance", journalEntryId: journalEntry.id });
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/my-profile", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [emp] = await db.select().from(employeesTable)
      .where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.userId, userId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found", message: "No employee record linked to your user account" }); return; }
    res.json({
      id: emp.id, employeeCode: emp.employeeCode, fullName: emp.fullName, fullNameAr: emp.fullNameAr,
      nationalId: emp.nationalId, phone: emp.phone, email: emp.email, department: emp.department,
      jobTitle: emp.jobTitle, grade: emp.grade, hireDate: emp.hireDate, contractType: emp.contractType,
      status: emp.status, bankName: emp.bankName, bankAccountNo: emp.bankAccountNo, bankIban: emp.bankIban,
      annualLeaveBalance: Number(emp.annualLeaveBalance), sickLeaveBalance: Number(emp.sickLeaveBalance),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.patch("/my-profile/bank", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [emp] = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.userId, userId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found", message: "No employee record linked to your user account" }); return; }

    const { bankName, bankAccountNo, bankIban } = req.body;
    if (!bankName && !bankAccountNo && !bankIban) {
      res.status(400).json({ error: "bad_request", message: "At least one bank field is required" }); return;
    }
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (typeof bankName === "string") updates.bankName = bankName.trim().slice(0, 255);
    if (typeof bankAccountNo === "string") updates.bankAccountNo = bankAccountNo.trim().slice(0, 100);
    if (typeof bankIban === "string") {
      const cleaned = bankIban.trim().toUpperCase().slice(0, 34);
      updates.bankIban = cleaned;
    }
    await db.update(employeesTable).set(updates).where(eq(employeesTable.id, emp.id));
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

router.post("/my-expenses/upload-receipt", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [emp] = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.userId, userId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found", message: "No employee record linked to your user account" }); return; }

    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      res.status(400).json({ error: "bad_request", message: "Content-Type must be multipart/form-data" }); return;
    }

    let totalSize = 0;
    const chunks: Buffer[] = [];
    let aborted = false;

    req.on("data", (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_UPLOAD_SIZE) {
        if (!aborted) {
          aborted = true;
          res.status(413).json({ error: "bad_request", message: "File too large. Maximum size is 5MB" });
          req.destroy();
        }
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", async () => {
      if (aborted) return;
      try {
        const fullBuffer = Buffer.concat(chunks);
        const boundary = contentType.split("boundary=")[1];
        if (!boundary) { res.status(400).json({ error: "bad_request", message: "No boundary found" }); return; }

        const parts = fullBuffer.toString("binary").split(`--${boundary}`);
        let fileBuffer: Buffer | null = null;
        let originalName = "receipt";
        let mimeType = "application/octet-stream";

        for (const part of parts) {
          if (part.includes("filename=")) {
            const nameMatch = part.match(/filename="([^"]+)"/);
            if (nameMatch) originalName = nameMatch[1];
            const typeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
            if (typeMatch) mimeType = typeMatch[1].trim();
            const headerEnd = part.indexOf("\r\n\r\n");
            if (headerEnd !== -1) {
              const fileData = part.substring(headerEnd + 4);
              const cleanData = fileData.replace(/\r\n$/, "");
              fileBuffer = Buffer.from(cleanData, "binary");
            }
          }
        }

        if (!fileBuffer) { res.status(400).json({ error: "bad_request", message: "No file found in upload" }); return; }

        const validationError = validateFile({ originalname: originalName, mimetype: mimeType, size: fileBuffer.length });
        if (validationError) { res.status(400).json({ error: "bad_request", message: validationError }); return; }

        const fileName = generateFileName(originalName);
        const filePath = path.join(getUploadDir(), fileName);
        fs.writeFileSync(filePath, fileBuffer);

        res.json({ url: `/api/employees/receipt/${fileName}`, fileName: originalName });
      } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/receipt/:fileName", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const fileName = req.params.fileName;
    if (!fileName || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
      res.status(400).json({ error: "bad_request", message: "Invalid file name" }); return;
    }
    const filePath = path.join(getUploadDir(), fileName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "not_found", message: "File not found" }); return;
    }
    res.sendFile(filePath);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/my-leaves/upload-attachment", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [emp] = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.userId, userId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found", message: "No employee record linked to your user account" }); return; }

    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      res.status(400).json({ error: "bad_request", message: "Content-Type must be multipart/form-data" }); return;
    }

    let totalSize = 0;
    const chunks: Buffer[] = [];
    let aborted = false;

    req.on("data", (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_UPLOAD_SIZE) {
        if (!aborted) {
          aborted = true;
          res.status(413).json({ error: "bad_request", message: "File too large. Maximum size is 5MB" });
          req.destroy();
        }
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", async () => {
      if (aborted) return;
      try {
        const fullBuffer = Buffer.concat(chunks);
        const boundary = contentType.split("boundary=")[1];
        if (!boundary) { res.status(400).json({ error: "bad_request", message: "No boundary found" }); return; }

        const parts = fullBuffer.toString("binary").split(`--${boundary}`);
        let fileBuffer: Buffer | null = null;
        let originalName = "doctor-note";
        let mimeType = "application/octet-stream";

        for (const part of parts) {
          if (part.includes("filename=")) {
            const nameMatch = part.match(/filename="([^"]+)"/);
            if (nameMatch) originalName = nameMatch[1];
            const typeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
            if (typeMatch) mimeType = typeMatch[1].trim();
            const headerEnd = part.indexOf("\r\n\r\n");
            if (headerEnd !== -1) {
              const fileData = part.substring(headerEnd + 4);
              const cleanData = fileData.replace(/\r\n$/, "");
              fileBuffer = Buffer.from(cleanData, "binary");
            }
          }
        }

        if (!fileBuffer) { res.status(400).json({ error: "bad_request", message: "No file found in upload" }); return; }

        const validationError = validateFile({ originalname: originalName, mimetype: mimeType, size: fileBuffer.length });
        if (validationError) { res.status(400).json({ error: "bad_request", message: validationError }); return; }

        const fileName = generateFileName(originalName);
        const filePath = path.join(getUploadDir(), fileName);
        fs.writeFileSync(filePath, fileBuffer);

        res.json({ url: `/api/employees/receipt/${fileName}`, fileName: originalName });
      } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/my-payslips", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [emp] = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.userId, userId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found", message: "No employee record linked" }); return; }

    const items = await db.select({
      id: payrollItemsTable.id,
      payrollRunId: payrollItemsTable.payrollRunId,
      basicSalary: payrollItemsTable.basicSalary,
      allowances: payrollItemsTable.allowances,
      grossSalary: payrollItemsTable.grossSalary,
      socialInsuranceEmployee: payrollItemsTable.socialInsuranceEmployee,
      incomeTax: payrollItemsTable.incomeTax,
      totalDeductions: payrollItemsTable.totalDeductions,
      netSalary: payrollItemsTable.netSalary,
      periodMonth: payrollRunsTable.periodMonth,
      periodYear: payrollRunsTable.periodYear,
      runStatus: payrollRunsTable.status,
      createdAt: payrollItemsTable.createdAt,
    }).from(payrollItemsTable)
      .innerJoin(payrollRunsTable, eq(payrollItemsTable.payrollRunId, payrollRunsTable.id))
      .where(and(
        eq(payrollItemsTable.tenantId, tenantId),
        eq(payrollItemsTable.employeeId, emp.id),
        eq(payrollRunsTable.status, "Approved"),
      ))
      .orderBy(desc(payrollRunsTable.periodYear), desc(payrollRunsTable.periodMonth))
      .limit(24);

    res.json({
      data: items.map(i => ({
        ...i,
        basicSalary: Number(i.basicSalary), allowances: Number(i.allowances),
        grossSalary: Number(i.grossSalary), socialInsuranceEmployee: Number(i.socialInsuranceEmployee),
        incomeTax: Number(i.incomeTax), totalDeductions: Number(i.totalDeductions), netSalary: Number(i.netSalary),
      }))
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/my-leaves", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [emp] = await db.select({ id: employeesTable.id, annualLeaveBalance: employeesTable.annualLeaveBalance, sickLeaveBalance: employeesTable.sickLeaveBalance })
      .from(employeesTable).where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.userId, userId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found", message: "No employee record linked" }); return; }

    const leaves = await db.select().from(leaveRequestsTable)
      .where(and(eq(leaveRequestsTable.tenantId, tenantId), eq(leaveRequestsTable.employeeId, emp.id)))
      .orderBy(desc(leaveRequestsTable.createdAt)).limit(50);

    res.json({
      balances: { annual: Number(emp.annualLeaveBalance), sick: Number(emp.sickLeaveBalance) },
      data: leaves.map(l => ({ ...l, days: Number(l.days) })),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/my-leaves", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [emp] = await db.select({ id: employeesTable.id, annualLeaveBalance: employeesTable.annualLeaveBalance, sickLeaveBalance: employeesTable.sickLeaveBalance })
      .from(employeesTable).where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.userId, userId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found", message: "No employee record linked" }); return; }

    const { leaveType, startDate, endDate, days, reason, attachmentUrl } = req.body;
    if (!leaveType || !startDate || !endDate || !days) {
      res.status(400).json({ error: "bad_request", message: "leaveType, startDate, endDate, days required" }); return;
    }
    const VALID_LEAVE_TYPES = ["Annual", "Casual", "Maternity", "Paternity", "Condolence", "BusinessTrip", "SickNonDocumented", "SickDocumented"];
    if (!VALID_LEAVE_TYPES.includes(leaveType)) {
      res.status(400).json({ error: "bad_request", message: `leaveType must be one of: ${VALID_LEAVE_TYPES.join(", ")}` }); return;
    }
    const parsedDays = Number(days);
    if (!Number.isFinite(parsedDays) || parsedDays <= 0) { res.status(400).json({ error: "bad_request", message: "days must be a positive number" }); return; }
    const startD = new Date(startDate); const endD = new Date(endDate);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime())) { res.status(400).json({ error: "bad_request", message: "startDate and endDate must be valid dates" }); return; }
    if (startD > endD) { res.status(400).json({ error: "bad_request", message: "startDate must be before or equal to endDate" }); return; }
    if (leaveType === "SickNonDocumented" && parsedDays > 3) {
      res.status(400).json({ error: "bad_request", message: "Sick Leave (Non-Documented) cannot exceed 3 consecutive days" }); return;
    }
    if (leaveType === "SickDocumented" && !attachmentUrl) {
      res.status(400).json({ error: "bad_request", message: "Doctor's note attachment is required for Documented Sick Leave" }); return;
    }
    if (leaveType === "Annual") {
      const balance = Number(emp.annualLeaveBalance);
      if (parsedDays > balance) {
        res.status(400).json({ error: "bad_request", message: `Insufficient annual leave balance (${balance} days remaining)` }); return;
      }
    } else if (leaveType === "Casual") {
      const balance = Number(emp.sickLeaveBalance);
      if (parsedDays > balance) {
        res.status(400).json({ error: "bad_request", message: `Insufficient casual leave balance (${balance} days remaining)` }); return;
      }
    }

    const [leave] = await db.insert(leaveRequestsTable).values({
      tenantId, employeeId: emp.id, leaveType, startDate, endDate, days: Number(days).toString(), reason,
      attachmentUrl: attachmentUrl || null,
    }).returning();
    res.status(201).json({ ...leave, days: Number(leave.days) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/my-expenses", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [emp] = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.userId, userId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found", message: "No employee record linked" }); return; }

    const claims = await db.select().from(expenseClaimsTable)
      .where(and(eq(expenseClaimsTable.tenantId, tenantId), eq(expenseClaimsTable.employeeId, emp.id)))
      .orderBy(desc(expenseClaimsTable.createdAt)).limit(50);

    res.json({ data: claims.map(c => ({ ...c, amount: Number(c.amount) })) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/my-expenses", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [emp] = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.userId, userId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found", message: "No employee record linked" }); return; }

    const { category, description, amount, receiptUrl } = req.body;
    if (!category || !description || !amount) {
      res.status(400).json({ error: "bad_request", message: "category, description, amount required" }); return;
    }
    const VALID_CATEGORIES = ["Transport", "Meals", "Office Supplies", "Travel", "Communication", "Other"];
    if (!VALID_CATEGORIES.includes(category)) {
      res.status(400).json({ error: "bad_request", message: `category must be one of: ${VALID_CATEGORIES.join(", ")}` }); return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { res.status(400).json({ error: "bad_request", message: "amount must be a positive number" }); return; }

    const [claim] = await db.insert(expenseClaimsTable).values({
      tenantId, employeeId: emp.id, category, description,
      amount: parsedAmount.toFixed(2), receiptUrl: receiptUrl || null,
    }).returning();
    res.status(201).json({ ...claim, amount: Number(claim.amount) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/expense-claims", requireAuth, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const claims = await db.select({
      id: expenseClaimsTable.id, tenantId: expenseClaimsTable.tenantId,
      employeeId: expenseClaimsTable.employeeId, category: expenseClaimsTable.category,
      description: expenseClaimsTable.description, amount: expenseClaimsTable.amount,
      receiptUrl: expenseClaimsTable.receiptUrl, status: expenseClaimsTable.status,
      rejectionReason: expenseClaimsTable.rejectionReason,
      createdAt: expenseClaimsTable.createdAt, updatedAt: expenseClaimsTable.updatedAt,
      employeeName: employeesTable.fullName, employeeCode: employeesTable.employeeCode,
    }).from(expenseClaimsTable)
      .innerJoin(employeesTable, eq(expenseClaimsTable.employeeId, employeesTable.id))
      .where(eq(expenseClaimsTable.tenantId, tenantId))
      .orderBy(desc(expenseClaimsTable.createdAt)).limit(100);
    res.json({ data: claims.map(c => ({ ...c, amount: Number(c.amount) })) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/expense-claims/:id/approve", requireAuth, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { action, rejectionReason } = req.body;
    const [claim] = await db.select().from(expenseClaimsTable)
      .where(and(eq(expenseClaimsTable.id, req.params.id), eq(expenseClaimsTable.tenantId, tenantId))).limit(1);
    if (!claim) { res.status(404).json({ error: "not_found" }); return; }

    if (claim.status !== "Pending") { res.status(400).json({ error: "bad_request", message: "Can only approve/reject pending claims" }); return; }
    if (action === "approve") {
      await db.update(expenseClaimsTable).set({ status: "Approved", approvedById: req.user!.id, approvedAt: new Date(), updatedAt: new Date() }).where(eq(expenseClaimsTable.id, claim.id));
    } else if (action === "reject") {
      await db.update(expenseClaimsTable).set({ status: "Rejected", rejectionReason, updatedAt: new Date() }).where(eq(expenseClaimsTable.id, claim.id));
    } else {
      res.status(400).json({ error: "bad_request", message: "action must be 'approve' or 'reject'" }); return;
    }
    res.json({ message: `Expense claim ${action === "approve" ? "approved" : "rejected"}` });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

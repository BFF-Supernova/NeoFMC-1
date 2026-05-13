import { Router } from "express";
import { db, attendanceRecordsTable, employeesTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();
const HR_ROLES = ["TenantAdmin", "BranchManager", "HR", "HRManager"] as const;
const STANDARD_HOURS = 8;

router.post("/clock-in", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [emp] = await db.select({ id: employeesTable.id, fullName: employeesTable.fullName })
      .from(employeesTable)
      .where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.userId, userId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found", message: "No employee record linked to your user account" }); return; }

    const today = new Date().toISOString().split("T")[0];
    const [existing] = await db.select({ id: attendanceRecordsTable.id, clockIn: attendanceRecordsTable.clockIn })
      .from(attendanceRecordsTable)
      .where(and(
        eq(attendanceRecordsTable.tenantId, tenantId),
        eq(attendanceRecordsTable.employeeId, emp.id),
        eq(attendanceRecordsTable.date, today),
      )).limit(1);

    if (existing?.clockIn) {
      res.status(400).json({ error: "bad_request", message: "Already clocked in today" }); return;
    }

    const now = new Date();
    if (existing) {
      await db.update(attendanceRecordsTable)
        .set({ clockIn: now, status: "Present", updatedAt: now })
        .where(eq(attendanceRecordsTable.id, existing.id));
      res.json({ message: "Clocked in", clockIn: now, date: today });
    } else {
      const [record] = await db.insert(attendanceRecordsTable).values({
        tenantId, employeeId: emp.id, date: today, clockIn: now, status: "Present",
      }).returning();
      res.status(201).json({ message: "Clocked in", clockIn: now, date: today, id: record.id });
    }

    await logAudit({
      tenantId, userId, userName: emp.fullName,
      action: "ATTENDANCE_CLOCK_IN", entity: "Employee", entityId: emp.id,
      details: { date: today, clockIn: now.toISOString() },
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/clock-out", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [emp] = await db.select({ id: employeesTable.id, fullName: employeesTable.fullName })
      .from(employeesTable)
      .where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.userId, userId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found", message: "No employee record linked" }); return; }

    const today = new Date().toISOString().split("T")[0];
    const [record] = await db.select()
      .from(attendanceRecordsTable)
      .where(and(
        eq(attendanceRecordsTable.tenantId, tenantId),
        eq(attendanceRecordsTable.employeeId, emp.id),
        eq(attendanceRecordsTable.date, today),
      )).limit(1);

    if (!record || !record.clockIn) {
      res.status(400).json({ error: "bad_request", message: "No clock-in found for today" }); return;
    }
    if (record.clockOut) {
      res.status(400).json({ error: "bad_request", message: "Already clocked out today" }); return;
    }

    const now = new Date();
    const diffMs = now.getTime() - new Date(record.clockIn).getTime();
    const hoursWorked = Math.round((diffMs / 3600000) * 100) / 100;
    const overtimeHours = Math.max(0, Math.round((hoursWorked - STANDARD_HOURS) * 100) / 100);

    await db.update(attendanceRecordsTable).set({
      clockOut: now, hoursWorked: hoursWorked.toString(),
      overtimeHours: overtimeHours.toString(), updatedAt: now,
    }).where(eq(attendanceRecordsTable.id, record.id));

    await logAudit({
      tenantId, userId, userName: emp.fullName,
      action: "ATTENDANCE_CLOCK_OUT", entity: "Employee", entityId: emp.id,
      details: { date: today, clockOut: now.toISOString(), hoursWorked, overtimeHours },
    });

    res.json({ message: "Clocked out", clockOut: now, hoursWorked, overtimeHours, date: today });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/my-attendance", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [emp] = await db.select({ id: employeesTable.id })
      .from(employeesTable)
      .where(and(eq(employeesTable.tenantId, tenantId), eq(employeesTable.userId, userId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found", message: "No employee record linked" }); return; }

    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    const year = Number(req.query.year) || new Date().getFullYear();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

    const records = await db.select().from(attendanceRecordsTable)
      .where(and(
        eq(attendanceRecordsTable.tenantId, tenantId),
        eq(attendanceRecordsTable.employeeId, emp.id),
        gte(attendanceRecordsTable.date, startDate),
        lte(attendanceRecordsTable.date, endDate),
      )).orderBy(desc(attendanceRecordsTable.date));

    const totalHours = records.reduce((s, r) => s + Number(r.hoursWorked), 0);
    const totalOT = records.reduce((s, r) => s + Number(r.overtimeHours), 0);

    res.json({
      data: records.map(r => ({ ...r, hoursWorked: Number(r.hoursWorked), overtimeHours: Number(r.overtimeHours) })),
      summary: {
        totalDays: records.length,
        totalHours: Math.round(totalHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOT * 100) / 100,
        month, year,
      },
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/", requireAuth, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const employeeId = req.query.employeeId as string;

    if (!dateFrom || !dateTo) {
      res.status(400).json({ error: "bad_request", message: "dateFrom and dateTo required" }); return;
    }

    let where = and(
      eq(attendanceRecordsTable.tenantId, tenantId),
      gte(attendanceRecordsTable.date, dateFrom),
      lte(attendanceRecordsTable.date, dateTo),
    );
    if (employeeId) where = and(where, eq(attendanceRecordsTable.employeeId, employeeId)) as typeof where;

    const records = await db.select({
      record: attendanceRecordsTable,
      employeeName: employeesTable.fullName,
      employeeCode: employeesTable.employeeCode,
      department: employeesTable.department,
    }).from(attendanceRecordsTable)
      .innerJoin(employeesTable, eq(attendanceRecordsTable.employeeId, employeesTable.id))
      .where(where!)
      .orderBy(desc(attendanceRecordsTable.date))
      .limit(500);

    res.json({
      data: records.map(({ record: r, employeeName, employeeCode, department }) => ({
        ...r, hoursWorked: Number(r.hoursWorked), overtimeHours: Number(r.overtimeHours),
        employeeName, employeeCode, department,
      })),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/manual", requireAuth, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const { employeeId, date, clockIn, clockOut, status, notes } = req.body;
    if (!employeeId || !date) {
      res.status(400).json({ error: "bad_request", message: "employeeId and date required" }); return;
    }

    const [emp] = await db.select({ id: employeesTable.id })
      .from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.tenantId, tenantId))).limit(1);
    if (!emp) { res.status(404).json({ error: "not_found", message: "Employee not found in your tenant" }); return; }

    let hoursWorked = 0;
    let overtimeHours = 0;
    if (clockIn && clockOut) {
      const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
      if (diffMs < 0) {
        res.status(400).json({ error: "bad_request", message: "clockOut must be after clockIn" }); return;
      }
      hoursWorked = Math.round((diffMs / 3600000) * 100) / 100;
      overtimeHours = Math.max(0, Math.round((hoursWorked - STANDARD_HOURS) * 100) / 100);
    }

    const [record] = await db.insert(attendanceRecordsTable).values({
      tenantId, employeeId, date,
      clockIn: clockIn ? new Date(clockIn) : null,
      clockOut: clockOut ? new Date(clockOut) : null,
      hoursWorked: hoursWorked.toString(),
      overtimeHours: overtimeHours.toString(),
      status: status || "Present",
      notes,
    }).onConflictDoUpdate({
      target: [attendanceRecordsTable.tenantId, attendanceRecordsTable.employeeId, attendanceRecordsTable.date],
      set: {
        clockIn: clockIn ? new Date(clockIn) : null,
        clockOut: clockOut ? new Date(clockOut) : null,
        hoursWorked: hoursWorked.toString(),
        overtimeHours: overtimeHours.toString(),
        status: status || "Present",
        notes,
        updatedAt: new Date(),
      },
    }).returning();

    res.json({ ...record, hoursWorked: Number(record.hoursWorked), overtimeHours: Number(record.overtimeHours) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/monthly-summary", requireAuth, requireRole(...HR_ROLES, "Accountant", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    const year = Number(req.query.year) || new Date().getFullYear();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

    const rows = await db.select({
      employeeId: attendanceRecordsTable.employeeId,
      employeeName: employeesTable.fullName,
      employeeCode: employeesTable.employeeCode,
      department: employeesTable.department,
      totalDays: sql<number>`COUNT(*)`,
      totalHours: sql<number>`COALESCE(SUM(CAST(${attendanceRecordsTable.hoursWorked} AS NUMERIC)), 0)`,
      totalOvertimeHours: sql<number>`COALESCE(SUM(CAST(${attendanceRecordsTable.overtimeHours} AS NUMERIC)), 0)`,
    }).from(attendanceRecordsTable)
      .innerJoin(employeesTable, eq(attendanceRecordsTable.employeeId, employeesTable.id))
      .where(and(
        eq(attendanceRecordsTable.tenantId, tenantId),
        gte(attendanceRecordsTable.date, startDate),
        lte(attendanceRecordsTable.date, endDate),
      ))
      .groupBy(attendanceRecordsTable.employeeId, employeesTable.fullName, employeesTable.employeeCode, employeesTable.department);

    res.json({
      data: rows.map(r => ({
        ...r, totalHours: Number(r.totalHours), totalOvertimeHours: Number(r.totalOvertimeHours), totalDays: Number(r.totalDays),
      })),
      month, year,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

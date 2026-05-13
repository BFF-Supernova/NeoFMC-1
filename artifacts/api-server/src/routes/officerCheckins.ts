import { Router } from "express";
import { db, officerCheckinsTable, usersTable, clientsTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const ALLOWED_ROLES = ["SuperAdmin", "TenantAdmin", "BranchManager", "LoanOfficer", "CollectionOfficer"];

function requireCheckinRole(req: any, res: any, next: any) {
  if (!req.user || !ALLOWED_ROLES.includes(req.user.role)) {
    res.status(403).json({ error: "forbidden", message: "Insufficient permissions" });
    return;
  }
  next();
}

const router = Router();
router.use(requireAuth, requireCheckinRole);

router.post("/", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const { latitude, longitude, clientId, branchId, visitType, notes, photoUrl } = req.body;
    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: "bad_request", message: "latitude and longitude required" });
      return;
    }

    const [checkin] = await db.insert(officerCheckinsTable).values({
      tenantId,
      officerId: req.user!.id,
      clientId: clientId || null,
      branchId: branchId || null,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      visitType: visitType || "Collection",
      notes: notes || null,
      photoUrl: photoUrl || null,
    }).returning();

    res.status(201).json({ ...checkin, latitude: Number(checkin.latitude), longitude: Number(checkin.longitude) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const officerId = req.query.officerId as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    let conditions = [eq(officerCheckinsTable.tenantId, tenantId)];
    if (officerId) conditions.push(eq(officerCheckinsTable.officerId, officerId));
    if (dateFrom) conditions.push(gte(officerCheckinsTable.checkedInAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(officerCheckinsTable.checkedInAt, new Date(dateTo)));

    const isManager = ["SuperAdmin", "TenantAdmin", "BranchManager"].includes(req.user!.role || "");
    if (!isManager) {
      conditions.push(eq(officerCheckinsTable.officerId, req.user!.id));
    }

    const whereClause = and(...conditions);

    const [rows, [{ count }]] = await Promise.all([
      db.select({
        checkin: officerCheckinsTable,
        officerName: usersTable.fullName,
        clientName: clientsTable.fullNameAr,
      })
        .from(officerCheckinsTable)
        .leftJoin(usersTable, eq(officerCheckinsTable.officerId, usersTable.id))
        .leftJoin(clientsTable, eq(officerCheckinsTable.clientId, clientsTable.id))
        .where(whereClause)
        .orderBy(desc(officerCheckinsTable.checkedInAt))
        .limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(officerCheckinsTable).where(whereClause),
    ]);

    res.json({
      data: rows.map(r => ({
        ...r.checkin,
        latitude: Number(r.checkin.latitude),
        longitude: Number(r.checkin.longitude),
        officerName: r.officerName,
        clientName: r.clientName,
      })),
      total: Number(count), page, limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(400).json({ error: "no_tenant" }); return; }

    const today = new Date().toISOString().split("T")[0];

    const [todayStats] = await db.select({
      totalCheckins: sql<number>`count(*)::int`,
      uniqueOfficers: sql<number>`count(distinct officer_id)::int`,
      uniqueClients: sql<number>`count(distinct client_id)::int`,
    }).from(officerCheckinsTable).where(
      and(
        eq(officerCheckinsTable.tenantId, tenantId),
        gte(officerCheckinsTable.checkedInAt, new Date(today)),
      )
    );

    const byVisitType = await db.select({
      visitType: officerCheckinsTable.visitType,
      count: sql<number>`count(*)::int`,
    }).from(officerCheckinsTable).where(
      and(
        eq(officerCheckinsTable.tenantId, tenantId),
        gte(officerCheckinsTable.checkedInAt, new Date(today)),
      )
    ).groupBy(officerCheckinsTable.visitType);

    res.json({ today: todayStats, byVisitType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

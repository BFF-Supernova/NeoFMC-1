import { Router } from "express";
import { db, clientGroupsTable, clientGroupMembersTable, clientsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);

    const [groups, [{ count }]] = await Promise.all([
      db.select().from(clientGroupsTable)
        .where(eq(clientGroupsTable.tenantId, tenantId))
        .orderBy(desc(clientGroupsTable.createdAt))
        .limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(clientGroupsTable)
        .where(eq(clientGroupsTable.tenantId, tenantId)),
    ]);

    const data = [];
    for (const g of groups) {
      const members = await db.select().from(clientGroupMembersTable)
        .where(eq(clientGroupMembersTable.groupId, g.id));
      data.push({ ...g, memberCount: members.length, members });
    }

    res.json({ data, total: Number(count), page, limit });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { groupName, groupNameAr, branchId, leaderId, leaderName, maxMembers, notes } = req.body;
    if (!groupName) { res.status(400).json({ error: "bad_request", message: "groupName required" }); return; }

    const [group] = await db.insert(clientGroupsTable).values({
      tenantId, groupName, groupNameAr, branchId, leaderId, leaderName,
      maxMembers: maxMembers || 7, notes, status: "Active",
    }).returning();

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName || "", action: "CREATE", entity: "ClientGroup", entityId: group.id, details: { groupName } });
    res.status(201).json(group);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/:id/members", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { clientId } = req.body;
    if (!clientId) { res.status(400).json({ error: "bad_request", message: "clientId required" }); return; }

    const [group] = await db.select().from(clientGroupsTable)
      .where(and(eq(clientGroupsTable.id, req.params.id), eq(clientGroupsTable.tenantId, tenantId))).limit(1);
    if (!group) { res.status(404).json({ error: "not_found" }); return; }

    const existingMembers = await db.select().from(clientGroupMembersTable)
      .where(eq(clientGroupMembersTable.groupId, group.id));
    if (existingMembers.length >= group.maxMembers) {
      res.status(400).json({ error: "limit_exceeded", message: `Group is full (max ${group.maxMembers} members)` }); return;
    }

    const alreadyMember = existingMembers.find(m => m.clientId === clientId);
    if (alreadyMember) { res.status(409).json({ error: "duplicate", message: "Client is already a member" }); return; }

    const [client] = await db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable)
      .where(eq(clientsTable.id, clientId)).limit(1);

    const [member] = await db.insert(clientGroupMembersTable).values({
      groupId: group.id, clientId, clientName: client?.fullNameAr || "", role: "Member",
    }).returning();

    await logAudit({ tenantId, userId: req.user!.id, userName: req.user!.fullName || "", action: "ADD_MEMBER", entity: "ClientGroup", entityId: group.id, details: { clientId } });
    res.status(201).json(member);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id/members/:memberId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [group] = await db.select().from(clientGroupsTable)
      .where(and(eq(clientGroupsTable.id, req.params.id), eq(clientGroupsTable.tenantId, tenantId))).limit(1);
    if (!group) { res.status(404).json({ error: "not_found" }); return; }

    await db.delete(clientGroupMembersTable)
      .where(and(eq(clientGroupMembersTable.id, req.params.memberId), eq(clientGroupMembersTable.groupId, group.id)));

    res.json({ success: true });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

import { Router } from "express";
import { db, usersTable, tenantsTable, tenantUserLimitsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole, hashPassword } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const tenantId = user.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const users = await db.select().from(usersTable)
      .where(eq(usersTable.tenantId, tenantId))
      .orderBy(desc(usersTable.createdAt));
    res.json(users.map(formatUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, requireRole("TenantAdmin", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { fullName, email, password, role, branchId } = req.body;
    if (!fullName || !email || !password || !role) {
      res.status(400).json({ error: "bad_request", message: "fullName, email, password, role required" });
      return;
    }
    const [tenantRow] = await db.select({ allowedDomains: tenantsTable.allowedDomains }).from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    if (tenantRow?.allowedDomains) {
      const domains = tenantRow.allowedDomains.split(',').map((d: string) => d.trim().toLowerCase()).filter(Boolean);
      if (domains.length > 0) {
        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (!emailDomain || !domains.includes(emailDomain)) {
          res.status(400).json({ error: "domain_restricted", message: `Email domain not allowed. Permitted domains: ${domains.join(', ')}` });
          return;
        }
      }
    }
    const [limit] = await db.select().from(tenantUserLimitsTable)
      .where(and(
        eq(tenantUserLimitsTable.tenantId, tenantId),
        eq(tenantUserLimitsTable.userType, role)
      )).limit(1);
    if (limit && limit.maxUsers !== null) {
      if (limit.maxUsers === 0) {
        res.status(400).json({
          error: "user_limit_reached",
          message: `${role} users are not allowed for this tenant (quota is 0).`
        });
        return;
      }
      const [{ count: currentCount }] = await db.select({
        count: sql<number>`cast(count(*) as int)`,
      }).from(usersTable)
        .where(and(
          eq(usersTable.tenantId, tenantId),
          eq(usersTable.role, role),
          eq(usersTable.isActive, true)
        ));
      if (currentCount >= limit.maxUsers) {
        res.status(400).json({
          error: "user_limit_reached",
          message: `Maximum ${limit.maxUsers} ${role} users allowed. Currently ${currentCount} active.`
        });
        return;
      }
    }
    const [newUser] = await db.insert(usersTable).values({
      tenantId,
      fullName,
      email,
      passwordHash: hashPassword(password),
      role,
      branchId: branchId || null,
      isSuperUser: !!req.body.isSuperUser,
      isActive: true,
    }).returning();
    res.status(201).json(formatUser(newUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, requireRole("TenantAdmin", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { id } = req.params;
    const { fullName, role, branchId, isActive } = req.body;

    const [existing] = await db.select().from(usersTable)
      .where(and(eq(usersTable.id, id), eq(usersTable.tenantId, tenantId))).limit(1);
    if (!existing) { res.status(404).json({ error: "not_found" }); return; }

    const newRole = role || existing.role;
    const newActive = isActive !== undefined ? isActive : existing.isActive;
    const roleChanged = newRole !== existing.role;
    const reactivating = newActive && !existing.isActive;

    if ((roleChanged || reactivating) && newActive) {
      const [limit] = await db.select().from(tenantUserLimitsTable)
        .where(and(
          eq(tenantUserLimitsTable.tenantId, tenantId),
          eq(tenantUserLimitsTable.userType, newRole)
        )).limit(1);
      if (limit && limit.maxUsers !== null) {
        if (limit.maxUsers === 0) {
          res.status(400).json({
            error: "user_limit_reached",
            message: `${newRole} users are not allowed for this tenant (quota is 0).`
          });
          return;
        }
        const [{ count: currentCount }] = await db.select({
          count: sql<number>`cast(count(*) as int)`,
        }).from(usersTable)
          .where(and(
            eq(usersTable.tenantId, tenantId),
            eq(usersTable.role, newRole),
            eq(usersTable.isActive, true)
          ));
        const countExcludingSelf = (existing.role === newRole && existing.isActive) ? currentCount - 1 : currentCount;
        if (countExcludingSelf >= limit.maxUsers) {
          res.status(400).json({
            error: "user_limit_reached",
            message: `Maximum ${limit.maxUsers} ${newRole} users allowed. Currently ${countExcludingSelf} active.`
          });
          return;
        }
      }
    }

    const isSuperUser = req.body.isSuperUser !== undefined ? !!req.body.isSuperUser : undefined;
    const updateFields: Record<string, any> = { fullName, role, branchId: branchId || null, isActive, updatedAt: new Date() };
    if (isSuperUser !== undefined) updateFields.isSuperUser = isSuperUser;
    if (req.body.password && req.body.password.trim()) {
      updateFields.passwordHash = hashPassword(req.body.password.trim());
      updateFields.failedLoginAttempts = 0;
      updateFields.lockedUntil = null;
    }
    const [updated] = await db.update(usersTable)
      .set(updateFields)
      .where(and(eq(usersTable.id, id), eq(usersTable.tenantId, tenantId)))
      .returning();
    res.json(formatUser(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    tenantId: u.tenantId,
    branchId: u.branchId,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    isSuperUser: u.isSuperUser,
    isActive: u.isActive,
    createdAt: u.createdAt,
  };
}

export default router;

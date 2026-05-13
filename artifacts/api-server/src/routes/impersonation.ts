import { Router } from "express";
import { requireAuth, requireSuperAdmin, signImpersonationToken, AuthUser } from "../lib/auth";
import { db, usersTable, auditLogsTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.post("/start", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { userId, tenantId, reason } = req.body;
    if (!userId || !tenantId || !reason?.trim()) {
      res.status(400).json({ error: "userId, tenantId, and reason are required" });
      return;
    }

    const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (targetUser.tenantId !== tenantId) {
      res.status(403).json({ error: "User does not belong to specified tenant" });
      return;
    }

    const superAdmin = req.user!;

    const impersonationPayload: AuthUser = {
      id: targetUser.id,
      tenantId: targetUser.tenantId,
      role: targetUser.role,
      email: targetUser.email,
      fullName: targetUser.fullName,
      branchId: targetUser.branchId || undefined,
      isImpersonation: true,
      impersonatedBy: superAdmin.id,
      impersonatedByName: superAdmin.fullName || superAdmin.email,
      impersonationReason: reason.trim(),
    };

    const token = signImpersonationToken(impersonationPayload, 60 * 60 * 1000);

    await logAudit({
      tenantId,
      userId: superAdmin.id,
      userName: `[SuperAdmin] ${superAdmin.fullName || superAdmin.email}`,
      action: "IMPERSONATE_START",
      entity: "USER",
      entityId: targetUser.id,
      details: {
        superAdminId: superAdmin.id,
        superAdminEmail: superAdmin.email,
        superAdminName: superAdmin.fullName,
        targetUserId: targetUser.id,
        targetUserName: targetUser.fullName,
        targetUserEmail: targetUser.email,
        targetUserRole: targetUser.role,
        reason: reason.trim(),
      },
      ipAddress: req.ip,
    });

    res.json({
      token,
      targetUser: {
        id: targetUser.id,
        fullName: targetUser.fullName,
        email: targetUser.email,
        role: targetUser.role,
        tenantId: targetUser.tenantId,
      },
      superAdmin: {
        id: superAdmin.id,
        name: superAdmin.fullName || superAdmin.email,
        email: superAdmin.email,
      },
      reason: reason.trim(),
    });
  } catch (err: any) {
    console.error("Impersonation start error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.post("/end", requireAuth, async (req, res) => {
  try {
    if (!req.user?.isImpersonation) {
      res.status(400).json({ error: "Not in an impersonation session" });
      return;
    }

    const { tenantId, id: targetUserId, impersonatedBy, impersonatedByName, impersonationReason } = req.user;

    if (tenantId) {
      await logAudit({
        tenantId,
        userId: impersonatedBy || targetUserId,
        userName: `[SuperAdmin] ${impersonatedByName}`,
        action: "IMPERSONATE_END",
        entity: "USER",
        entityId: targetUserId,
        details: {
          superAdminId: impersonatedBy,
          superAdminName: impersonatedByName,
          targetUserId,
          reason: impersonationReason,
        },
        ipAddress: req.ip,
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Impersonation end error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.get("/logs", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { page = "1", limit = "50" } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);

    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(or(eq(auditLogsTable.action, "IMPERSONATE_START"), eq(auditLogsTable.action, "IMPERSONATE_END")))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    res.json({ logs, page: pageNum, limit: limitNum });
  } catch (err: any) {
    console.error("Impersonation logs error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default router;

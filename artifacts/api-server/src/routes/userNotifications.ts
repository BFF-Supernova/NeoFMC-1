import { Router } from "express";
import { db, userNotificationsTable, systemAnnouncementsTable } from "@workspace/db";
import { eq, and, desc, sql, isNull, gt, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;
    const limit = Math.min(50, Number(req.query.limit) || 30);
    const unreadOnly = req.query.unread === "true";

    let where: any = tenantId
      ? and(eq(userNotificationsTable.userId, userId), eq(userNotificationsTable.tenantId, tenantId))
      : eq(userNotificationsTable.userId, userId);

    if (unreadOnly) {
      where = and(where, eq(userNotificationsTable.isRead, false));
    }

    const notifications = await db.select().from(userNotificationsTable)
      .where(where)
      .orderBy(desc(userNotificationsTable.createdAt))
      .limit(limit);

    let announcements: any[] = [];
    try {
      const now = new Date();
      announcements = await db.select().from(systemAnnouncementsTable)
        .where(and(
          eq(systemAnnouncementsTable.isActive, true),
          or(isNull(systemAnnouncementsTable.expiresAt), gt(systemAnnouncementsTable.expiresAt, now)),
        ))
        .orderBy(desc(systemAnnouncementsTable.createdAt))
        .limit(10);
    } catch {}

    res.json({ notifications, announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;

    let where: any = tenantId
      ? and(eq(userNotificationsTable.userId, userId), eq(userNotificationsTable.tenantId, tenantId), eq(userNotificationsTable.isRead, false))
      : and(eq(userNotificationsTable.userId, userId), eq(userNotificationsTable.isRead, false));

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(userNotificationsTable)
      .where(where);

    let announcementCount = 0;
    try {
      const now = new Date();
      const [ac] = await db.select({ count: sql<number>`count(*)` })
        .from(systemAnnouncementsTable)
        .where(and(
          eq(systemAnnouncementsTable.isActive, true),
          or(isNull(systemAnnouncementsTable.expiresAt), gt(systemAnnouncementsTable.expiresAt, now)),
        ));
      announcementCount = Number(ac.count);
    } catch {}

    res.json({ unread: Number(count), announcements: announcementCount, total: Number(count) + announcementCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/read", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const [updated] = await db.update(userNotificationsTable)
      .set({ isRead: true })
      .where(and(eq(userNotificationsTable.id, req.params.id), eq(userNotificationsTable.userId, userId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/read-all", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;

    let where: any = tenantId
      ? and(eq(userNotificationsTable.userId, userId), eq(userNotificationsTable.tenantId, tenantId), eq(userNotificationsTable.isRead, false))
      : and(eq(userNotificationsTable.userId, userId), eq(userNotificationsTable.isRead, false));

    await db.update(userNotificationsTable)
      .set({ isRead: true })
      .where(where);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

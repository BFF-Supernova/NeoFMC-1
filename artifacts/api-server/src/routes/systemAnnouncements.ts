import { Router } from "express";
import { db, systemAnnouncementsTable } from "@workspace/db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../lib/auth";
import { notifyAllSystemUsers } from "../lib/userNotifications";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const announcements = await db.select().from(systemAnnouncementsTable)
      .where(and(
        eq(systemAnnouncementsTable.isActive, true),
        sql`(${systemAnnouncementsTable.expiresAt} IS NULL OR ${systemAnnouncementsTable.expiresAt} > ${now})`,
      ))
      .orderBy(desc(systemAnnouncementsTable.createdAt))
      .limit(10);
    res.json(announcements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/all", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const announcements = await db.select().from(systemAnnouncementsTable)
      .orderBy(desc(systemAnnouncementsTable.createdAt));
    res.json(announcements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { title, titleAr, message, messageAr, severity, expiresAt } = req.body;
    if (!title || !message) {
      res.status(400).json({ error: "bad_request", message: "title and message required" });
      return;
    }
    const [ann] = await db.insert(systemAnnouncementsTable).values({
      title, titleAr, message, messageAr,
      severity: severity || "info",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();

    await notifyAllSystemUsers({
      type: "system_announcement",
      title: title,
      titleAr: titleAr || null,
      message: message,
      messageAr: messageAr || null,
      severity: severity || "info",
      metadata: { announcementId: ann.id },
    });

    res.status(201).json(ann);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { title, titleAr, message, messageAr, severity, isActive, expiresAt } = req.body;
    const [updated] = await db.update(systemAnnouncementsTable)
      .set({
        ...(title !== undefined && { title }),
        ...(titleAr !== undefined && { titleAr }),
        ...(message !== undefined && { message }),
        ...(messageAr !== undefined && { messageAr }),
        ...(severity !== undefined && { severity }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      })
      .where(eq(systemAnnouncementsTable.id, req.params.id))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const [deleted] = await db.delete(systemAnnouncementsTable)
      .where(eq(systemAnnouncementsTable.id, req.params.id))
      .returning();
    if (!deleted) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

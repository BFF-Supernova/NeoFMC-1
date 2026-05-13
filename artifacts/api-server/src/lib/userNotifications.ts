import { db, userNotificationsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

interface CreateNotification {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  severity?: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function createUserNotification(data: CreateNotification) {
  try {
    await db.insert(userNotificationsTable).values({
      tenantId: data.tenantId,
      userId: data.userId,
      type: data.type,
      title: data.title,
      titleAr: data.titleAr || null,
      message: data.message,
      messageAr: data.messageAr || null,
      severity: data.severity || "info",
      linkUrl: data.linkUrl || null,
      metadata: data.metadata || null,
    });
  } catch (err) {
    console.error("[UserNotification] Failed to create:", err);
  }
}

export async function notifyAllSystemUsers(data: Omit<CreateNotification, "tenantId" | "userId"> & { excludeUserId?: string }) {
  try {
    const allUsers = await db.select({ id: usersTable.id, tenantId: usersTable.tenantId })
      .from(usersTable)
      .where(eq(usersTable.isActive, true));

    const filtered = data.excludeUserId
      ? allUsers.filter(u => u.id !== data.excludeUserId)
      : allUsers;

    if (filtered.length === 0) return;

    const withTenant = filtered.filter(u => u.tenantId != null);
    if (withTenant.length === 0) return;

    const batchSize = 500;
    for (let i = 0; i < withTenant.length; i += batchSize) {
      const batch = withTenant.slice(i, i + batchSize);
      await db.insert(userNotificationsTable).values(
        batch.map(u => ({
          tenantId: u.tenantId!,
          userId: u.id,
          type: data.type,
          title: data.title,
          titleAr: data.titleAr || null,
          message: data.message,
          messageAr: data.messageAr || null,
          severity: data.severity || "info",
          linkUrl: data.linkUrl || null,
          metadata: data.metadata || null,
        }))
      );
    }
  } catch (err) {
    console.error("[UserNotification] Failed to notify all users:", err);
  }
}

export async function notifyByRoles(tenantId: string, roles: string[], data: Omit<CreateNotification, "tenantId" | "userId">) {
  try {
    const users = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(and(
        eq(usersTable.tenantId, tenantId),
        inArray(usersTable.role, roles),
        eq(usersTable.isActive, true),
      ));

    if (users.length === 0) return;

    await db.insert(userNotificationsTable).values(
      users.map(u => ({
        tenantId,
        userId: u.id,
        type: data.type,
        title: data.title,
        titleAr: data.titleAr || null,
        message: data.message,
        messageAr: data.messageAr || null,
        severity: data.severity || "info",
        linkUrl: data.linkUrl || null,
        metadata: data.metadata || null,
      }))
    );
  } catch (err) {
    console.error("[UserNotification] Failed to notify roles:", err);
  }
}

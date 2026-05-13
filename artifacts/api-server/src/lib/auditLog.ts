import { db, auditLogsTable } from "@workspace/db";

export async function logAudit(params: {
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogsTable).values({
      tenantId: params.tenantId,
      userId: params.userId,
      userName: params.userName || "",
      action: params.action,
      entity: params.entity,
      entityId: params.entityId || null,
      details: params.details || null,
      ipAddress: params.ipAddress || null,
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}

import crypto from "crypto";
import { db, webhooksTable, webhookDeliveriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const WEBHOOK_EVENTS = [
  "loan.disbursed",
  "loan.closed",
  "loan.written_off",
  "payment.received",
  "payment.reversed",
  "client.created",
  "client.updated",
  "installment.overdue",
  "loan_request.approved",
  "loan_request.rejected",
  "cheque.cleared",
  "cheque.bounced",
  "savings.deposit",
  "savings.withdrawal",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function getAvailableEvents() {
  return [...WEBHOOK_EVENTS];
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function deliverWebhook(
  tenantId: string,
  webhookId: string,
  url: string,
  secret: string | null,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["X-Webhook-Signature"] = signPayload(body, secret);

  let responseStatus = 0;
  let responseBody = "";
  let status = "Failed";

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });
    responseStatus = resp.status;
    responseBody = (await resp.text()).slice(0, 1000);
    status = resp.ok ? "Delivered" : "Failed";
  } catch (err: any) {
    responseBody = err.message;
  }

  await db.insert(webhookDeliveriesTable).values({
    tenantId,
    webhookId,
    event,
    payload,
    responseStatus: responseStatus || null,
    responseBody,
    status,
    attempts: 1,
    lastAttemptAt: new Date(),
  });
}

export async function fireWebhook(
  tenantId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const webhooks = await db.select().from(webhooksTable).where(
      and(eq(webhooksTable.tenantId, tenantId), eq(webhooksTable.isActive, true))
    );

    const matching = webhooks.filter((w) => {
      const events = (w.events as string[]) || [];
      return events.includes(event) || events.includes("*");
    });

    for (const wh of matching) {
      deliverWebhook(tenantId, wh.id, wh.url, wh.secret, event, payload).catch((err) =>
        console.error(`Webhook delivery failed for ${wh.id}:`, err)
      );
    }
  } catch (err) {
    console.error("Error firing webhooks:", err);
  }
}

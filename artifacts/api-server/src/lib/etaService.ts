import { logAudit } from "./auditLog";
import crypto from "crypto";

export interface EtaInvoiceItem {
  description: string;
  itemType: string;
  quantity: number;
  unitPrice: number;
  salesTotal: number;
  taxType: string;
  taxRate: number;
  taxAmount: number;
  total: number;
  internalCode: string;
  gpcCode?: string;
}

export interface EtaInvoice {
  issuerName: string;
  issuerTaxId: string;
  issuerAddress: string;
  receiverName: string;
  receiverTaxId?: string;
  receiverAddress?: string;
  invoiceType: "I" | "C" | "D";
  dateTimeIssued: string;
  taxpayerActivityCode: string;
  internalId: string;
  items: EtaInvoiceItem[];
  totalSalesAmount: number;
  totalTaxAmount: number;
  netAmount: number;
  totalAmount: number;
  extraDiscountAmount?: number;
  totalItemsDiscountAmount?: number;
}

export interface EtaSubmissionResult {
  submissionId: string;
  status: "accepted" | "rejected" | "pending" | "error";
  uuid?: string;
  longId?: string;
  errors?: Array<{ code: string; message: string }>;
  submittedAt: Date;
}

const ETA_API_BASE = process.env.ETA_API_BASE_URL || "https://api.invoicing.eta.gov.eg/api/v1.0";
const ETA_CLIENT_ID = process.env.ETA_CLIENT_ID || "";
const ETA_CLIENT_SECRET = process.env.ETA_CLIENT_SECRET || "";
const ETA_TOKEN_URL = process.env.ETA_TOKEN_URL || "https://id.eta.gov.eg/connect/token";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getEtaToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  if (!ETA_CLIENT_ID || !ETA_CLIENT_SECRET) {
    throw new Error("ETA credentials not configured. Set ETA_CLIENT_ID and ETA_CLIENT_SECRET.");
  }

  const response = await fetch(ETA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: ETA_CLIENT_ID,
      client_secret: ETA_CLIENT_SECRET,
      scope: "InvoicingAPI",
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`ETA token request failed: ${response.status}`);
  }

  const data = await response.json() as any;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return cachedToken.token;
}

export async function submitInvoice(
  invoice: EtaInvoice,
  tenantId: string,
  userId: string
): Promise<EtaSubmissionResult> {
  const submissionId = `ETA-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  if (!ETA_CLIENT_ID) {
    await logAudit({
      userId,
      tenantId,
      action: "eta_invoice_queued",
      entity: "invoice",
      details: { submissionId, internalId: invoice.internalId, status: "queued_offline" },
    });

    return {
      submissionId,
      status: "pending",
      submittedAt: new Date(),
    };
  }

  try {
    const token = await getEtaToken();

    const etaDocument = {
      issuer: {
        name: invoice.issuerName,
        type: "B",
        id: invoice.issuerTaxId,
        address: {
          country: "EG",
          governate: "",
          regionCity: "",
          street: invoice.issuerAddress,
          buildingNumber: "",
        },
      },
      receiver: {
        name: invoice.receiverName,
        type: invoice.receiverTaxId ? "B" : "P",
        id: invoice.receiverTaxId || "",
        address: {
          country: "EG",
          street: invoice.receiverAddress || "",
        },
      },
      documentType: invoice.invoiceType,
      documentTypeVersion: "1.0",
      dateTimeIssued: invoice.dateTimeIssued,
      taxpayerActivityCode: invoice.taxpayerActivityCode,
      internalID: invoice.internalId,
      invoiceLines: invoice.items.map(item => ({
        description: item.description,
        itemType: item.itemType,
        itemCode: item.gpcCode || item.internalCode,
        unitType: "EA",
        quantity: item.quantity,
        unitValue: { currencySold: "EGP", amountEGP: item.unitPrice },
        salesTotal: item.salesTotal,
        total: item.total,
        valueDifference: 0,
        totalTaxableFees: 0,
        netTotal: item.salesTotal,
        itemsDiscount: 0,
        discount: { rate: 0, amount: 0 },
        taxableItems: [{
          taxType: item.taxType || "T1",
          amount: item.taxAmount,
          subType: "V009",
          rate: item.taxRate,
        }],
        internalCode: item.internalCode,
      })),
      totalSalesAmount: invoice.totalSalesAmount,
      totalDiscountAmount: invoice.totalItemsDiscountAmount || 0,
      netAmount: invoice.netAmount,
      taxTotals: [{ taxType: "T1", amount: invoice.totalTaxAmount }],
      totalAmount: invoice.totalAmount,
      extraDiscountAmount: invoice.extraDiscountAmount || 0,
      totalItemsDiscountAmount: invoice.totalItemsDiscountAmount || 0,
    };

    const response = await fetch(`${ETA_API_BASE}/documentsubmissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ documents: [etaDocument] }),
      signal: AbortSignal.timeout(30000),
    });

    const result = await response.json() as any;

    if (response.ok && result.acceptedDocuments?.length > 0) {
      const accepted = result.acceptedDocuments[0];
      await logAudit({
        userId,
        tenantId,
        action: "eta_invoice_submitted",
        entity: "invoice",
        details: { submissionId, uuid: accepted.uuid, longId: accepted.longId, internalId: invoice.internalId },
      });

      return {
        submissionId,
        status: "accepted",
        uuid: accepted.uuid,
        longId: accepted.longId,
        submittedAt: new Date(),
      };
    }

    const errors = result.rejectedDocuments?.[0]?.error?.details?.map((d: any) => ({
      code: d.propertyPath || "UNKNOWN",
      message: d.error || "Unknown error",
    })) || [{ code: "UNKNOWN", message: "Submission failed" }];

    return {
      submissionId,
      status: "rejected",
      errors,
      submittedAt: new Date(),
    };
  } catch (error: any) {
    return {
      submissionId,
      status: "error",
      errors: [{ code: "CONNECTION_ERROR", message: error.message }],
      submittedAt: new Date(),
    };
  }
}

export function serializeCanonicalJson(doc: Record<string, unknown>): string {
  const sortKeys = (obj: unknown): unknown => {
    if (Array.isArray(obj)) return obj.map(sortKeys);
    if (obj !== null && typeof obj === "object") {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
        sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
      }
      return sorted;
    }
    return obj;
  };
  return JSON.stringify(sortKeys(doc));
}

export function computeDocumentDigest(canonicalJson: string): string {
  return crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

export async function signDocument(
  canonicalJson: string,
  _options?: { provider?: "hsm" | "usb_token" | "software" }
): Promise<{ signature: string; signedAt: string; provider: string }> {
  const digest = computeDocumentDigest(canonicalJson);
  return {
    signature: `PLACEHOLDER_SIGNATURE_${digest.substring(0, 16)}`,
    signedAt: new Date().toISOString(),
    provider: "software_placeholder",
  };
}

export async function submitBatchInvoices(
  invoices: EtaInvoice[],
  tenantId: string,
  userId: string
): Promise<EtaSubmissionResult[]> {
  const results: EtaSubmissionResult[] = [];
  for (const invoice of invoices) {
    const result = await submitInvoice(invoice, tenantId, userId);
    results.push(result);
  }
  return results;
}

export async function cancelInvoice(uuid: string): Promise<{ status: string }> {
  if (!ETA_CLIENT_ID) {
    return { status: "cancel_queued_offline" };
  }

  const token = await getEtaToken();
  const response = await fetch(`${ETA_API_BASE}/documents/state/${uuid}/state`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ status: "cancelled", reason: "Cancelled by issuer" }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to cancel invoice: ${response.status}`);
  }

  return { status: "cancelled" };
}

export async function getInvoiceStatus(uuid: string): Promise<{ status: string; cancelRequestDate?: string }> {
  if (!ETA_CLIENT_ID) {
    return { status: "pending" };
  }

  const token = await getEtaToken();
  const response = await fetch(`${ETA_API_BASE}/documents/${uuid}/raw`, {
    headers: { "Authorization": `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch invoice status: ${response.status}`);
  }

  const data = await response.json() as any;
  return { status: data.status, cancelRequestDate: data.cancelRequestDate };
}

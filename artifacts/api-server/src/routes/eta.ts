import { Router } from "express";
import { db, etaSubmissionsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { submitInvoice, getInvoiceStatus, submitBatchInvoices, cancelInvoice, serializeCanonicalJson, signDocument, EtaInvoice } from "../lib/etaService";

const router = Router();
const ETA_ROLES = ["TenantAdmin", "Accountant", "FinancialController", "CFO", "SuperAdmin"] as const;

router.post("/submit", requireAuth, requireRole(...ETA_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const invoice: EtaInvoice = req.body;
    if (!invoice.internalId || !invoice.items?.length) {
      res.status(400).json({ error: "bad_request", message: "internalId and items are required" }); return;
    }
    if (typeof invoice.totalAmount !== "number" || typeof invoice.totalTaxAmount !== "number" || isNaN(invoice.totalAmount) || isNaN(invoice.totalTaxAmount)) {
      res.status(400).json({ error: "bad_request", message: "totalAmount and totalTaxAmount must be valid numbers" }); return;
    }

    const result = await submitInvoice(invoice, tenantId, req.user!.id);

    await db.insert(etaSubmissionsTable).values({
      tenantId, internalId: invoice.internalId,
      submissionId: result.submissionId,
      uuid: result.uuid || null,
      longId: result.longId || null,
      invoiceType: invoice.invoiceType || "I",
      receiverName: invoice.receiverName,
      receiverTaxId: invoice.receiverTaxId || null,
      totalAmount: invoice.totalAmount.toFixed(2),
      totalTaxAmount: invoice.totalTaxAmount.toFixed(2),
      status: result.status,
      errors: result.errors ? JSON.stringify(result.errors) : null,
      submittedById: req.user!.id,
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/submit-credit-note", requireAuth, requireRole(...ETA_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const invoice: EtaInvoice = { ...req.body, invoiceType: "C" };
    if (!invoice.internalId || !invoice.items?.length) {
      res.status(400).json({ error: "bad_request", message: "internalId and items required for credit note" }); return;
    }
    if (typeof invoice.totalAmount !== "number" || typeof invoice.totalTaxAmount !== "number" || isNaN(invoice.totalAmount) || isNaN(invoice.totalTaxAmount)) {
      res.status(400).json({ error: "bad_request", message: "totalAmount and totalTaxAmount must be valid numbers" }); return;
    }

    const result = await submitInvoice(invoice, tenantId, req.user!.id);

    await db.insert(etaSubmissionsTable).values({
      tenantId, internalId: invoice.internalId,
      submissionId: result.submissionId, uuid: result.uuid || null, longId: result.longId || null,
      invoiceType: "C", receiverName: invoice.receiverName, receiverTaxId: invoice.receiverTaxId || null,
      totalAmount: invoice.totalAmount.toFixed(2), totalTaxAmount: invoice.totalTaxAmount.toFixed(2),
      status: result.status, errors: result.errors ? JSON.stringify(result.errors) : null,
      submittedById: req.user!.id,
    });

    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/submit-debit-note", requireAuth, requireRole(...ETA_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const invoice: EtaInvoice = { ...req.body, invoiceType: "D" };
    if (!invoice.internalId || !invoice.items?.length) {
      res.status(400).json({ error: "bad_request", message: "internalId and items required for debit note" }); return;
    }
    if (typeof invoice.totalAmount !== "number" || typeof invoice.totalTaxAmount !== "number" || isNaN(invoice.totalAmount) || isNaN(invoice.totalTaxAmount)) {
      res.status(400).json({ error: "bad_request", message: "totalAmount and totalTaxAmount must be valid numbers" }); return;
    }

    const result = await submitInvoice(invoice, tenantId, req.user!.id);

    await db.insert(etaSubmissionsTable).values({
      tenantId, internalId: invoice.internalId,
      submissionId: result.submissionId, uuid: result.uuid || null, longId: result.longId || null,
      invoiceType: "D", receiverName: invoice.receiverName, receiverTaxId: invoice.receiverTaxId || null,
      totalAmount: invoice.totalAmount.toFixed(2), totalTaxAmount: invoice.totalTaxAmount.toFixed(2),
      status: result.status, errors: result.errors ? JSON.stringify(result.errors) : null,
      submittedById: req.user!.id,
    });

    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/submit-batch", requireAuth, requireRole(...ETA_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const { invoices } = req.body;
    if (!Array.isArray(invoices) || invoices.length === 0) {
      res.status(400).json({ error: "bad_request", message: "invoices array required" }); return;
    }
    if (invoices.length > 50) {
      res.status(400).json({ error: "bad_request", message: "Maximum 50 invoices per batch" }); return;
    }

    const results = await submitBatchInvoices(invoices, tenantId, req.user!.id);

    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      const result = results[i];
      await db.insert(etaSubmissionsTable).values({
        tenantId, internalId: invoice.internalId,
        submissionId: result.submissionId, uuid: result.uuid || null, longId: result.longId || null,
        invoiceType: invoice.invoiceType || "I",
        receiverName: invoice.receiverName, receiverTaxId: invoice.receiverTaxId || null,
        totalAmount: (invoice.totalAmount || 0).toFixed(2),
        totalTaxAmount: (invoice.totalTaxAmount || 0).toFixed(2),
        status: result.status, errors: result.errors ? JSON.stringify(result.errors) : null,
        submittedById: req.user!.id,
      });
    }

    const accepted = results.filter(r => r.status === "accepted").length;
    const rejected = results.filter(r => r.status === "rejected").length;

    res.json({ results, summary: { total: results.length, accepted, rejected } });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/submissions", requireAuth, requireRole(...ETA_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const invoiceType = req.query.invoiceType as string;

    let where = eq(etaSubmissionsTable.tenantId, tenantId);
    if (invoiceType) where = and(where, eq(etaSubmissionsTable.invoiceType, invoiceType)) as typeof where;

    const [submissions, [{ count }]] = await Promise.all([
      db.select().from(etaSubmissionsTable).where(where)
        .orderBy(desc(etaSubmissionsTable.submittedAt))
        .limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(etaSubmissionsTable).where(where),
    ]);

    res.json({
      data: submissions.map(s => ({
        ...s,
        totalAmount: Number(s.totalAmount),
        totalTaxAmount: Number(s.totalTaxAmount),
        errors: s.errors ? JSON.parse(s.errors) : null,
      })),
      total: Number(count), page, limit,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/status/:uuid", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [submission] = await db.select({ id: etaSubmissionsTable.id })
      .from(etaSubmissionsTable)
      .where(and(eq(etaSubmissionsTable.uuid, req.params.uuid), eq(etaSubmissionsTable.tenantId, tenantId)))
      .limit(1);
    if (!submission) { res.status(404).json({ error: "not_found", message: "Submission not found in your tenant" }); return; }

    const result = await getInvoiceStatus(req.params.uuid);

    await db.update(etaSubmissionsTable).set({
      status: result.status, lastCheckedAt: new Date(),
    }).where(eq(etaSubmissionsTable.id, submission.id));

    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/cancel/:uuid", requireAuth, requireRole(...ETA_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [submission] = await db.select({ id: etaSubmissionsTable.id })
      .from(etaSubmissionsTable)
      .where(and(eq(etaSubmissionsTable.uuid, req.params.uuid), eq(etaSubmissionsTable.tenantId, tenantId)))
      .limit(1);
    if (!submission) { res.status(404).json({ error: "not_found", message: "Submission not found in your tenant" }); return; }

    const result = await cancelInvoice(req.params.uuid);

    await db.update(etaSubmissionsTable).set({
      status: "cancelled", lastCheckedAt: new Date(),
    }).where(eq(etaSubmissionsTable.id, submission.id));

    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/sign-preview", requireAuth, requireRole(...ETA_ROLES), async (req, res) => {
  try {
    const { document } = req.body;
    if (!document) { res.status(400).json({ error: "bad_request", message: "document required" }); return; }

    const canonical = serializeCanonicalJson(document);
    const signatureResult = await signDocument(canonical);

    res.json({ canonical, ...signatureResult });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

import { Router } from "express";
import { db, vendorsTable, purchaseInvoicesTable, vendorPaymentsTable, journalEntriesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();
const VENDOR_ROLES = ["TenantAdmin", "BranchManager", "Accountant", "FinancialController", "CFO"] as const;

router.get("/", requireAuth, requireRole(...VENDOR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const status = req.query.status as string | undefined;

    let where = eq(vendorsTable.tenantId, tenantId);
    if (status) where = and(where, eq(vendorsTable.status, status)) as typeof where;

    const [vendors, [{ count }]] = await Promise.all([
      db.select().from(vendorsTable).where(where).orderBy(desc(vendorsTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(vendorsTable).where(where),
    ]);
    res.json({ data: vendors.map(v => ({ ...v, totalPurchases: Number(v.totalPurchases), outstandingBalance: Number(v.outstandingBalance) })), total: Number(count), page, limit });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/", requireAuth, requireRole("TenantAdmin", "BranchManager", "Accountant"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { vendorCode, name, nameAr, taxId, commercialRegNo, contactPerson, phone, email, address, bankName, bankAccountNo, bankIban, paymentTermsDays, category, notes } = req.body;
    if (!vendorCode || !name) { res.status(400).json({ error: "bad_request", message: "vendorCode, name required" }); return; }
    const [vendor] = await db.insert(vendorsTable).values({
      tenantId, vendorCode, name, nameAr, taxId, commercialRegNo, contactPerson, phone, email, address,
      bankName, bankAccountNo, bankIban, paymentTermsDays, category, notes,
    }).returning();
    res.status(201).json(vendor);
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/:id", requireAuth, requireRole("TenantAdmin", "Accountant"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const fields = ["name", "nameAr", "taxId", "commercialRegNo", "contactPerson", "phone", "email", "address", "bankName", "bankAccountNo", "bankIban", "paymentTermsDays", "category", "status", "notes"];
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const f of fields) if (req.body[f] !== undefined) updateData[f] = req.body[f];
    const [updated] = await db.update(vendorsTable).set(updateData)
      .where(and(eq(vendorsTable.id, req.params.id), eq(vendorsTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ ...updated, totalPurchases: Number(updated.totalPurchases), outstandingBalance: Number(updated.outstandingBalance) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/invoices", requireAuth, requireRole(...VENDOR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const vendorId = req.query.vendorId as string | undefined;
    const status = req.query.status as string | undefined;

    let where = eq(purchaseInvoicesTable.tenantId, tenantId);
    if (vendorId) where = and(where, eq(purchaseInvoicesTable.vendorId, vendorId)) as typeof where;
    if (status) where = and(where, eq(purchaseInvoicesTable.status, status)) as typeof where;

    const [invoices, [{ count }]] = await Promise.all([
      db.select().from(purchaseInvoicesTable).where(where).orderBy(desc(purchaseInvoicesTable.createdAt)).limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(purchaseInvoicesTable).where(where),
    ]);
    res.json({ data: invoices.map(i => ({ ...i, subtotal: Number(i.subtotal), vatAmount: Number(i.vatAmount), withholdingTax: Number(i.withholdingTax), totalAmount: Number(i.totalAmount), paidAmount: Number(i.paidAmount) })), total: Number(count), page, limit });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/invoices", requireAuth, requireRole("TenantAdmin", "BranchManager", "Accountant"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { branchId, vendorId, invoiceNumber, invoiceDate, dueDate, subtotal, vatAmount, withholdingTax, totalAmount, description, category, documentUrls } = req.body;
    if (!branchId || !vendorId || !invoiceNumber || !invoiceDate || !dueDate || !subtotal) {
      res.status(400).json({ error: "bad_request", message: "branchId, vendorId, invoiceNumber, invoiceDate, dueDate, subtotal required" }); return;
    }
    const sub = Number(subtotal);
    const vat = Number(vatAmount || 0);
    const wht = Number(withholdingTax || 0);
    const total = totalAmount ? Number(totalAmount) : sub + vat - wht;
    const [invoice] = await db.insert(purchaseInvoicesTable).values({
      tenantId, branchId, vendorId, invoiceNumber, invoiceDate, dueDate,
      subtotal: sub.toString(), vatAmount: vat.toString(), withholdingTax: wht.toString(),
      totalAmount: total.toString(), description, category,
      documentUrls: documentUrls || null, createdById: req.user!.id,
    }).returning();

    await db.update(vendorsTable).set({
      totalPurchases: sql`CAST(total_purchases AS NUMERIC) + ${total}`,
      outstandingBalance: sql`CAST(outstanding_balance AS NUMERIC) + ${total}`,
      updatedAt: new Date(),
    }).where(eq(vendorsTable.id, vendorId));

    res.status(201).json({ ...invoice, subtotal: sub, totalAmount: total });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.put("/invoices/:id/approve", requireAuth, requireRole("TenantAdmin", "FinancialController", "CFO"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [invoice] = await db.select().from(purchaseInvoicesTable)
      .where(and(eq(purchaseInvoicesTable.id, req.params.id), eq(purchaseInvoicesTable.tenantId, tenantId))).limit(1);
    if (!invoice) { res.status(404).json({ error: "not_found" }); return; }
    if (invoice.createdById === req.user!.id) { res.status(400).json({ error: "bad_request", message: "Cannot approve own invoice (maker-checker)" }); return; }

    const [updated] = await db.update(purchaseInvoicesTable).set({
      status: "Approved", approvedById: req.user!.id, approvedAt: new Date(), updatedAt: new Date(),
    }).where(eq(purchaseInvoicesTable.id, invoice.id)).returning();

    if (!updated.glSynced) {
      await db.insert(journalEntriesTable).values({
        tenantId, branchId: updated.branchId, referenceType: "PurchaseInvoice", referenceId: updated.id,
        description: `Purchase Invoice ${updated.invoiceNumber}`,
        totalDebit: updated.totalAmount, totalCredit: updated.totalAmount,
      });
      await db.update(purchaseInvoicesTable).set({ glSynced: true }).where(eq(purchaseInvoicesTable.id, updated.id));
    }
    res.json({ ...updated, totalAmount: Number(updated.totalAmount) });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.post("/invoices/:id/pay", requireAuth, requireRole("TenantAdmin", "Accountant", "Cashier"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { amount, paymentDate, paymentMethod, referenceNumber, notes } = req.body;
    if (!amount || !paymentDate || !paymentMethod) { res.status(400).json({ error: "bad_request", message: "amount, paymentDate, paymentMethod required" }); return; }

    const [invoice] = await db.select().from(purchaseInvoicesTable)
      .where(and(eq(purchaseInvoicesTable.id, req.params.id), eq(purchaseInvoicesTable.tenantId, tenantId))).limit(1);
    if (!invoice) { res.status(404).json({ error: "not_found" }); return; }

    const payAmt = Number(amount);
    await db.insert(vendorPaymentsTable).values({
      tenantId, vendorId: invoice.vendorId, invoiceId: invoice.id,
      amount: payAmt.toString(), paymentDate, paymentMethod, referenceNumber, notes, createdById: req.user!.id,
    });

    const newPaid = Number(invoice.paidAmount) + payAmt;
    const invoiceStatus = newPaid >= Number(invoice.totalAmount) ? "Paid" : "PartiallyPaid";
    await db.update(purchaseInvoicesTable).set({ paidAmount: newPaid.toString(), status: invoiceStatus, updatedAt: new Date() }).where(eq(purchaseInvoicesTable.id, invoice.id));
    await db.update(vendorsTable).set({ outstandingBalance: sql`CAST(outstanding_balance AS NUMERIC) - ${payAmt}`, updatedAt: new Date() }).where(eq(vendorsTable.id, invoice.vendorId));

    res.json({ message: "Payment recorded", invoiceStatus, paidAmount: newPaid });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

router.get("/ap-aging", requireAuth, requireRole(...VENDOR_ROLES), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const invoices = await db.select().from(purchaseInvoicesTable)
      .where(and(eq(purchaseInvoicesTable.tenantId, tenantId), sql`${purchaseInvoicesTable.status} IN ('Pending', 'Approved', 'PartiallyPaid')`));

    const today = new Date();
    const buckets = { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90plus: 0 };
    for (const inv of invoices) {
      const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount);
      if (outstanding <= 0) continue;
      const dueDate = new Date(inv.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
      if (daysOverdue <= 0) buckets.current += outstanding;
      else if (daysOverdue <= 30) buckets.days1_30 += outstanding;
      else if (daysOverdue <= 60) buckets.days31_60 += outstanding;
      else if (daysOverdue <= 90) buckets.days61_90 += outstanding;
      else buckets.days90plus += outstanding;
    }
    const total = Object.values(buckets).reduce((a, b) => a + b, 0);
    res.json({ ...buckets, total: Math.round(total * 100) / 100 });
  } catch (err) { console.error(err); res.status(500).json({ error: "server_error" }); }
});

export default router;

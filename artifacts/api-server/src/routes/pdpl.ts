import { Router } from "express";
import { db, clientsTable, pdplConsentsTable, dsarRequestsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.get("/consent-status/:clientId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [client] = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.id, req.params.clientId), eq(clientsTable.tenantId, tenantId)));

    if (!client) { res.status(404).json({ error: "not_found" }); return; }

    const consents = await db.select().from(pdplConsentsTable)
      .where(and(eq(pdplConsentsTable.clientId, client.id), eq(pdplConsentsTable.tenantId, tenantId)));

    const defaultPurposes = [
      { purpose: "loan_processing", granted: true, description: "Processing loan applications and management" },
      { purpose: "credit_assessment", granted: true, description: "Credit scoring and risk assessment" },
      { purpose: "regulatory_reporting", granted: true, description: "FRA and CBE regulatory compliance reporting" },
      { purpose: "marketing", granted: false, description: "Marketing communications and promotions" },
    ];

    const purposes = consents.length > 0
      ? consents.map(c => ({ purpose: c.purpose, granted: c.granted, consentDate: c.consentDate, revokedDate: c.revokedDate }))
      : defaultPurposes;

    res.json({
      clientId: client.id,
      dataProcessingConsent: true,
      consentDate: client.createdAt,
      lastUpdated: client.updatedAt,
      purposes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/data-access-request", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const { clientId, requestType } = req.body;
    if (!clientId || !requestType) {
      res.status(400).json({ error: "bad_request", message: "clientId and requestType required" });
      return;
    }

    const validTypes = ["access", "rectification", "erasure", "portability", "restriction"];
    if (!validTypes.includes(requestType)) {
      res.status(400).json({ error: "bad_request", message: `requestType must be one of: ${validTypes.join(", ")}` });
      return;
    }

    const [client] = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.id, clientId), eq(clientsTable.tenantId, tenantId)));

    if (!client) { res.status(404).json({ error: "client_not_found" }); return; }

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 30);

    const [dsarRecord] = await db.insert(dsarRequestsTable).values({
      tenantId,
      clientId,
      requestType,
      status: "received",
      requestedBy: req.user!.id,
      deadline: deadlineDate,
    }).returning();

    await logAudit({
      userId: req.user!.id,
      tenantId,
      action: `pdpl_dsar_${requestType}`,
      entity: "client",
      entityId: clientId,
      details: { requestId: dsarRecord.id, requestType, clientName: client.fullNameAr },
    });

    res.status(201).json({
      requestId: dsarRecord.id,
      requestType,
      clientId,
      status: "received",
      submittedAt: dsarRecord.createdAt,
      deadline: deadlineDate.toISOString(),
      message: `Data ${requestType} request registered. Must be fulfilled within 30 days per PDPL Article 11.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/client-data-export/:clientId", requireAuth, requireRole("TenantAdmin", "Auditor", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [client] = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.id, req.params.clientId), eq(clientsTable.tenantId, tenantId)));

    if (!client) { res.status(404).json({ error: "client_not_found" }); return; }

    const loans = await db.execute(sql`
      SELECT id, status, loan_amount, outstanding_balance, disbursement_date, created_at
      FROM loans WHERE client_id = ${client.id} AND tenant_id = ${tenantId}::uuid
    `);

    const payments = await db.execute(sql`
      SELECT p.id, p.amount, p.payment_date, p.payment_method, p.created_at
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      WHERE l.client_id = ${client.id} AND p.tenant_id = ${tenantId}::uuid
    `);

    await logAudit({
      userId: req.user!.id,
      tenantId,
      action: "pdpl_data_export",
      entity: "client",
      entityId: client.id,
      details: { exportedFields: "personal,loans,payments" },
    });

    res.json({
      exportDate: new Date().toISOString(),
      dataSubject: {
        id: client.id,
        fullNameAr: client.fullNameAr,
        fullNameEn: client.fullNameEn,
        nationalId: client.nationalId ? `${client.nationalId.substring(0, 3)}***${client.nationalId.substring(11)}` : null,
        phone: client.phone,
        address: client.address,
        customerCategory: client.customerCategory,
        kycStatus: client.kycStatus,
        createdAt: client.createdAt,
      },
      loans: loans.rows,
      payments: payments.rows,
      retentionPolicy: {
        activeData: "Retained during business relationship",
        closedAccounts: "7 years after account closure (CBE requirement)",
        auditLogs: "10 years (FRA requirement)",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/client-erasure/:clientId", requireAuth, requireRole("TenantAdmin", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [client] = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.id, req.params.clientId), eq(clientsTable.tenantId, tenantId)));

    if (!client) { res.status(404).json({ error: "client_not_found" }); return; }

    const activeLoans = await db.execute(sql`
      SELECT COUNT(*) as count FROM loans
      WHERE client_id = ${client.id} AND tenant_id = ${tenantId}::uuid AND status IN ('Active', 'Overdue')
    `);

    if (Number((activeLoans.rows[0] as any).count) > 0) {
      res.status(409).json({
        error: "erasure_blocked",
        message: "Cannot erase client data while active loans exist. Close or write off all loans first.",
        activeLoans: Number((activeLoans.rows[0] as any).count),
      });
      return;
    }

    const { confirmErasure } = req.body;
    if (confirmErasure !== true) {
      res.status(400).json({
        error: "confirmation_required",
        message: "Set confirmErasure: true to proceed. This action is irreversible.",
      });
      return;
    }

    await db.update(clientsTable).set({
      fullNameAr: "[ERASED]",
      fullNameEn: "[ERASED]",
      nationalId: null,
      phone: null,
      address: null,
      primaryAddress: null,
      secondaryAddress: null,
      photoUrl: null,
      idFrontUrl: null,
      idBackUrl: null,
      kycNotes: null,
      iScoreData: null,
      updatedAt: new Date(),
    }).where(eq(clientsTable.id, client.id));

    await logAudit({
      userId: req.user!.id,
      tenantId,
      action: "pdpl_data_erasure",
      entity: "client",
      entityId: client.id,
      details: {
        reason: req.body.reason || "PDPL right to erasure request",
        originalClientCode: client.clientCode,
        erasedFields: "fullNameAr,fullNameEn,nationalId,phone,address,photos,kycData",
      },
    });

    res.json({
      success: true,
      clientId: client.id,
      message: "Client personal data has been erased per PDPL Article 11. Financial transaction records retained per regulatory requirements.",
      erasedAt: new Date().toISOString(),
      retainedData: "Anonymized financial transaction records (CBE 7-year retention requirement)",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/retention-policy", requireAuth, async (_req, res) => {
  res.json({
    policies: [
      { dataCategory: "Client Personal Data", retentionPeriod: "Duration of business relationship + 30 days", legalBasis: "PDPL Article 3", deletionMethod: "Anonymization" },
      { dataCategory: "KYC Documents", retentionPeriod: "5 years after account closure", legalBasis: "AML Law 80/2002, E-KYC Law 5/2022", deletionMethod: "Secure deletion" },
      { dataCategory: "Financial Transactions", retentionPeriod: "7 years", legalBasis: "CBE Regulations, Commercial Code", deletionMethod: "Anonymization" },
      { dataCategory: "Audit Logs", retentionPeriod: "10 years", legalBasis: "FRA Regulations", deletionMethod: "Secure deletion" },
      { dataCategory: "I-Score Reports", retentionPeriod: "3 years", legalBasis: "CBE Credit Bureau Regulations", deletionMethod: "Secure deletion" },
      { dataCategory: "Consent Records", retentionPeriod: "Duration of consent + 5 years", legalBasis: "PDPL Article 6", deletionMethod: "Secure deletion" },
    ],
    lastUpdated: "2026-04-01",
    dataProtectionOfficer: "compliance@neofmc.com",
  });
});

export default router;

import { Router } from "express";
import { db, clientsTable, loansTable, loanRequestsTable, installmentsTable, paymentsTable, tenantsTable } from "@workspace/db";
import { eq, and, desc, like, or, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { generateRefNumber, getBranchSeq } from "../lib/refGenerator";
import { encryptPII, decryptPII } from "../lib/encryption";
import { logAudit } from "../lib/auditLog";

const PII_FIELDS = ["nationalId", "phone", "address", "primaryAddress", "secondaryAddress"];
const ENCRYPTION_ENABLED = !!process.env.ENCRYPTION_KEY;

const router = Router();

const DEFAULT_ID_SETTINGS: Record<string, boolean> = { nationalId: true, jobTitle: true, professionLicenseId: true, agriculturalLandId: true, taxId: true, commercialRegistrationNo: true };
const ID_FIELD_LABELS: Record<string, string> = {
  nationalId: "National ID",
  jobTitle: "Job Title",
  professionLicenseId: "Profession License ID",
  agriculturalLandId: "Agricultural Land ID",
  taxId: "Tax ID",
  commercialRegistrationNo: "Commercial Registration No.",
};

async function getTenantIdSettings(tenantId: string): Promise<Record<string, boolean>> {
  const [tenant] = await db.select({ requiredIdentifications: tenantsTable.requiredIdentifications })
    .from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
  return (tenant?.requiredIdentifications as Record<string, boolean>) || DEFAULT_ID_SETTINGS;
}

function validateRequiredIds(body: Record<string, any>, settings: Record<string, boolean>): string | null {
  for (const [key, required] of Object.entries(settings)) {
    if (required && !body[key]) {
      return `${ID_FIELD_LABELS[key] || key} is required`;
    }
  }
  return null;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(500, Number(req.query.limit) || 20);
    const search = req.query.search as string | undefined;
    const offset = (page - 1) * limit;

    let query = db.select().from(clientsTable).where(eq(clientsTable.tenantId, tenantId));
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(clientsTable).where(eq(clientsTable.tenantId, tenantId));

    if (search) {
      const searchCond = or(
        like(clientsTable.fullNameAr, `%${search}%`),
        like(clientsTable.nationalId, `%${search}%`),
        like(clientsTable.phone, `%${search}%`),
        like(clientsTable.clientCode, `%${search}%`),
      );
      query = db.select().from(clientsTable).where(and(eq(clientsTable.tenantId, tenantId), searchCond));
      countQuery = db.select({ count: sql<number>`count(*)` }).from(clientsTable).where(and(eq(clientsTable.tenantId, tenantId), searchCond));
    }

    const [clients, [{ count }]] = await Promise.all([
      query.orderBy(desc(clientsTable.createdAt)).limit(limit).offset(offset),
      countQuery,
    ]);

    const decryptedClients = ENCRYPTION_ENABLED
      ? clients.map(c => decryptPII({ ...c }, PII_FIELDS) as typeof c)
      : clients;
    res.json({ data: decryptedClients.map(formatClient), total: Number(count), page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { nationalId, fullNameAr, fullNameEn, phone, address, primaryAddress, secondaryAddress, riskScore, jobTitle, professionLicenseId, agriculturalLandId, taxId, commercialRegistrationNo, idIssuanceDate, idExpiryDate } = req.body;
    if (!fullNameAr) {
      res.status(400).json({ error: "bad_request", message: "fullNameAr required" });
      return;
    }

    const idSettings = await getTenantIdSettings(tenantId);
    const idError = validateRequiredIds(req.body, idSettings);
    if (idError) {
      res.status(400).json({ error: "bad_request", message: idError });
      return;
    }

    if (nationalId) {
      const existingByNationalId = await db.select({ id: clientsTable.id, fullNameAr: clientsTable.fullNameAr, nationalId: clientsTable.nationalId, phone: clientsTable.phone })
        .from(clientsTable)
        .where(and(eq(clientsTable.tenantId, tenantId), eq(clientsTable.nationalId, nationalId)))
        .limit(1);
      if (existingByNationalId.length > 0) {
        res.status(409).json({ error: "duplicate_client", message: "A client with this National ID already exists", duplicate: existingByNationalId[0] });
        return;
      }
    }

    if (phone && !req.body.allowOverride) {
      const existingByPhone = await db.select({ id: clientsTable.id, fullNameAr: clientsTable.fullNameAr, nationalId: clientsTable.nationalId, phone: clientsTable.phone })
        .from(clientsTable)
        .where(and(eq(clientsTable.tenantId, tenantId), eq(clientsTable.phone, phone)))
        .limit(1);
      if (existingByPhone.length > 0) {
        res.status(409).json({ error: "duplicate_phone", message: "A client with this phone number already exists", duplicate: existingByPhone[0], allowOverride: true });
        return;
      }
    }

    const userBranchId = req.user!.branchId || "";
    const branchSeqStr = await getBranchSeq(userBranchId);
    const clientCode = await generateRefNumber("CL", "clients", "client_code", tenantId, branchSeqStr);

    let insertValues: Record<string, any> = {
      tenantId, clientCode, nationalId: nationalId || null, fullNameAr, fullNameEn, phone, address,
      primaryAddress: primaryAddress || null,
      secondaryAddress: secondaryAddress || null,
      jobTitle: jobTitle || null,
      professionLicenseId: professionLicenseId || null,
      agriculturalLandId: agriculturalLandId || null,
      taxId: taxId || null,
      commercialRegistrationNo: commercialRegistrationNo || null,
      idIssuanceDate: idIssuanceDate || null,
      idExpiryDate: idExpiryDate || null,
      riskScore: riskScore ? Number(riskScore) : null,
      isBlacklisted: false,
    };
    if (ENCRYPTION_ENABLED) {
      insertValues = encryptPII(insertValues, PII_FIELDS);
    }
    const [client] = await db.insert(clientsTable).values(insertValues).returning();

    await logAudit({
      tenantId,
      userId: req.user!.id,
      userName: req.user!.fullName || "",
      action: "CLIENT_REGISTERED",
      entity: "Client",
      entityId: client.id,
      details: { clientCode: client.clientCode, fullNameAr, nationalId: nationalId ? "provided" : "none" },
    });

    const clientOut = ENCRYPTION_ENABLED ? decryptPII({ ...client }, PII_FIELDS) : client;
    res.status(201).json(formatClient(clientOut as typeof client));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const [client] = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.id, req.params.id), eq(clientsTable.tenantId, tenantId))).limit(1);
    if (!client) { res.status(404).json({ error: "not_found" }); return; }
    const clientOut = ENCRYPTION_ENABLED ? decryptPII({ ...client }, PII_FIELDS) as typeof client : client;
    res.json(formatClient(clientOut));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const role = req.user!.role;
    if (!["SuperAdmin", "TenantAdmin", "BranchManager", "LoanOfficer", "DataEntry"].includes(role || "")) {
      res.status(403).json({ error: "forbidden", message: "Insufficient permissions to edit client" });
      return;
    }
    const { nationalId, fullNameAr, fullNameEn, phone, address, primaryAddress, secondaryAddress, riskScore, customerCategory, jobTitle, professionLicenseId, agriculturalLandId, taxId, commercialRegistrationNo, idIssuanceDate, idExpiryDate } = req.body;
    const updateData: Record<string, unknown> = {
      nationalId: nationalId || null, fullNameAr, fullNameEn, phone, address,
      primaryAddress: primaryAddress !== undefined ? (primaryAddress || null) : undefined,
      secondaryAddress: secondaryAddress !== undefined ? (secondaryAddress || null) : undefined,
      jobTitle: jobTitle !== undefined ? (jobTitle || null) : undefined,
      professionLicenseId: professionLicenseId !== undefined ? (professionLicenseId || null) : undefined,
      agriculturalLandId: agriculturalLandId !== undefined ? (agriculturalLandId || null) : undefined,
      taxId: taxId !== undefined ? (taxId || null) : undefined,
      commercialRegistrationNo: commercialRegistrationNo !== undefined ? (commercialRegistrationNo || null) : undefined,
      idIssuanceDate: idIssuanceDate !== undefined ? (idIssuanceDate || null) : undefined,
      idExpiryDate: idExpiryDate !== undefined ? (idExpiryDate || null) : undefined,
      riskScore: riskScore ? Number(riskScore) : null,
      updatedAt: new Date(),
    };
    Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);
    if (customerCategory) updateData.customerCategory = customerCategory;
    const finalUpdateData = ENCRYPTION_ENABLED ? encryptPII(updateData as Record<string, any>, PII_FIELDS) : updateData;
    const [updated] = await db.update(clientsTable)
      .set(finalUpdateData)
      .where(and(eq(clientsTable.id, req.params.id), eq(clientsTable.tenantId, tenantId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }

    await logAudit({
      tenantId,
      userId: req.user!.id,
      userName: req.user!.fullName || "",
      action: "CLIENT_UPDATED",
      entity: "Client",
      entityId: updated.id,
      details: { updatedFields: Object.keys(finalUpdateData).filter(k => k !== "updatedAt") },
    });

    const updatedOut = ENCRYPTION_ENABLED ? decryptPII({ ...updated }, PII_FIELDS) : updated;
    res.json(formatClient(updatedOut as typeof updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

function formatClient(c: typeof clientsTable.$inferSelect) {
  return {
    id: c.id,
    clientCode: c.clientCode || null,
    tenantId: c.tenantId,
    nationalId: c.nationalId,
    fullNameAr: c.fullNameAr,
    fullNameEn: c.fullNameEn,
    phone: c.phone,
    address: c.address,
    primaryAddress: c.primaryAddress,
    secondaryAddress: c.secondaryAddress,
    jobTitle: c.jobTitle,
    professionLicenseId: c.professionLicenseId,
    agriculturalLandId: c.agriculturalLandId,
    taxId: c.taxId,
    commercialRegistrationNo: c.commercialRegistrationNo,
    idIssuanceDate: c.idIssuanceDate,
    idExpiryDate: c.idExpiryDate,
    riskScore: c.riskScore,
    isBlacklisted: c.isBlacklisted,
    blacklistReason: c.blacklistReason,
    kycStatus: c.kycStatus,
    kycNotes: c.kycNotes,
    kycVerifiedAt: c.kycVerifiedAt,
    kycVerifiedById: c.kycVerifiedById,
    photoUrl: c.photoUrl,
    idFrontUrl: c.idFrontUrl,
    idBackUrl: c.idBackUrl,
    customerCategory: c.customerCategory,
    createdAt: c.createdAt,
  };
}

router.get("/:id/statement", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [client] = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.id, req.params.id), eq(clientsTable.tenantId, tenantId))).limit(1);
    if (!client) { res.status(404).json({ error: "not_found" }); return; }

    const loanReqs = await db.select().from(loanRequestsTable)
      .where(and(eq(loanRequestsTable.clientId, client.id), eq(loanRequestsTable.tenantId, tenantId)))
      .orderBy(desc(loanRequestsTable.createdAt));

    const statement: any[] = [];

    for (const lr of loanReqs) {
      const [loan] = await db.select().from(loansTable)
        .where(and(eq(loansTable.requestId, lr.id), eq(loansTable.tenantId, tenantId))).limit(1);
      if (!loan) continue;

      const installments = await db.select().from(installmentsTable)
        .where(and(eq(installmentsTable.loanId, loan.id), eq(installmentsTable.tenantId, tenantId)))
        .orderBy(installmentsTable.installmentNumber);

      const payments = await db.select().from(paymentsTable)
        .where(and(eq(paymentsTable.loanId, loan.id), eq(paymentsTable.tenantId, tenantId)))
        .orderBy(desc(paymentsTable.createdAt));

      statement.push({
        loan: {
          id: loan.id,
          disbursedAmount: Number(loan.disbursedAmount),
          outstandingBalance: Number(loan.outstandingBalance),
          totalPaid: Number(loan.totalPaid),
          status: loan.status,
          disbursedAt: loan.disbursedAt,
        },
        installments: installments.map(i => ({
          installmentNumber: i.installmentNumber,
          dueDate: i.dueDate,
          totalAmount: Number(i.totalAmount),
          principalAmount: Number(i.principalAmount),
          interestAmount: Number(i.interestAmount),
          paidAmount: Number(i.paidAmount),
          penaltyAmount: Number(i.penaltyAmount),
          status: i.status,
          paidDate: i.paidDate,
        })),
        payments: payments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          paymentMethod: p.paymentMethod,
          referenceNumber: p.referenceNumber,
          createdAt: p.createdAt,
        })),
      });
    }

    res.json({
      client: formatClient(client),
      loans: statement,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/kyc", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const role = req.user!.role;
    if (!["SuperAdmin", "TenantAdmin", "BranchManager", "LoanOfficer"].includes(role || "")) {
      res.status(403).json({ error: "forbidden", message: "Insufficient permissions for KYC update" });
      return;
    }

    const { kycStatus, kycNotes, photoUrl, idFrontUrl, idBackUrl } = req.body;
    if (!kycStatus || !["Pending", "InProgress", "Verified", "Rejected", "Expired"].includes(kycStatus)) {
      res.status(400).json({ error: "bad_request", message: "kycStatus must be one of: Pending, InProgress, Verified, Rejected, Expired" });
      return;
    }

    const updateData: Record<string, unknown> = { kycStatus, updatedAt: new Date() };
    if (kycNotes !== undefined) updateData.kycNotes = kycNotes;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (idFrontUrl !== undefined) updateData.idFrontUrl = idFrontUrl;
    if (idBackUrl !== undefined) updateData.idBackUrl = idBackUrl;

    if (kycStatus === "Verified") {
      updateData.kycVerifiedAt = new Date();
      updateData.kycVerifiedById = req.user!.id;
    }

    const [existing] = await db.select({ kycStatus: clientsTable.kycStatus, fullNameAr: clientsTable.fullNameAr })
      .from(clientsTable)
      .where(and(eq(clientsTable.id, req.params.id), eq(clientsTable.tenantId, tenantId))).limit(1);

    const [updated] = await db.update(clientsTable)
      .set(updateData)
      .where(and(eq(clientsTable.id, req.params.id), eq(clientsTable.tenantId, tenantId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }

    await logAudit({
      tenantId,
      userId: req.user!.id,
      userName: req.user!.fullName || "",
      action: "KYC_STATUS_CHANGED",
      entity: "Client",
      entityId: updated.id,
      details: {
        previousStatus: existing?.kycStatus || "Unknown",
        newStatus: kycStatus,
        clientName: existing?.fullNameAr || updated.fullNameAr,
        kycNotes: kycNotes || null,
      },
    });

    res.json(formatClient(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/filter/by-category", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const category = req.query.category as string;
    if (!category) { res.status(400).json({ error: "bad_request", message: "category required" }); return; }

    const clients = await db.select({
      id: clientsTable.id,
      fullNameAr: clientsTable.fullNameAr,
      nationalId: clientsTable.nationalId,
      phone: clientsTable.phone,
      customerCategory: clientsTable.customerCategory,
    }).from(clientsTable)
      .where(and(eq(clientsTable.tenantId, tenantId), eq(clientsTable.customerCategory, category)))
      .orderBy(clientsTable.fullNameAr)
      .limit(200);

    res.json({ data: clients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

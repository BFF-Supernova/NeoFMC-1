import { Router } from "express";
import { db, guaranteesTable, clientsTable, tenantsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { generateRefNumber, getBranchSeq } from "../lib/refGenerator";

const router = Router();

const DEFAULT_ID_SETTINGS: Record<string, boolean> = { nationalId: true, jobTitle: true, professionLicenseId: true, agriculturalLandId: true, taxId: true, commercialRegistrationNo: true };

async function getTenantIdSettings(tenantId: string): Promise<Record<string, boolean>> {
  const [tenant] = await db.select({ requiredIdentifications: tenantsTable.requiredIdentifications })
    .from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
  return (tenant?.requiredIdentifications as Record<string, boolean>) || DEFAULT_ID_SETTINGS;
}

const GUARANTOR_ID_FIELD_MAP: Record<string, string> = {
  nationalId: "guarantorNationalId",
  jobTitle: "guarantorJobTitle",
  professionLicenseId: "guarantorProfessionLicenseId",
  agriculturalLandId: "guarantorAgriculturalLandId",
  taxId: "guarantorTaxId",
  commercialRegistrationNo: "guarantorCommercialRegistrationNo",
};
const ID_FIELD_LABELS: Record<string, string> = {
  nationalId: "National ID", jobTitle: "Job Title", professionLicenseId: "Profession License ID",
  agriculturalLandId: "Agricultural Land ID", taxId: "Tax ID", commercialRegistrationNo: "Commercial Registration No.",
};

function validateGuarantorIds(body: Record<string, any>, settings: Record<string, boolean>): string | null {
  for (const [key, required] of Object.entries(settings)) {
    if (required) {
      const guarantorField = GUARANTOR_ID_FIELD_MAP[key];
      if (guarantorField && !body[guarantorField]) {
        return `Guarantor ${ID_FIELD_LABELS[key] || key} is required`;
      }
    }
  }
  return null;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const loanId = req.query.loanId as string | undefined;
    const loanRequestId = req.query.loanRequestId as string | undefined;
    const clientId = req.query.clientId as string | undefined;

    let whereClause = eq(guaranteesTable.tenantId, tenantId);
    if (loanId) whereClause = and(whereClause, eq(guaranteesTable.loanId, loanId)) as typeof whereClause;
    if (loanRequestId) whereClause = and(whereClause, eq(guaranteesTable.loanRequestId, loanRequestId)) as typeof whereClause;
    if (clientId) whereClause = and(whereClause, eq(guaranteesTable.clientId, clientId)) as typeof whereClause;

    const guarantees = await db.select().from(guaranteesTable).where(whereClause).orderBy(desc(guaranteesTable.createdAt));

    const clientIds = [...new Set(guarantees.map(g => g.clientId).filter(Boolean))];
    const clientMap = new Map<string, string>();
    for (const cId of clientIds) {
      const [c] = await db.select({ fullNameAr: clientsTable.fullNameAr }).from(clientsTable).where(eq(clientsTable.id, cId!)).limit(1);
      if (c) clientMap.set(cId!, c.fullNameAr);
    }

    res.json(guarantees.map(g => ({ ...g, guaranteeValue: g.guaranteeValue ? Number(g.guaranteeValue) : null, clientName: g.clientId ? clientMap.get(g.clientId) || null : null })));
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { clientId, loanId, loanRequestId, guaranteeType, guarantorName, guarantorNameAr, guarantorNationalId, guarantorPhone, guarantorAddress, guarantorJobTitle, guarantorProfessionLicenseId, guarantorAgriculturalLandId, guarantorTaxId, guarantorCommercialRegistrationNo, guarantorIdIssuanceDate, guarantorIdExpiryDate, guaranteeValue, assetDescription, expiryDate, documentUrls, notes } = req.body;
    if (!guaranteeType || !guarantorName) {
      res.status(400).json({ error: "bad_request", message: "guaranteeType, guarantorName required" });
      return;
    }

    const idSettings = await getTenantIdSettings(tenantId);
    const idError = validateGuarantorIds(req.body, idSettings);
    if (idError) {
      res.status(400).json({ error: "bad_request", message: idError });
      return;
    }

    const userBranchId = req.user!.branchId || "";
    const branchSeqStr = await getBranchSeq(userBranchId);
    const guaranteeNumber = await generateRefNumber("GR", "guarantees", "guarantee_number", tenantId, branchSeqStr);

    const [guarantee] = await db.insert(guaranteesTable).values({
      tenantId, guaranteeNumber, clientId: clientId || null, loanId: loanId || null, loanRequestId: loanRequestId || null,
      guaranteeType, guarantorName, guarantorNameAr, guarantorNationalId,
      guarantorPhone, guarantorAddress,
      guarantorJobTitle: guarantorJobTitle || null,
      guarantorProfessionLicenseId: guarantorProfessionLicenseId || null,
      guarantorAgriculturalLandId: guarantorAgriculturalLandId || null,
      guarantorTaxId: guarantorTaxId || null,
      guarantorCommercialRegistrationNo: guarantorCommercialRegistrationNo || null,
      guarantorIdIssuanceDate: guarantorIdIssuanceDate || null,
      guarantorIdExpiryDate: guarantorIdExpiryDate || null,
      guaranteeValue: guaranteeValue?.toString() || null,
      assetDescription, expiryDate, documentUrls, notes,
      status: "Active",
    }).returning();

    res.status(201).json({ ...guarantee, guaranteeValue: guarantee.guaranteeValue ? Number(guarantee.guaranteeValue) : null });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const fields = ["clientId", "guaranteeType", "guarantorName", "guarantorNameAr", "guarantorNationalId", "guarantorPhone", "guarantorAddress", "guarantorJobTitle", "guarantorProfessionLicenseId", "guarantorAgriculturalLandId", "guarantorTaxId", "guarantorCommercialRegistrationNo", "guarantorIdIssuanceDate", "guarantorIdExpiryDate", "guaranteeValue", "assetDescription", "expiryDate", "status", "documentUrls", "notes"];
    for (const f of fields) {
      if (req.body[f] !== undefined) updateData[f] = f === "guaranteeValue" ? req.body[f]?.toString() : req.body[f];
    }

    const [updated] = await db.update(guaranteesTable).set(updateData)
      .where(and(eq(guaranteesTable.id, req.params.id), eq(guaranteesTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ ...updated, guaranteeValue: updated.guaranteeValue ? Number(updated.guaranteeValue) : null });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

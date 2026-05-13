import { Router } from "express";
import { db, bankFacilitiesTable, insuranceCompaniesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const facilities = await db.select().from(bankFacilitiesTable)
      .where(eq(bankFacilitiesTable.tenantId, tenantId)).orderBy(desc(bankFacilitiesTable.createdAt));
    res.json(facilities.map(f => ({
      ...f, facilityLimit: Number(f.facilityLimit), usedAmount: Number(f.usedAmount),
      availableAmount: Number(f.availableAmount), interestRate: f.interestRate ? Number(f.interestRate) : null,
    })));
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { bankName, bankNameAr, facilityType, facilityLimit, interestRate, startDate, expiryDate, accountNumber, contactPerson, notes } = req.body;
    if (!bankName || !facilityType || !facilityLimit) {
      res.status(400).json({ error: "bad_request", message: "bankName, facilityType, facilityLimit required" });
      return;
    }

    const [facility] = await db.insert(bankFacilitiesTable).values({
      tenantId, bankName, bankNameAr, facilityType,
      facilityLimit: facilityLimit.toString(),
      availableAmount: facilityLimit.toString(),
      interestRate: interestRate?.toString() || null,
      startDate, expiryDate, accountNumber, contactPerson, notes,
    }).returning();

    res.status(201).json({
      ...facility, facilityLimit: Number(facility.facilityLimit),
      usedAmount: Number(facility.usedAmount), availableAmount: Number(facility.availableAmount),
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const fields = ["bankName", "bankNameAr", "facilityType", "facilityLimit", "interestRate", "startDate", "expiryDate", "accountNumber", "contactPerson", "notes", "isActive", "status"];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updateData[f] = ["facilityLimit", "interestRate"].includes(f) ? req.body[f]?.toString() : req.body[f];
      }
    }

    const [updated] = await db.update(bankFacilitiesTable).set(updateData)
      .where(and(eq(bankFacilitiesTable.id, req.params.id), eq(bankFacilitiesTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json({
      ...updated, facilityLimit: Number(updated.facilityLimit),
      usedAmount: Number(updated.usedAmount), availableAmount: Number(updated.availableAmount),
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/insurance-companies", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const companies = await db.select().from(insuranceCompaniesTable)
      .where(eq(insuranceCompaniesTable.tenantId, tenantId)).orderBy(desc(insuranceCompaniesTable.createdAt));
    res.json(companies.map(c => ({ ...c, premiumRate: c.premiumRate ? Number(c.premiumRate) : null })));
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/insurance-companies", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { companyName, companyNameAr, contactPerson, phone, email, policyType, premiumRate, notes } = req.body;
    if (!companyName) {
      res.status(400).json({ error: "bad_request", message: "companyName required" });
      return;
    }

    const [company] = await db.insert(insuranceCompaniesTable).values({
      tenantId, companyName, companyNameAr, contactPerson, phone, email,
      policyType, premiumRate: premiumRate?.toString() || null, notes,
    }).returning();

    res.status(201).json({ ...company, premiumRate: company.premiumRate ? Number(company.premiumRate) : null });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.get("/product-regions", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const { productRegionsTable, productSectorsTable } = await import("@workspace/db");
    const productId = req.query.productId as string | undefined;

    let regionsWhere = eq(productRegionsTable.tenantId, tenantId);
    let sectorsWhere = eq(productSectorsTable.tenantId, tenantId);
    if (productId) {
      regionsWhere = and(regionsWhere, eq(productRegionsTable.productId, productId)) as typeof regionsWhere;
      sectorsWhere = and(sectorsWhere, eq(productSectorsTable.productId, productId)) as typeof sectorsWhere;
    }

    const [regions, sectors] = await Promise.all([
      db.select().from(productRegionsTable).where(regionsWhere),
      db.select().from(productSectorsTable).where(sectorsWhere),
    ]);

    res.json({ regions, sectors });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/product-regions", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { productRegionsTable } = await import("@workspace/db");
    const { productId, regionName, regionNameAr, isAllowed } = req.body;
    if (!productId || !regionName) {
      res.status(400).json({ error: "bad_request", message: "productId, regionName required" });
      return;
    }

    const [region] = await db.insert(productRegionsTable).values({
      tenantId, productId, regionName, regionNameAr, isAllowed: isAllowed !== false,
    }).returning();
    res.status(201).json(region);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

router.post("/product-sectors", requireAuth, requireRole("TenantAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const { productSectorsTable } = await import("@workspace/db");
    const { productId, sectorName, sectorNameAr, isAllowed } = req.body;
    if (!productId || !sectorName) {
      res.status(400).json({ error: "bad_request", message: "productId, sectorName required" });
      return;
    }

    const [sector] = await db.insert(productSectorsTable).values({
      tenantId, productId, sectorName, sectorNameAr, isAllowed: isAllowed !== false,
    }).returning();
    res.status(201).json(sector);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "server_error" });
  }
});

export default router;

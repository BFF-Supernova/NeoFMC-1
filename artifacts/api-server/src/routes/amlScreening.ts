import { Router } from "express";
import { requireAuth, requireRole } from "../lib/auth";
import { screenClient, monitorTransaction, getTransactionRules } from "../lib/amlScreening";

const router = Router();

router.post("/screen-client", requireAuth, requireRole("TenantAdmin", "LoanOfficer", "BranchManager", "Auditor", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const { nationalId, fullNameAr, fullNameEn, dateOfBirth, screeningType } = req.body;
    if (!nationalId || !fullNameAr) {
      res.status(400).json({ error: "bad_request", message: "nationalId and fullNameAr are required" });
      return;
    }

    const result = await screenClient({
      nationalId,
      fullNameAr,
      fullNameEn,
      dateOfBirth,
      tenantId,
      userId: req.user!.id,
      screeningType: screeningType || "onboarding",
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/monitor-transaction", requireAuth, requireRole("TenantAdmin", "BranchManager", "FinancialController", "SuperAdmin"), async (req, res) => {
  try {
    const alerts = monitorTransaction(req.body);
    res.json({ alerts, alertCount: alerts.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/transaction-rules", requireAuth, requireRole("TenantAdmin", "Auditor", "SuperAdmin"), async (_req, res) => {
  const rules = getTransactionRules();
  res.json(rules.map(r => ({ id: r.id, name: r.name, description: r.description, riskLevel: r.riskLevel })));
});

export default router;

import { Router } from "express";
import { requireAuth, requireRole } from "../lib/auth";
import { verifyNationalId } from "../lib/nidaService";

const router = Router();

router.post("/verify", requireAuth, requireRole("TenantAdmin", "LoanOfficer", "BranchManager", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const { nationalId, fullNameAr, dateOfBirth } = req.body;
    if (!nationalId || !fullNameAr) {
      res.status(400).json({ error: "bad_request", message: "nationalId and fullNameAr are required" });
      return;
    }

    const result = await verifyNationalId({
      nationalId,
      fullNameAr,
      dateOfBirth,
      tenantId,
      userId: req.user!.id,
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

import { Router } from "express";
import { requireAuth, requireRole } from "../lib/auth";
import { performEKyc } from "../lib/ekycService";

const router = Router();

router.post("/verify", requireAuth, requireRole("TenantAdmin", "LoanOfficer", "BranchManager", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const { clientId, nationalId, fullNameAr, fullNameEn, dateOfBirth, idFrontImage, idBackImage, selfieImage } = req.body;
    if (!nationalId || !fullNameAr) {
      res.status(400).json({ error: "bad_request", message: "nationalId and fullNameAr are required" });
      return;
    }

    const result = await performEKyc({
      clientId,
      nationalId,
      fullNameAr,
      fullNameEn,
      dateOfBirth,
      idFrontImage,
      idBackImage,
      selfieImage,
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

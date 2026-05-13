import { Router } from "express";
import { requireAuth, requireRole } from "../lib/auth";
import { runEndOfDayProcessing } from "../lib/scheduler";

const router = Router();

router.post("/run-eod", requireAuth, requireRole("TenantAdmin", "SuperAdmin"), async (req, res) => {
  try {
    const results = await runEndOfDayProcessing();
    res.json({ success: true, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

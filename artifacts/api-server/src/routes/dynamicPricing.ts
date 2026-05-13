import { Router } from "express";
import { requireAuth, requireRole } from "../lib/auth";
import { requireModule } from "../middlewares/featureGate";
import { calculateDynamicPrice } from "../lib/ai/collectionOptimizer";

const router = Router();

router.use(requireAuth, requireModule("moduleDynamicPricing"));

router.post("/calculate", requireRole("TenantAdmin", "BranchManager", "LoanOfficer", "SuperAdmin"), async (req, res) => {
  try {
    const { creditScore, baseRate, loanAmount, termMonths, maxRate } = req.body;
    if (creditScore === undefined || !baseRate || !loanAmount) {
      res.status(400).json({ error: "creditScore, baseRate, and loanAmount are required" });
      return;
    }
    const result = calculateDynamicPrice(creditScore, baseRate, loanAmount, termMonths || 12, maxRate || 30);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

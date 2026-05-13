import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { simulateLoan } from "../lib/installmentEngine";

const router = Router();

router.post("/simulate", requireAuth, (req, res) => {
  try {
    const { amount, termMonths, interestRate, amortizationMethod, adminFeePct, insuranceFeePct } = req.body;
    if (!amount || !termMonths || interestRate === undefined || !amortizationMethod) {
      res.status(400).json({ error: "bad_request", message: "amount, termMonths, interestRate, amortizationMethod required" });
      return;
    }

    const result = simulateLoan({
      amount: Number(amount),
      termMonths: Number(termMonths),
      interestRate: Number(interestRate),
      amortizationMethod,
      adminFeePct: Number(adminFeePct || 0),
      insuranceFeePct: Number(insuranceFeePct || 0),
    });

    let remaining = Number(amount);
    result.schedule = result.schedule.map(s => {
      remaining -= s.principal;
      return { ...s, remainingBalance: Math.max(0, Math.round(remaining * 100) / 100) };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

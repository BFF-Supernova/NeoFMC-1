import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { requireModule } from "../middlewares/featureGate";
import { optimizeCollectionStrategy, type CollectionInput } from "../lib/ai/collectionOptimizer";

const router = Router();

router.use(requireAuth, requireModule("moduleAICollection"));

router.get("/optimize", requireRole("TenantAdmin", "BranchManager", "CollectionOfficer", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const branchId = req.query.branchId as string | undefined;

    let query = sql`
      SELECT c.id as client_id, c.full_name_ar as client_name, c.phone, c.primary_address as address, c.governorate,
        SUM(i.total_amount - i.paid_amount) as outstanding_amount,
        MAX(EXTRACT(DAY FROM NOW() - i.due_date)::int) as days_overdue,
        COUNT(CASE WHEN i.status IN ('Pending', 'PartiallyPaid') AND i.due_date < NOW() THEN 1 END) as total_overdue_installments,
        (SELECT MAX(p.created_at) FROM payments p WHERE p.loan_id = l.id)::text as last_payment_date,
        (SELECT COUNT(*) FROM payments p2 WHERE p2.loan_id = l.id) as total_payments,
        (SELECT COUNT(*) FROM collection_activities ca WHERE ca.client_id = c.id AND ca.outcome IN ('Promise', 'Partial'))::int as broken_promises,
        (SELECT COUNT(*) FROM collection_activities ca2 WHERE ca2.client_id = c.id)::int as contact_attempts
      FROM installments i
      JOIN loans l ON i.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      WHERE l.tenant_id = ${tenantId}::uuid AND i.status IN ('Pending', 'PartiallyPaid') AND i.due_date < NOW()
    `;
    if (branchId) query = sql`${query} AND l.branch_id = ${branchId}::uuid`;
    query = sql`${query} GROUP BY c.id, c.full_name_ar, c.phone, c.primary_address, c.governorate, l.id ORDER BY outstanding_amount DESC LIMIT 200`;

    const result = await db.execute(query);

    const inputs: CollectionInput[] = (result.rows as any[]).map(row => ({
      clientId: row.client_id,
      clientName: row.client_name,
      outstandingAmount: Number(row.outstanding_amount),
      daysOverdue: Number(row.days_overdue) || 0,
      totalOverdueInstallments: Number(row.total_overdue_installments),
      lastPaymentDate: row.last_payment_date,
      lastContactDate: null,
      lastContactChannel: null,
      contactAttempts: Number(row.contact_attempts),
      brokenPromises: Number(row.broken_promises),
      onTimePayments: Number(row.total_payments) - Number(row.broken_promises),
      totalPayments: Number(row.total_payments),
      phone: row.phone,
      hasWhatsApp: !!row.phone,
      address: row.address,
      governorate: row.governorate,
    }));

    const strategies = optimizeCollectionStrategy(inputs);
    res.json({ totalClients: strategies.length, strategies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/promise", requireRole("TenantAdmin", "BranchManager", "CollectionOfficer", "LoanOfficer", "SuperAdmin"), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { clientId, loanId, promisedAmount, promisedDate, notes } = req.body;
    if (!clientId || !promisedAmount || !promisedDate) {
      res.status(400).json({ error: "clientId, promisedAmount, and promisedDate required" });
      return;
    }
    await db.execute(sql`
      INSERT INTO payment_promises (tenant_id, client_id, loan_id, promised_amount, promised_date, notes, recorded_by, status)
      VALUES (${tenantId}::uuid, ${clientId}::uuid, ${loanId ? sql`${loanId}::uuid` : sql`NULL`}, ${promisedAmount}, ${promisedDate}::date, ${notes || null}, ${req.user!.id}::uuid, 'pending')
    `);
    res.status(201).json({ message: "Payment promise recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/promises", async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await db.execute(sql`
      SELECT pp.*, c.full_name_ar as client_name FROM payment_promises pp
      JOIN clients c ON pp.client_id = c.id
      WHERE pp.tenant_id = ${tenantId}::uuid ORDER BY pp.promised_date ASC LIMIT 500
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

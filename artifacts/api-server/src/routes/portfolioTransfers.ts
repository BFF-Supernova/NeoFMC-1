import { Router } from "express";
import { db, portfolioTransfersTable, loansTable, loanRequestsTable, usersTable, branchesTable } from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const rows = await db.select().from(portfolioTransfersTable)
      .where(eq(portfolioTransfersTable.tenantId, tenantId))
      .orderBy(desc(portfolioTransfersTable.createdAt));

    const officerIds = [...new Set([
      ...rows.map(r => r.fromOfficerId).filter(Boolean),
      ...rows.map(r => r.toOfficerId).filter(Boolean),
    ])] as string[];

    const branchIds = [...new Set([
      ...rows.map(r => r.fromBranchId).filter(Boolean),
      ...rows.map(r => r.toBranchId).filter(Boolean),
    ])] as string[];

    const officerMap = new Map<string, string>();
    const branchMap = new Map<string, string>();

    if (officerIds.length > 0) {
      const officers = await db.select({ id: usersTable.id, fullName: usersTable.fullName })
        .from(usersTable).where(inArray(usersTable.id, officerIds));
      officers.forEach(o => officerMap.set(o.id, o.fullName || ""));
    }
    if (branchIds.length > 0) {
      const branches = await db.select({ id: branchesTable.id, nameAr: branchesTable.nameAr })
        .from(branchesTable).where(inArray(branchesTable.id, branchIds));
      branches.forEach(b => branchMap.set(b.id, b.nameAr));
    }

    res.json({
      data: rows.map(r => ({
        ...r,
        fromOfficerName: r.fromOfficerId ? officerMap.get(r.fromOfficerId) || null : null,
        toOfficerName: r.toOfficerId ? officerMap.get(r.toOfficerId) || null : null,
        fromBranchName: r.fromBranchId ? branchMap.get(r.fromBranchId) || null : null,
        toBranchName: r.toBranchId ? branchMap.get(r.toBranchId) || null : null,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const role = req.user!.role;
    if (!["SuperAdmin", "TenantAdmin", "BranchManager"].includes(role || "")) {
      res.status(403).json({ error: "forbidden", message: "Only admins and managers can transfer portfolios" });
      return;
    }

    const { transferType, fromOfficerId, toOfficerId, fromBranchId, toBranchId, loanIds, reason } = req.body;
    const validTypes = ["officer_to_officer", "branch_to_branch", "cross_branch_officer"];
    const tType = transferType || "officer_to_officer";

    if (!validTypes.includes(tType)) {
      res.status(400).json({ error: "bad_request", message: `transferType must be one of: ${validTypes.join(", ")}` });
      return;
    }

    if (tType === "officer_to_officer" && (!fromOfficerId || !toOfficerId)) {
      res.status(400).json({ error: "bad_request", message: "fromOfficerId and toOfficerId required for officer_to_officer transfer" });
      return;
    }
    if (tType === "branch_to_branch" && (!fromBranchId || !toBranchId)) {
      res.status(400).json({ error: "bad_request", message: "fromBranchId and toBranchId required for branch_to_branch transfer" });
      return;
    }
    if (tType === "cross_branch_officer" && (!fromOfficerId || !toOfficerId)) {
      res.status(400).json({ error: "bad_request", message: "fromOfficerId and toOfficerId required for cross_branch_officer transfer" });
      return;
    }

    if (toOfficerId) {
      const [targetUser] = await db.select().from(usersTable)
        .where(and(eq(usersTable.id, toOfficerId), eq(usersTable.tenantId, tenantId))).limit(1);
      if (!targetUser) {
        res.status(400).json({ error: "bad_request", message: "Target officer not found in this tenant" });
        return;
      }
    }

    if (toBranchId) {
      const [targetBranch] = await db.select().from(branchesTable)
        .where(and(eq(branchesTable.id, toBranchId), eq(branchesTable.tenantId, tenantId))).limit(1);
      if (!targetBranch) {
        res.status(400).json({ error: "bad_request", message: "Target branch not found in this tenant" });
        return;
      }
    }

    let affectedLoans: { id: string }[] = [];

    if (loanIds && loanIds.length > 0) {
      affectedLoans = await db.select({ id: loansTable.id }).from(loansTable)
        .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active"), inArray(loansTable.id, loanIds)));
    } else if (tType === "branch_to_branch" && fromBranchId) {
      affectedLoans = await db.select({ id: loansTable.id }).from(loansTable)
        .where(and(eq(loansTable.tenantId, tenantId), eq(loansTable.status, "Active"), eq(loansTable.assignedBranchId, fromBranchId)));
    } else if (fromOfficerId) {
      affectedLoans = await db.select({ id: loansTable.id }).from(loansTable)
        .innerJoin(loanRequestsTable, eq(loansTable.requestId, loanRequestsTable.id))
        .where(and(
          eq(loansTable.tenantId, tenantId),
          eq(loansTable.status, "Active"),
          eq(loanRequestsTable.assignedOfficerId, fromOfficerId)
        ));
    }

    if (affectedLoans.length === 0) {
      res.status(400).json({ error: "bad_request", message: "No active loans found to transfer" });
      return;
    }

    const loanIdsToUpdate = affectedLoans.map(l => l.id);
    const needsApproval = tType === "cross_branch_officer" && role === "BranchManager";

    const { pool } = await import("@workspace/db");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (!needsApproval) {
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (toOfficerId) updateData.assignedOfficerId = toOfficerId;
        if (toBranchId) updateData.assignedBranchId = toBranchId;

        await db.update(loansTable).set(updateData)
          .where(inArray(loansTable.id, loanIdsToUpdate));

        if (toOfficerId) {
          for (const loanId of loanIdsToUpdate) {
            const [lr] = await db.select().from(loanRequestsTable)
              .innerJoin(loansTable, eq(loansTable.requestId, loanRequestsTable.id))
              .where(eq(loansTable.id, loanId)).limit(1);
            if (lr) {
              await db.update(loanRequestsTable).set({
                assignedOfficerId: toOfficerId,
                updatedAt: new Date(),
              }).where(eq(loanRequestsTable.id, lr.loan_requests.id));
            }
          }
        }
      }

      const [transfer] = await db.insert(portfolioTransfersTable).values({
        tenantId,
        transferType: tType,
        fromOfficerId: fromOfficerId || null,
        toOfficerId: toOfficerId || null,
        fromBranchId: fromBranchId || null,
        toBranchId: toBranchId || null,
        loanCount: loanIdsToUpdate.length,
        loanIds: loanIdsToUpdate,
        reason: reason || null,
        status: needsApproval ? "PendingApproval" : "Completed",
        transferredById: req.user!.id,
        transferredByName: req.user!.fullName || req.user!.email || "",
      }).returning();

      await client.query("COMMIT");

      res.status(201).json({
        ...transfer,
        affectedLoanIds: loanIdsToUpdate,
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/approve", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const role = req.user!.role;
    if (!["SuperAdmin", "TenantAdmin"].includes(role || "")) {
      res.status(403).json({ error: "forbidden", message: "Only admins can approve cross-branch transfers" });
      return;
    }

    const [transfer] = await db.select().from(portfolioTransfersTable)
      .where(and(
        eq(portfolioTransfersTable.id, req.params.id),
        eq(portfolioTransfersTable.tenantId, tenantId),
        eq(portfolioTransfersTable.status, "PendingApproval"),
      )).limit(1);

    if (!transfer) { res.status(404).json({ error: "not_found" }); return; }

    const storedLoanIds = (transfer as any).loanIds as string[] | undefined;

    if (storedLoanIds && storedLoanIds.length > 0) {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (transfer.toOfficerId) updateData.assignedOfficerId = transfer.toOfficerId;
      if (transfer.toBranchId) updateData.assignedBranchId = transfer.toBranchId;

      await db.update(loansTable).set(updateData)
        .where(inArray(loansTable.id, storedLoanIds));

      if (transfer.toOfficerId) {
        for (const loanId of storedLoanIds) {
          const [lr] = await db.select().from(loanRequestsTable)
            .innerJoin(loansTable, eq(loansTable.requestId, loanRequestsTable.id))
            .where(eq(loansTable.id, loanId)).limit(1);
          if (lr) {
            await db.update(loanRequestsTable).set({
              assignedOfficerId: transfer.toOfficerId,
              updatedAt: new Date(),
            }).where(eq(loanRequestsTable.id, lr.loan_requests.id));
          }
        }
      }
    }

    const [updated] = await db.update(portfolioTransfersTable).set({
      status: "Completed",
      approvedById: req.user!.id,
      approvedAt: new Date(),
    }).where(eq(portfolioTransfersTable.id, req.params.id)).returning();

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/:id/reject", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }
    const role = req.user!.role;
    if (!["SuperAdmin", "TenantAdmin"].includes(role || "")) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    const [updated] = await db.update(portfolioTransfersTable).set({
      status: "Rejected",
      approvedById: req.user!.id,
      approvedAt: new Date(),
    }).where(and(
      eq(portfolioTransfersTable.id, req.params.id),
      eq(portfolioTransfersTable.tenantId, tenantId),
      eq(portfolioTransfersTable.status, "PendingApproval"),
    )).returning();

    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

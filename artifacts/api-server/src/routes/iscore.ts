import { Router } from "express";
import { db, iscoreChecksTable, clientsTable, tenantsTable, loanRequestsTable, blacklistsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.post("/check/:clientId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    if (!tenant?.iscoreEnabled) {
      res.status(400).json({ error: "iscore_disabled", message: "I-Score integration is not enabled for this company" });
      return;
    }

    const [client] = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.id, req.params.clientId), eq(clientsTable.tenantId, tenantId))).limit(1);
    if (!client) { res.status(404).json({ error: "client_not_found" }); return; }

    const mockScore = 300 + Math.floor(Math.random() * 550);
    const result = mockScore >= 400 ? "Pass" : "Fail";
    const responseData = {
      score: mockScore,
      result,
      reportDate: new Date().toISOString(),
      creditHistory: mockScore >= 500 ? "Good" : mockScore >= 400 ? "Fair" : "Poor",
      activeLoans: Math.floor(Math.random() * 5),
      defaultHistory: mockScore < 400,
    };

    const [check] = await db.insert(iscoreChecksTable).values({
      tenantId,
      clientId: client.id,
      nationalId: client.nationalId,
      score: mockScore,
      status: "Completed",
      result,
      responseData,
      checkedById: req.user!.id,
      loanRequestId: req.body.loanRequestId || null,
    }).returning();

    await db.update(clientsTable).set({
      iScoreData: responseData,
      updatedAt: new Date(),
    }).where(eq(clientsTable.id, client.id));

    if (req.body.loanRequestId) {
      const [lr] = await db.select({ id: loanRequestsTable.id, clientId: loanRequestsTable.clientId })
        .from(loanRequestsTable)
        .where(and(eq(loanRequestsTable.id, req.body.loanRequestId), eq(loanRequestsTable.tenantId, tenantId)))
        .limit(1);
      if (lr && lr.clientId === client.id) {
        await db.update(loanRequestsTable).set({
          iscoreChecked: true,
          iscoreResult: responseData,
          updatedAt: new Date(),
        }).where(eq(loanRequestsTable.id, lr.id));
      }
    }

    await logAudit({
      tenantId,
      userId: req.user!.id,
      userName: req.user!.fullName || "",
      action: "ISCORE_CHECK_PERFORMED",
      entity: "Client",
      entityId: client.id,
      details: {
        checkId: check.id,
        score: mockScore,
        result,
        creditHistory: responseData.creditHistory,
        loanRequestId: req.body.loanRequestId || null,
      },
    });

    res.json({
      checkId: check.id,
      clientId: client.id,
      nationalId: client.nationalId,
      score: mockScore,
      result,
      creditHistory: responseData.creditHistory,
      responseData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.get("/history/:clientId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const checks = await db.select().from(iscoreChecksTable)
      .where(and(eq(iscoreChecksTable.tenantId, tenantId), eq(iscoreChecksTable.clientId, req.params.clientId)));

    res.json({ data: checks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/gate/:loanRequestId", requireAuth, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) { res.status(403).json({ error: "forbidden" }); return; }

    const [lr] = await db.select().from(loanRequestsTable)
      .where(and(eq(loanRequestsTable.id, req.params.loanRequestId), eq(loanRequestsTable.tenantId, tenantId))).limit(1);
    if (!lr) { res.status(404).json({ error: "not_found" }); return; }

    const [client] = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.id, lr.clientId), eq(clientsTable.tenantId, tenantId))).limit(1);
    if (!client) { res.status(404).json({ error: "client_not_found" }); return; }

    const blacklistRows = await db.select().from(blacklistsTable)
      .where(and(eq(blacklistsTable.tenantId, tenantId), eq(blacklistsTable.nationalId, client.nationalId)));

    const isBlacklisted = blacklistRows.length > 0;
    await db.update(loanRequestsTable).set({
      blacklistChecked: true,
      blacklistClear: !isBlacklisted,
      updatedAt: new Date(),
    }).where(eq(loanRequestsTable.id, lr.id));

    if (isBlacklisted) {
      await db.update(clientsTable).set({
        isBlacklisted: true,
        blacklistReason: blacklistRows.map(b => `${b.listType}: ${b.reason || "N/A"}`).join("; "),
        updatedAt: new Date(),
      }).where(eq(clientsTable.id, client.id));
    }

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    let iscoreResult = null;
    if (tenant?.iscoreEnabled) {
      const mockScore = 300 + Math.floor(Math.random() * 550);
      const result = mockScore >= 400 ? "Pass" : "Fail";
      const responseData = {
        score: mockScore, result,
        reportDate: new Date().toISOString(),
        creditHistory: mockScore >= 500 ? "Good" : mockScore >= 400 ? "Fair" : "Poor",
      };

      await db.insert(iscoreChecksTable).values({
        tenantId, clientId: client.id, nationalId: client.nationalId,
        score: mockScore, status: "Completed", result, responseData,
        checkedById: req.user!.id, loanRequestId: lr.id,
      });

      await db.update(loanRequestsTable).set({
        iscoreChecked: true,
        iscoreResult: responseData,
        updatedAt: new Date(),
      }).where(eq(loanRequestsTable.id, lr.id));

      iscoreResult = { score: mockScore, result, creditHistory: responseData.creditHistory };
    }

    const canProceed = !isBlacklisted && (iscoreResult ? iscoreResult.result === "Pass" : true);

    await logAudit({
      tenantId,
      userId: req.user!.id,
      userName: req.user!.fullName || "",
      action: "RISK_GATE_EVALUATED",
      entity: "LoanRequest",
      entityId: lr.id,
      details: {
        clientId: client.id,
        blacklistCheck: { clear: !isBlacklisted, matchCount: blacklistRows.length },
        iscoreCheck: tenant?.iscoreEnabled
          ? { score: iscoreResult?.score, result: iscoreResult?.result }
          : { skipped: true, reason: "I-Score disabled" },
        canProceed,
      },
    });

    res.json({
      loanRequestId: lr.id,
      blacklistCheck: { checked: true, clear: !isBlacklisted, entries: blacklistRows },
      iscoreCheck: tenant?.iscoreEnabled ? { checked: true, ...iscoreResult } : { checked: false, reason: "I-Score disabled" },
      canProceed,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;

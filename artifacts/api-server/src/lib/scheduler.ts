import { db, installmentsTable, loansTable, loanRequestsTable, paymentsTable, fundProductsTable, notificationsTable, clientsTable, recurringJournalTemplatesTable, recurringJournalLinesTable, journalEntriesTable, journalItemsTable, glAccountsTable } from "@workspace/db";
import { eq, and, lt, sql, lte, inArray } from "drizzle-orm";
import cron from "node-cron";

export function initScheduler() {
  cron.schedule("0 0 * * *", async () => {
    console.log("[Scheduler] Running midnight EOD processing...");
    try {
      const results = await runEndOfDayProcessing();
      console.log("[Scheduler] EOD completed:", results);
    } catch (err) {
      console.error("[Scheduler] EOD failed:", err);
    }
  }, { timezone: "Africa/Cairo" });

  cron.schedule("0 6 * * *", async () => {
    console.log("[Scheduler] Running 6 AM recurring journals...");
    try {
      const results = await executeRecurringJournals();
      console.log("[Scheduler] Recurring journals completed:", results);
    } catch (err) {
      console.error("[Scheduler] Recurring journals failed:", err);
    }
  }, { timezone: "Africa/Cairo" });

  console.log("[Scheduler] Initialized — EOD cron set for midnight Cairo time, recurring journals at 6 AM");
}

export async function runEndOfDayProcessing() {
  const today = new Date().toISOString().split("T")[0];
  const results = {
    overdueMarked: 0,
    penaltiesAccrued: 0,
    remindersQueued: 0,
    arrearsAutoCleared: 0,
    interestAccrued: 0,
    escalationsCreated: 0,
    emailRemindersQueued: 0,
  };

  try {
    const overdue = await db.update(installmentsTable)
      .set({ status: "Overdue", updatedAt: new Date() })
      .where(and(
        eq(installmentsTable.status, "Pending"),
        lt(installmentsTable.dueDate, today),
      ))
      .returning({ id: installmentsTable.id });
    results.overdueMarked = overdue.length;

    const overdueInstallments = await db.select({
      id: installmentsTable.id,
      tenantId: installmentsTable.tenantId,
      loanId: installmentsTable.loanId,
      totalAmount: installmentsTable.totalAmount,
      paidAmount: installmentsTable.paidAmount,
      penaltyAmount: installmentsTable.penaltyAmount,
      dueDate: installmentsTable.dueDate,
      installmentNumber: installmentsTable.installmentNumber,
    }).from(installmentsTable)
      .where(eq(installmentsTable.status, "Overdue"))
      .limit(5000);

    const loanIds = [...new Set(overdueInstallments.map(i => i.loanId))];
    const loans = loanIds.length > 0 ? await db.select({
      id: loansTable.id,
      loanRequestId: loansTable.loanRequestId,
    }).from(loansTable)
      .where(sql`${loansTable.id} IN (${sql.join(loanIds.map(id => sql`${id}`), sql`,`)})`) : [];

    const requestIds = [...new Set(loans.map(l => l.loanRequestId).filter(Boolean))];
    const requests = requestIds.length > 0 ? await db.select({
      id: loanRequestsTable.id,
      productId: loanRequestsTable.productId,
    }).from(loanRequestsTable)
      .where(sql`${loanRequestsTable.id} IN (${sql.join(requestIds.map(id => sql`${id}`), sql`,`)})`) : [];

    const productIds = [...new Set(requests.map(r => r.productId).filter(Boolean))];
    const products = productIds.length > 0 ? await db.select({
      id: fundProductsTable.id,
      penaltyRatePerDay: fundProductsTable.penaltyRatePerDay,
      penaltyCapPct: fundProductsTable.penaltyCapPct,
      arrearsTolerance: fundProductsTable.arrearsTolerance,
    }).from(fundProductsTable)
      .where(sql`${fundProductsTable.id} IN (${sql.join(productIds.map(id => sql`${id}`), sql`,`)})`) : [];

    const loanToRequest = new Map(loans.map(l => [l.id, l.loanRequestId]));
    const requestToProduct = new Map(requests.map(r => [r.id, r.productId]));
    const productMap = new Map(products.map(p => [p.id, p]));

    for (const inst of overdueInstallments) {
      const reqId = loanToRequest.get(inst.loanId);
      const prodId = reqId ? requestToProduct.get(reqId) : null;
      const product = prodId ? productMap.get(prodId) : null;
      if (!product) continue;

      const rate = Number(product.penaltyRatePerDay || 0);
      if (rate <= 0) continue;

      const remaining = Number(inst.totalAmount) - Number(inst.paidAmount);
      const tolerance = Number(product.arrearsTolerance || 0);
      if (remaining <= tolerance && tolerance > 0) {
        await db.update(installmentsTable)
          .set({ status: "Paid", paidAmount: inst.totalAmount, updatedAt: new Date() })
          .where(eq(installmentsTable.id, inst.id));
        results.arrearsAutoCleared++;
        continue;
      }

      const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(inst.dueDate).getTime()) / 86400000));
      let newPenalty = Math.round(remaining * (rate / 100) * daysOverdue * 100) / 100;

      const capPct = Number(product.penaltyCapPct || 0);
      if (capPct > 0) {
        const maxPenalty = remaining * (capPct / 100);
        newPenalty = Math.min(newPenalty, maxPenalty);
      }

      const currentPenalty = Number(inst.penaltyAmount || 0);
      const penaltyDelta = newPenalty - currentPenalty;
      if (Math.abs(penaltyDelta) > 0.01) {
        try {
          await db.transaction(async (tx) => {
            await tx.update(installmentsTable)
              .set({ penaltyAmount: newPenalty.toString(), updatedAt: new Date() })
              .where(eq(installmentsTable.id, inst.id));

            const penaltyReceivableAcct = await tx.select({ id: glAccountsTable.id })
              .from(glAccountsTable)
              .where(and(eq(glAccountsTable.tenantId, inst.tenantId), eq(glAccountsTable.accountCode, "1102")))
              .limit(1);
            const penaltyIncomeAcct = await tx.select({ id: glAccountsTable.id })
              .from(glAccountsTable)
              .where(and(eq(glAccountsTable.tenantId, inst.tenantId), eq(glAccountsTable.accountCode, "4002")))
              .limit(1);

            if (penaltyReceivableAcct.length > 0 && penaltyIncomeAcct.length > 0) {
              const absDelta = Math.abs(penaltyDelta).toFixed(2);
              const isIncrease = penaltyDelta > 0;
              const description = isIncrease
                ? `Penalty accrual of ${absDelta} EGP on installment #${inst.installmentNumber} (${daysOverdue} days overdue)`
                : `Penalty reversal of ${absDelta} EGP on installment #${inst.installmentNumber} (cap/correction)`;

              const [entry] = await tx.insert(journalEntriesTable).values({
                tenantId: inst.tenantId,
                referenceType: isIncrease ? "PenaltyAccrual" : "PenaltyReversal",
                referenceId: inst.loanId,
                description,
                totalDebit: absDelta,
                totalCredit: absDelta,
              }).returning();

              await tx.insert(journalItemsTable).values([
                {
                  tenantId: inst.tenantId, entryId: entry.id,
                  accountId: isIncrease ? penaltyReceivableAcct[0].id : penaltyIncomeAcct[0].id,
                  debit: absDelta, credit: "0.00",
                },
                {
                  tenantId: inst.tenantId, entryId: entry.id,
                  accountId: isIncrease ? penaltyIncomeAcct[0].id : penaltyReceivableAcct[0].id,
                  debit: "0.00", credit: absDelta,
                },
              ]);
            }
          });
          results.penaltiesAccrued++;
        } catch (penaltyErr) {
          console.error("[EOD] Penalty accrual/reversal transaction failed:", penaltyErr);
        }
      }
    }

    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 3);
    const reminderDateStr = reminderDate.toISOString().split("T")[0];

    const upcomingInstallments = await db.select({
      id: installmentsTable.id,
      tenantId: installmentsTable.tenantId,
      loanId: installmentsTable.loanId,
      dueDate: installmentsTable.dueDate,
      totalAmount: installmentsTable.totalAmount,
    }).from(installmentsTable)
      .where(and(
        eq(installmentsTable.status, "Pending"),
        lte(installmentsTable.dueDate, reminderDateStr),
      ))
      .limit(1000);

    for (const inst of upcomingInstallments) {
      const [loan] = await db.select({ clientId: loansTable.clientId }).from(loansTable)
        .where(eq(loansTable.id, inst.loanId)).limit(1);
      if (!loan?.clientId) continue;

      const [client] = await db.select({ phone: clientsTable.phone, fullNameAr: clientsTable.fullNameAr })
        .from(clientsTable).where(eq(clientsTable.id, loan.clientId)).limit(1);
      if (!client?.phone) continue;

      await db.insert(notificationsTable).values({
        tenantId: inst.tenantId,
        recipientType: "Client",
        recipientId: loan.clientId,
        recipientContact: client.phone,
        channel: "SMS",
        subject: "Payment Reminder",
        body: `Dear ${client.fullNameAr}, your installment of ${inst.totalAmount} is due on ${inst.dueDate}. Please ensure timely payment.`,
        status: "Queued",
      });
      results.remindersQueued++;

      if (client.phone) {
        await db.insert(notificationsTable).values({
          tenantId: inst.tenantId,
          recipientType: "Client",
          recipientId: loan.clientId,
          recipientContact: client.phone,
          channel: "Email",
          subject: "Payment Reminder - Neo FMC",
          body: `Dear ${client.fullNameAr},\n\nThis is a reminder that your installment of ${inst.totalAmount} EGP is due on ${inst.dueDate}.\n\nPlease ensure timely payment to avoid any penalties.\n\nBest regards,\nNeo FMC`,
          status: "Queued",
        });
        results.emailRemindersQueued++;
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const severelyOverdue = await db.select({
      id: installmentsTable.id,
      tenantId: installmentsTable.tenantId,
      loanId: installmentsTable.loanId,
      dueDate: installmentsTable.dueDate,
      totalAmount: installmentsTable.totalAmount,
    }).from(installmentsTable)
      .where(and(
        eq(installmentsTable.status, "Overdue"),
        lte(installmentsTable.dueDate, thirtyDaysAgoStr),
      ))
      .limit(500);

    const escalatedLoanIds = new Set<string>();
    for (const inst of severelyOverdue) {
      if (escalatedLoanIds.has(inst.loanId)) continue;
      escalatedLoanIds.add(inst.loanId);

      const daysOverdue = Math.floor((Date.now() - new Date(inst.dueDate).getTime()) / 86400000);

      const [loan] = await db.select({ clientId: loansTable.clientId, assignedOfficerId: loansTable.assignedOfficerId }).from(loansTable)
        .where(eq(loansTable.id, inst.loanId)).limit(1);
      if (!loan) continue;

      await db.insert(notificationsTable).values({
        tenantId: inst.tenantId,
        recipientType: "User",
        recipientId: loan.assignedOfficerId || null,
        recipientContact: null,
        channel: "InApp",
        subject: "Collection Escalation",
        body: `Loan ${inst.loanId.slice(0, 8)} has installment overdue by ${daysOverdue} days (due ${inst.dueDate}). Amount: ${inst.totalAmount} EGP. Requires immediate collection follow-up.`,
        status: "Queued",
      });
      results.escalationsCreated++;
    }

    const activeLoans = await db.select({
      id: loansTable.id,
      tenantId: loansTable.tenantId,
      loanRequestId: loansTable.loanRequestId,
      outstandingBalance: loansTable.outstandingBalance,
      status: loansTable.status,
    }).from(loansTable)
      .where(eq(loansTable.status, "Active"))
      .limit(5000);

    for (const loan of activeLoans) {
      if (!loan.loanRequestId) continue;
      const [request] = await db.select({ productId: loanRequestsTable.productId, interestRate: loanRequestsTable.interestRate })
        .from(loanRequestsTable).where(eq(loanRequestsTable.id, loan.loanRequestId)).limit(1);
      if (!request?.interestRate) continue;

      const annualRate = Number(request.interestRate);
      if (annualRate <= 0) continue;
      const dailyRate = annualRate / 365 / 100;
      const outstanding = Number(loan.outstandingBalance || 0);
      if (outstanding <= 0) continue;

      const dailyInterest = Math.round(outstanding * dailyRate * 100) / 100;
      if (dailyInterest < 0.01) continue;

      results.interestAccrued++;
    }

  } catch (err) {
    console.error("[EOD] Error:", err);
  }

  console.log(`[EOD] Processing complete:`, results);
  return results;
}

export async function executeRecurringJournals() {
  const today = new Date().toISOString().split("T")[0];
  const results = { executed: 0, skipped: 0, errors: 0 };

  try {
    const templates = await db.select().from(recurringJournalTemplatesTable)
      .where(and(
        eq(recurringJournalTemplatesTable.isActive, true),
        lte(recurringJournalTemplatesTable.nextRunDate, today),
      ))
      .limit(100);

    for (const template of templates) {
      try {
        if (template.endDate && template.endDate < today) {
          await db.update(recurringJournalTemplatesTable)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(recurringJournalTemplatesTable.id, template.id));
          results.skipped++;
          continue;
        }

        const lines = await db.select().from(recurringJournalLinesTable)
          .where(eq(recurringJournalLinesTable.templateId, template.id));

        if (lines.length === 0) { results.skipped++; continue; }

        const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
        const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

        const [entry] = await db.insert(journalEntriesTable).values({
          tenantId: template.tenantId,
          branchId: template.branchId,
          referenceType: "RecurringJournal",
          referenceId: template.id,
          transactionDate: today,
          description: `[Auto] ${template.name} - Recurring Journal`,
          totalDebit: totalDebit.toFixed(2),
          totalCredit: totalCredit.toFixed(2),
        }).returning();

        for (const line of lines) {
          await db.insert(journalItemsTable).values({
            tenantId: template.tenantId,
            entryId: entry.id,
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
          });
        }

        let nextDate = new Date(today);
        switch (template.frequency) {
          case 'Daily': nextDate.setDate(nextDate.getDate() + 1); break;
          case 'Weekly': nextDate.setDate(nextDate.getDate() + 7); break;
          case 'Monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
          case 'Quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
          case 'Yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        }

        await db.update(recurringJournalTemplatesTable).set({
          nextRunDate: nextDate.toISOString().split("T")[0],
          lastRunDate: today,
          updatedAt: new Date(),
        }).where(eq(recurringJournalTemplatesTable.id, template.id));

        results.executed++;
      } catch (err) {
        console.error(`[RecurringJournal] Error executing template ${template.id}:`, err);
        results.errors++;
      }
    }
  } catch (err) {
    console.error("[RecurringJournal] Error:", err);
  }

  return results;
}

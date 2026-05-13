import { db, glAccountsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const STANDARD_GL_ACCOUNTS = [
  { accountCode: "1001", accountName: "Cash on Hand", accountNameAr: "النقدية بالخزينة", accountType: "Asset" },
  { accountCode: "1002", accountName: "Cash at Bank", accountNameAr: "النقدية بالبنك", accountType: "Asset" },
  { accountCode: "1003", accountName: "Petty Cash", accountNameAr: "نثريات", accountType: "Asset" },
  { accountCode: "1100", accountName: "Loan Portfolio - Principal", accountNameAr: "محفظة القروض - أصل الدين", accountType: "Asset" },
  { accountCode: "1101", accountName: "Loan Portfolio - Interest Receivable", accountNameAr: "محفظة القروض - فوائد مستحقة", accountType: "Asset" },
  { accountCode: "1102", accountName: "Loan Portfolio - Penalties Receivable", accountNameAr: "محفظة القروض - غرامات مستحقة", accountType: "Asset" },
  { accountCode: "1200", accountName: "Provision for Loan Losses", accountNameAr: "مخصص خسائر القروض", accountType: "Asset" },
  { accountCode: "1300", accountName: "Prepaid Expenses", accountNameAr: "مصروفات مدفوعة مقدماً", accountType: "Asset" },
  { accountCode: "1400", accountName: "Fixed Assets", accountNameAr: "أصول ثابتة", accountType: "Asset" },
  { accountCode: "1401", accountName: "Accumulated Depreciation", accountNameAr: "إهلاك متراكم", accountType: "Asset" },
  { accountCode: "1500", accountName: "Other Receivables", accountNameAr: "مدينون آخرون", accountType: "Asset" },
  { accountCode: "2001", accountName: "Borrowings from Banks", accountNameAr: "قروض من البنوك", accountType: "Liability" },
  { accountCode: "2002", accountName: "Borrowings from Funds", accountNameAr: "قروض من صناديق التمويل", accountType: "Liability" },
  { accountCode: "2100", accountName: "Accounts Payable", accountNameAr: "دائنون", accountType: "Liability" },
  { accountCode: "2200", accountName: "Accrued Expenses", accountNameAr: "مصروفات مستحقة", accountType: "Liability" },
  { accountCode: "2300", accountName: "Tax Payable", accountNameAr: "ضرائب مستحقة", accountType: "Liability" },
  { accountCode: "2400", accountName: "Client Deposits", accountNameAr: "تأمينات العملاء", accountType: "Liability" },
  { accountCode: "2500", accountName: "Unearned Revenue", accountNameAr: "إيرادات مؤجلة", accountType: "Liability" },
  { accountCode: "3001", accountName: "Share Capital", accountNameAr: "رأس المال", accountType: "Equity" },
  { accountCode: "3002", accountName: "Retained Earnings", accountNameAr: "أرباح مرحلة", accountType: "Equity" },
  { accountCode: "3003", accountName: "Reserves", accountNameAr: "احتياطيات", accountType: "Equity" },
  { accountCode: "3004", accountName: "Donated Capital / Grants", accountNameAr: "رأس مال ممنوح / منح", accountType: "Equity" },
  { accountCode: "4001", accountName: "Interest Income on Loans", accountNameAr: "إيرادات فوائد القروض", accountType: "Income" },
  { accountCode: "4002", accountName: "Penalty Income", accountNameAr: "إيرادات غرامات التأخير", accountType: "Income" },
  { accountCode: "4003", accountName: "Service Fee Income", accountNameAr: "إيرادات رسوم الخدمة", accountType: "Income" },
  { accountCode: "4004", accountName: "Commission Income", accountNameAr: "إيرادات عمولات", accountType: "Income" },
  { accountCode: "4005", accountName: "Early Settlement Fee Income", accountNameAr: "إيرادات رسوم السداد المبكر", accountType: "Income" },
  { accountCode: "4006", accountName: "Insurance Income", accountNameAr: "إيرادات تأمين", accountType: "Income" },
  { accountCode: "4099", accountName: "Other Income", accountNameAr: "إيرادات أخرى", accountType: "Income" },
  { accountCode: "5001", accountName: "Salaries & Benefits", accountNameAr: "مرتبات ومزايا الموظفين", accountType: "Expense" },
  { accountCode: "5002", accountName: "Rent Expense", accountNameAr: "مصروف الإيجار", accountType: "Expense" },
  { accountCode: "5003", accountName: "Utilities", accountNameAr: "مصروفات المرافق", accountType: "Expense" },
  { accountCode: "5004", accountName: "Provision Expense", accountNameAr: "مصروف المخصصات", accountType: "Expense" },
  { accountCode: "5005", accountName: "Depreciation Expense", accountNameAr: "مصروف الإهلاك", accountType: "Expense" },
  { accountCode: "5006", accountName: "Interest Expense on Borrowings", accountNameAr: "مصروف فوائد الاقتراض", accountType: "Expense" },
  { accountCode: "5007", accountName: "Commission Expense", accountNameAr: "مصروف عمولات", accountType: "Expense" },
  { accountCode: "5008", accountName: "Insurance Expense", accountNameAr: "مصروف تأمين", accountType: "Expense" },
  { accountCode: "5009", accountName: "Legal & Professional Fees", accountNameAr: "مصروفات قانونية ومهنية", accountType: "Expense" },
  { accountCode: "5010", accountName: "Marketing & Advertising", accountNameAr: "مصروفات تسويق وإعلان", accountType: "Expense" },
  { accountCode: "5011", accountName: "Write-Off Expense", accountNameAr: "مصروف شطب ديون", accountType: "Expense" },
  { accountCode: "5099", accountName: "Other Expenses", accountNameAr: "مصروفات أخرى", accountType: "Expense" },
];

export async function seedGlAccountsForTenant(tenantId: string): Promise<number> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` })
    .from(glAccountsTable)
    .where(eq(glAccountsTable.tenantId, tenantId));

  if (Number(count) > 0) {
    return 0;
  }

  const values = STANDARD_GL_ACCOUNTS.map(acc => ({
    tenantId,
    accountCode: acc.accountCode,
    accountName: acc.accountName,
    accountNameAr: acc.accountNameAr,
    accountType: acc.accountType,
  }));

  await db.insert(glAccountsTable).values(values);
  return values.length;
}

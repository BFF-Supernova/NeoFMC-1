const crypto = require('crypto');
const PW_HASH = "$2b$10$/hlHoAZpfhgI8yHBqXe4P.NvDlZcukY6WKB6qBcMBThRk9ZNCnh1S";
const TENANT_ID = "8042ea3a-182f-422f-9793-f31061f02b56";
const EXISTING_BRANCH = "bb07449c-2414-456c-a5d6-490b7d7c8465";
const PRODUCTS = [
  "948e59e7-ad6d-45ca-80a9-d50929ba8ae5",
  "1795a1ad-2949-4ab6-8fdd-f8b38a12b311",
  "f1c1e20a-f453-4a98-93b5-e7ba438186fd",
  "3774c260-34c3-432b-ba13-225cc38daa0a",
];

function uuid() { return crypto.randomUUID(); }
function ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function re(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function ds(d) { return d.toISOString().split("T")[0]; }
function ts(d) { return d.toISOString().replace("T"," ").replace("Z",""); }
function addM(d, n) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
function addD(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function esc(s) { return s.replace(/'/g, "''"); }

const ROLES = ["TenantAdmin","BranchManager","LoanOfficer","CollectionOfficer","Cashier","Auditor","DataEntry","Accountant","FinancialController","CFO"];
const ARABIC_FIRST = ["أحمد","محمد","عبدالله","إبراهيم","مصطفى","خالد","حسن","يوسف","عمر","ماجد","سعيد","ناصر","وليد","فاروق","طارق","هشام","عادل","جمال","رامي","سامي","كريم","تامر","بلال","زياد","فهد","شريف","أشرف","ياسر","نبيل","حمدي","عماد","صلاح","منير","باسم","عصام","أيمن","مجدي","رضا","فتحي","غسان"];
const ARABIC_LAST = ["عبدالرحمن","الشافعي","حسين","علي","السيد","فاروق","محمود","إبراهيم","مرسي","الدين","الحكيم","البدوي","العتيبي","السعدي","المنصور","الزهراني","العمري","القحطاني","المالكي","الغامدي","النور","الفتاح","الرزاق","الكريم","الصمد","الواحد","القادر","المهيمن","الجبار","المتعال"];
const EN_FIRST = ["Ahmed","Mohamed","Abdullah","Ibrahim","Mostafa","Khaled","Hassan","Youssef","Omar","Maged","Saeed","Nasser","Walid","Farouk","Tarek","Hesham","Adel","Gamal","Rami","Sami","Karim","Tamer","Bilal","Ziad","Fahd","Sherif","Ashraf","Yasser","Nabil","Hamdi","Emad","Salah","Mounir","Basem","Essam","Ayman","Magdy","Reda","Fathy","Ghassan"];
const EN_LAST = ["Abdel-Rahman","El-Shafei","Hussein","Ali","El-Sayed","Farouk","Mahmoud","Ibrahim","Morsi","El-Din","El-Hakim","El-Badawy","El-Otaibi","El-Saadi","El-Mansour","El-Zahrani","El-Omari","El-Qahtani","El-Malki","El-Ghamdi","El-Nour","Abdel-Fattah","Abdel-Razaq","Abdel-Karim","Abdel-Samad","Abdel-Wahid","Abdel-Qader","El-Mohaimin","El-Jabbar","El-Moataal"];
const CITIES = ["القاهرة","الجيزة","الإسكندرية","المنصورة","طنطا","الزقازيق","أسيوط","سوهاج","المنيا","بني سويف","الفيوم","قنا","أسوان","دمياط","بورسعيد"];
const STREETS = ["شارع الحرية","شارع الجمهورية","شارع النيل","شارع التحرير","شارع المعز","شارع صلاح سالم","شارع رمسيس","شارع الهرم","شارع فيصل","شارع مصر حلوان"];

const sql = [];
const today = new Date();

sql.push("BEGIN;");

sql.push(`UPDATE tenants SET allowed_domains = 'fmc.com', module_core_basic = true, module_core_edge = true, module_advanced_lending = true, module_financial_settlements = true, iscore_enabled = true, epayment_fawry_enabled = true WHERE id = '${TENANT_ID}';`);

const branchIds = [EXISTING_BRANCH];
const branchData = [
  { ar: "فرع المعادي", en: "Maadi Branch", region: "South Cairo", regionAr: "جنوب القاهرة" },
  { ar: "فرع مدينة نصر", en: "Nasr City Branch", region: "East Cairo", regionAr: "شرق القاهرة" },
  { ar: "فرع الإسكندرية", en: "Alexandria Branch", region: "Alexandria", regionAr: "الإسكندرية" },
  { ar: "فرع المنصورة", en: "Mansoura Branch", region: "Delta", regionAr: "الدلتا" },
];
for (const b of branchData) {
  const id = uuid();
  branchIds.push(id);
  sql.push(`INSERT INTO branches (id, tenant_id, branch_name_ar, branch_name_en, main_cash_box_balance, spending_limit, region, region_ar) VALUES ('${id}','${TENANT_ID}','${esc(b.ar)}','${esc(b.en)}',500000,100000,'${b.region}','${esc(b.regionAr)}') ON CONFLICT DO NOTHING;`);
}

const usersByRole = {};
const allUserIds = [];
for (const role of ROLES) {
  usersByRole[role] = [];
  const prefix = role.toLowerCase();
  for (let i = 1; i <= 10; i++) {
    const id = uuid();
    const isSU = i === 10;
    const email = `${prefix}${i}@fmc.com`;
    const fullName = `${role} User ${i}${isSU ? " (SU)" : ""}`;
    const branchId = branchIds[i % branchIds.length];
    sql.push(`INSERT INTO users (id, tenant_id, branch_id, full_name, email, password_hash, role, is_active, is_super_user) VALUES ('${id}','${TENANT_ID}','${branchId}','${fullName}','${email}','${PW_HASH}','${role}',true,${isSU}) ON CONFLICT (email) DO NOTHING;`);
    usersByRole[role].push(id);
    allUserIds.push(id);
  }
}

const clientIds = [];
const clientNames = [];
const totalClients = 660;
for (let i = 0; i < totalClients; i++) {
  const id = uuid();
  clientIds.push(id);
  const fnAr = re(ARABIC_FIRST), lnAr = re(ARABIC_LAST);
  const fnEn = re(EN_FIRST), lnEn = re(EN_LAST);
  const nameAr = `${fnAr} ${lnAr}`;
  const nameEn = `${fnEn} ${lnEn}`;
  clientNames.push({ ar: nameAr, en: nameEn });
  const nid = `2${ri(80,99)}${String(ri(1,12)).padStart(2,"0")}${String(ri(1,28)).padStart(2,"0")}${ri(10,35)}${ri(1000,9999)}${ri(1,9)}`;
  const phone = `01${ri(0,2)}${ri(10000000,99999999)}`;
  const address = `${re(STREETS)}، ${re(CITIES)}`;
  const risk = ri(20, 95);
  sql.push(`INSERT INTO clients (id, tenant_id, national_id, full_name_ar, full_name_en, phone, address, risk_score, is_blacklisted) VALUES ('${id}','${TENANT_ID}','${nid}','${esc(nameAr)}','${esc(nameEn)}','${phone}','${esc(address)}',${risk},false) ON CONFLICT DO NOTHING;`);
}

const loanOfficers = usersByRole["LoanOfficer"];
const collectionOfficers = usersByRole["CollectionOfficer"];
const cashiers = usersByRole["Cashier"];

const requestStatuses = ["Draft","Draft","CreditReview","CreditReview","FieldVisit","FieldVisit","Approved","Approved","Approved","Draft"];
for (let i = 0; i < 10; i++) {
  const id = uuid();
  const clientId = clientIds[650 + i];
  const productId = re(PRODUCTS);
  const amount = ri(5,50)*1000;
  const term = re([6,12,18,24]);
  const officer = re(loanOfficers);
  const st = requestStatuses[i];
  const created = ts(addD(today, -ri(1,15)));
  sql.push(`INSERT INTO loan_requests (id, tenant_id, client_id, product_id, requested_amount, term_months, workflow_status, assigned_officer_id, interest_rate, admin_fee, insurance_fee, stamp_duty, iscore_checked, blacklist_checked, blacklist_clear, created_at) VALUES ('${id}','${TENANT_ID}','${clientId}','${productId}',${amount},${term},'${st}','${officer}',18,0,0,0,${st!=="Draft"},${st!=="Draft"},true,'${created}');`);
}

let totalInstallments = 0;
let totalPayments = 0;
const deferredInstallments = [];
const deferredPayments = [];
const loanIdList = [];

for (let i = 0; i < 650; i++) {
  const clientId = clientIds[i];
  const productId = re(PRODUCTS);
  const officer = re(loanOfficers);
  const branch = branchIds[i % branchIds.length];
  const amount = ri(5,100)*1000;
  const termMonths = re([6,12,18,24]);
  const interestRate = re([18,20,22,25]);

  let daysAgo = ri(60,600);
  let disbursedDate = addD(today, -daysAgo);
  const minDate = new Date("2024-06-01");
  if (disbursedDate < minDate) disbursedDate = new Date(minDate);

  const requestId = uuid();
  sql.push(`INSERT INTO loan_requests (id, tenant_id, client_id, product_id, requested_amount, term_months, workflow_status, assigned_officer_id, interest_rate, admin_fee, insurance_fee, stamp_duty, iscore_checked, blacklist_checked, blacklist_clear, created_at, updated_at) VALUES ('${requestId}','${TENANT_ID}','${clientId}','${productId}',${amount},${termMonths},'Disbursed','${officer}',${interestRate},0,0,0,true,true,true,'${ts(disbursedDate)}','${ts(disbursedDate)}');`);

  const monthlyRate = interestRate / 100 / 12;
  const emi = Math.round((amount * monthlyRate * Math.pow(1+monthlyRate,termMonths))/(Math.pow(1+monthlyRate,termMonths)-1));
  const totalLoanAmt = emi * termMonths;

  const loanId = uuid();
  let status = "Active";
  let outstandingBalance = totalLoanAmt;
  let totalPaid = 0;

  const installs = [];
  let remainP = amount;
  for (let m = 1; m <= termMonths; m++) {
    const dueDate = addM(disbursedDate, m);
    const intAmt = Math.round(remainP * monthlyRate);
    const prinAmt = Math.max(emi - intAmt, 0);
    remainP -= prinAmt;

    let instStatus = "Pending";
    let paidAmount = 0;
    let paidDate = null;
    let penalty = 0;

    if (dueDate < today) {
      const chance = Math.random();
      if (chance < 0.75) {
        instStatus = "Paid"; paidAmount = emi;
        paidDate = ds(addD(dueDate, ri(-2,5)));
        totalPaid += emi; outstandingBalance -= emi;
      } else if (chance < 0.88) {
        const partial = Math.round(emi * (ri(30,70)/100));
        instStatus = "PartiallyPaid"; paidAmount = partial;
        paidDate = ds(addD(dueDate, ri(0,10)));
        totalPaid += partial; outstandingBalance -= partial;
        penalty = Math.round((emi-partial)*0.001*ri(1,30));
      } else {
        instStatus = "Overdue";
        const dov = Math.round((today.getTime()-dueDate.getTime())/86400000);
        penalty = Math.round(emi*0.001*dov);
      }
    }

    const instId = uuid();
    installs.push({ id: instId, num: m, dueDate, status: instStatus, paid: paidAmount, paidDate });
    deferredInstallments.push(`INSERT INTO installments (id, tenant_id, loan_id, installment_number, due_date, principal_amount, interest_amount, total_amount, paid_amount, penalty_amount, status, paid_date) VALUES ('${instId}','${TENANT_ID}','${loanId}',${m},'${ds(dueDate)}',${prinAmt},${intAmt},${emi},${paidAmount},${penalty},'${instStatus}',${paidDate ? "'"+paidDate+"'" : "NULL"});`);
    totalInstallments++;

    if (paidAmount > 0) {
      const collector = re([...collectionOfficers, ...cashiers]);
      const payMethod = re(["Cash","Cash","Cash","E-Payment","BankTransfer"]);
      const refNum = payMethod === "Cash" ? "NULL" : `'REF-${ri(100000,999999)}'`;
      deferredPayments.push(`INSERT INTO payments (id, tenant_id, loan_id, installment_id, amount, payment_method, reference_number, collected_by_id, branch_id, status, created_at) VALUES ('${uuid()}','${TENANT_ID}','${loanId}','${instId}',${paidAmount},'${payMethod}',${refNum},'${collector}','${branch}','Completed','${paidDate}');`);
      totalPayments++;
    }
  }

  const allPaid = installs.every(inst => inst.status === "Paid");
  if (allPaid) { status = "Closed"; outstandingBalance = 0; }
  const nextInst = installs.find(inst => ["Pending","Overdue","PartiallyPaid"].includes(inst.status));

  sql.push(`INSERT INTO loans (id, tenant_id, request_id, disbursed_amount, outstanding_balance, total_paid, status, disbursed_at, assigned_officer_id, assigned_branch_id, next_installment_date, created_at) VALUES ('${loanId}','${TENANT_ID}','${requestId}',${amount},${Math.max(outstandingBalance,0)},${totalPaid},'${status}','${ts(disbursedDate)}','${officer}','${branch}',${nextInst ? "'"+ds(nextInst.dueDate)+"'" : "NULL"},'${ts(disbursedDate)}');`);
  loanIdList.push({ loanId, clientId });
}

sql.push(...deferredInstallments);
sql.push(...deferredPayments);

const expCats = ["Rent","Salaries","Utilities","Office Supplies","Transportation","Marketing","Maintenance"];
for (let i = 0; i < 30; i++) {
  const branch = re(branchIds);
  const createdBy = re(usersByRole["Accountant"]);
  const verifier = re(usersByRole["FinancialController"]);
  const txDate = ds(addD(today, -ri(1,180)));
  const amt = ri(500,25000);
  const approved = i < 25;
  sql.push(`INSERT INTO expenses (id, tenant_id, branch_id, category, description, amount, transaction_date, status, created_by_id, created_by_name, verified_by_id, verified_by_name, verified_at, gl_synced, created_at) VALUES ('${uuid()}','${TENANT_ID}','${branch}','${re(expCats)}','Expense #${i+1}',${amt},'${txDate}','${approved?"Approved":"Pending"}','${createdBy}','Accountant User ${ri(1,9)}',${approved ? "'"+verifier+"'" : "NULL"},${approved ? "'FC User "+ri(1,9)+"'" : "NULL"},${approved ? "'"+txDate+"'" : "NULL"},${approved},'${txDate}');`);
}

const guaTypes = ["PersonalGuarantor","PropertyCollateral","VehicleCollateral","FinancialAsset"];
for (let i = 0; i < 40; i++) {
  const clientId = clientIds[ri(0,200)];
  sql.push(`INSERT INTO guarantees (id, tenant_id, guarantee_type, guarantor_name, guarantor_name_ar, guarantor_national_id, guarantor_phone, guarantee_value, status, client_id) VALUES ('${uuid()}','${TENANT_ID}','${re(guaTypes)}','${re(EN_FIRST)} ${re(EN_LAST)}','${esc(re(ARABIC_FIRST))} ${esc(re(ARABIC_LAST))}','2${ri(80,99)}0${ri(1,9)}${ri(10,28)}${ri(10,35)}${ri(1000,9999)}${ri(1,9)}','01${ri(0,2)}${ri(10000000,99999999)}',${ri(5,50)*1000},'Active','${clientId}');`);
}

const chqStatuses = ["Pending","Deposited","Cleared","Bounced"];
for (let i = 0; i < 25; i++) {
  const clientId = clientIds[ri(0,200)];
  const branch = re(branchIds);
  const dueDate = addD(today, ri(-60,90));
  sql.push(`INSERT INTO cheques (id, tenant_id, client_id, branch_id, cheque_number, bank_name, bank_branch, amount, currency, issue_date, due_date, drawer_name, drawer_national_id, status, cheque_type, assigned_to, created_by_id) VALUES ('${uuid()}','${TENANT_ID}','${clientId}','${branch}','CHQ-${ri(100000,999999)}','${re(["CIB","NBE","QNB","Banque Misr","AAIB"])}','${re(["Main","Downtown","Maadi","Nasr City"])}',${ri(5,80)*1000},'EGP','${ds(addD(dueDate,-30))}','${ds(dueDate)}','${re(EN_FIRST)} ${re(EN_LAST)}','2${ri(80,99)}0${ri(1,9)}${ri(10,28)}${ri(10,35)}${ri(1000,9999)}${ri(1,9)}','${re(chqStatuses)}','${re(["PDC","GuaranteeCheque"])}','${re(["Customer","Guarantor"])}','${re(cashiers)}');`);
}

for (let g = 0; g < 8; g++) {
  const groupId = uuid();
  const branch = re(branchIds);
  const leaderId = clientIds[g*5];
  sql.push(`INSERT INTO client_groups (id, tenant_id, branch_id, group_name, group_name_ar, leader_id, leader_name, max_members, status) VALUES ('${groupId}','${TENANT_ID}','${branch}','Solidarity Group ${g+1}','${esc("مجموعة تضامنية "+(g+1))}','${leaderId}','${esc(clientNames[g*5].ar)}',10,'Active');`);
  for (let m = 0; m < 5; m++) {
    const memberId = clientIds[g*5+m];
    sql.push(`INSERT INTO client_group_members (id, group_id, client_id, client_name, role) VALUES ('${uuid()}','${groupId}','${memberId}','${esc(clientNames[g*5+m].ar)}','${m===0?"Leader":"Member"}');`);
  }
}

const actTypes = ["PhoneCall","FieldVisit","SMS"];
const outcomes = ["Contacted","PromiseToPay","NotAvailable","Escalated"];
for (let i = 0; i < 80; i++) {
  const loanRef = re(loanIdList);
  const collector = re(collectionOfficers);
  const actDate = ds(addD(today, -ri(0,90)));
  sql.push(`INSERT INTO collection_activities (id, tenant_id, loan_id, client_id, activity_type, channel, contact_date, outcome, notes, assigned_collector_id, assigned_collector_name, created_by_id) VALUES ('${uuid()}','${TENANT_ID}','${loanRef.loanId}','${loanRef.clientId}','${re(actTypes)}','${re(["Phone","InPerson","SMS"])}','${actDate}','${re(outcomes)}','Follow-up #${i+1}','${collector}','CollectionOfficer User ${ri(1,9)}','${collector}');`);
}

const approvalTypes = ["WriteOff","Reschedule","EarlySettlement","PenaltyWaiver"];
const approvalStatuses = ["Pending","Approved","Rejected","Approved","Approved"];
for (let i = 0; i < 15; i++) {
  const requestedBy = re(loanOfficers);
  const approvedBy = re(usersByRole["BranchManager"]);
  const apStatus = re(approvalStatuses);
  const createdAt = ts(addD(today, -ri(1,30)));
  const resolvedAt = apStatus !== "Pending" ? ts(addD(today, -ri(0,15))) : "NULL";
  sql.push(`INSERT INTO approval_requests (id, tenant_id, request_type, reference_id, reference_label, status, requested_by_id, requested_by_name, approved_by_id, approved_by_name, data, created_at, resolved_at) VALUES ('${uuid()}','${TENANT_ID}','${re(approvalTypes)}','${uuid()}','Loan #${ri(1,650)}','${apStatus}','${requestedBy}','LoanOfficer User ${ri(1,9)}',${apStatus!=="Pending" ? "'"+approvedBy+"'" : "NULL"},${apStatus!=="Pending" ? "'BranchManager User "+ri(1,9)+"'" : "NULL"},'${JSON.stringify({reason:"Request #"+(i+1),amount:ri(5,50)*1000})}','${createdAt}',${resolvedAt === "NULL" ? "NULL" : "'"+resolvedAt+"'"});`);
}

for (let d = 0; d < 30; d++) {
  const closingDate = ds(addD(today, -(d+1)));
  for (const branch of branchIds.slice(0,3)) {
    const collected = ri(10000,150000);
    const disbursed = ri(20000,200000);
    const expenses = ri(1000,10000);
    const expectedCash = collected - disbursed - expenses + 500000;
    const actualCash = expectedCash + ri(-500,500);
    const closedBy = re(cashiers);
    const denom = JSON.stringify({200:ri(50,200),100:ri(50,300),50:ri(20,100),20:ri(30,100),10:ri(20,50),5:ri(10,30),1:ri(5,20)});
    sql.push(`INSERT INTO daily_closings (id, tenant_id, branch_id, closing_date, total_collected, total_disbursed, total_expenses, expected_cash, actual_cash, discrepancy, status, closed_by_id, closed_by_name, denomination_breakdown, closed_at) VALUES ('${uuid()}','${TENANT_ID}','${branch}','${closingDate}',${collected},${disbursed},${expenses},${expectedCash},${actualCash},${actualCash-expectedCash},'Closed','${closedBy}','Cashier User ${ri(1,9)}','${denom}','${closingDate}');`);
  }
}

for (let i = 0; i < 50; i++) {
  const recipientId = re(allUserIds);
  const channel = re(["SMS","Email","InApp"]);
  const contact = channel === "SMS" ? `01${ri(0,2)}${ri(10000000,99999999)}` : channel === "Email" ? `user${ri(1,90)}@fmc.com` : `inapp-${recipientId}`;
  sql.push(`INSERT INTO notifications (id, tenant_id, channel, recipient_type, recipient_id, recipient_contact, subject, body, status, created_at) VALUES ('${uuid()}','${TENANT_ID}','${channel}','User','${recipientId}','${contact}','Notification #${i+1}','System notification ${i+1}','${re(["Queued","Sent","Delivered","Failed"])}','${ts(addD(today, -ri(0,30)))}');`);
}

const auditActions = ["CREATE","UPDATE","DELETE","LOGIN","APPROVE","REJECT","PAYMENT","DISBURSEMENT","CLOSING"];
const auditEntities = ["Loan","Client","Payment","Expense","Installment","User","DailyClosing","ApprovalRequest"];
for (let i = 0; i < 100; i++) {
  const userId = re(allUserIds);
  sql.push(`INSERT INTO audit_logs (id, tenant_id, user_id, user_name, action, entity, entity_id, details, created_at) VALUES ('${uuid()}','${TENANT_ID}','${userId}','User ${ri(1,9)}','${re(auditActions)}','${re(auditEntities)}','${uuid()}','${JSON.stringify({desc:"Audit #"+(i+1)})}','${ts(addD(today, -ri(0,60)))}');`);
}

for (let i = 0; i < 40; i++) {
  const branch = re(branchIds);
  const txDate = ds(addD(today, -ri(1,120)));
  const amt = ri(1000,100000);
  sql.push(`INSERT INTO journal_entries (id, tenant_id, branch_id, reference_type, transaction_date, description, total_debit, total_credit, is_reconciled, created_at) VALUES ('${uuid()}','${TENANT_ID}','${branch}','${re(["Payment","Disbursement","Expense","Fee","Interest"])}','${txDate}','Journal entry #${i+1}',${amt},${amt},${i<30},'${txDate}');`);
}

sql.push(`INSERT INTO system_announcements (id, title, title_ar, message, message_ar, severity, is_active) VALUES ('${uuid()}','System Maintenance','صيانة النظام','Scheduled maintenance on Friday 10PM-12AM','صيانة مجدولة يوم الجمعة من 10 مساءً إلى 12 صباحاً','warning',true);`);
sql.push(`INSERT INTO system_announcements (id, title, title_ar, message, message_ar, severity, is_active) VALUES ('${uuid()}','New Feature Available','ميزة جديدة متاحة','Es2alny AI Assistant is now available!','مساعد اسألني الذكي متاح الآن!','info',true);`);

sql.push(`INSERT INTO holidays (id, tenant_id, name, name_ar, holiday_date, is_recurring) VALUES ('${uuid()}','${TENANT_ID}','Eid Al-Fitr','عيد الفطر','2025-03-30',false);`);
sql.push(`INSERT INTO holidays (id, tenant_id, name, name_ar, holiday_date, is_recurring) VALUES ('${uuid()}','${TENANT_ID}','Eid Al-Adha','عيد الأضحى','2025-06-06',false);`);
sql.push(`INSERT INTO holidays (id, tenant_id, name, name_ar, holiday_date, is_recurring) VALUES ('${uuid()}','${TENANT_ID}','25 January Revolution','ثورة 25 يناير','2025-01-25',true);`);
sql.push(`INSERT INTO holidays (id, tenant_id, name, name_ar, holiday_date, is_recurring) VALUES ('${uuid()}','${TENANT_ID}','Labour Day','عيد العمال','2025-05-01',true);`);
sql.push(`INSERT INTO holidays (id, tenant_id, name, name_ar, holiday_date, is_recurring) VALUES ('${uuid()}','${TENANT_ID}','Sinai Liberation Day','عيد تحرير سيناء','2025-04-25',true);`);
sql.push(`INSERT INTO holidays (id, tenant_id, name, name_ar, holiday_date, is_recurring) VALUES ('${uuid()}','${TENANT_ID}','Prophet Birthday','المولد النبوي','2025-09-05',false);`);

sql.push("COMMIT;");

process.stderr.write(`Generated ${sql.length} SQL statements\n`);
process.stderr.write(`Installments: ${totalInstallments}, Payments: ${totalPayments}\n`);
process.stdout.write(sql.join("\n") + "\n");

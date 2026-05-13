import jsPDF from 'jspdf';

export type ReportLang = 'en' | 'ar';

function L(lang: ReportLang, en: string, ar: string): string {
  if (lang === 'ar') return `${ar} / ${en}`;
  return en;
}

function Ls(lang: ReportLang, en: string, ar: string): string {
  return lang === 'ar' ? ar : en;
}

function fmtCurrency(amount: number | string | null | undefined, lang: ReportLang = 'en'): string {
  if (amount === null || amount === undefined) return lang === 'ar' ? '0 EGP' : '0 EGP';
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 EGP';
  return num.toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " EGP";
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString('en-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function generatePaymentReceiptPDF(payment: any, loan: any, lang: ReportLang = 'en') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });
  const w = 80;
  let y = 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Neo FMC', w / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(L(lang, 'Payment Receipt', 'إيصال دفع'), w / 2, y, { align: 'center' });
  y += 8;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(5, y, w - 5, y);
  y += 6;

  const rows: [string, string][] = [
    [Ls(lang, 'Date', 'التاريخ'), fmtDate(payment.paymentDate || new Date())],
    [Ls(lang, 'Client', 'العميل'), loan?.clientName || '-'],
    [Ls(lang, 'Loan ID', 'رقم القرض'), loan?.id?.slice(0, 8) || '-'],
    [Ls(lang, 'Amount', 'المبلغ'), fmtCurrency(payment.amount, lang)],
    [Ls(lang, 'Method', 'طريقة الدفع'), payment.paymentMethod || '-'],
  ];
  if (payment.referenceNumber) {
    rows.push([Ls(lang, 'Reference', 'المرجع'), payment.referenceNumber]);
  }
  if (payment.collectedBy) {
    rows.push([Ls(lang, 'Collected By', 'تم التحصيل بواسطة'), payment.collectedBy]);
  }

  doc.setFontSize(9);
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'normal');
    doc.text(label + ':', 6, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, w - 6, y, { align: 'right' });
    y += 5;
    doc.setDrawColor(200);
    doc.setLineWidth(0.1);
    doc.line(6, y - 1.5, w - 6, y - 1.5);
  }

  y += 4;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(5, y, w - 5, y);
  y += 6;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(fmtCurrency(payment.amount, lang), w / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(L(lang, 'Thank you for your payment', 'شكراً لسداد القسط'), w / 2, y, { align: 'center' });
  y += 4;

  const pageH = y + 10;
  (doc as any).internal.pageSize.height = pageH;

  doc.save(`receipt_${payment.id?.slice(0, 8) || 'payment'}.pdf`);
}

export function generateStatementPDF(loan: any, installments: any[], payments: any[], summary: any, lang: ReportLang = 'en') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = 210;
  const margin = 15;
  let y = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(L(lang, 'Neo FMC - Client Account Statement', 'كشف حساب العميل - Neo FMC'), w / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${Ls(lang, 'Generated', 'تاريخ الإصدار')}: ${fmtDate(new Date())}`, w / 2, y, { align: 'center' });
  y += 10;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, w - margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(L(lang, 'Loan Summary', 'ملخص القرض'), margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const summaryRows: [string, string][] = [
    [Ls(lang, 'Client', 'العميل'), loan?.clientName || '-'],
    [Ls(lang, 'Loan Amount', 'مبلغ القرض'), fmtCurrency(loan?.approvedAmount || loan?.requestedAmount, lang)],
    [Ls(lang, 'Status', 'الحالة'), loan?.status || '-'],
    [Ls(lang, 'Total Paid', 'إجمالي المدفوع'), fmtCurrency(summary?.totalPaid, lang)],
    [Ls(lang, 'Remaining', 'المتبقي'), fmtCurrency(summary?.totalRemaining, lang)],
    [Ls(lang, 'Overdue', 'المتأخر'), fmtCurrency(summary?.totalOverdue, lang)],
  ];

  for (const [label, value] of summaryRows) {
    doc.setFont('helvetica', 'normal');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 60, y);
    y += 5;
  }

  y += 5;

  if (installments && installments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(L(lang, 'Installment Schedule', 'جدول الأقساط'), margin, y);
    y += 6;

    const headers = [
      '#',
      Ls(lang, 'Due Date', 'تاريخ الاستحقاق'),
      Ls(lang, 'Amount', 'المبلغ'),
      Ls(lang, 'Paid', 'المدفوع'),
      Ls(lang, 'Status', 'الحالة'),
    ];
    const colWidths = [10, 35, 35, 35, 30];

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, w - margin * 2, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    let xPos = margin + 2;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], xPos, y);
      xPos += colWidths[i];
    }
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    for (let idx = 0; idx < installments.length; idx++) {
      if (y > 270) {
        doc.addPage();
        y = 15;
      }
      const inst = installments[idx];
      xPos = margin + 2;
      const rowData = [
        String(idx + 1),
        fmtDate(inst.dueDate),
        fmtCurrency(inst.installmentAmount || inst.amount, lang),
        fmtCurrency(inst.paidAmount || 0, lang),
        inst.status || '-',
      ];
      for (let i = 0; i < rowData.length; i++) {
        doc.text(rowData[i], xPos, y);
        xPos += colWidths[i];
      }
      y += 4;
      doc.setDrawColor(230);
      doc.setLineWidth(0.1);
      doc.line(margin, y - 1.5, w - margin, y - 1.5);
    }
  }

  y += 6;
  if (payments && payments.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 15;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(L(lang, 'Payment History', 'سجل المدفوعات'), margin, y);
    y += 6;

    const pHeaders = [
      Ls(lang, 'Date', 'التاريخ'),
      Ls(lang, 'Amount', 'المبلغ'),
      Ls(lang, 'Method', 'الطريقة'),
      Ls(lang, 'Reference', 'المرجع'),
    ];
    const pColWidths = [35, 35, 40, 45];

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, w - margin * 2, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    let xPos = margin + 2;
    for (let i = 0; i < pHeaders.length; i++) {
      doc.text(pHeaders[i], xPos, y);
      xPos += pColWidths[i];
    }
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    for (const pmt of payments) {
      if (y > 270) {
        doc.addPage();
        y = 15;
      }
      xPos = margin + 2;
      const rowData = [
        fmtDate(pmt.paymentDate),
        fmtCurrency(pmt.amount, lang),
        pmt.paymentMethod || '-',
        pmt.referenceNumber || '-',
      ];
      for (let i = 0; i < rowData.length; i++) {
        doc.text(rowData[i], xPos, y);
        xPos += pColWidths[i];
      }
      y += 4;
      doc.setDrawColor(230);
      doc.setLineWidth(0.1);
      doc.line(margin, y - 1.5, w - margin, y - 1.5);
    }
  }

  y += 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(L(lang, 'This is a system-generated document from Neo FMC.', 'هذا مستند تم إنشاؤه آلياً من Neo FMC.'), w / 2, y, { align: 'center' });

  doc.save(`statement_${loan?.id?.slice(0, 8) || 'client'}.pdf`);
}

export function generateLoanContractPDF(contractData: any, lang: ReportLang = 'en') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = 210;
  const margin = 15;
  let y = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(L(lang, 'Loan Contract', 'عقد تمويل'), w / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${Ls(lang, 'Contract No', 'رقم العقد')}: ${contractData.loan?.id?.slice(0, 12) || '-'}`, margin, y);
  doc.text(`${Ls(lang, 'Date', 'التاريخ')}: ${fmtDate(contractData.loan?.disbursedAt || new Date())}`, w - margin, y, { align: 'right' });
  y += 8;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, w - margin, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(L(lang, 'Borrower Information', 'بيانات المقترض'), margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const clientRows: [string, string][] = [
    [L(lang, 'Name', 'الاسم'), contractData.client?.fullNameAr || '-'],
    [L(lang, 'National ID', 'الرقم القومي'), contractData.client?.nationalId || '-'],
    [L(lang, 'Phone', 'الهاتف'), contractData.client?.phone || '-'],
    [L(lang, 'Address', 'العنوان'), contractData.client?.address || '-'],
  ];

  for (const [label, value] of clientRows) {
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 65, y);
    doc.setFont('helvetica', 'normal');
    y += 5;
  }

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(L(lang, 'Loan Terms', 'شروط التمويل'), margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const loanRows: [string, string][] = [
    [L(lang, 'Product', 'المنتج'), contractData.product?.productName || '-'],
    [L(lang, 'Approved Amount', 'المبلغ المعتمد'), fmtCurrency(contractData.request?.approvedAmount || contractData.loan?.disbursedAmount, lang)],
    [L(lang, 'Interest Rate', 'سعر الفائدة'), `${contractData.request?.interestRate || 0}%`],
    [L(lang, 'Tenure', 'المدة'), `${contractData.request?.tenure || '-'} ${Ls(lang, 'months', 'شهر')}`],
    [L(lang, 'Repayment', 'السداد'), contractData.request?.repaymentFrequency || Ls(lang, 'Monthly', 'شهري')],
    [L(lang, 'Purpose', 'الغرض'), contractData.request?.purpose || '-'],
  ];

  for (const [label, value] of loanRows) {
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 65, y);
    doc.setFont('helvetica', 'normal');
    y += 5;
  }

  y += 5;
  if (contractData.installments && contractData.installments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(L(lang, 'Repayment Schedule', 'جدول السداد'), margin, y);
    y += 7;

    const headers = [
      '#',
      L(lang, 'Due Date', 'تاريخ'),
      L(lang, 'Principal', 'اصل'),
      L(lang, 'Interest', 'فائدة'),
      L(lang, 'Total', 'اجمالي'),
    ];
    const colWidths = [12, 35, 35, 35, 35];

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, w - margin * 2, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    let xPos = margin + 2;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], xPos, y);
      xPos += colWidths[i];
    }
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    for (const inst of contractData.installments) {
      if (y > 260) { doc.addPage(); y = 15; }
      xPos = margin + 2;
      const rowData = [
        String(inst.installmentNumber),
        fmtDate(inst.dueDate),
        fmtCurrency(inst.principalAmount, lang),
        fmtCurrency(inst.interestAmount, lang),
        fmtCurrency(inst.totalAmount, lang),
      ];
      for (let i = 0; i < rowData.length; i++) {
        doc.text(rowData[i], xPos, y);
        xPos += colWidths[i];
      }
      y += 4;
      doc.setDrawColor(230);
      doc.setLineWidth(0.1);
      doc.line(margin, y - 1.5, w - margin, y - 1.5);
    }
  }

  y += 5;
  if (contractData.guarantors && contractData.guarantors.length > 0) {
    if (y > 230) { doc.addPage(); y = 15; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(L(lang, 'Guarantors', 'الضامنين'), margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const g of contractData.guarantors) {
      doc.text(`${Ls(lang, 'Name', 'الاسم')}: ${g.guarantorName || '-'}`, margin, y);
      doc.text(`${Ls(lang, 'ID', 'الرقم القومي')}: ${g.guarantorNationalId || '-'}`, margin + 80, y);
      y += 5;
      doc.text(`${Ls(lang, 'Phone', 'الهاتف')}: ${g.guarantorPhone || '-'}`, margin, y);
      doc.text(`${Ls(lang, 'Relation', 'العلاقة')}: ${g.relationToClient || '-'}`, margin + 80, y);
      y += 5;
      doc.text(`${Ls(lang, 'Address', 'العنوان')}: ${g.guarantorAddress || '-'}`, margin, y);
      y += 7;
    }
  }

  y += 10;
  if (y > 250) { doc.addPage(); y = 15; }
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, w - margin, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(L(lang, 'Borrower Signature', 'توقيع المقترض'), margin, y);
  doc.text(L(lang, 'Authorized Signature', 'التوقيع المعتمد'), w - margin - 60, y);
  y += 15;
  doc.line(margin, y, margin + 60, y);
  doc.line(w - margin - 60, y, w - margin, y);

  y += 10;
  doc.setFontSize(7);
  doc.text(L(lang, 'This contract is governed by the laws of the Arab Republic of Egypt and the regulations of the Financial Regulatory Authority (FRA).', 'هذا العقد يخضع لقوانين جمهورية مصر العربية ولوائح الهيئة العامة للرقابة المالية'), w / 2, y, { align: 'center' });

  doc.save(`contract_${contractData.loan?.id?.slice(0, 8) || 'loan'}.pdf`);
}

export function generateDisbursementVoucherPDF(contractData: any, lang: ReportLang = 'en') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = 210;
  const margin = 15;
  let y = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(L(lang, 'Disbursement Voucher', 'إذن صرف'), w / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${Ls(lang, 'Voucher No', 'رقم الإذن')}: DV-${contractData.loan?.id?.slice(0, 8) || ''}`, margin, y);
  doc.text(`${Ls(lang, 'Date', 'التاريخ')}: ${fmtDate(contractData.loan?.disbursedAt || new Date())}`, w - margin, y, { align: 'right' });
  y += 8;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, w - margin, y);
  y += 8;

  doc.setFontSize(9);
  const rows: [string, string][] = [
    [L(lang, 'Beneficiary Name', 'اسم المستفيد'), contractData.client?.fullNameAr || '-'],
    [L(lang, 'National ID', 'الرقم القومي'), contractData.client?.nationalId || '-'],
    [L(lang, 'Loan Contract No', 'رقم العقد'), contractData.loan?.id?.slice(0, 12) || '-'],
    [L(lang, 'Product', 'المنتج'), contractData.product?.productName || '-'],
    [L(lang, 'Disbursed Amount', 'المبلغ المصروف'), fmtCurrency(contractData.loan?.disbursedAmount, lang)],
    [L(lang, 'Interest Rate', 'سعر الفائدة'), `${contractData.request?.interestRate || 0}%`],
    [L(lang, 'Tenure', 'المدة'), `${contractData.request?.tenure || '-'} ${Ls(lang, 'months', 'شهر')}`],
    [L(lang, 'Number of Installments', 'عدد الاقساط'), String(contractData.installments?.length || '-')],
  ];

  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'normal');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 80, y);
    y += 6;
  }

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(fmtCurrency(contractData.loan?.disbursedAmount, lang), w / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(L(lang, 'Amount in words', 'المبلغ بالحروف') + ': ___________________________', w / 2, y, { align: 'center' });

  y += 15;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, w - margin, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const sigs = [
    [L(lang, 'Prepared By', 'تم الاعداد بواسطة'), margin],
    [L(lang, 'Reviewed By', 'تم المراجعة بواسطة'), w / 2 - 30],
    [L(lang, 'Approved By', 'تم الاعتماد بواسطة'), w - margin - 55],
  ];
  for (const [label, x] of sigs) {
    doc.text(String(label), Number(x), y);
  }
  y += 15;
  for (const [, x] of sigs) {
    doc.line(Number(x), y, Number(x) + 50, y);
  }

  y += 10;
  doc.setFontSize(9);
  doc.text(L(lang, 'Beneficiary Signature', 'توقيع المستفيد'), margin, y);
  y += 15;
  doc.line(margin, y, margin + 60, y);

  y += 10;
  doc.setFontSize(7);
  doc.text(L(lang, 'I acknowledge receipt of the above amount and agree to the terms of the loan contract.', 'أقر باستلام المبلغ أعلاه وأوافق على شروط عقد التمويل'), w / 2, y, { align: 'center' });

  doc.save(`voucher_DV-${contractData.loan?.id?.slice(0, 8) || 'loan'}.pdf`);
}

export function generateTrialBalancePDF(data: any, dateFrom: string, dateTo: string, lang: ReportLang = 'en') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = 210;
  const margin = 15;
  let y = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(L(lang, 'Trial Balance', 'ميزان المراجعة'), w / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${Ls(lang, 'Period', 'الفترة')}: ${dateFrom} ${Ls(lang, 'to', 'إلى')} ${dateTo}`, w / 2, y, { align: 'center' });
  y += 5;
  doc.text(`${Ls(lang, 'Generated', 'تاريخ الإصدار')}: ${fmtDate(new Date())}`, w / 2, y, { align: 'center' });
  y += 8;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, w - margin, y);
  y += 6;

  const headers = [
    Ls(lang, 'Account Code', 'كود الحساب'),
    Ls(lang, 'Account Name', 'اسم الحساب'),
    Ls(lang, 'Type', 'النوع'),
    Ls(lang, 'Debit', 'مدين'),
    Ls(lang, 'Credit', 'دائن'),
    Ls(lang, 'Balance', 'الرصيد'),
  ];
  const colWidths = [22, 50, 22, 28, 28, 28];

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, w - margin * 2, 6, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  let xPos = margin + 2;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], xPos, y);
    xPos += colWidths[i];
  }
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  for (const a of (data?.accounts || [])) {
    if (y > 270) { doc.addPage(); y = 15; }
    xPos = margin + 2;
    const accountName = lang === 'ar' ? (a.accountNameAr || a.accountName || '') : (a.accountName || '');
    const rowData = [a.accountCode || '', accountName, a.accountType || '', a.debit > 0 ? fmtCurrency(a.debit, lang) : '-', a.credit > 0 ? fmtCurrency(a.credit, lang) : '-', fmtCurrency(Math.abs(a.balance), lang)];
    for (let i = 0; i < rowData.length; i++) {
      doc.text(String(rowData[i]).substring(0, 30), xPos, y);
      xPos += colWidths[i];
    }
    y += 4;
    doc.setDrawColor(230); doc.setLineWidth(0.1); doc.line(margin, y - 1.5, w - margin, y - 1.5);
  }

  y += 4;
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y - 4, w - margin * 2, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(Ls(lang, 'TOTAL', 'الإجمالي'), margin + 2, y);
  doc.text(fmtCurrency(data?.totalDebit, lang), margin + 2 + 22 + 50 + 22, y);
  doc.text(fmtCurrency(data?.totalCredit, lang), margin + 2 + 22 + 50 + 22 + 28, y);
  y += 8;

  doc.setFontSize(9);
  doc.text(data?.isBalanced ? Ls(lang, 'Status: BALANCED', 'الحالة: متوازن') : Ls(lang, 'Status: UNBALANCED', 'الحالة: غير متوازن'), w / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(L(lang, 'This is a system-generated document from Neo FMC.', 'هذا مستند تم إنشاؤه آلياً من Neo FMC.'), w / 2, y, { align: 'center' });

  doc.save(`trial_balance_${dateFrom}_${dateTo}.pdf`);
}

export function generateIncomeStatementPDF(data: any, dateFrom: string, dateTo: string, lang: ReportLang = 'en') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = 210;
  const margin = 15;
  let y = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(L(lang, 'Income Statement', 'قائمة الدخل'), w / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${Ls(lang, 'Period', 'الفترة')}: ${dateFrom} ${Ls(lang, 'to', 'إلى')} ${dateTo}`, w / 2, y, { align: 'center' });
  y += 5;
  doc.text(`${Ls(lang, 'Generated', 'تاريخ الإصدار')}: ${fmtDate(new Date())}`, w / 2, y, { align: 'center' });
  y += 8;
  doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(margin, y, w - margin, y); y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(L(lang, 'Revenue', 'الإيرادات'), margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const a of (data?.incomeAccounts || [])) {
    const accountName = lang === 'ar' ? (a.accountNameAr || a.accountName || '') : (a.accountName || '');
    doc.text(accountName, margin + 4, y);
    doc.text(fmtCurrency(a.amount, lang), w - margin, y, { align: 'right' });
    y += 5;
  }
  doc.setFont('helvetica', 'bold');
  doc.setDrawColor(0); doc.line(w - margin - 40, y, w - margin, y); y += 5;
  doc.text(Ls(lang, 'Total Revenue', 'إجمالي الإيرادات'), margin + 4, y);
  doc.text(fmtCurrency(data?.totalIncome, lang), w - margin, y, { align: 'right' });
  y += 10;

  doc.setFontSize(12);
  doc.text(L(lang, 'Expenses', 'المصروفات'), margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const a of (data?.expenseAccounts || [])) {
    if (y > 265) { doc.addPage(); y = 15; }
    const accountName = lang === 'ar' ? (a.accountNameAr || a.accountName || '') : (a.accountName || '');
    doc.text(accountName, margin + 4, y);
    doc.text(fmtCurrency(a.amount, lang), w - margin, y, { align: 'right' });
    y += 5;
  }
  doc.setFont('helvetica', 'bold');
  doc.setDrawColor(0); doc.line(w - margin - 40, y, w - margin, y); y += 5;
  doc.text(Ls(lang, 'Total Expenses', 'إجمالي المصروفات'), margin + 4, y);
  doc.text(fmtCurrency(data?.totalExpenses, lang), w - margin, y, { align: 'right' });
  y += 10;

  doc.setDrawColor(0); doc.setLineWidth(0.8); doc.line(margin, y, w - margin, y); y += 6;
  doc.setFontSize(14);
  const ni = data?.netIncome || 0;
  doc.text(`${Ls(lang, 'Net Income', 'صافي الدخل')}: ${fmtCurrency(ni, lang)}`, w / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text(L(lang, 'This is a system-generated document from Neo FMC.', 'هذا مستند تم إنشاؤه آلياً من Neo FMC.'), w / 2, y, { align: 'center' });

  doc.save(`income_statement_${dateFrom}_${dateTo}.pdf`);
}

export function generateBalanceSheetPDF(data: any, asOfDate: string, lang: ReportLang = 'en') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = 210;
  const margin = 15;
  let y = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(L(lang, 'Balance Sheet', 'الميزانية العمومية'), w / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`${Ls(lang, 'As of', 'كما في')}: ${asOfDate}`, w / 2, y, { align: 'center' });
  y += 5;
  doc.text(`${Ls(lang, 'Generated', 'تاريخ الإصدار')}: ${fmtDate(new Date())}`, w / 2, y, { align: 'center' });
  y += 8;
  doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(margin, y, w - margin, y); y += 8;

  const renderSection = (titleEn: string, titleAr: string, items: any[], color: [number, number, number]) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...color);
    doc.text(L(lang, titleEn, titleAr), margin, y); y += 6;
    doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    let total = 0;
    for (const a of (items || [])) {
      if (y > 265) { doc.addPage(); y = 15; }
      const accountName = lang === 'ar' ? (a.accountNameAr || a.accountName || '') : (a.accountName || '');
      doc.text(`${a.accountCode || ''} - ${accountName}`, margin + 4, y);
      doc.text(fmtCurrency(a.balance, lang), w - margin, y, { align: 'right' });
      total += Number(a.balance || 0);
      y += 5;
    }
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(0); doc.line(w - margin - 40, y, w - margin, y); y += 5;
    doc.text(`${Ls(lang, 'Total', 'الإجمالي')}: ${fmtCurrency(total, lang)}`, w - margin, y, { align: 'right' });
    y += 8;
  };

  renderSection('Assets', 'الأصول', data?.assets, [59, 130, 246]);
  renderSection('Liabilities', 'الالتزامات', data?.liabilities, [249, 115, 22]);
  renderSection('Equity', 'حقوق الملكية', data?.equity, [168, 85, 247]);

  y += 4;
  doc.setDrawColor(0); doc.setLineWidth(0.8); doc.line(margin, y, w - margin, y); y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
  doc.text(data?.isBalanced ? Ls(lang, 'Balance Sheet is BALANCED', 'الميزانية العمومية متوازنة') : Ls(lang, 'Balance Sheet is UNBALANCED', 'الميزانية العمومية غير متوازنة'), w / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text(L(lang, 'This is a system-generated document from Neo FMC.', 'هذا مستند تم إنشاؤه آلياً من Neo FMC.'), w / 2, y, { align: 'center' });

  doc.save(`balance_sheet_${asOfDate}.pdf`);
}

export function generateCashFlowPDF(data: any, dateFrom: string, dateTo: string, lang: ReportLang = 'en') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = 210;
  const margin = 15;
  let y = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(L(lang, 'Cash Flow Statement', 'قائمة التدفقات النقدية'), w / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`${Ls(lang, 'Period', 'الفترة')}: ${dateFrom} ${Ls(lang, 'to', 'إلى')} ${dateTo}`, w / 2, y, { align: 'center' });
  y += 5;
  doc.text(`${Ls(lang, 'Generated', 'تاريخ الإصدار')}: ${fmtDate(new Date())}`, w / 2, y, { align: 'center' });
  y += 8;
  doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(margin, y, w - margin, y); y += 8;

  const renderCFSection = (titleEn: string, titleAr: string, items: [string, string, number][], netLabelEn: string, netLabelAr: string, netVal: number) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(L(lang, titleEn, titleAr), margin, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    for (const [en, ar, amount] of items) {
      doc.text(Ls(lang, en, ar), margin + 4, y);
      doc.text(fmtCurrency(amount, lang), w - margin, y, { align: 'right' });
      y += 5;
    }
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(0); doc.line(w - margin - 40, y, w - margin, y); y += 5;
    doc.text(Ls(lang, netLabelEn, netLabelAr), margin + 4, y);
    doc.text(fmtCurrency(netVal, lang), w - margin, y, { align: 'right' });
    y += 8;
  };

  const op = data?.operating || {};
  renderCFSection('Operating Activities', 'أنشطة تشغيلية', [
    ['Interest Income', 'إيرادات الفوائد', op.interestIncome || 0],
    ['Fee Income', 'إيرادات الرسوم', op.feeIncome || 0],
    ['Penalty Income', 'إيرادات الغرامات', op.penaltyIncome || 0],
    ['Operating Expenses', 'مصروفات تشغيلية', -(op.operatingExpenses || 0)],
    ['Payroll', 'رواتب', -(op.payroll || 0)],
  ], 'Net Operating Cash Flow', 'صافي التدفق النقدي التشغيلي', op.netOperating || 0);

  const inv = data?.investing || {};
  renderCFSection('Investing Activities', 'أنشطة استثمارية', [
    ['Loan Disbursements', 'صرف القروض', -(inv.loanDisbursements || 0)],
    ['Loan Collections', 'تحصيل القروض', inv.loanCollections || 0],
    ['Asset Purchases', 'شراء أصول', -(inv.assetPurchases || 0)],
    ['Asset Disposals', 'بيع أصول', inv.assetDisposals || 0],
  ], 'Net Investing Cash Flow', 'صافي التدفق النقدي الاستثماري', inv.netInvesting || 0);

  const fin = data?.financing || {};
  renderCFSection('Financing Activities', 'أنشطة تمويلية', [
    ['Facility Drawdowns', 'سحب التسهيلات', fin.facilityDrawdowns || 0],
    ['Facility Repayments', 'سداد التسهيلات', -(fin.facilityRepayments || 0)],
    ['Equity Injection', 'ضخ رأس المال', fin.equityInjection || 0],
  ], 'Net Financing Cash Flow', 'صافي التدفق النقدي التمويلي', fin.netFinancing || 0);

  y += 4;
  doc.setDrawColor(0); doc.setLineWidth(0.8); doc.line(margin, y, w - margin, y); y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text(`${Ls(lang, 'Net Change in Cash', 'صافي التغير في النقدية')}: ${fmtCurrency(data?.netCashChange || 0, lang)}`, w / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text(L(lang, 'This is a system-generated document from Neo FMC.', 'هذا مستند تم إنشاؤه آلياً من Neo FMC.'), w / 2, y, { align: 'center' });

  doc.save(`cash_flow_${dateFrom}_${dateTo}.pdf`);
}

export function generateBranchPnlPDF(data: any, dateFrom: string, dateTo: string, lang: ReportLang = 'en') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const w = 297;
  const margin = 15;
  let y = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(L(lang, 'Branch P&L Report', 'تقرير ربحية الفروع'), w / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`${Ls(lang, 'Period', 'الفترة')}: ${dateFrom} ${Ls(lang, 'to', 'إلى')} ${dateTo}`, w / 2, y, { align: 'center' });
  y += 5;
  doc.text(`${Ls(lang, 'Generated', 'تاريخ الإصدار')}: ${fmtDate(new Date())}`, w / 2, y, { align: 'center' });
  y += 8;
  doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(margin, y, w - margin, y); y += 6;

  const headers = [
    Ls(lang, 'Branch', 'الفرع'),
    Ls(lang, 'Income', 'الإيرادات'),
    Ls(lang, 'Expenses', 'المصروفات'),
    Ls(lang, 'Net Income', 'صافي الدخل'),
    Ls(lang, 'Margin %', 'هامش الربح %'),
  ];
  const colWidths = [80, 45, 45, 45, 40];

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, w - margin * 2, 6, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  let xPos = margin + 2;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], xPos, y);
    xPos += colWidths[i];
  }
  y += 5;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  const branches = data?.branchPnl ? Object.entries(data.branchPnl) : [];
  for (const [name, val] of branches as [string, any][]) {
    if (y > 190) { doc.addPage(); y = 15; }
    xPos = margin + 2;
    const margin_pct = val.income > 0 ? ((val.netIncome / val.income) * 100).toFixed(1) + '%' : '-';
    const rowData = [name, fmtCurrency(val.income, lang), fmtCurrency(val.expenses, lang), fmtCurrency(val.netIncome, lang), margin_pct];
    for (let i = 0; i < rowData.length; i++) {
      doc.text(String(rowData[i]).substring(0, 40), xPos, y);
      xPos += colWidths[i];
    }
    y += 5;
    doc.setDrawColor(230); doc.setLineWidth(0.1); doc.line(margin, y - 1.5, w - margin, y - 1.5);
  }

  y += 8;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text(L(lang, 'This is a system-generated document from Neo FMC.', 'هذا مستند تم إنشاؤه آلياً من Neo FMC.'), w / 2, y, { align: 'center' });

  doc.save(`branch_pnl_${dateFrom}_${dateTo}.pdf`);
}

export function generateInstallmentSchedulePDF(loan: any, installments: any[], lang: ReportLang = 'en') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = 210;
  const margin = 15;
  let y = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(L(lang, 'Installment Schedule', 'جدول الأقساط'), w / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`${Ls(lang, 'Loan', 'القرض')}: ${loan?.id?.slice(0, 12) || '-'}  |  ${Ls(lang, 'Client', 'العميل')}: ${loan?.clientName || '-'}`, w / 2, y, { align: 'center' });
  y += 5;
  doc.text(`${Ls(lang, 'Generated', 'تاريخ الإصدار')}: ${fmtDate(new Date())}`, w / 2, y, { align: 'center' });
  y += 8;
  doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(margin, y, w - margin, y); y += 6;

  const headers = [
    '#',
    Ls(lang, 'Due Date', 'تاريخ الاستحقاق'),
    Ls(lang, 'Principal', 'أصل'),
    Ls(lang, 'Interest', 'فائدة'),
    Ls(lang, 'Total', 'إجمالي'),
    Ls(lang, 'Paid', 'مدفوع'),
    Ls(lang, 'Status', 'الحالة'),
  ];
  const colWidths = [10, 25, 25, 25, 25, 25, 22];

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, w - margin * 2, 6, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  let xPos = margin + 2;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], xPos, y);
    xPos += colWidths[i];
  }
  y += 5;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  let totalPrincipal = 0, totalInterest = 0, totalAmount = 0, totalPaid = 0;
  for (const inst of (installments || [])) {
    if (y > 270) { doc.addPage(); y = 15; }
    xPos = margin + 2;
    const p = Number(inst.principalAmount || 0); const int = Number(inst.interestAmount || 0);
    const tot = Number(inst.totalAmount || 0); const paid = Number(inst.paidAmount || 0);
    totalPrincipal += p; totalInterest += int; totalAmount += tot; totalPaid += paid;
    const rowData = [String(inst.installmentNumber), fmtDate(inst.dueDate), fmtCurrency(p, lang), fmtCurrency(int, lang), fmtCurrency(tot, lang), fmtCurrency(paid, lang), inst.status || '-'];
    for (let i = 0; i < rowData.length; i++) {
      doc.text(rowData[i], xPos, y);
      xPos += colWidths[i];
    }
    y += 4;
    doc.setDrawColor(230); doc.setLineWidth(0.1); doc.line(margin, y - 1.5, w - margin, y - 1.5);
  }

  y += 3;
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y - 4, w - margin * 2, 6, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  xPos = margin + 2;
  doc.text(Ls(lang, 'TOTAL', 'الإجمالي'), xPos, y); xPos += 10 + 25;
  doc.text(fmtCurrency(totalPrincipal, lang), xPos, y); xPos += 25;
  doc.text(fmtCurrency(totalInterest, lang), xPos, y); xPos += 25;
  doc.text(fmtCurrency(totalAmount, lang), xPos, y); xPos += 25;
  doc.text(fmtCurrency(totalPaid, lang), xPos, y);

  y += 10;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text(L(lang, 'This is a system-generated document from Neo FMC.', 'هذا مستند تم إنشاؤه آلياً من Neo FMC.'), w / 2, y, { align: 'center' });

  doc.save(`schedule_${loan?.id?.slice(0, 8) || 'loan'}.pdf`);
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0 EGP";
  if (amount === "***") return "***";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 EGP";
  
  return new Intl.NumberFormat('en-EG', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num) + " EGP";
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

export const STATUS_COLORS: Record<string, string> = {
  // Loan Request Status
  Draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  CreditReview: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  FieldVisit: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Approved: "bg-green-500/10 text-green-400 border-green-500/20",
  Disbursed: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  Rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  
  // Loan Status
  Active: "bg-green-500/10 text-green-400 border-green-500/20",
  Closed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  Rescheduled: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  WrittenOff: "bg-red-500/10 text-red-400 border-red-500/20",
  
  // Payment/Installment Status
  Completed: "bg-green-500/10 text-green-400 border-green-500/20",
  Pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Failed: "bg-red-500/10 text-red-400 border-red-500/20",
  Paid: "bg-green-500/10 text-green-400 border-green-500/20",

  // Cheque Status
  Presented: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Cleared: "bg-green-500/10 text-green-400 border-green-500/20",
  Bounced: "bg-red-500/10 text-red-400 border-red-500/20",
  Cancelled: "bg-slate-500/10 text-slate-400 border-slate-500/20",

  // Wire Transfer / Settlement
  Reconciled: "bg-green-500/10 text-green-400 border-green-500/20",
  Unreconciled: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",

  // Guarantee
  Verified: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  Released: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  Forfeited: "bg-red-500/10 text-red-400 border-red-500/20",

  // Notification
  Queued: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Sent: "bg-green-500/10 text-green-400 border-green-500/20",
  Delivered: "bg-teal-500/10 text-teal-400 border-teal-500/20",

  // Bulk Operation
  PartiallyCompleted: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  
  // Roles
  SuperAdmin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  TenantAdmin: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  BranchManager: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  LoanOfficer: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CollectionOfficer: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Cashier: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Auditor: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  DataEntry: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

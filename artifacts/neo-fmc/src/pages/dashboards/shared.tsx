import { cn, formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';

function useValueFontClass(value: string | number): string {
  return useMemo(() => {
    const len = String(value).length;
    if (len <= 6) return 'text-xl sm:text-2xl';
    if (len <= 10) return 'text-lg sm:text-xl';
    if (len <= 14) return 'text-base sm:text-lg';
    return 'text-sm sm:text-base';
  }, [value]);
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
  onClick,
  trend,
  trendLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
  bg: string;
  onClick?: () => void;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
}) {
  const valueFontClass = useValueFontClass(value);

  return (
    <div
      onClick={onClick}
      className={cn(
        'premium-card p-3 sm:p-5 group transition-all duration-200 overflow-hidden',
        onClick && 'cursor-pointer hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
        <p className="text-[11px] sm:text-sm font-medium text-muted-foreground leading-snug break-words min-w-0">{label}</p>
        <div className={cn('w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110', bg, color)}>
          <Icon size={18} className="sm:hidden" />
          <Icon size={22} className="hidden sm:block" />
        </div>
      </div>
      <h3 className={cn(valueFontClass, 'font-display font-bold text-foreground break-all leading-tight')}>{value}</h3>
      {trendLabel && (
        <p className={cn(
          'text-xs mt-0.5 font-medium',
          trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground',
        )}>{trendLabel}</p>
      )}
    </div>
  );
}

export function MiniKpi({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string | number;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl bg-secondary/50 border border-border/50 transition-all duration-200',
        onClick && 'cursor-pointer hover:border-primary/30 hover:bg-secondary/70 group',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {onClick && <ExternalLink size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

export function SectionHeader({
  title,
  linkLabel,
  onLink,
  icon: Icon,
}: {
  title: string;
  linkLabel?: string;
  onLink?: () => void;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h3 className="text-lg font-bold flex items-center gap-2">
        {Icon && <Icon size={20} className="text-primary" />}
        {title}
      </h3>
      {linkLabel && onLink && (
        <button
          onClick={onLink}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {linkLabel} <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

export function CardShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('premium-card p-6', className)}>{children}</div>;
}

export function LoadingDash() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  );
}

export function EmptyState({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground opacity-50 gap-2">
      <Icon size={28} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Draft: 'bg-secondary text-muted-foreground border-border',
    Submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    UnderReview: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    Approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Disbursed: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    Rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
    Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Pending: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    Posted: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    Active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  };
  const cls = colorMap[status] ?? 'bg-secondary text-muted-foreground border-border';
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', cls)}>{status}</span>
  );
}

export { formatCurrency };

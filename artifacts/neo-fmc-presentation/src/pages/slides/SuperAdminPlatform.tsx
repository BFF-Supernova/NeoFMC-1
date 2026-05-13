export default function SuperAdminPlatform() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/3" />
      <div className="absolute bottom-0 right-0 w-[35vw] h-[35vh] bg-primary/4 rounded-full blur-[10vw]" />
      <div className="relative z-10 flex flex-col h-full px-[6vw] pt-[6vh]">
        <span className="font-body text-[1.2vw] text-primary font-semibold uppercase tracking-[0.2em] mb-[1.5vh]">Platform Management</span>
        <h2 className="font-display text-[3.5vw] font-extrabold text-text leading-[1.1] tracking-tight mb-[4vh]">
          SuperAdmin <span className="text-primary">Command Center</span>
        </h2>
        <div className="grid grid-cols-3 gap-[2vw] mb-[3vh]">
          <div className="bg-card border border-border rounded-[0.6vw] p-[1.8vw]">
            <div className="flex items-center gap-[0.8vw] mb-[1.5vh]">
              <div className="w-[2.2vw] h-[2.2vw] rounded-[0.3vw] bg-primary/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round"/><path d="M2 17l10 5 10-5" strokeLinecap="round"/><path d="M2 12l10 5 10-5" strokeLinecap="round"/></svg>
              </div>
              <span className="font-display text-[1.4vw] font-bold text-text">Onboarding Workflow</span>
            </div>
            <p className="font-body text-[1.1vw] text-muted">Self-registration creates pending tenants. Approve or reject with reason. Login blocked until approved.</p>
          </div>
          <div className="bg-card border border-border rounded-[0.6vw] p-[1.8vw]">
            <div className="flex items-center gap-[0.8vw] mb-[1.5vh]">
              <div className="w-[2.2vw] h-[2.2vw] rounded-[0.3vw] bg-primary/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round"/><path d="M12 9v4M12 17h.01" strokeLinecap="round"/></svg>
              </div>
              <span className="font-display text-[1.4vw] font-bold text-text">Platform Alerts</span>
            </div>
            <p className="font-body text-[1.1vw] text-muted">Automated monitoring for high PAR, dormant tenants, overdue thresholds. Critical alerts surface instantly.</p>
          </div>
          <div className="bg-card border border-border rounded-[0.6vw] p-[1.8vw]">
            <div className="flex items-center gap-[0.8vw] mb-[1.5vh]">
              <div className="w-[2.2vw] h-[2.2vw] rounded-[0.3vw] bg-primary/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round"/></svg>
              </div>
              <span className="font-display text-[1.4vw] font-bold text-text">Billing Engine</span>
            </div>
            <p className="font-body text-[1.1vw] text-muted">Auto-generate invoices per tenant from module subscriptions and user counts with 14% tax calculation.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-[2vw]">
          <div className="bg-card border border-border rounded-[0.6vw] p-[1.8vw]">
            <div className="flex items-center gap-[0.8vw] mb-[1.5vh]">
              <div className="w-[2.2vw] h-[2.2vw] rounded-[0.3vw] bg-accent/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" strokeLinecap="round"/><path d="M18 17V9M13 17V5M8 17v-3" strokeLinecap="round"/></svg>
              </div>
              <span className="font-display text-[1.4vw] font-bold text-text">Tenant Comparison</span>
            </div>
            <p className="font-body text-[1.1vw] text-muted">Side-by-side KPI benchmarking: portfolio size, PAR, clients, collection rate, growth trends.</p>
          </div>
          <div className="bg-card border border-border rounded-[0.6vw] p-[1.8vw]">
            <div className="flex items-center gap-[0.8vw] mb-[1.5vh]">
              <div className="w-[2.2vw] h-[2.2vw] rounded-[0.3vw] bg-accent/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/></svg>
              </div>
              <span className="font-display text-[1.4vw] font-bold text-text">White-Label Branding</span>
            </div>
            <p className="font-body text-[1.1vw] text-muted">Custom colors, logos, favicons, and domains per tenant. Each company gets their own branded experience.</p>
          </div>
          <div className="bg-card border border-border rounded-[0.6vw] p-[1.8vw]">
            <div className="flex items-center gap-[0.8vw] mb-[1.5vh]">
              <div className="w-[2.2vw] h-[2.2vw] rounded-[0.3vw] bg-accent/15 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01" strokeLinecap="round"/></svg>
              </div>
              <span className="font-display text-[1.4vw] font-bold text-text">Bulk Operations</span>
            </div>
            <p className="font-body text-[1.1vw] text-muted">Toggle modules, change plans, activate or deactivate tenants across many companies at once.</p>
          </div>
        </div>
        <div className="flex items-center gap-[1vw] mt-auto mb-[4vh]">
          <div className="h-[0.2vh] flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
          <span className="font-body text-[1.2vw] text-muted">Manage your entire platform from a single dashboard -- or through natural language with Es2alny</span>
          <div className="h-[0.2vh] flex-1 bg-gradient-to-l from-primary/30 to-transparent" />
        </div>
      </div>
    </div>
  );
}

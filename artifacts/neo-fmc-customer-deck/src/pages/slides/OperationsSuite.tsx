export default function OperationsSuite() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-bl from-primary/4 via-transparent to-accent/3" />
      <div className="absolute bottom-[5vh] right-[5vw] w-[22vw] h-[22vw] bg-primary/3 rounded-full blur-[8vw]" />
      <div className="relative z-10 flex flex-col h-full px-[6vw] pt-[6vh]">
        <span className="font-body text-[1.2vw] text-primary font-semibold uppercase tracking-[0.2em] mb-[1.5vh]">Beyond Lending</span>
        <h2 className="font-display text-[3.4vw] font-extrabold text-text leading-[1.08] tracking-tight mb-[1.5vh]">
          Operations <span className="text-primary">and HR Suite</span>
        </h2>
        <p className="font-body text-[1.4vw] text-muted mb-[3.5vh] max-w-[70vw]">
          Manage your workforce, savings products, insurance, and branch network -- all connected to your lending core.
        </p>
        <div className="flex gap-[1.8vw]">
          <div className="flex-1 bg-card border border-border rounded-[0.6vw] p-[1.8vw]">
            <div className="w-[2.2vw] h-[2.2vw] rounded-[0.35vw] bg-primary/12 flex items-center justify-center mb-[1.2vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.3vw] font-bold text-text">HR Management</span>
            <p className="font-body text-[1.05vw] text-muted mt-[0.6vh] leading-relaxed">Full employee lifecycle: hiring, contracts, attendance, leave, performance reviews, disciplinary actions, and end-of-service calculations</p>
          </div>
          <div className="flex-1 bg-card border border-border rounded-[0.6vw] p-[1.8vw]">
            <div className="w-[2.2vw] h-[2.2vw] rounded-[0.35vw] bg-primary/12 flex items-center justify-center mb-[1.2vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.3vw] font-bold text-text">Payroll Engine</span>
            <p className="font-body text-[1.05vw] text-muted mt-[0.6vh] leading-relaxed">Automated salary calculation with social insurance, tax deductions, bonuses, allowances, and GL journal entries per pay period</p>
          </div>
          <div className="flex-1 bg-card border border-border rounded-[0.6vw] p-[1.8vw]">
            <div className="w-[2.2vw] h-[2.2vw] rounded-[0.35vw] bg-accent/12 flex items-center justify-center mb-[1.2vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span className="font-display text-[1.3vw] font-bold text-text">Insurance</span>
            <p className="font-body text-[1.05vw] text-muted mt-[0.6vh] leading-relaxed">Credit life insurance integration with automatic premium calculation, policy tracking, and claims processing linked to loan status</p>
          </div>
        </div>
        <div className="flex gap-[1.8vw] mt-[2vh]">
          <div className="flex-1 bg-card border border-border rounded-[0.6vw] p-[1.8vw]">
            <div className="w-[2.2vw] h-[2.2vw] rounded-[0.35vw] bg-accent/12 flex items-center justify-center mb-[1.2vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01M6 12h.01M18 12h.01" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.3vw] font-bold text-text">Savings Products</span>
            <p className="font-body text-[1.05vw] text-muted mt-[0.6vh] leading-relaxed">Voluntary savings, mandatory savings, fixed deposits, and group savings with interest computation and GL integration</p>
          </div>
          <div className="flex-1 bg-card border border-border rounded-[0.6vw] p-[1.8vw]">
            <div className="w-[2.2vw] h-[2.2vw] rounded-[0.35vw] bg-accent/12 flex items-center justify-center mb-[1.2vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <span className="font-display text-[1.3vw] font-bold text-text">Branch Network</span>
            <p className="font-body text-[1.05vw] text-muted mt-[0.6vh] leading-relaxed">Multi-branch hierarchy with area managers, region-based reporting, inter-branch transfers, and consolidated dashboards</p>
          </div>
          <div className="flex-1 bg-card border border-border rounded-[0.6vw] p-[1.8vw]">
            <div className="w-[2.2vw] h-[2.2vw] rounded-[0.35vw] bg-primary/12 flex items-center justify-center mb-[1.2vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.3vw] font-bold text-text">Mobile Wallet</span>
            <p className="font-body text-[1.05vw] text-muted mt-[0.6vh] leading-relaxed">Agent banking and mobile money integration for field collection and disbursement in remote areas</p>
          </div>
        </div>
      </div>
    </div>
  );
}

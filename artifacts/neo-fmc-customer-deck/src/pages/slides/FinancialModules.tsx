export default function FinancialModules() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-tr from-bg via-card/20 to-bg" />
      <div className="absolute top-[15vh] right-[3vw] w-[20vw] h-[20vw] bg-accent/3 rounded-full blur-[8vw]" />
      <div className="relative z-10 flex flex-col h-full px-[6vw] pt-[6vh]">
        <span className="font-body text-[1.2vw] text-primary font-semibold uppercase tracking-[0.2em] mb-[1.5vh]">Financial Management</span>
        <h2 className="font-display text-[3.4vw] font-extrabold text-text leading-[1.08] tracking-tight mb-[1.5vh]">
          Complete <span className="text-primary">Financial Control</span>
        </h2>
        <p className="font-body text-[1.4vw] text-muted mb-[3.5vh] max-w-[70vw]">
          General ledger, regulatory reporting, tax compliance, and multi-level closing -- all integrated with your lending operations.
        </p>
        <div className="grid grid-cols-2 gap-[2vw]">
          <div className="bg-card border border-border rounded-[0.6vw] p-[2vw]">
            <div className="flex items-center gap-[0.8vw] mb-[1.5vh]">
              <div className="w-[2.4vw] h-[2.4vw] rounded-[0.35vw] bg-primary/12 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round"/></svg>
              </div>
              <span className="font-display text-[1.5vw] font-bold text-text">General Ledger</span>
            </div>
            <p className="font-body text-[1.15vw] text-muted leading-relaxed">Full chart of accounts with automatic journal entries from every lending transaction. Trial balance, income statement, and balance sheet generated in real time. Multi-branch consolidation with inter-branch settlement tracking.</p>
          </div>
          <div className="bg-card border border-border rounded-[0.6vw] p-[2vw]">
            <div className="flex items-center gap-[0.8vw] mb-[1.5vh]">
              <div className="w-[2.4vw] h-[2.4vw] rounded-[0.35vw] bg-primary/12 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <span className="font-display text-[1.5vw] font-bold text-text">ETA E-Invoicing</span>
            </div>
            <p className="font-body text-[1.15vw] text-muted leading-relaxed">Full compliance with Egyptian Tax Authority electronic invoicing requirements. Automated invoice generation, digital signing, and submission. Real-time status tracking and rejection handling for seamless tax reporting.</p>
          </div>
          <div className="bg-card border border-border rounded-[0.6vw] p-[2vw]">
            <div className="flex items-center gap-[0.8vw] mb-[1.5vh]">
              <div className="w-[2.4vw] h-[2.4vw] rounded-[0.35vw] bg-accent/12 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" strokeLinecap="round"/><path d="M18 17V9M13 17V5M8 17v-3" strokeLinecap="round"/></svg>
              </div>
              <span className="font-display text-[1.5vw] font-bold text-text">IFRS 9 Provisioning</span>
            </div>
            <p className="font-body text-[1.15vw] text-muted leading-relaxed">Expected credit loss calculation with stage classification. Automatic provision computation based on portfolio aging, PD/LGD models, and collective/individual assessment per FRA guidelines.</p>
          </div>
          <div className="bg-card border border-border rounded-[0.6vw] p-[2vw]">
            <div className="flex items-center gap-[0.8vw] mb-[1.5vh]">
              <div className="w-[2.4vw] h-[2.4vw] rounded-[0.35vw] bg-accent/12 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/></svg>
              </div>
              <span className="font-display text-[1.5vw] font-bold text-text">4-Level Closing</span>
            </div>
            <p className="font-body text-[1.15vw] text-muted leading-relaxed">Hierarchical financial closing: Daily → Monthly → Quarterly → Annual. Each level locks prior periods, enforces reconciliation, and cascades upward for complete fiscal integrity.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

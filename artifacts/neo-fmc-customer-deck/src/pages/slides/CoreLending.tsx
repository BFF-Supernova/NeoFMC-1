export default function CoreLending() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-bg" />
      <div className="absolute bottom-0 left-0 w-[25vw] h-[25vh] bg-accent/4 rounded-full blur-[8vw]" />
      <div className="relative z-10 flex flex-col h-full px-[6vw] pt-[6vh]">
        <span className="font-body text-[1.2vw] text-primary font-semibold uppercase tracking-[0.2em] mb-[1.5vh]">Core Lending Engine</span>
        <h2 className="font-display text-[3.4vw] font-extrabold text-text leading-[1.08] tracking-tight mb-[1.5vh]">
          The Complete <span className="text-primary">Loan Lifecycle</span>
        </h2>
        <p className="font-body text-[1.4vw] text-muted mb-[3.5vh] max-w-[75vw]">
          Every step from client intake to repayment, managed in one system with built-in approvals and compliance.
        </p>
        <div className="flex items-start gap-[0.8vw] mb-[4vh]">
          <div className="flex flex-col items-center">
            <div className="w-[4vw] h-[4vw] rounded-full bg-primary/12 border border-primary/25 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[1.8vw] h-[1.8vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1vw] font-bold text-text mt-[0.8vh]">Registration</span>
            <span className="font-body text-[0.85vw] text-muted">KYC + eKYC</span>
          </div>
          <div className="flex items-center pt-[1.8vh]">
            <div className="w-[2.5vw] h-[0.12vh] bg-primary/30" />
            <svg viewBox="0 0 8 8" className="w-[0.6vw] h-[0.6vw] text-primary/50"><path d="M1 4h6M5 2l2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[4vw] h-[4vw] rounded-full bg-primary/12 border border-primary/25 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[1.8vw] h-[1.8vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M6 12h12M6 16h8" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1vw] font-bold text-text mt-[0.8vh]">Origination</span>
            <span className="font-body text-[0.85vw] text-muted">Application</span>
          </div>
          <div className="flex items-center pt-[1.8vh]">
            <div className="w-[2.5vw] h-[0.12vh] bg-primary/30" />
            <svg viewBox="0 0 8 8" className="w-[0.6vw] h-[0.6vw] text-primary/50"><path d="M1 4h6M5 2l2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[4vw] h-[4vw] rounded-full bg-primary/12 border border-primary/25 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[1.8vw] h-[1.8vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1vw] font-bold text-text mt-[0.8vh]">Credit Review</span>
            <span className="font-body text-[0.85vw] text-muted">Scoring</span>
          </div>
          <div className="flex items-center pt-[1.8vh]">
            <div className="w-[2.5vw] h-[0.12vh] bg-primary/30" />
            <svg viewBox="0 0 8 8" className="w-[0.6vw] h-[0.6vw] text-primary/50"><path d="M1 4h6M5 2l2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[4vw] h-[4vw] rounded-full bg-primary/12 border border-primary/25 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[1.8vw] h-[1.8vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round"/><path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="font-display text-[1vw] font-bold text-text mt-[0.8vh]">Approval</span>
            <span className="font-body text-[0.85vw] text-muted">Multi-level</span>
          </div>
          <div className="flex items-center pt-[1.8vh]">
            <div className="w-[2.5vw] h-[0.12vh] bg-primary/30" />
            <svg viewBox="0 0 8 8" className="w-[0.6vw] h-[0.6vw] text-primary/50"><path d="M1 4h6M5 2l2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[4vw] h-[4vw] rounded-full bg-primary/12 border border-primary/25 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[1.8vw] h-[1.8vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="font-display text-[1vw] font-bold text-text mt-[0.8vh]">Disbursement</span>
            <span className="font-body text-[0.85vw] text-muted">GL Posting</span>
          </div>
          <div className="flex items-center pt-[1.8vh]">
            <div className="w-[2.5vw] h-[0.12vh] bg-primary/30" />
            <svg viewBox="0 0 8 8" className="w-[0.6vw] h-[0.6vw] text-primary/50"><path d="M1 4h6M5 2l2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[4vw] h-[4vw] rounded-full bg-accent/12 border border-accent/25 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[1.8vw] h-[1.8vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1vw] font-bold text-text mt-[0.8vh]">Collection</span>
            <span className="font-body text-[0.85vw] text-muted">AI-Powered</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-[1.8vw] mt-auto mb-[5vh]">
          <div className="bg-card border border-border rounded-[0.5vw] p-[1.8vw]">
            <span className="font-display text-[1.3vw] font-bold text-text">Maker-Checker Approvals</span>
            <p className="font-body text-[1.05vw] text-muted mt-[0.8vh]">Write-offs, rescheduling, and early settlements require dual authorization with full audit trail</p>
          </div>
          <div className="bg-card border border-border rounded-[0.5vw] p-[1.8vw]">
            <span className="font-display text-[1.3vw] font-bold text-text">Flexible Installment Engine</span>
            <p className="font-body text-[1.05vw] text-muted mt-[0.8vh]">Declining balance, flat rate, balloon payments, grace periods, and custom schedules per product</p>
          </div>
          <div className="bg-card border border-border rounded-[0.5vw] p-[1.8vw]">
            <span className="font-display text-[1.3vw] font-bold text-text">Group + Individual Lending</span>
            <p className="font-body text-[1.05vw] text-muted mt-[0.8vh]">Solidarity groups, village banking, and individual micro-enterprise loans all in one system</p>
          </div>
        </div>
      </div>
    </div>
  );
}

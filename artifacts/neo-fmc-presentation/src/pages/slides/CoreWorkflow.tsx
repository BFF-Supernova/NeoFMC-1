export default function CoreWorkflow() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-bg" />
      <div className="absolute bottom-0 left-0 w-[30vw] h-[30vh] bg-accent/5 rounded-full blur-[8vw]" />
      <div className="relative z-10 flex flex-col h-full px-[6vw] pt-[7vh]">
        <span className="font-body text-[1.2vw] text-primary font-semibold uppercase tracking-[0.2em] mb-[1.5vh]">End-to-End Flow</span>
        <h2 className="font-display text-[3.5vw] font-extrabold text-text leading-[1.1] tracking-tight mb-[5vh]">
          From Registration to <span className="text-primary">Financial Closing</span>
        </h2>
        <div className="flex items-start gap-[1vw] mb-[5vh]">
          <div className="flex flex-col items-center">
            <div className="w-[4.5vw] h-[4.5vw] rounded-[0.6vw] bg-primary/15 border border-primary/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[2vw] h-[2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.1vw] font-bold text-text mt-[1vh] text-center">Client</span>
            <span className="font-body text-[0.9vw] text-muted text-center">Registration</span>
          </div>
          <div className="flex items-center pt-[2vh]">
            <div className="w-[3vw] h-[0.15vh] bg-primary/40" />
            <svg viewBox="0 0 12 12" className="w-[0.8vw] h-[0.8vw] text-primary/60"><path d="M2 6h8M7 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[4.5vw] h-[4.5vw] rounded-[0.6vw] bg-primary/15 border border-primary/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[2vw] h-[2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01" strokeLinecap="round"/><path d="M6 12h12M6 16h8" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.1vw] font-bold text-text mt-[1vh] text-center">Loan</span>
            <span className="font-body text-[0.9vw] text-muted text-center">Origination</span>
          </div>
          <div className="flex items-center pt-[2vh]">
            <div className="w-[3vw] h-[0.15vh] bg-primary/40" />
            <svg viewBox="0 0 12 12" className="w-[0.8vw] h-[0.8vw] text-primary/60"><path d="M2 6h8M7 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[4.5vw] h-[4.5vw] rounded-[0.6vw] bg-primary/15 border border-primary/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[2vw] h-[2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <span className="font-display text-[1.1vw] font-bold text-text mt-[1vh] text-center">Approval</span>
            <span className="font-body text-[0.9vw] text-muted text-center">Workflow</span>
          </div>
          <div className="flex items-center pt-[2vh]">
            <div className="w-[3vw] h-[0.15vh] bg-primary/40" />
            <svg viewBox="0 0 12 12" className="w-[0.8vw] h-[0.8vw] text-primary/60"><path d="M2 6h8M7 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[4.5vw] h-[4.5vw] rounded-[0.6vw] bg-primary/15 border border-primary/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[2vw] h-[2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.1vw] font-bold text-text mt-[1vh] text-center">Disbursement</span>
            <span className="font-body text-[0.9vw] text-muted text-center">and Posting</span>
          </div>
          <div className="flex items-center pt-[2vh]">
            <div className="w-[3vw] h-[0.15vh] bg-primary/40" />
            <svg viewBox="0 0 12 12" className="w-[0.8vw] h-[0.8vw] text-primary/60"><path d="M2 6h8M7 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[4.5vw] h-[4.5vw] rounded-[0.6vw] bg-primary/15 border border-primary/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[2vw] h-[2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="font-display text-[1.1vw] font-bold text-text mt-[1vh] text-center">Collection</span>
            <span className="font-body text-[0.9vw] text-muted text-center">and Payments</span>
          </div>
          <div className="flex items-center pt-[2vh]">
            <div className="w-[3vw] h-[0.15vh] bg-primary/40" />
            <svg viewBox="0 0 12 12" className="w-[0.8vw] h-[0.8vw] text-primary/60"><path d="M2 6h8M7 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[4.5vw] h-[4.5vw] rounded-[0.6vw] bg-accent/15 border border-accent/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[2vw] h-[2vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round"/><path d="M14 2v6h6" strokeLinecap="round"/><path d="M16 13H8M16 17H8M10 9H8" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.1vw] font-bold text-text mt-[1vh] text-center">Financial</span>
            <span className="font-body text-[0.9vw] text-muted text-center">Reporting</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-[2vw] mt-auto mb-[6vh]">
          <div className="bg-card border border-border rounded-[0.6vw] p-[2vw]">
            <span className="font-display text-[1.3vw] font-bold text-text">5-Stage Loan Pipeline</span>
            <p className="font-body text-[1.1vw] text-muted mt-[0.8vh]">Draft → Credit Review → Field Visit → Approved → Disbursed with role-based gating</p>
          </div>
          <div className="bg-card border border-border rounded-[0.6vw] p-[2vw]">
            <span className="font-display text-[1.3vw] font-bold text-text">Maker-Checker Approvals</span>
            <p className="font-body text-[1.1vw] text-muted mt-[0.8vh]">Write-offs, rescheduling, and settlements require dual-approval workflow</p>
          </div>
          <div className="bg-card border border-border rounded-[0.6vw] p-[2vw]">
            <span className="font-display text-[1.3vw] font-bold text-text">4-Level Financial Closing</span>
            <p className="font-body text-[1.1vw] text-muted mt-[0.8vh]">Daily → Monthly → Quarterly → Annual with hierarchical enforcement</p>
          </div>
        </div>
      </div>
    </div>
  );
}

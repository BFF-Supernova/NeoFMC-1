export default function ModulesSuite() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-tr from-bg via-card/30 to-bg" />
      <div className="absolute top-[10vh] right-[5vw] w-[25vw] h-[25vw] bg-primary/4 rounded-full blur-[8vw]" />
      <div className="relative z-10 flex flex-col h-full px-[6vw] pt-[6vh]">
        <span className="font-body text-[1.2vw] text-primary font-semibold uppercase tracking-[0.2em] mb-[1.5vh]">Modular Architecture</span>
        <h2 className="font-display text-[3.5vw] font-extrabold text-text leading-[1.1] tracking-tight mb-[4vh]">
          28 Modules, <span className="text-primary">Your Choice</span>
        </h2>
        <div className="grid grid-cols-4 gap-[1.2vw]">
          <div className="bg-card border border-border rounded-[0.5vw] p-[1.2vw]">
            <div className="w-[2vw] h-[2vw] rounded-[0.3vw] bg-primary/15 flex items-center justify-center mb-[1vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7h8M8 11h6M8 15h4" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.2vw] font-bold text-text">Core Lending</span>
            <p className="font-body text-[1vw] text-muted mt-[0.5vh]">Loan origination, servicing, installment engine</p>
          </div>
          <div className="bg-card border border-border rounded-[0.5vw] p-[1.2vw]">
            <div className="w-[2vw] h-[2vw] rounded-[0.3vw] bg-primary/15 flex items-center justify-center mb-[1vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <span className="font-display text-[1.2vw] font-bold text-text">HR and Payroll</span>
            <p className="font-body text-[1vw] text-muted mt-[0.5vh]">Employee management, attendance, end-of-service</p>
          </div>
          <div className="bg-card border border-border rounded-[0.5vw] p-[1.2vw]">
            <div className="w-[2vw] h-[2vw] rounded-[0.3vw] bg-primary/15 flex items-center justify-center mb-[1vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.2vw] font-bold text-text">Insurance</span>
            <p className="font-body text-[1vw] text-muted mt-[0.5vh]">Credit life insurance integration and tracking</p>
          </div>
          <div className="bg-card border border-border rounded-[0.5vw] p-[1.2vw]">
            <div className="w-[2vw] h-[2vw] rounded-[0.3vw] bg-primary/15 flex items-center justify-center mb-[1vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.2vw] font-bold text-text">Savings</span>
            <p className="font-body text-[1vw] text-muted mt-[0.5vh]">Voluntary, mandatory, fixed, group deposits</p>
          </div>
          <div className="bg-card border border-border rounded-[0.5vw] p-[1.2vw]">
            <div className="w-[2vw] h-[2vw] rounded-[0.3vw] bg-accent/15 flex items-center justify-center mb-[1vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.2vw] font-bold text-text">AI Collection</span>
            <p className="font-body text-[1vw] text-muted mt-[0.5vh]">Smart scoring, WhatsApp reminders, prediction</p>
          </div>
          <div className="bg-card border border-border rounded-[0.5vw] p-[1.2vw]">
            <div className="w-[2vw] h-[2vw] rounded-[0.3vw] bg-accent/15 flex items-center justify-center mb-[1vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round"/><path d="M14 2v6h6" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.2vw] font-bold text-text">ETA E-Invoicing</span>
            <p className="font-body text-[1vw] text-muted mt-[0.5vh]">Egyptian Tax Authority compliant invoicing</p>
          </div>
          <div className="bg-card border border-border rounded-[0.5vw] p-[1.2vw]">
            <div className="w-[2vw] h-[2vw] rounded-[0.3vw] bg-accent/15 flex items-center justify-center mb-[1vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.2vw] font-bold text-text">OCR Documents</span>
            <p className="font-body text-[1vw] text-muted mt-[0.5vh]">Automated document scanning and extraction</p>
          </div>
          <div className="bg-card border border-border rounded-[0.5vw] p-[1.2vw]">
            <div className="w-[2vw] h-[2vw] rounded-[0.3vw] bg-accent/15 flex items-center justify-center mb-[1vh]">
              <svg viewBox="0 0 24 24" className="w-[1.1vw] h-[1.1vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" strokeLinecap="round"/><path d="M18 17V9M13 17V5M8 17v-3" strokeLinecap="round"/></svg>
            </div>
            <span className="font-display text-[1.2vw] font-bold text-text">IFRS 9 Provisions</span>
            <p className="font-body text-[1vw] text-muted mt-[0.5vh]">Expected credit loss modeling and reporting</p>
          </div>
        </div>
        <div className="flex items-center gap-[3vw] mt-auto mb-[5vh] px-[2vw]">
          <div className="flex items-center gap-[0.6vw]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-primary" />
            <span className="font-body text-[1.2vw] text-muted">Core Modules</span>
          </div>
          <div className="flex items-center gap-[0.6vw]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-accent" />
            <span className="font-body text-[1.2vw] text-muted">AI and Advanced Modules</span>
          </div>
          <span className="font-body text-[1.2vw] text-muted ml-auto">+ Mobile Wallet, Agent Banking, eKYC, AML, PDPL, Dynamic Pricing, and more</span>
        </div>
      </div>
    </div>
  );
}

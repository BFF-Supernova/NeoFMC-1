const base = import.meta.env.BASE_URL;

export default function PlatformGlance() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-accent/3" />
      <div className="absolute top-[5vh] right-[8vw] w-[30vw] h-[30vw] bg-primary/3 rounded-full blur-[10vw]" />
      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center pl-[6vw] pr-[2vw] w-[52%]">
          <span className="font-body text-[1.2vw] text-primary font-semibold uppercase tracking-[0.2em] mb-[1.5vh]">Platform at a Glance</span>
          <h2 className="font-display text-[3.6vw] font-extrabold text-text leading-[1.08] tracking-tight mb-[3vh]">
            Everything Your MFI Needs, <span className="text-primary">Unified</span>
          </h2>
          <p className="font-body text-[1.5vw] text-muted leading-relaxed mb-[4vh]">
            Neo FMC replaces disconnected spreadsheets and legacy systems with a single cloud platform purpose-built for Egyptian microfinance regulations and workflows.
          </p>
          <div className="flex flex-col gap-[2vh]">
            <div className="flex items-start gap-[1vw]">
              <div className="w-[2.4vw] h-[2.4vw] rounded-[0.35vw] bg-primary/12 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-[0.2vh]">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round"/><path d="M2 17l10 5 10-5" strokeLinecap="round"/><path d="M2 12l10 5 10-5" strokeLinecap="round"/></svg>
              </div>
              <div>
                <span className="font-display text-[1.4vw] font-bold text-text">End-to-End Lifecycle</span>
                <p className="font-body text-[1.15vw] text-muted mt-[0.3vh]">Client registration, KYC, loan origination, approval, disbursement, collection, and financial closing in one flow</p>
              </div>
            </div>
            <div className="flex items-start gap-[1vw]">
              <div className="w-[2.4vw] h-[2.4vw] rounded-[0.35vw] bg-primary/12 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-[0.2vh]">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" strokeLinecap="round"/></svg>
              </div>
              <div>
                <span className="font-display text-[1.4vw] font-bold text-text">Full Arabic + English</span>
                <p className="font-body text-[1.15vw] text-muted mt-[0.3vh]">Complete RTL/LTR bilingual interface with 3 visual themes -- light, dark, and high contrast</p>
              </div>
            </div>
            <div className="flex items-start gap-[1vw]">
              <div className="w-[2.4vw] h-[2.4vw] rounded-[0.35vw] bg-primary/12 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-[0.2vh]">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87" strokeLinecap="round"/><path d="M16 3.13a4 4 0 010 7.75" strokeLinecap="round"/></svg>
              </div>
              <div>
                <span className="font-display text-[1.4vw] font-bold text-text">Role-Based Access for 10 Roles</span>
                <p className="font-body text-[1.15vw] text-muted mt-[0.3vh]">Loan Officer, Branch Manager, Credit Analyst, Area Manager, CFO, Auditor, and more -- each with tailored dashboards</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center w-[48%] pr-[4vw]">
          <div className="relative w-[38vw] rounded-[1vw] overflow-hidden border border-border shadow-2xl shadow-primary/8">
            <img
              src={`${base}screenshot-landing.jpg`}
              crossOrigin="anonymous"
              className="w-full h-auto"
              alt="Neo FMC Platform"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/30 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}

const base = import.meta.env.BASE_URL;

export default function PlatformOverview() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-0 right-0 w-[40vw] h-[40vh] bg-primary/3 rounded-full blur-[10vw]" />
      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center pl-[6vw] pr-[3vw] w-[50%]">
          <span className="font-body text-[1.2vw] text-primary font-semibold uppercase tracking-[0.2em] mb-[2vh]">Platform Overview</span>
          <h2 className="font-display text-[3.8vw] font-extrabold text-text leading-[1.1] tracking-tight mb-[3vh]">
            One Platform,
            <span className="text-primary"> Every</span> Operation
          </h2>
          <p className="font-body text-[1.5vw] text-muted leading-relaxed mb-[4vh]">
            Neo FMC digitizes the entire microfinance lifecycle from client onboarding to financial closing, with real-time dashboards for every role.
          </p>
          <div className="flex flex-col gap-[2vh]">
            <div className="flex items-start gap-[1vw]">
              <div className="w-[2.2vw] h-[2.2vw] rounded-[0.3vw] bg-primary/15 flex items-center justify-center flex-shrink-0 mt-[0.3vh]">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87" strokeLinecap="round"/><path d="M16 3.13a4 4 0 010 7.75" strokeLinecap="round"/></svg>
              </div>
              <div>
                <span className="font-display text-[1.4vw] font-bold text-text">10 Specialized Roles</span>
                <p className="font-body text-[1.2vw] text-muted mt-[0.3vh]">From Loan Officers to CFOs, each with tailored dashboards</p>
              </div>
            </div>
            <div className="flex items-start gap-[1vw]">
              <div className="w-[2.2vw] h-[2.2vw] rounded-[0.3vw] bg-primary/15 flex items-center justify-center flex-shrink-0 mt-[0.3vh]">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" strokeLinecap="round"/></svg>
              </div>
              <div>
                <span className="font-display text-[1.4vw] font-bold text-text">Arabic + English RTL/LTR</span>
                <p className="font-body text-[1.2vw] text-muted mt-[0.3vh]">Full bilingual interface with 3 visual themes</p>
              </div>
            </div>
            <div className="flex items-start gap-[1vw]">
              <div className="w-[2.2vw] h-[2.2vw] rounded-[0.3vw] bg-primary/15 flex items-center justify-center flex-shrink-0 mt-[0.3vh]">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round"/></svg>
              </div>
              <div>
                <span className="font-display text-[1.4vw] font-bold text-text">Row-Level Security</span>
                <p className="font-body text-[1.2vw] text-muted mt-[0.3vh]">Database-enforced tenant isolation at PostgreSQL level</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center w-[50%] pr-[4vw]">
          <div className="relative w-[38vw] rounded-[1vw] overflow-hidden border border-border shadow-2xl shadow-primary/10">
            <img
              src={`${base}screenshot-landing.jpg`}
              crossOrigin="anonymous"
              className="w-full h-auto"
              alt="Neo FMC Landing Page"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/40 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}

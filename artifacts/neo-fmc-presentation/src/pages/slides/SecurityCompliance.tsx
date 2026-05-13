const base = import.meta.env.BASE_URL;

export default function SecurityCompliance() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 via-transparent to-accent/3" />
      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center pl-[6vw] w-[45%]">
          <span className="font-body text-[1.2vw] text-primary font-semibold uppercase tracking-[0.2em] mb-[1.5vh]">Security and Compliance</span>
          <h2 className="font-display text-[3.5vw] font-extrabold text-text leading-[1.1] tracking-tight mb-[3vh]">
            Enterprise-Grade <span className="text-primary">Security</span>
          </h2>
          <p className="font-body text-[1.5vw] text-muted leading-relaxed mb-[4vh]">
            Built from the ground up with regulatory compliance and data protection at its core.
          </p>
          <div className="flex flex-col gap-[2.5vh]">
            <div className="flex items-center gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-[1.3vw] h-[1.3vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <span className="font-display text-[1.4vw] font-bold text-text">PostgreSQL Row-Level Security</span>
                <p className="font-body text-[1.1vw] text-muted">Database-enforced tenant isolation</p>
              </div>
            </div>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-[1.3vw] h-[1.3vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/></svg>
              </div>
              <div>
                <span className="font-display text-[1.4vw] font-bold text-text">TOTP Multi-Factor Authentication</span>
                <p className="font-body text-[1.1vw] text-muted">Enforced for all privileged roles</p>
              </div>
            </div>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-[1.3vw] h-[1.3vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
              </div>
              <div>
                <span className="font-display text-[1.4vw] font-bold text-text">Comprehensive Audit Trail</span>
                <p className="font-body text-[1.1vw] text-muted">Every action logged with user, entity, timestamp</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center items-center w-[55%] pr-[5vw]">
          <div className="relative w-[35vw] rounded-[1vw] overflow-hidden border border-border shadow-2xl shadow-primary/10 mb-[3vh]">
            <img
              src={`${base}screenshot-login.jpg`}
              crossOrigin="anonymous"
              className="w-full h-auto"
              alt="Neo FMC Login Screen"
            />
          </div>
          <div className="flex gap-[1.5vw]">
            <div className="bg-card border border-border rounded-[0.5vw] px-[1.5vw] py-[1vh] text-center">
              <span className="font-display text-[1.8vw] font-extrabold text-primary">FRA</span>
              <p className="font-body text-[0.9vw] text-muted">Regulatory Compliant</p>
            </div>
            <div className="bg-card border border-border rounded-[0.5vw] px-[1.5vw] py-[1vh] text-center">
              <span className="font-display text-[1.8vw] font-extrabold text-primary">AML</span>
              <p className="font-body text-[0.9vw] text-muted">Anti-Money Laundering</p>
            </div>
            <div className="bg-card border border-border rounded-[0.5vw] px-[1.5vw] py-[1vh] text-center">
              <span className="font-display text-[1.8vw] font-extrabold text-primary">PDPL</span>
              <p className="font-body text-[0.9vw] text-muted">Data Protection Law</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

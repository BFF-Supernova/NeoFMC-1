const base = import.meta.env.BASE_URL;

export default function SecurityCompliance() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 via-transparent to-accent/3" />
      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center pl-[6vw] w-[48%]">
          <span className="font-body text-[1.2vw] text-primary font-semibold uppercase tracking-[0.2em] mb-[1.5vh]">Security and Compliance</span>
          <h2 className="font-display text-[3.4vw] font-extrabold text-text leading-[1.08] tracking-tight mb-[3vh]">
            Built for <span className="text-primary">Regulated Finance</span>
          </h2>
          <p className="font-body text-[1.4vw] text-muted leading-relaxed mb-[4vh]">
            Your data stays isolated, encrypted, and auditable. Every action is logged. Every access is verified.
          </p>
          <div className="flex flex-col gap-[2.2vh]">
            <div className="flex items-center gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-primary/12 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <span className="font-display text-[1.35vw] font-bold text-text">Row-Level Security</span>
                <p className="font-body text-[1.1vw] text-muted">PostgreSQL-enforced tenant isolation at the database layer</p>
              </div>
            </div>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-primary/12 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/></svg>
              </div>
              <div>
                <span className="font-display text-[1.35vw] font-bold text-text">TOTP Multi-Factor Auth</span>
                <p className="font-body text-[1.1vw] text-muted">Mandatory for privileged roles, optional for all users</p>
              </div>
            </div>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-primary/12 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-[1.2vw] h-[1.2vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8" strokeLinecap="round"/></svg>
              </div>
              <div>
                <span className="font-display text-[1.35vw] font-bold text-text">Full Audit Trail</span>
                <p className="font-body text-[1.1vw] text-muted">Every action logged: user, entity, timestamp, before/after</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center items-center w-[52%] pr-[5vw]">
          <div className="relative w-[36vw] rounded-[0.8vw] overflow-hidden border border-border shadow-2xl shadow-primary/8 mb-[3vh]">
            <img
              src={`${base}screenshot-login.jpg`}
              crossOrigin="anonymous"
              className="w-full h-auto"
              alt="Secure Login"
            />
          </div>
          <div className="flex gap-[1.2vw]">
            <div className="bg-card border border-border rounded-[0.5vw] px-[1.4vw] py-[1vh] text-center">
              <span className="font-display text-[1.6vw] font-extrabold text-primary">FRA</span>
              <p className="font-body text-[0.9vw] text-muted">Regulatory</p>
            </div>
            <div className="bg-card border border-border rounded-[0.5vw] px-[1.4vw] py-[1vh] text-center">
              <span className="font-display text-[1.6vw] font-extrabold text-primary">AML</span>
              <p className="font-body text-[0.9vw] text-muted">Anti-Laundering</p>
            </div>
            <div className="bg-card border border-border rounded-[0.5vw] px-[1.4vw] py-[1vh] text-center">
              <span className="font-display text-[1.6vw] font-extrabold text-primary">PDPL</span>
              <p className="font-body text-[0.9vw] text-muted">Data Protection</p>
            </div>
            <div className="bg-card border border-border rounded-[0.5vw] px-[1.4vw] py-[1vh] text-center">
              <span className="font-display text-[1.6vw] font-extrabold text-primary">ETA</span>
              <p className="font-body text-[0.9vw] text-muted">E-Invoicing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

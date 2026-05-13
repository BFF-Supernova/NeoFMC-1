export default function ClosingSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-bg to-accent/5" />
      <div className="absolute top-[20vh] left-[15vw] w-[40vw] h-[40vw] bg-primary/5 rounded-full blur-[12vw]" />
      <div className="absolute bottom-[10vh] right-[10vw] w-[25vw] h-[25vw] bg-accent/5 rounded-full blur-[8vw]" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center">
        <div className="flex items-center gap-[1vw] mb-[4vh]">
          <div className="w-[4vw] h-[4vw] rounded-[0.6vw] bg-primary flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-[2.2vw] h-[2.2vw] text-bg" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 16l4-8 4 4 5-9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-display text-[3vw] font-extrabold text-text tracking-tight">Neo FMC</span>
        </div>
        <h2 className="font-display text-[4.5vw] font-extrabold text-text leading-[1.1] tracking-tighter mb-[3vh]">
          The Future of <span className="text-primary">Microfinance</span>
        </h2>
        <p className="font-body text-[1.8vw] text-muted leading-relaxed max-w-[50vw] mb-[6vh]">
          Multi-tenant, AI-powered, regulatory-compliant. Everything your microfinance institution needs in one platform.
        </p>
        <div className="flex items-center gap-[4vw]">
          <div className="text-center">
            <span className="font-display text-[3.5vw] font-extrabold text-primary">28</span>
            <p className="font-body text-[1.2vw] text-muted mt-[0.5vh]">Feature Modules</p>
          </div>
          <div className="w-[0.15vw] h-[5vh] bg-border" />
          <div className="text-center">
            <span className="font-display text-[3.5vw] font-extrabold text-primary">10</span>
            <p className="font-body text-[1.2vw] text-muted mt-[0.5vh]">User Roles</p>
          </div>
          <div className="w-[0.15vw] h-[5vh] bg-border" />
          <div className="text-center">
            <span className="font-display text-[3.5vw] font-extrabold text-primary">100%</span>
            <p className="font-body text-[1.2vw] text-muted mt-[0.5vh]">FRA Compliant</p>
          </div>
        </div>
        <div className="absolute bottom-[5vh] flex items-center gap-[3vw]">
          <span className="font-body text-[1.3vw] text-muted">Ready to transform your operations?</span>
          <div className="h-[0.15vh] w-[3vw] bg-primary/40" />
          <span className="font-body text-[1.3vw] text-primary font-semibold">Start Your Free Trial</span>
        </div>
      </div>
    </div>
  );
}

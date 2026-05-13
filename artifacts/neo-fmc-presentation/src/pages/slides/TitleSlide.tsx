const base = import.meta.env.BASE_URL;

export default function TitleSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <img
        src={`${base}hero.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        alt="Fintech dashboard"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-bg/90 via-bg/70 to-transparent" />
      <div className="absolute top-[2vh] left-[3vw] flex items-center gap-[0.8vw]">
        <div className="w-[2.5vw] h-[2.5vw] rounded-[0.4vw] bg-primary flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-[1.4vw] h-[1.4vw] text-bg" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 16l4-8 4 4 5-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="font-display text-[1.6vw] font-bold text-text tracking-tight">Neo FMC</span>
      </div>
      <div className="relative z-10 flex flex-col justify-center h-full pl-[8vw] pr-[5vw] max-w-[65vw]">
        <div className="inline-flex items-center gap-[0.5vw] bg-primary/15 border border-primary/30 rounded-full px-[1.2vw] py-[0.5vh] mb-[3vh] w-fit">
          <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
          <span className="font-body text-[1.2vw] text-primary font-medium">Built for Egyptian Microfinance</span>
        </div>
        <h1 className="font-display text-[5.5vw] font-extrabold text-text leading-[1.05] tracking-tighter mb-[3vh]">
          The Complete
          <span className="text-primary"> Microfinance</span>
          <span className="block">ERP Platform</span>
        </h1>
        <p className="font-body text-[1.8vw] text-muted leading-relaxed max-w-[50vw]">
          Multi-tenant SaaS platform powering loan origination, financial reporting, compliance, and AI-driven collection for microfinance institutions across Egypt.
        </p>
        <div className="flex items-center gap-[2vw] mt-[5vh]">
          <div className="flex items-center gap-[0.5vw]">
            <svg viewBox="0 0 20 20" className="w-[1.2vw] h-[1.2vw] text-primary" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
            <span className="font-body text-[1.3vw] text-muted">FRA Compliant</span>
          </div>
          <div className="flex items-center gap-[0.5vw]">
            <svg viewBox="0 0 20 20" className="w-[1.2vw] h-[1.2vw] text-primary" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
            <span className="font-body text-[1.3vw] text-muted">28 Modules</span>
          </div>
          <div className="flex items-center gap-[0.5vw]">
            <svg viewBox="0 0 20 20" className="w-[1.2vw] h-[1.2vw] text-primary" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
            <span className="font-body text-[1.3vw] text-muted">AI-Powered</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[3vh] right-[4vw] font-body text-[1.2vw] text-muted/60">
        Product Demonstration 2026
      </div>
    </div>
  );
}

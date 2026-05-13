const base = import.meta.env.BASE_URL;

export default function TitleSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <img
        src={`${base}hero-customer.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover opacity-35"
        alt="Modern microfinance office"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/80 to-bg/40" />
      <div className="absolute top-[3vh] left-[4vw] flex items-center gap-[0.8vw]">
        <div className="w-[2.8vw] h-[2.8vw] rounded-[0.4vw] bg-primary flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-[1.5vw] h-[1.5vw] text-bg" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 16l4-8 4 4 5-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="font-display text-[1.8vw] font-bold text-text tracking-tight">Neo FMC</span>
      </div>
      <div className="relative z-10 flex flex-col justify-center h-full pl-[8vw] max-w-[60vw]">
        <div className="inline-flex items-center gap-[0.5vw] bg-primary/12 border border-primary/25 rounded-full px-[1.4vw] py-[0.6vh] mb-[3vh] w-fit">
          <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
          <span className="font-body text-[1.3vw] text-primary font-semibold">Designed for Egyptian Microfinance</span>
        </div>
        <h1 className="font-display text-[5.8vw] font-extrabold text-text leading-[1.02] tracking-tighter mb-[3vh]">
          Digitize Your
          <span className="block text-primary">Entire Lending</span>
          <span className="block">Operation</span>
        </h1>
        <p className="font-body text-[1.7vw] text-muted leading-relaxed max-w-[45vw] mb-[5vh]">
          From client registration through loan disbursement to financial closing -- one integrated platform replaces fragmented systems and manual processes.
        </p>
        <div className="flex items-center gap-[3vw]">
          <div className="text-center">
            <span className="font-display text-[2.5vw] font-extrabold text-primary">28</span>
            <p className="font-body text-[1.1vw] text-muted">Modules</p>
          </div>
          <div className="w-[0.1vw] h-[4vh] bg-border" />
          <div className="text-center">
            <span className="font-display text-[2.5vw] font-extrabold text-primary">10</span>
            <p className="font-body text-[1.1vw] text-muted">User Roles</p>
          </div>
          <div className="w-[0.1vw] h-[4vh] bg-border" />
          <div className="text-center">
            <span className="font-display text-[2.5vw] font-extrabold text-primary">AR/EN</span>
            <p className="font-body text-[1.1vw] text-muted">Bilingual</p>
          </div>
          <div className="w-[0.1vw] h-[4vh] bg-border" />
          <div className="text-center">
            <span className="font-display text-[2.5vw] font-extrabold text-primary">100%</span>
            <p className="font-body text-[1.1vw] text-muted">FRA Compliant</p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[3vh] right-[4vw] font-body text-[1.1vw] text-muted/50">
        Product Overview 2026
      </div>
    </div>
  );
}

export default function ClosingSlide() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-bg to-accent/4" />
      <div className="absolute top-[25vh] left-[20vw] w-[35vw] h-[35vw] bg-primary/4 rounded-full blur-[12vw]" />
      <div className="absolute bottom-[15vh] right-[15vw] w-[20vw] h-[20vw] bg-accent/4 rounded-full blur-[8vw]" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center">
        <div className="flex items-center gap-[1.2vw] mb-[4vh]">
          <div className="w-[4.5vw] h-[4.5vw] rounded-[0.7vw] bg-primary flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-[2.4vw] h-[2.4vw] text-bg" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 16l4-8 4 4 5-9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-display text-[3.2vw] font-extrabold text-text tracking-tight">Neo FMC</span>
        </div>
        <h2 className="font-display text-[4.2vw] font-extrabold text-text leading-[1.08] tracking-tighter mb-[2.5vh]">
          Your Microfinance, <span className="text-primary">Reimagined</span>
        </h2>
        <p className="font-body text-[1.7vw] text-muted leading-relaxed max-w-[48vw] mb-[5vh]">
          Stop managing spreadsheets. Start managing your institution. One platform for every operation, every branch, every client.
        </p>
        <div className="flex items-center gap-[4vw] mb-[6vh]">
          <div className="text-center">
            <span className="font-display text-[3.2vw] font-extrabold text-primary">28</span>
            <p className="font-body text-[1.1vw] text-muted mt-[0.3vh]">Modules</p>
          </div>
          <div className="w-[0.12vw] h-[5vh] bg-border" />
          <div className="text-center">
            <span className="font-display text-[3.2vw] font-extrabold text-primary">AI</span>
            <p className="font-body text-[1.1vw] text-muted mt-[0.3vh]">Powered</p>
          </div>
          <div className="w-[0.12vw] h-[5vh] bg-border" />
          <div className="text-center">
            <span className="font-display text-[3.2vw] font-extrabold text-primary">100%</span>
            <p className="font-body text-[1.1vw] text-muted mt-[0.3vh]">Cloud</p>
          </div>
          <div className="w-[0.12vw] h-[5vh] bg-border" />
          <div className="text-center">
            <span className="font-display text-[3.2vw] font-extrabold text-primary">FRA</span>
            <p className="font-body text-[1.1vw] text-muted mt-[0.3vh]">Compliant</p>
          </div>
        </div>
        <div className="absolute bottom-[5vh] flex items-center gap-[2vw]">
          <span className="font-body text-[1.3vw] text-muted">Ready to transform your operations?</span>
          <div className="h-[0.12vh] w-[2vw] bg-primary/40" />
          <span className="font-body text-[1.3vw] text-primary font-semibold">Schedule a Demo Today</span>
        </div>
      </div>
    </div>
  );
}

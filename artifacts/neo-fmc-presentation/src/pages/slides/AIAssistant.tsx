const base = import.meta.env.BASE_URL;

export default function AIAssistant() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <img
        src={`${base}architecture.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover opacity-20"
        alt="Architecture background"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/90 to-bg/60" />
      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center pl-[6vw] w-[55%]">
          <span className="font-body text-[1.2vw] text-primary font-semibold uppercase tracking-[0.2em] mb-[1.5vh]">AI-Powered Assistant</span>
          <h2 className="font-display text-[3.5vw] font-extrabold text-text leading-[1.1] tracking-tight mb-[3vh]">
            Meet <span className="text-primary">Es2alny</span>
          </h2>
          <p className="font-body text-[1.5vw] text-muted leading-relaxed mb-[4vh] max-w-[40vw]">
            Your conversational AI assistant that queries live data, executes actions, manages tenants, and provides instant answers -- all through natural language.
          </p>
          <div className="bg-card border border-border rounded-[0.8vw] p-[2vw] max-w-[40vw]">
            <div className="flex items-center gap-[0.6vw] mb-[2vh]">
              <div className="w-[1.5vw] h-[1.5vw] rounded-full bg-primary/20 flex items-center justify-center">
                <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-primary" />
              </div>
              <span className="font-display text-[1.1vw] font-semibold text-primary">Es2alny AI</span>
            </div>
            <div className="flex flex-col gap-[1.5vh]">
              <div className="flex gap-[1vw]">
                <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-border flex items-center justify-center flex-shrink-0">
                  <span className="font-body text-[0.8vw] text-muted">U</span>
                </div>
                <div className="bg-border/50 rounded-[0.4vw] px-[1vw] py-[0.6vh]">
                  <span className="font-body text-[1.1vw] text-text">"Show me the PAR ratio across all tenants"</span>
                </div>
              </div>
              <div className="flex gap-[1vw]">
                <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-body text-[0.8vw] text-primary">AI</span>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-[0.4vw] px-[1vw] py-[0.6vh]">
                  <span className="font-body text-[1.1vw] text-text">Platform PAR: 7.2% across 12 active tenants. Top risk: Al-Baraka MFI at 15.3%...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center w-[45%] pr-[5vw] pl-[2vw]">
          <div className="flex flex-col gap-[2vh]">
            <div className="bg-card border border-border rounded-[0.6vw] p-[1.5vw]">
              <span className="font-display text-[1.3vw] font-bold text-text">10 SuperAdmin Tools</span>
              <p className="font-body text-[1vw] text-muted mt-[0.5vh]">Create tenants, approve onboarding, generate invoices, run health checks</p>
            </div>
            <div className="bg-card border border-border rounded-[0.6vw] p-[1.5vw]">
              <span className="font-display text-[1.3vw] font-bold text-text">Cross-Tenant Analytics</span>
              <p className="font-body text-[1vw] text-muted mt-[0.5vh]">Tenant rankings, dormancy detection, growth metrics, platform overview</p>
            </div>
            <div className="bg-card border border-border rounded-[0.6vw] p-[1.5vw]">
              <span className="font-display text-[1.3vw] font-bold text-text">Live Data Queries</span>
              <p className="font-body text-[1vw] text-muted mt-[0.5vh]">Portfolio KPIs, collection stats, officer performance -- real numbers, not guesses</p>
            </div>
            <div className="bg-card border border-border rounded-[0.6vw] p-[1.5vw]">
              <span className="font-display text-[1.3vw] font-bold text-text">Action Execution</span>
              <p className="font-body text-[1vw] text-muted mt-[0.5vh]">Reset passwords, send reminders, toggle modules, bulk operations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

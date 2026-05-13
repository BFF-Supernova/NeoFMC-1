export default function AIDeepDive() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-gradient-to-r from-accent/4 via-transparent to-primary/3" />
      <div className="absolute top-[10vh] left-[10vw] w-[20vw] h-[20vw] bg-accent/4 rounded-full blur-[8vw]" />
      <div className="relative z-10 flex flex-col h-full px-[6vw] pt-[6vh]">
        <span className="font-body text-[1.2vw] text-accent font-semibold uppercase tracking-[0.2em] mb-[1.5vh]">AI Deep Dive</span>
        <h2 className="font-display text-[3.4vw] font-extrabold text-text leading-[1.08] tracking-tight mb-[4vh]">
          What Es2alny <span className="text-accent">Can Do For You</span>
        </h2>
        <div className="flex gap-[2vw] flex-1 mb-[5vh]">
          <div className="flex-1 flex flex-col gap-[2vh]">
            <div className="bg-card border border-border rounded-[0.6vw] p-[1.8vw] flex-1">
              <div className="inline-flex items-center gap-[0.5vw] bg-accent/10 border border-accent/20 rounded-full px-[0.8vw] py-[0.3vh] mb-[1.2vh]">
                <span className="font-body text-[0.9vw] text-accent font-semibold">For Loan Officers</span>
              </div>
              <span className="font-display text-[1.4vw] font-bold text-text block mb-[0.8vh]">Field Intelligence</span>
              <p className="font-body text-[1.05vw] text-muted leading-relaxed">"Show me my overdue clients this week" -- instant list with amounts, days late, and contact info. "What is client Ahmed Hassan's repayment history?" -- full timeline in seconds.</p>
            </div>
            <div className="bg-card border border-border rounded-[0.6vw] p-[1.8vw] flex-1">
              <div className="inline-flex items-center gap-[0.5vw] bg-primary/10 border border-primary/20 rounded-full px-[0.8vw] py-[0.3vh] mb-[1.2vh]">
                <span className="font-body text-[0.9vw] text-primary font-semibold">For Branch Managers</span>
              </div>
              <span className="font-display text-[1.4vw] font-bold text-text block mb-[0.8vh]">Branch Command</span>
              <p className="font-body text-[1.05vw] text-muted leading-relaxed">"Compare my officers' collection rates" -- ranked performance breakdown. "How many loans are pending approval?" -- real-time pipeline status with bottleneck identification.</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-[2vh]">
            <div className="bg-card border border-border rounded-[0.6vw] p-[1.8vw] flex-1">
              <div className="inline-flex items-center gap-[0.5vw] bg-accent/10 border border-accent/20 rounded-full px-[0.8vw] py-[0.3vh] mb-[1.2vh]">
                <span className="font-body text-[0.9vw] text-accent font-semibold">For CFOs</span>
              </div>
              <span className="font-display text-[1.4vw] font-bold text-text block mb-[0.8vh]">Financial Oversight</span>
              <p className="font-body text-[1.05vw] text-muted leading-relaxed">"Show me portfolio at risk by region" -- instant PAR breakdown with trends. "What is our current provision coverage?" -- IFRS 9 staging with expected credit loss by bucket.</p>
            </div>
            <div className="bg-card border border-border rounded-[0.6vw] p-[1.8vw] flex-1">
              <div className="inline-flex items-center gap-[0.5vw] bg-primary/10 border border-primary/20 rounded-full px-[0.8vw] py-[0.3vh] mb-[1.2vh]">
                <span className="font-body text-[0.9vw] text-primary font-semibold">For Operations</span>
              </div>
              <span className="font-display text-[1.4vw] font-bold text-text block mb-[0.8vh]">Automated Actions</span>
              <p className="font-body text-[1.05vw] text-muted leading-relaxed">"Send payment reminders to clients overdue 3+ days" -- automated WhatsApp outreach. "Reset user password for Officer Fatma" -- instant secure credential management.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[1vw] mb-[4vh]">
          <div className="h-[0.15vh] flex-1 bg-gradient-to-r from-accent/30 to-transparent" />
          <span className="font-body text-[1.2vw] text-muted">Es2alny learns your data, speaks your language, and works 24/7</span>
          <div className="h-[0.15vh] flex-1 bg-gradient-to-l from-accent/30 to-transparent" />
        </div>
      </div>
    </div>
  );
}

const base = import.meta.env.BASE_URL;

export default function AIIntelligence() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <img
        src={`${base}ai-brain.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover opacity-20"
        alt="AI neural network"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/60" />
      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center pl-[6vw] w-[50%]">
          <span className="font-body text-[1.2vw] text-accent font-semibold uppercase tracking-[0.2em] mb-[1.5vh]">AI-Powered Platform</span>
          <h2 className="font-display text-[3.4vw] font-extrabold text-text leading-[1.08] tracking-tight mb-[2.5vh]">
            Intelligence <span className="text-accent">Built In</span>,
            <span className="block">Not Bolted On</span>
          </h2>
          <p className="font-body text-[1.4vw] text-muted leading-relaxed mb-[3vh] max-w-[40vw]">
            AI runs through every layer of Neo FMC -- from the chatbot you talk to, to the credit scoring that evaluates risk, to the collection engine that optimizes recovery.
          </p>
          <div className="bg-card border border-border rounded-[0.7vw] p-[1.8vw] max-w-[40vw]">
            <div className="flex items-center gap-[0.6vw] mb-[1.5vh]">
              <div className="w-[1.4vw] h-[1.4vw] rounded-full bg-accent/20 flex items-center justify-center">
                <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-accent" />
              </div>
              <span className="font-display text-[1.1vw] font-semibold text-accent">Es2alny Assistant</span>
            </div>
            <div className="flex flex-col gap-[1.2vh]">
              <div className="flex gap-[0.8vw]">
                <div className="w-[1.6vw] h-[1.6vw] rounded-full bg-border flex items-center justify-center flex-shrink-0">
                  <span className="font-body text-[0.7vw] text-muted">U</span>
                </div>
                <div className="bg-border/50 rounded-[0.3vw] px-[0.8vw] py-[0.5vh]">
                  <span className="font-body text-[1vw] text-text">"What is our PAR-30 this month?"</span>
                </div>
              </div>
              <div className="flex gap-[0.8vw]">
                <div className="w-[1.6vw] h-[1.6vw] rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-body text-[0.7vw] text-accent">AI</span>
                </div>
                <div className="bg-accent/10 border border-accent/15 rounded-[0.3vw] px-[0.8vw] py-[0.5vh]">
                  <span className="font-body text-[1vw] text-text">PAR-30 is 4.8%, down from 5.2% last month. Al-Minya branch improved most at -1.1pp...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center w-[50%] pr-[5vw] pl-[2vw] gap-[2vh]">
          <div className="bg-card border border-border rounded-[0.6vw] p-[1.6vw]">
            <div className="flex items-center gap-[0.7vw] mb-[0.8vh]">
              <div className="w-[2vw] h-[2vw] rounded-[0.3vw] bg-accent/12 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1vw] h-[1vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <span className="font-display text-[1.3vw] font-bold text-text">Natural Language Queries</span>
            </div>
            <p className="font-body text-[1.05vw] text-muted">Ask Es2alny about portfolio KPIs, officer performance, collection rates, or overdue clients in plain Arabic or English. Instant answers from live data.</p>
          </div>
          <div className="bg-card border border-border rounded-[0.6vw] p-[1.6vw]">
            <div className="flex items-center gap-[0.7vw] mb-[0.8vh]">
              <div className="w-[2vw] h-[2vw] rounded-[0.3vw] bg-accent/12 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1vw] h-[1vw] text-accent" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" strokeLinecap="round"/><path d="M7 16l4-8 4 4 5-9" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span className="font-display text-[1.3vw] font-bold text-text">AI Credit Scoring</span>
            </div>
            <p className="font-body text-[1.05vw] text-muted">Machine learning models analyze payment history, client behavior, and field data to predict default probability and recommend loan terms.</p>
          </div>
          <div className="bg-card border border-border rounded-[0.6vw] p-[1.6vw]">
            <div className="flex items-center gap-[0.7vw] mb-[0.8vh]">
              <div className="w-[2vw] h-[2vw] rounded-[0.3vw] bg-primary/12 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1vw] h-[1vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01" strokeLinecap="round"/></svg>
              </div>
              <span className="font-display text-[1.3vw] font-bold text-text">Smart Collection Engine</span>
            </div>
            <p className="font-body text-[1.05vw] text-muted">Automated WhatsApp reminders, risk-based prioritization, and predictive models that identify at-risk loans before they go delinquent.</p>
          </div>
          <div className="bg-card border border-border rounded-[0.6vw] p-[1.6vw]">
            <div className="flex items-center gap-[0.7vw] mb-[0.8vh]">
              <div className="w-[2vw] h-[2vw] rounded-[0.3vw] bg-primary/12 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-[1vw] h-[1vw] text-primary" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9" strokeLinecap="round"/></svg>
              </div>
              <span className="font-display text-[1.3vw] font-bold text-text">OCR Document Scanning</span>
            </div>
            <p className="font-body text-[1.05vw] text-muted">Automated extraction of national IDs, utility bills, and financial documents -- reducing data entry time and errors in the field.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

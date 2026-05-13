import { useState } from 'react';
import { useLocation } from 'wouter';
import { Shield, BarChart3, Users, Globe, Banknote, Building2, ChevronRight, Check, Zap, Lock, Smartphone, FileText, ArrowRight, Star } from 'lucide-react';

const features = [
  { icon: Banknote, title: 'Loan Lifecycle Management', titleAr: 'إدارة دورة القروض', desc: 'Full origination pipeline from application to disbursement with 5-stage approval workflow.' },
  { icon: BarChart3, title: 'Financial Statements', titleAr: 'القوائم المالية', desc: 'Trial Balance, Income Statement, Balance Sheet, Cash Flow, and Branch P&L with PDF export.' },
  { icon: Users, title: 'Client Management & KYC', titleAr: 'إدارة العملاء', desc: 'Comprehensive client profiles with national ID verification, document attachments, and group lending.' },
  { icon: Shield, title: 'Regulatory Compliance', titleAr: 'الامتثال التنظيمي', desc: 'FRA quarterly reports, borrower concentration, geographic distribution, and compliance engine.' },
  { icon: Building2, title: 'Multi-Branch Operations', titleAr: 'عمليات متعددة الفروع', desc: '10 user roles with RBAC, branch-level controls, spending limits, and portfolio transfers.' },
  { icon: Globe, title: 'Bilingual Arabic/English', titleAr: 'ثنائي اللغة', desc: 'Full RTL Arabic and LTR English support throughout the entire platform.' },
  { icon: Lock, title: 'Bank Reconciliation', titleAr: 'تسوية بنكية', desc: 'Automated bank statement matching with discrepancy tracking and resolution.' },
  { icon: Zap, title: 'Automated EOD Processing', titleAr: 'معالجة آلية', desc: 'Nightly batch processing: overdue detection, penalty accrual, SMS/email reminders, collection escalation.' },
  { icon: FileText, title: 'Document Generation', titleAr: 'إصدار المستندات', desc: 'PDF contracts, payment receipts, statements, disbursement vouchers, and financial report exports.' },
  { icon: Smartphone, title: 'Mobile-Ready', titleAr: 'متوافق مع الموبايل', desc: 'Responsive design optimized for field officers on tablets and smartphones.' },
  { icon: Star, title: 'Risk & Credit Scoring', titleAr: 'تقييم المخاطر', desc: 'Built-in risk engine with I-Score integration, blacklist management, and credit limits.' },
  { icon: BarChart3, title: 'ERP Modules', titleAr: 'وحدات ERP', desc: 'Fixed Assets, HR & Payroll, Budgeting, Vendors & AP, Cost Centers, Tax Engine, and Recurring Journals.' },
];

const pricingPlans = [
  {
    name: 'Basic',
    nameAr: 'أساسي',
    price: '2,500',
    period: '/month',
    desc: 'For small MFIs getting started',
    features: ['Up to 5 users', 'Core lending module', 'Client management', 'Basic reports', 'SMS notifications', 'Single branch'],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    nameAr: 'احترافي',
    price: '7,500',
    period: '/month',
    desc: 'For growing microfinance institutions',
    features: ['Up to 25 users', 'All lending modules', 'Financial statements & PDF export', 'Multi-branch management', 'Bank reconciliation', 'Savings accounts', 'Risk scoring engine', 'Bulk operations'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    nameAr: 'مؤسسي',
    price: 'Custom',
    period: '',
    desc: 'For large institutions with advanced needs',
    features: ['Unlimited users', 'All Professional features', 'ERP modules (HR, Assets, Budgets)', 'FRA regulatory reports', 'API access & webhooks', 'Custom integrations', 'Dedicated support', 'SLA guarantee'],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Neo FMC</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
              Sign In
            </button>
            <button onClick={() => navigate('/onboarding')} className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/25">
              Get Started <ChevronRight className="inline w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </nav>

      <section className="pt-20 pb-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
            <Zap className="w-4 h-4" /> Built for Egyptian Microfinance
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            The Complete <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Microfinance ERP</span> Platform
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Multi-tenant SaaS platform for microfinance institutions in Egypt. From loan origination to financial reporting, compliance to collection — everything you need to run your MFI.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/onboarding')} className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-lg font-bold transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2">
              Start Your Free Trial <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-8 py-4 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-lg font-medium transition-all">
              Sign In to Your Account
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> 14-day free trial</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> FRA compliant</span>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything Your MFI Needs</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">Purpose-built for microfinance institutions with Egyptian regulatory compliance baked in.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 hover:bg-white/[0.06] transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  <f.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-slate-400">All prices in EGP. Start with a 14-day free trial.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan, i) => (
              <div key={i} className={`p-8 rounded-2xl border transition-all duration-300 ${plan.popular ? 'bg-gradient-to-b from-emerald-500/10 to-transparent border-emerald-500/30 ring-1 ring-emerald-500/20 scale-105' : 'bg-white/[0.03] border-white/5 hover:border-white/10'}`}>
                {plan.popular && (
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-4">Most Popular</span>
                )}
                <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-slate-400 text-sm"> EGP{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(plan.name === 'Enterprise' ? '/login' : '/onboarding')}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${plan.popular ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25' : 'border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white'}`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Transform Your MFI?</h2>
          <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">Join microfinance institutions across Egypt using Neo FMC to streamline operations and ensure regulatory compliance.</p>
          <button onClick={() => navigate('/onboarding')} className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-lg font-bold transition-all shadow-xl shadow-emerald-500/25 inline-flex items-center gap-2">
            Start Your Free Trial <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-400">Neo FMC</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Neo FMC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

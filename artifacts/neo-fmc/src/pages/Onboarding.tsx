import { useState } from 'react';
import { useLocation } from 'wouter';
import { api, handleApiError } from '@/lib/api';
import { Building2, User, MapPin, Check, ArrowRight, ArrowLeft, Banknote, Loader2, ChevronRight } from 'lucide-react';

const inputCls = "w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all placeholder:text-slate-500";
const labelCls = "text-sm font-medium text-slate-300 mb-1.5 block";

interface FormData {
  companyName: string;
  companyNameAr: string;
  fraLicenseNumber: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordConfirm: string;
  branchName: string;
  branchNameAr: string;
  branchCity: string;
  branchAddress: string;
  plan: string;
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData>({
    companyName: '', companyNameAr: '', fraLicenseNumber: '',
    adminFullName: '', adminEmail: '', adminPassword: '', adminPasswordConfirm: '',
    branchName: 'Main Branch', branchNameAr: 'الفرع الرئيسي', branchCity: '', branchAddress: '',
    plan: 'Professional',
  });

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const steps = [
    { label: 'Company', icon: Building2 },
    { label: 'Admin', icon: User },
    { label: 'Branch', icon: MapPin },
    { label: 'Plan', icon: Banknote },
  ];

  const canNext = () => {
    switch (step) {
      case 0: return form.companyName && form.companyNameAr;
      case 1: return form.adminFullName && form.adminEmail && form.adminPassword && form.adminPassword === form.adminPasswordConfirm && form.adminPassword.length >= 6;
      case 2: return form.branchName && form.branchNameAr;
      case 3: return form.plan;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/tenants/self-register', {
        companyName: form.companyName,
        companyNameAr: form.companyNameAr,
        fraLicenseNumber: form.fraLicenseNumber || undefined,
        adminFullName: form.adminFullName,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        branchName: form.branchName,
        branchNameAr: form.branchNameAr,
        branchCity: form.branchCity || undefined,
        branchAddress: form.branchAddress || undefined,
        plan: form.plan,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Welcome to Neo FMC!</h1>
          <p className="text-slate-400 mb-8">Your account has been created successfully. Your GL Chart of Accounts has been seeded with standard microfinance accounts.</p>
          <button onClick={() => navigate('/login')} className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/25 inline-flex items-center gap-2">
            Sign In Now <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Neo FMC</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Set Up Your Account</h1>
          <p className="text-sm text-slate-400 mt-1">Get your microfinance platform running in minutes</p>
        </div>

        <div className="flex items-center justify-center gap-1 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${i <= step ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-500'}`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-600 mx-1" />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 sm:p-8">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-1">Company Information</h2>
              <p className="text-sm text-slate-400 mb-4">Tell us about your microfinance institution</p>
              <div><label className={labelCls}>Company Name (English)</label><input value={form.companyName} onChange={set('companyName')} placeholder="e.g. Tanmeyah Microfinance" className={inputCls} /></div>
              <div><label className={labelCls}>اسم الشركة (عربي)</label><input value={form.companyNameAr} onChange={set('companyNameAr')} placeholder="مثال: تنمية للتمويل متناهي الصغر" className={inputCls} dir="rtl" /></div>
              <div><label className={labelCls}>FRA License Number (optional)</label><input value={form.fraLicenseNumber} onChange={set('fraLicenseNumber')} placeholder="e.g. FRA-2024-XXX" className={inputCls} /></div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-1">Admin Account</h2>
              <p className="text-sm text-slate-400 mb-4">Create your first administrator account</p>
              <div><label className={labelCls}>Full Name</label><input value={form.adminFullName} onChange={set('adminFullName')} placeholder="Your full name" className={inputCls} /></div>
              <div><label className={labelCls}>Email Address</label><input type="email" value={form.adminEmail} onChange={set('adminEmail')} placeholder="admin@company.com" className={inputCls} /></div>
              <div><label className={labelCls}>Password</label><input type="password" value={form.adminPassword} onChange={set('adminPassword')} placeholder="Minimum 6 characters" className={inputCls} /></div>
              <div>
                <label className={labelCls}>Confirm Password</label>
                <input type="password" value={form.adminPasswordConfirm} onChange={set('adminPasswordConfirm')} placeholder="Confirm your password" className={inputCls} />
                {form.adminPasswordConfirm && form.adminPassword !== form.adminPasswordConfirm && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-1">First Branch</h2>
              <p className="text-sm text-slate-400 mb-4">Set up your first branch location</p>
              <div><label className={labelCls}>Branch Name (English)</label><input value={form.branchName} onChange={set('branchName')} placeholder="e.g. Main Branch" className={inputCls} /></div>
              <div><label className={labelCls}>اسم الفرع (عربي)</label><input value={form.branchNameAr} onChange={set('branchNameAr')} placeholder="مثال: الفرع الرئيسي" className={inputCls} dir="rtl" /></div>
              <div><label className={labelCls}>City (optional)</label><input value={form.branchCity} onChange={set('branchCity')} placeholder="e.g. Cairo" className={inputCls} /></div>
              <div><label className={labelCls}>Address (optional)</label><input value={form.branchAddress} onChange={set('branchAddress')} placeholder="Full address" className={inputCls} /></div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-1">Choose Your Plan</h2>
              <p className="text-sm text-slate-400 mb-4">Start with a 14-day free trial on any plan</p>
              {['Basic', 'Professional', 'Enterprise'].map(plan => (
                <label key={plan} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${form.plan === plan ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                  <input type="radio" name="plan" value={plan} checked={form.plan === plan} onChange={set('plan')} className="sr-only" />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.plan === plan ? 'border-emerald-500' : 'border-slate-600'}`}>
                    {form.plan === plan && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                  </div>
                  <div>
                    <p className="font-medium text-white">{plan}</p>
                    <p className="text-xs text-slate-400">
                      {plan === 'Basic' && '2,500 EGP/month — Up to 5 users, single branch'}
                      {plan === 'Professional' && '7,500 EGP/month — Up to 25 users, multi-branch'}
                      {plan === 'Enterprise' && 'Custom pricing — Unlimited users, all features'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button onClick={() => navigate('/landing')} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Home
              </button>
            )}

            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!canNext() || submitting} className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/25">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {submitting ? 'Creating...' : 'Create Account'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Already have an account? <button onClick={() => navigate('/login')} className="text-emerald-400 hover:text-emerald-300 transition-colors">Sign in</button>
        </p>
      </div>
    </div>
  );
}

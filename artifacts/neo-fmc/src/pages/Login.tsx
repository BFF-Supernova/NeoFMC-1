import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth as useReplitAuth } from '@workspace/replit-auth-web';
import { api } from '@/lib/api';
import { Globe, Lock, Mail, ArrowRight, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { t, language, setLanguage, isRtl } = useLanguage();
  const { user: replitUser, isLoading: replitLoading, login: replitLogin } = useReplitAuth();

  useEffect(() => {
    if (replitUser && !replitLoading) {
      fetch('/api/auth/me', { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            login('session', data);
            setLocation(data.role === 'SuperAdmin' ? '/super-admin' : '/dashboard');
          }
        })
        .catch(() => {});
    }
  }, [replitUser, replitLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const data = await api.post<any>('/auth/login', {
        email,
        password,
        ...(requires2FA && totpCode ? { totpCode } : {}),
      });
      if (data.requires2FA) {
        setRequires2FA(true);
        setIsSubmitting(false);
        return;
      }
      login(data.token, data.user);
      setLocation(data.user.role === 'SuperAdmin' ? '/super-admin' : '/dashboard');
    } catch (err: any) {
      setError(err?.data?.message || err?.message || t('فشل تسجيل الدخول', 'Login failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/20">
                <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Logo" className="w-7 h-7 object-contain" />
              </div>
              <span className="text-2xl font-display font-bold tracking-tight">Neo FMC</span>
            </div>
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors border border-border"
            >
              <Globe size={16} />
              {language === 'ar' ? 'English' : 'عربي'}
            </button>
          </div>

          {/* Form Card */}
          <div className="premium-card p-8 md:p-10">
            <h2 className="text-3xl font-display font-bold mb-2">
              {t('مرحباً بك', 'Welcome back')}
            </h2>
            <p className="text-muted-foreground mb-8">
              {t('قم بتسجيل الدخول للوصول إلى النظام', 'Sign in to access your dashboard')}
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-red-400 text-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">
                  {t('البريد الإلكتروني', 'Email address')}
                </label>
                <div className="relative">
                  <Mail className={cn("absolute top-3.5 text-muted-foreground", isRtl ? "right-4" : "left-4")} size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={cn("premium-input", isRtl ? "pr-11" : "pl-11")}
                    placeholder="name@company.com"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block">
                  {t('كلمة المرور', 'Password')}
                </label>
                <div className="relative">
                  <Lock className={cn("absolute top-3.5 text-muted-foreground", isRtl ? "right-4" : "left-4")} size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={cn("premium-input", isRtl ? "pr-11" : "pl-11")}
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>
              </div>

              {requires2FA && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground block flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary" />
                    {t('رمز التحقق الثنائي', '2FA Verification Code')}
                  </label>
                  <div className="relative">
                    <ShieldCheck className={cn("absolute top-3.5 text-muted-foreground", isRtl ? "right-4" : "left-4")} size={18} />
                    <input
                      type="text"
                      required
                      value={totpCode}
                      onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={cn("premium-input", isRtl ? "pr-11" : "pl-11")}
                      placeholder="000000"
                      dir="ltr"
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{t('أدخل الرمز من تطبيق المصادقة', 'Enter the code from your authenticator app')}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:scale-100 mt-8"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : requires2FA ? (
                  <>
                    <ShieldCheck size={18} />
                    <span>{t('تحقق', 'Verify')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('تسجيل الدخول', 'Sign In')}</span>
                    <ArrowRight size={18} className={cn(isRtl && "rotate-180")} />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('أو', 'or')}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={replitLogin}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold border border-border transition-all active:scale-[0.98]"
            >
              <LogIn size={18} />
              <span>{t('تسجيل الدخول بحساب خارجي', 'Log in with SSO')}</span>
            </button>
          </div>
          
          <p className="text-center text-sm text-muted-foreground mt-8">
            © {new Date().getFullYear()} Neo FMC. {t('جميع الحقوق محفوظة', 'All rights reserved')}.
          </p>
        </div>
      </div>

      {/* Right side visual (Desktop only) */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden bg-black/20 border-l border-border/50">
        <img 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
          alt="Dashboard Preview" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen"
        />
        <div className="relative z-10 max-w-lg text-center p-12">
          <div className="w-24 h-24 mx-auto bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center mb-8 shadow-2xl">
            <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Logo" className="w-14 h-14 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          </div>
          <h2 className="text-4xl font-display font-bold text-white mb-6 leading-tight">
            {t('مستقبل التمويل متناهي الصغر', 'The Future of Microfinance')}
          </h2>
          <p className="text-lg text-blue-100/70 leading-relaxed">
            {t('منصة سحابية متكاملة لرقمنة عمليات التمويل والتحصيل وإدارة المحافظ بذكاء وسرعة.', 'An integrated cloud platform to digitize origination, collection, and portfolio management with speed and intelligence.')}
          </p>
        </div>
      </div>
    </div>
  );
}

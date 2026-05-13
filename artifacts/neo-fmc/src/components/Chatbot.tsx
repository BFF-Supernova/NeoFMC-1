import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantContext } from '@/contexts/TenantContext';
import { cn } from '@/lib/utils';
import { MessageCircle, X, Send, Loader2, Bot, User, Minimize2, Zap, Building2, ChevronDown } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chatbot() {
  const { t, language, isRtl } = useLanguage();
  const { user } = useAuth();
  const { isSuperAdmin, tenants, selectedTenantId, setSelectedTenantId, selectedTenant } = useTenantContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showTenantPicker, setShowTenantPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

  const needsTenantSelection = isSuperAdmin && !selectedTenantId;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: Message = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);
    setIsThinking(false);

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const token = localStorage.getItem('neo_fmc_token');
      const saTenant = localStorage.getItem('neo_fmc_sa_tenant');
      const response = await fetch(`${BASE}/api/chatbot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(saTenant ? { 'X-Tenant-Id': saTenant } : {}),
        },
        body: JSON.stringify({ messages: newMessages, language }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.thinking) {
                setIsThinking(true);
                continue;
              }
              if (data.content) {
                setIsThinking(false);
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: last.content + data.content };
                  }
                  return updated;
                });
              }
              if (data.error) {
                setIsThinking(false);
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: t('عذراً، حدث خطأ. حاول مرة أخرى.', 'Sorry, an error occurred. Please try again.') };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.role === 'assistant' && updated[updated.length - 1].content === '') {
          updated[updated.length - 1] = { role: 'assistant', content: t('عذراً، لم أتمكن من الرد. حاول مرة أخرى.', 'Sorry, I could not respond. Please try again.') };
        }
        return updated;
      });
    }

    setIsStreaming(false);
    setIsThinking(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-2xl shadow-primary/30 flex items-center justify-center hover:scale-110 transition-all duration-200 group",
          isRtl ? "left-6" : "right-6"
        )}
        title={t('اسألني', 'Es2alny')}
      >
        <MessageCircle size={24} />
        <span className={cn(
          "absolute bottom-full mb-2 px-3 py-1 bg-card text-foreground text-xs rounded-lg shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none",
        )}>
          {t('اسألني - مساعد النظام', 'Es2alny - System Assistant')}
        </span>
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className={cn("fixed bottom-6 z-50", isRtl ? "left-6" : "right-6")}>
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white shadow-2xl shadow-primary/30 hover:scale-105 transition-all"
        >
          <Bot size={18} />
          <span className="text-sm font-medium">{t('اسألني', 'Es2alny')}</span>
          {messages.length > 0 && (
            <span className="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">{messages.filter(m => m.role === 'assistant').length}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-6 z-50 w-[95vw] sm:w-[420px] h-[70vh] sm:h-[580px] max-h-[85vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up",
      isRtl ? "left-3 sm:left-6" : "right-3 sm:right-6"
    )}>
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm">{t('اسألني', 'Es2alny')}</h3>
            <p className="text-[10px] opacity-80 flex items-center gap-1">
              <Zap size={8} />
              {t('مساعد ذكي - يقرأ البيانات وينفذ الأوامر', 'Smart Assistant - Reads data & executes actions')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(true)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <Minimize2 size={16} />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="px-3 py-2 border-b border-border bg-secondary/50 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowTenantPicker(!showTenantPicker)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                selectedTenantId
                  ? "bg-card border-primary/30 text-foreground"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <Building2 size={13} />
                {selectedTenant
                  ? (isRtl ? selectedTenant.companyNameAr || selectedTenant.companyName : selectedTenant.companyName)
                  : t('اختر شركة للعمل عليها...', 'Select a company to work with...')}
              </span>
              <ChevronDown size={13} className={cn("shrink-0 transition-transform", showTenantPicker && "rotate-180")} />
            </button>
            {showTenantPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                {tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => {
                      setSelectedTenantId(tenant.id);
                      setShowTenantPicker(false);
                    }}
                    className={cn(
                      "w-full text-start px-3 py-2 text-xs hover:bg-primary/10 transition-colors flex items-center gap-2 border-b border-border/50 last:border-0",
                      selectedTenantId === tenant.id && "bg-primary/10 text-primary font-semibold"
                    )}
                  >
                    <Building2 size={12} className="shrink-0 opacity-50" />
                    <span className="truncate">{isRtl ? tenant.companyNameAr || tenant.companyName : tenant.companyName}</span>
                  </button>
                ))}
                {tenants.length === 0 && (
                  <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                    {t('لا توجد شركات', 'No companies found')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {needsTenantSelection && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <Building2 size={28} className="text-amber-500" />
            </div>
            <h4 className="font-bold text-lg mb-2">{t('اختر شركة أولاً', 'Select a company first')}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {t(
                'بصفتك مشرف عام، يجب اختيار شركة من القائمة أعلاه قبل أن أتمكن من الاستعلام عن البيانات أو تنفيذ الإجراءات.',
                'As a SuperAdmin, please select a company from the dropdown above before I can query data or perform actions.'
              )}
            </p>
          </div>
        )}

        {(!needsTenantSelection || messages.length > 0) && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot size={28} className="text-primary" />
            </div>
            <h4 className="font-bold text-lg mb-2">{t('مرحباً! أنا اسألني 👋', 'Hi! I\'m Es2alny 👋')}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {t(
                'أنا مساعدك الذكي. أقدر أجيب على أسئلتك، أعرضلك بيانات حية من النظام، وأنفذ أوامر زي إعادة تعيين كلمة سر أو إرسال تذكير.',
                'I\'m your smart assistant. I can answer questions, show you live system data, and execute actions like resetting passwords or sending reminders.'
              )}
            </p>
            <div className="grid grid-cols-1 gap-2 w-full">
              {[
                { ar: 'كم إجمالي المبيعات من أول السنة؟', en: 'What are total sales year-to-date?' },
                { ar: 'أرسل تذكير لمحمد يكمل مهامه', en: 'Send a reminder to Mohamed to complete his tasks' },
                { ar: 'كم عميل عندنا وكم قرض نشط؟', en: 'How many clients and active loans do we have?' },
                { ar: 'اعرض الأقساط المتأخرة', en: 'Show overdue installments' },
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(t(q.ar, q.en)); }}
                  className="text-xs px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-start transition-colors border border-border/50"
                >
                  {t(q.ar, q.en)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-primary" />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
              msg.role === 'user'
                ? 'bg-primary text-white rounded-br-md'
                : 'bg-secondary text-foreground rounded-bl-md'
            )}>
              {msg.role === 'assistant' && msg.content === '' && isStreaming ? (
                isThinking ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 size={12} className="animate-spin text-primary" />
                    <span>{t('جاري البحث في البيانات...', 'Querying data...')}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )
              ) : (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-primary" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-border bg-card shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('اسألني أي سؤال أو اطلب إجراء...', 'Ask anything or request an action...')}
            className="flex-1 resize-none rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 max-h-24 min-h-[40px] custom-scrollbar"
            rows={1}
            dir={isRtl ? 'rtl' : 'ltr'}
            disabled={isStreaming}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
              input.trim() && !isStreaming
                ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={isRtl ? 'rotate-180' : ''} />}
          </button>
        </div>
      </div>
    </div>
  );
}

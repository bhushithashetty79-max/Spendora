import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Trash2, User as UserIcon } from 'lucide-react';
import { useChats, useExpenses, useBudgets } from '@/hooks/useData';
import { useAuth } from '@/context/AuthContext';
import { novaIntro, novaReply } from '@/lib/ai';

const SUGGESTIONS = [
  'How much did I spend this month?',
  'Am I on track with my budget?',
  'Where am I spending the most?',
  'Give me a saving tip',
];

export function NovaScreen() {
  const { profile } = useAuth();
  const { expenses } = useExpenses();
  const { budgets } = useBudgets();
  const { messages, addMessage, clearChats, loading } = useChats();
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

  // Send Nova intro on first load if no messages
  useEffect(() => {
    if (!loading && messages.length === 0 && !greetedRef.current) {
      greetedRef.current = true;
      addMessage('assistant', novaIntro());
    }
  }, [loading, messages.length, addMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = async (text: string) => {
    if (!text.trim() || typing) return;
    setDraft('');
    await addMessage('user', text);
    setTyping(true);
    // Simulate Nova thinking
    await new Promise((r) => setTimeout(r, 700));
    const reply = novaReply(text, { expenses, budgets, profile });
    await addMessage('assistant', reply);
    setTyping(false);
  };

  return (
    <div className="flex flex-col h-screen pb-[76px]">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 border-b border-white/[0.06] bg-ink-900/60 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 gradient-mint rounded-xl blur-md opacity-50" />
              <div className="relative w-10 h-10 rounded-xl gradient-mint flex items-center justify-center shadow-glow-sm">
                <Sparkles className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-white flex items-center gap-1.5">
                Nova
                <span className="w-1.5 h-1.5 rounded-full bg-mint-400 shadow-glow-sm" />
              </h1>
              <p className="text-xs text-slate-400">AI Finance Assistant</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChats} className="btn-press text-slate-500 hover:text-rose-400 p-2 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-2.5 animate-fade-up ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {m.role === 'assistant' ? (
                <div className="w-8 h-8 rounded-lg gradient-mint flex items-center justify-center shrink-0 shadow-glow-sm">
                  <Sparkles className="w-4 h-4 text-ink-950" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-ink-700 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4 text-slate-300" />
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'gradient-mint text-ink-950 font-medium rounded-tr-sm'
                    : 'bg-ink-800 text-slate-200 rounded-tl-sm border border-white/[0.06]'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div className="flex gap-2.5 animate-fade-in">
              <div className="w-8 h-8 rounded-lg gradient-mint flex items-center justify-center shrink-0 shadow-glow-sm">
                <Sparkles className="w-4 h-4 text-ink-950" strokeWidth={2.5} />
              </div>
              <div className="bg-ink-800 rounded-2xl rounded-tl-sm border border-white/[0.06] px-4 py-3.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-mint-400 animate-dot" />
                <span className="w-2 h-2 rounded-full bg-mint-400 animate-dot" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 rounded-full bg-mint-400 animate-dot" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && !typing && (
        <div className="px-4 pb-2">
          <div className="max-w-2xl mx-auto flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="chip border-white/[0.08] bg-ink-800/60 text-slate-300 hover:text-mint-300 hover:border-mint-400/30 btn-press"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 pb-4 pt-2 bg-ink-900/60 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(draft)}
            placeholder="Ask Nova about your spending…"
            className="flex-1 rounded-2xl bg-ink-800 border border-white/[0.06] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-mint-400/40"
          />
          <button
            onClick={() => send(draft)}
            disabled={!draft.trim() || typing}
            className="btn-press w-11 h-11 rounded-2xl gradient-mint text-ink-950 flex items-center justify-center shadow-glow disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

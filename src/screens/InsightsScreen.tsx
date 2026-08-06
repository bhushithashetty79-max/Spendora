import { useState } from 'react';
import { Sparkles, Zap, Lightbulb, Repeat, ArrowRight, TrendingDown } from 'lucide-react';
import { useExpenses, useBudgets } from '@/hooks/useData';
import { generateInsights, formatINR, computeDashboardStats, type Insight } from '@/lib/ai';

const ICONS = {
  leak: { icon: TrendingDown, color: 'text-rose-400', bg: 'bg-rose-500/15', ring: 'ring-rose-400/30' },
  tip: { icon: Lightbulb, color: 'text-mint-300', bg: 'bg-mint-500/15', ring: 'ring-mint-400/30' },
  habit: { icon: Repeat, color: 'text-gold-400', bg: 'bg-gold-500/15', ring: 'ring-gold-400/30' },
};

export function InsightsScreen() {
  const { expenses } = useExpenses();
  const { budgets } = useBudgets();
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState(false);

  const stats = computeDashboardStats(expenses, budgets);

  const generate = async () => {
    setLoading(true);
    // Simulate thinking for UX
    await new Promise((r) => setTimeout(r, 900));
    setInsights(generateInsights(expenses, budgets));
    setLoading(false);
  };

  return (
    <div className="px-4 pt-6 pb-40 max-w-2xl mx-auto">
      <div className="mb-5 animate-fade-up">
        <h1 className="font-display text-xl font-bold text-white">AI Insights</h1>
        <p className="text-sm text-slate-400">Nova analyzes your spending patterns</p>
      </div>

      {/* Snapshot */}
      <div className="card p-5 mb-4 animate-fade-up" style={{ animationDelay: '40ms' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">This Month</p>
            <p className="font-display text-2xl font-bold text-white">{formatINR(stats.totalSpent)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Budget Left</p>
            <p className="font-display text-2xl font-bold gradient-mint-text">{formatINR(stats.remaining)}</p>
          </div>
        </div>
      </div>

      {/* Generate button */}
      {!insights && (
        <div className="card p-8 text-center animate-fade-up" style={{ animationDelay: '80ms' }}>
          <div className="relative inline-flex mb-4">
            <div className="absolute inset-0 gradient-mint rounded-2xl blur-lg opacity-40 animate-pulse-ring" />
            <div className="relative w-16 h-16 rounded-2xl gradient-mint flex items-center justify-center shadow-glow">
              <Sparkles className="w-8 h-8 text-ink-950" strokeWidth={2.5} />
            </div>
          </div>
          <h2 className="font-display text-lg font-semibold text-white mb-1">Generate Monthly Insights</h2>
          <p className="text-sm text-slate-400 mb-5 max-w-xs mx-auto">
            Nova will review your expenses and budgets to find money leaks and saving tips.
          </p>
          <button
            onClick={generate}
            disabled={loading || expenses.length === 0}
            className="btn-press gradient-mint text-ink-950 font-semibold rounded-2xl px-6 py-3 flex items-center gap-2 mx-auto shadow-glow disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-950 animate-dot" />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-950 animate-dot" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-950 animate-dot" style={{ animationDelay: '0.4s' }} />
                </span>
                Analyzing…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> Generate Insights
              </>
            )}
          </button>
          {expenses.length === 0 && (
            <p className="text-xs text-slate-500 mt-3">Add some expenses first.</p>
          )}
        </div>
      )}

      {/* Insight cards */}
      {insights && (
        <div className="space-y-3">
          {insights.map((ins, i) => {
            const cfg = ICONS[ins.icon];
            const Icon = cfg.icon;
            return (
              <div
                key={i}
                className="card card-hover p-4 animate-fade-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center ring-1 ${cfg.ring} shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">{ins.headline}</h3>
                    <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">{ins.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={generate}
            className="btn-press w-full card p-3.5 text-sm text-mint-300 hover:text-mint-200 flex items-center justify-center gap-2 mt-2"
          >
            <ArrowRight className="w-4 h-4" /> Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

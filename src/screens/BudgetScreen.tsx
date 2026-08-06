import { useMemo, useState, useEffect } from 'react';
import { Wallet, Check, IndianRupee } from 'lucide-react';
import { useBudgets, useExpenses } from '@/hooks/useData';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { CATEGORIES, type Category } from '@/types';
import { CATEGORY_META } from '@/lib/categories';
import { computeCategoryStats, formatINR, getBudgetStatus, getTimePct } from '@/lib/ai';

const DEFAULT_BUDGETS: Record<Category, number> = {
  Food: 4000,
  Travel: 1500,
  Education: 1000,
  Entertainment: 800,
  Shopping: 1500,
  Bills: 2000,
  Other: 1000,
};

export function BudgetScreen({ onClose }: { onClose: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const { budgets, upsertBudget } = useBudgets();
  const { expenses } = useExpenses();
  const catStats = useMemo(() => computeCategoryStats(expenses, budgets), [expenses, budgets]);
  const timePct = getTimePct();

  const [limits, setLimits] = useState<Record<Category, number>>(() => {
    const map = {} as Record<Category, number>;
    for (const c of CATEGORIES) {
      map[c] = budgets.find((b) => b.category === c)?.limit_amount ?? DEFAULT_BUDGETS[c];
    }
    return map;
  });
  const [income, setIncome] = useState(String(profile?.monthly_income ?? 0));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const map = {} as Record<Category, number>;
    for (const c of CATEGORIES) {
      map[c] = budgets.find((b) => b.category === c)?.limit_amount ?? DEFAULT_BUDGETS[c];
    }
    setLimits(map);
  }, [budgets]);

  const totalBudget = Object.values(limits).reduce((s, v) => s + v, 0);

  const save = async () => {
    setSaving(true);
    for (const c of CATEGORIES) {
      await upsertBudget(c, limits[c]);
    }
    const inc = parseFloat(income) || 0;
    if (profile) {
      await supabase.from('profiles').update({ monthly_income: inc }).eq('id', profile.id);
      await refreshProfile();
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-950/80 backdrop-blur-sm animate-fade-in">
      <div className="card glass w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-3xl p-6 animate-fade-up no-scrollbar">
        <div className="flex items-center justify-between mb-5 sticky top-0 bg-ink-850/80 backdrop-blur-sm -mx-6 px-6 pb-3 -mt-6 pt-6 z-10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-mint-soft border border-mint-400/20 flex items-center justify-center">
              <Wallet className="w-4.5 h-4.5 text-mint-300" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Budget Settings</h2>
              <p className="text-xs text-slate-400">Set monthly limits per category</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-press text-slate-400 hover:text-white text-sm font-medium">
            Done
          </button>
        </div>

        {/* Income */}
        <div className="card p-4 mb-5">
          <label className="text-sm text-slate-300 font-medium">Monthly Income</label>
          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <IndianRupee className="w-4 h-4" />
            </span>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="input-field pl-11 font-display text-lg font-semibold"
              placeholder="0"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Total budget: {formatINR(totalBudget)}
            {parseFloat(income) > 0 && (
              <span className={totalBudget > parseFloat(income) ? 'text-rose-400' : 'text-mint-300'}>
                {' '}· {((totalBudget / parseFloat(income)) * 100).toFixed(0)}% of income
              </span>
            )}
          </p>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          {CATEGORIES.map((c) => {
            const meta = CATEGORY_META[c];
            const Icon = meta.icon;
            const spent = catStats.find((s) => s.category === c)?.spent ?? 0;
            const limit = limits[c];
            const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
            const status = limit > 0 ? getBudgetStatus(pct, timePct) : 'ok';
            const fill = status === 'over' ? 'bg-rose-500' : status === 'approaching' || status === 'pacing' ? 'bg-gold-500' : 'bg-mint-500';
            return (
              <div key={c} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center ring-1 ${meta.ring}`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-200">{c}</span>
                  </div>
                  <span className="font-display font-semibold text-white text-sm">
                    {formatINR(limit)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20000}
                  step={100}
                  value={limit}
                  onChange={(e) => setLimits((p) => ({ ...p, [c]: Number(e.target.value) }))}
                  className="spendra-range"
                  style={{
                    background: `linear-gradient(to right, #1FE89F 0%, #14B8A6 ${(limit / 20000) * 100}%, #141A16 ${(limit / 20000) * 100}%, #141A16 100%)`,
                  }}
                />
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-slate-500">Spent {formatINR(spent)}</span>
                  <div className="flex-1 mx-3 h-1 rounded-full bg-ink-700 overflow-hidden">
                    <div className={`h-full ${fill} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-slate-500">{pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="btn-press w-full gradient-mint text-ink-950 font-semibold rounded-2xl py-3.5 mt-5 flex items-center justify-center gap-2 shadow-glow disabled:opacity-60"
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? 'Saving…' : 'Save Budgets'}
        </button>
      </div>
    </div>
  );
}

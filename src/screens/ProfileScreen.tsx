import { useState, useEffect } from 'react';
import { User as UserIcon, IndianRupee, Palette, Check, LogOut, Wallet, Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatINR, computeDashboardStats } from '@/lib/ai';
import { useExpenses, useBudgets } from '@/hooks/useData';

export function ProfileScreen({ onOpenBudgets }: { onOpenBudgets: () => void }) {
  const { profile, refreshProfile, signOut } = useAuth();
  const { expenses } = useExpenses();
  const { budgets } = useBudgets();
  const stats = computeDashboardStats(expenses, budgets);

  const [name, setName] = useState(profile?.name ?? '');
  const [income, setIncome] = useState(String(profile?.monthly_income ?? 0));
  const [currency] = useState(profile?.currency ?? 'INR');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setIncome(String(profile.monthly_income));
    }
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ name, monthly_income: parseFloat(income) || 0 })
      .eq('id', profile.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="px-4 pt-6 pb-40 max-w-2xl mx-auto">
      <div className="mb-5 animate-fade-up">
        <h1 className="font-display text-xl font-bold text-white">Profile</h1>
        <p className="text-sm text-slate-400">Your account and preferences</p>
      </div>

      {/* Avatar + name */}
      <div className="card p-5 mb-4 animate-fade-up" style={{ animationDelay: '40ms' }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 gradient-mint rounded-2xl blur-lg opacity-40" />
            <div className="relative w-16 h-16 rounded-2xl gradient-mint flex items-center justify-center shadow-glow">
              <span className="font-display text-2xl font-bold text-ink-950">
                {(name || 'S').charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-white">{name || 'Spendora User'}</p>
            <p className="text-sm text-slate-400">{expenses.length} expenses tracked</p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="card p-3 text-center">
          <p className="text-[10px] text-slate-500">Spent</p>
          <p className="font-display text-sm font-bold text-white">{formatINR(stats.totalSpent)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[10px] text-slate-500">Budget</p>
          <p className="font-display text-sm font-bold text-white">{formatINR(stats.totalBudget)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[10px] text-slate-500">Left</p>
          <p className="font-display text-sm font-bold gradient-mint-text">{formatINR(stats.remaining)}</p>
        </div>
      </div>

      {/* Editable fields */}
      <div className="card p-5 mb-4 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <h2 className="font-display text-base font-semibold text-white mb-4">Account</h2>

        <label className="text-sm text-slate-300 font-medium">Name</label>
        <div className="relative mt-1.5 mb-4">
          <UserIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field pl-11"
            placeholder="Your name"
          />
        </div>

        <label className="text-sm text-slate-300 font-medium">Monthly Income</label>
        <div className="relative mt-1.5 mb-4">
          <IndianRupee className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="input-field pl-11 font-display font-semibold"
            placeholder="0"
          />
        </div>

        <label className="text-sm text-slate-300 font-medium">Currency</label>
        <div className="relative mt-1.5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">{currency}</span>
          <input
            value={currency}
            disabled
            className="input-field pl-14 opacity-60 cursor-not-allowed"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="btn-press w-full gradient-mint text-ink-950 font-semibold rounded-2xl py-3 mt-5 flex items-center justify-center gap-2 shadow-glow-sm disabled:opacity-60"
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Theme */}
      <div className="card p-5 mb-4 animate-fade-up" style={{ animationDelay: '160ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4.5 h-4.5 text-mint-300" />
          <h2 className="font-display text-base font-semibold text-white">Theme</h2>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-ink-800/60 border border-mint-400/20 p-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-ink-950 border border-white/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-mint-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Dark</p>
              <p className="text-xs text-slate-500">Default · easy on the eyes</p>
            </div>
          </div>
          <span className="chip border-mint-400/40 bg-mint-400/10 text-mint-300">
            <Check className="w-3 h-3" /> Active
          </span>
        </div>
      </div>

      {/* Budget shortcut */}
      <button
        onClick={onOpenBudgets}
        className="card card-hover w-full p-4 flex items-center gap-3 mb-4 animate-fade-up"
        style={{ animationDelay: '200ms' }}
      >
        <div className="w-10 h-10 rounded-xl gradient-mint-soft border border-mint-400/20 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-mint-300" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-white">Budget Settings</p>
          <p className="text-xs text-slate-500">Adjust your category limits</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500" />
      </button>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="btn-press w-full card p-4 flex items-center justify-center gap-2 text-rose-400 hover:text-rose-300 animate-fade-up"
        style={{ animationDelay: '240ms' }}
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}

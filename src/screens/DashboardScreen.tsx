import { useMemo, useState } from 'react';
import { Plus, Mic, Camera, Search, X, Sparkles, Trash2, Pencil, Check } from 'lucide-react';
import { useExpenses, useBudgets } from '@/hooks/useData';
import { useAuth } from '@/context/AuthContext';
import { computeDashboardStats, computeCategoryStats, formatINR, parseExpenseText, parseReceipt } from '@/lib/ai';
import { CATEGORY_META, statusColor, statusLabel } from '@/lib/categories';
import { ProgressRing } from '@/components/ProgressRing';
import type { Category, Expense } from '@/types';

export function DashboardScreen() {
  const { profile } = useAuth();
  const { expenses, addExpense, deleteExpense, updateExpense } = useExpenses();
  const { budgets } = useBudgets();
  const stats = useMemo(() => computeDashboardStats(expenses, budgets), [expenses, budgets]);
  const catStats = useMemo(() => computeCategoryStats(expenses, budgets), [expenses, budgets]);

  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const handleAdd = async (text: string, source: 'text' | 'voice' = 'text') => {
    if (!text.trim()) return;
    const parsed = await parseExpenseText(text, source);
    if (parsed.amount === null) {
      flash('Couldn\'t find an amount. Try "₹120 on food at mess".');
      return;
    }
    const { error } = await addExpense({
      amount: parsed.amount,
      category: parsed.category,
      merchant: parsed.merchant,
      note: parsed.note,
      source,
    });
    if (error) {
      flash(error);
      return;
    }
    flash(`Added ${formatINR(parsed.amount)} to ${parsed.category}`);
    setInput('');
  };

  // Voice input via Web Speech API
  const handleMic = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => ISpeechRecognition;
      webkitSpeechRecognition?: new () => ISpeechRecognition;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      flash('Voice input not supported in this browser.');
      return;
    }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    setListening(true);
    rec.onresult = (e: ISpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      setListening(false);
      handleAdd(transcript, 'voice');
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  const handleReceiptParse = () => {
    const { items, needs_manual_entry } = parseReceipt(ocrText);
    if (needs_manual_entry || !items.length) {
      flash('Receipt too garbled. Add the expense manually.');
      setShowCamera(false);
      setOcrText('');
      return;
    }
    items.forEach(async (it) => {
      await addExpense({
        amount: it.amount,
        category: it.category,
        merchant: it.merchant,
        note: it.note,
        source: 'receipt',
      });
    });
    flash(`Added ${items.length} item${items.length > 1 ? 's' : ''} from receipt`);
    setShowCamera(false);
    setOcrText('');
  };

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (filter !== 'All' && e.category !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.note.toLowerCase().includes(q) ||
          (e.merchant?.toLowerCase().includes(q) ?? false) ||
          e.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [expenses, filter, search]);

  const greeting = profile?.name ? `Hi, ${profile.name.split(' ')[0]}` : 'Welcome back';

  return (
    <div className="px-4 pt-6 pb-40 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 animate-fade-up">
        <div>
          <p className="text-sm text-slate-400">{greeting}</p>
          <h1 className="font-display text-xl font-bold text-white">Dashboard</h1>
        </div>
        <div className="w-10 h-10 rounded-2xl gradient-mint-soft border border-mint-400/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-mint-300" />
        </div>
      </div>

      {/* Hero */}
      <div className="card p-6 mb-5 animate-fade-up" style={{ animationDelay: '40ms' }}>
        <p className="text-sm text-slate-400 mb-1">Total Spent This Month</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-4xl font-bold text-white tracking-tight">
              {formatINR(stats.totalSpent)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {stats.totalBudget > 0 ? (
                <>
                  <span className={`chip ${stats.remainingPct > 20 ? 'border-mint-400/40 bg-mint-400/10 text-mint-300' : 'border-gold-500/40 bg-gold-500/10 text-gold-400'}`}>
                    {stats.remainingPct.toFixed(0)}% left
                  </span>
                  <span className="text-xs text-slate-500">
                    of {formatINR(stats.totalBudget)}
                  </span>
                </>
              ) : (
                <span className="text-xs text-slate-500">Set a budget to track progress</span>
              )}
            </div>
          </div>
          <ProgressRing
            progress={stats.totalBudget > 0 ? 100 - stats.remainingPct : 0}
            size={120}
            stroke={11}
            label={stats.totalBudget > 0 ? `${(100 - stats.remainingPct).toFixed(0)}%` : '—'}
            sublabel="used"
          />
        </div>
      </div>

      {/* Category cards */}
      <h2 className="font-display text-base font-semibold text-white mb-3 animate-fade-up">Categories</h2>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {catStats.map((c, i) => {
          const meta = CATEGORY_META[c.category];
          const Icon = meta.icon;
          const col = statusColor(c.status);
          const pct = c.limit > 0 ? Math.min(100, c.spentPct) : 0;
          return (
            <div
              key={c.category}
              className="card card-hover p-4 animate-fade-up"
              style={{ animationDelay: `${60 + i * 40}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center ring-1 ${meta.ring}`}>
                  <Icon className={`w-4.5 h-4.5 ${meta.color}`} />
                </div>
                {(c.status === 'over' || c.status === 'approaching' || c.status === 'pacing') && c.limit > 0 && (
                  <span className={`chip text-[10px] px-2 py-0.5 ${col.chip}`}>
                    {statusLabel(c.status)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{c.category}</p>
              <p className="font-display text-lg font-semibold text-white">
                {formatINR(c.spent)}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-ink-700 overflow-hidden">
                <div
                  className={`h-full ${col.bar} rounded-full transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {c.limit > 0 ? `of ${formatINR(c.limit)}` : 'no budget'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent transactions */}
      <div className="flex items-center justify-between mb-3 animate-fade-up">
        <h2 className="font-display text-base font-semibold text-white">Recent</h2>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="rounded-full bg-ink-800/80 border border-white/[0.06] pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-mint-400/40 w-32 sm:w-40"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-2">
        {(['All', ...Object.keys(CATEGORY_META)] as (Category | 'All')[]).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`chip whitespace-nowrap btn-press ${filter === c
              ? 'border-mint-400/50 bg-mint-400/15 text-mint-200'
              : 'border-white/[0.06] bg-ink-800/60 text-slate-400'
              }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="card p-6 text-center text-sm text-slate-500 animate-fade-in">
            No expenses yet. Add one below.
          </div>
        )}
        {filtered.map((e, i) => (
          <ExpenseRow
            key={e.id}
            expense={e}
            index={i}
            editing={editingId === e.id}
            editAmount={editAmount}
            setEditAmount={setEditAmount}
            onStartEdit={() => {
              setEditingId(e.id);
              setEditAmount(String(e.amount));
            }}
            onSaveEdit={async () => {
              const n = parseFloat(editAmount);
              if (!Number.isNaN(n) && n > 0) {
                await updateExpense(e.id, { amount: n });
                flash('Updated');
              }
              setEditingId(null);
            }}
            onCancelEdit={() => setEditingId(null)}
            onDelete={async () => {
              await deleteExpense(e.id);
              flash('Deleted');
            }}
          />
        ))}
      </div>

      {/* Floating input bar */}
      <div className="fixed bottom-[88px] inset-x-0 z-30 px-4">
        <div className="mx-auto max-w-2xl glass rounded-3xl p-2 shadow-lift flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd(input)}
            placeholder={listening ? 'Listening…' : 'Add expense, e.g. "₹120 food at mess"'}
            className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />
          <button
            onClick={handleMic}
            className={`btn-press shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition ${listening ? 'gradient-mint text-ink-950 shadow-glow' : 'bg-ink-700 text-slate-300 hover:text-mint-300'
              }`}
            aria-label="Voice input"
          >
            <Mic className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => setShowCamera(true)}
            className="btn-press shrink-0 w-10 h-10 rounded-2xl bg-ink-700 text-slate-300 hover:text-mint-300 flex items-center justify-center"
            aria-label="Scan receipt"
          >
            <Camera className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => handleAdd(input)}
            className="btn-press shrink-0 gradient-mint text-ink-950 font-semibold rounded-2xl px-4 py-2.5 text-sm flex items-center gap-1.5 shadow-glow-sm"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Receipt modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in">
          <div className="card glass p-6 w-full max-w-md animate-pop">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-mint-300" /> Scan Receipt
              </h3>
              <button onClick={() => setShowCamera(false)} className="text-slate-400 hover:text-white btn-press">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Paste the OCR text from your receipt. Spendora will parse line items automatically.
            </p>
            <textarea
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              rows={6}
              placeholder={"e.g.\nMESS CANTEEN\nVeg thali  60\nCoffee     25\nSubtotal    85\nGST         0\nTotal       85"}
              className="input-field font-mono text-xs resize-none"
            />
            <button
              onClick={handleReceiptParse}
              className="btn-press w-full gradient-mint text-ink-950 font-semibold rounded-2xl py-3 mt-4 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Parse & Add
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 inset-x-0 z-50 flex justify-center animate-fade-up">
          <div className="glass rounded-full px-4 py-2 text-sm text-mint-200 shadow-lift border border-mint-400/30">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function ExpenseRow({
  expense,
  index,
  editing,
  editAmount,
  setEditAmount,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  expense: Expense;
  index: number;
  editing: boolean;
  editAmount: string;
  setEditAmount: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const meta = CATEGORY_META[expense.category];
  const Icon = meta.icon;
  return (
    <div
      className="card card-hover p-3 flex items-center gap-3 animate-slide-in"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center ring-1 ${meta.ring} shrink-0`}>
        <Icon className={`w-5 h-5 ${meta.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100 truncate">
          {expense.merchant || expense.note || expense.category}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {expense.category} · {expense.source} · {new Date(expense.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            className="w-20 rounded-lg bg-ink-700 border border-mint-400/40 px-2 py-1 text-sm text-white outline-none"
            type="number"
          />
          <button onClick={onSaveEdit} className="btn-press w-8 h-8 rounded-lg gradient-mint text-ink-950 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={onCancelEdit} className="btn-press w-8 h-8 rounded-lg bg-ink-700 text-slate-400 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <p className="font-display font-semibold text-white whitespace-nowrap">{formatINR(Number(expense.amount))}</p>
          <button onClick={onStartEdit} className="btn-press w-7 h-7 rounded-lg text-slate-500 hover:text-mint-300 flex items-center justify-center">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="btn-press w-7 h-7 rounded-lg text-slate-500 hover:text-rose-400 flex items-center justify-center">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
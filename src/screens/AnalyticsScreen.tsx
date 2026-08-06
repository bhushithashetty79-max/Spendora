import { useMemo } from 'react';
import { PieChart as PieIcon, BarChart3, Store, Flame, TrendingUp } from 'lucide-react';
import { useExpenses, useBudgets } from '@/hooks/useData';
import { computeCategoryStats, computeDashboardStats, formatINR } from '@/lib/ai';
import { CATEGORY_META, statusColor } from '@/lib/categories';
import type { Category } from '@/types';

const PIE_COLORS: Record<Category, string> = {
  Food: '#1FE89F',
  Travel: '#2DD4BF',
  Education: '#38BDF8',
  Entertainment: '#E879F9',
  Shopping: '#FBBF24',
  Bills: '#FB7185',
  Other: '#94A3B8',
};

export function AnalyticsScreen() {
  const { expenses } = useExpenses();
  const { budgets } = useBudgets();
  const stats = useMemo(() => computeDashboardStats(expenses, budgets), [expenses, budgets]);
  const catStats = useMemo(() => computeCategoryStats(expenses, budgets), [expenses, budgets]);

  const spentCats = catStats.filter((c) => c.spent > 0);
  const totalSpent = stats.totalSpent;

  // Weekly trend (last 4 weeks of current month approximation by day-of-week buckets)
  const weeklyData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const weeks = [0, 0, 0, 0, 0];
    expenses.forEach((e) => {
      const t = new Date(e.created_at);
      if (t.getFullYear() === year && t.getMonth() === month) {
        const weekIdx = Math.min(4, Math.floor((t.getDate() - 1) / 7));
        weeks[weekIdx] += Number(e.amount);
      }
    });
    return weeks;
  }, [expenses]);

  const maxWeekly = Math.max(...weeklyData, 1);

  // Top merchants
  const merchants = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const map = new Map<string, { total: number; count: number }>();
    expenses.forEach((e) => {
      const t = new Date(e.created_at);
      if (t.getFullYear() === year && t.getMonth() === month) {
        const key = e.merchant || e.note || 'Unknown';
        const cur = map.get(key) ?? { total: 0, count: 0 };
        cur.total += Number(e.amount);
        cur.count += 1;
        map.set(key, cur);
      }
    });
    return [...map.entries()].map(([merchant, v]) => ({ merchant, ...v })).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [expenses]);

  // Biggest expenses
  const biggest = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return expenses
      .filter((e) => {
        const t = new Date(e.created_at);
        return t.getFullYear() === year && t.getMonth() === month;
      })
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 3);
  }, [expenses]);

  // Pie chart geometry
  const pieSegments = useMemo(() => {
    if (totalSpent === 0) return [];
    let angle = -90;
    return spentCats.map((c) => {
      const pct = c.spent / totalSpent;
      const startAngle = angle;
      angle += pct * 360;
      return { ...c, pct, startAngle, endAngle: angle };
    });
  }, [spentCats, totalSpent]);

  const polarPath = (startDeg: number, endDeg: number, rOuter: number, rInner: number) => {
    const toXY = (deg: number, r: number) => {
      const rad = (deg * Math.PI) / 180;
      return [50 + r * Math.cos(rad), 50 + r * Math.sin(rad)];
    };
    const [x1, y1] = toXY(startDeg, rOuter);
    const [x2, y2] = toXY(endDeg, rOuter);
    const [x3, y3] = toXY(endDeg, rInner);
    const [x4, y4] = toXY(startDeg, rInner);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
  };

  return (
    <div className="px-4 pt-6 pb-40 max-w-2xl mx-auto">
      <div className="mb-5 animate-fade-up">
        <h1 className="font-display text-xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-slate-400">Where your money goes</p>
      </div>

      {/* Pie chart */}
      <div className="card p-5 mb-4 animate-fade-up perspective" style={{ animationDelay: '40ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <PieIcon className="w-4.5 h-4.5 text-mint-300" />
          <h2 className="font-display text-base font-semibold text-white">By Category</h2>
        </div>
        {pieSegments.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No spending yet this month.</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <svg viewBox="0 0 100 100" className="w-40 h-40 preserve-3d">
              {pieSegments.map((s) => (
                <path
                  key={s.category}
                  d={polarPath(s.startAngle, s.endAngle, 42, 22)}
                  fill={PIE_COLORS[s.category]}
                  stroke="#0B0F0D"
                  strokeWidth={0.8}
                  className="transition-transform hover:scale-[1.03] origin-center"
                />
              ))}
              <text x="50" y="49" textAnchor="middle" className="fill-white font-bold" fontSize="7">
                {formatINR(totalSpent)}
              </text>
              <text x="50" y="56" textAnchor="middle" className="fill-slate-400" fontSize="3.5">
                spent
              </text>
            </svg>
            <div className="flex-1 space-y-2 w-full">
              {spentCats.map((c) => (
                <div key={c.category} className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[c.category] }} />
                  <span className="text-sm text-slate-300 flex-1">{c.category}</span>
                  <span className="text-sm font-medium text-white">{formatINR(c.spent)}</span>
                  <span className="text-xs text-slate-500 w-10 text-right">{((c.spent / totalSpent) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bar chart */}
      <div className="card p-5 mb-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4.5 h-4.5 text-mint-300" />
          <h2 className="font-display text-base font-semibold text-white">Weekly Trend</h2>
        </div>
        <div className="flex items-end justify-between gap-2 h-36">
          {weeklyData.map((amt, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-slate-500">{amt > 0 ? formatINR(amt) : ''}</span>
              <div className="w-full rounded-t-lg bg-ink-700 overflow-hidden flex items-end" style={{ height: '100px' }}>
                <div
                  className="w-full gradient-mint rounded-t-lg transition-all duration-700"
                  style={{ height: `${(amt / maxWeekly) * 100}%`, minHeight: amt > 0 ? '4px' : '0' }}
                />
              </div>
              <span className="text-[10px] text-slate-500">W{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top merchants */}
      <div className="card p-5 mb-4 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-4.5 h-4.5 text-mint-300" />
          <h2 className="font-display text-base font-semibold text-white">Top Merchants</h2>
        </div>
        {merchants.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No merchants yet.</p>
        ) : (
          <div className="space-y-2.5">
            {merchants.map((m, i) => (
              <div key={m.merchant} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-ink-700 text-slate-400 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-200 flex-1 truncate">{m.merchant}</span>
                <span className="text-xs text-slate-500">{m.count}x</span>
                <span className="text-sm font-medium text-white">{formatINR(m.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Biggest expenses */}
      <div className="card p-5 animate-fade-up" style={{ animationDelay: '160ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-4.5 h-4.5 text-rose-400" />
          <h2 className="font-display text-base font-semibold text-white">Biggest Expenses</h2>
        </div>
        {biggest.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No expenses yet.</p>
        ) : (
          <div className="space-y-2.5">
            {biggest.map((e) => {
              const meta = CATEGORY_META[e.category];
              const Icon = meta.icon;
              return (
                <div key={e.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center ring-1 ${meta.ring}`}>
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{e.merchant || e.note}</p>
                    <p className="text-xs text-slate-500">{e.category}</p>
                  </div>
                  <span className="font-display font-semibold text-white">{formatINR(Number(e.amount))}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

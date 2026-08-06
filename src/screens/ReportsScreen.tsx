import { useMemo, useState } from 'react';
import { FileText, Download, Check, FileDown } from 'lucide-react';
import { useExpenses, useBudgets } from '@/hooks/useData';
import { useAuth } from '@/context/AuthContext';
import { buildReportData, formatINR } from '@/lib/ai';
import { statusLabel } from '@/lib/categories';

export function ReportsScreen() {
  const { expenses } = useExpenses();
  const { budgets } = useBudgets();
  const { profile } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);

  const report = useMemo(
    () => buildReportData(expenses, budgets, profile?.name || 'Spendora User'),
    [expenses, budgets, profile?.name],
  );

  const downloadPDF = async () => {
    setDownloading(true);
    // Build a self-contained HTML report and open print dialog (Save as PDF)
    const html = buildReportHTML(report);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
      w.onload = () => {
        setTimeout(() => w.print(), 400);
      };
    }
    setTimeout(() => {
      URL.revokeObjectURL(url);
      setDownloading(false);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    }, 600);
  };

  return (
    <div className="px-4 pt-6 pb-40 max-w-2xl mx-auto">
      <div className="mb-5 animate-fade-up">
        <h1 className="font-display text-xl font-bold text-white">Reports</h1>
        <p className="text-sm text-slate-400">Download your monthly finance report</p>
      </div>

      {/* Report preview thumbnail */}
      <div className="card p-5 mb-4 animate-fade-up" style={{ animationDelay: '40ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-mint-300" />
          <h2 className="font-display text-base font-semibold text-white">Report Preview</h2>
        </div>

        {/* Mini report mockup */}
        <div className="rounded-2xl bg-white p-5 text-slate-900 shadow-lift" style={{ aspectRatio: '1 / 1.3' }}>
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <FileDown className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm">Spendora Report</span>
            </div>
            <span className="text-[10px] text-slate-500">{report.monthLabel}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <p className="text-[9px] text-slate-500">Total Spent</p>
              <p className="font-bold text-sm">{formatINR(report.totalSpent)}</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-2">
              <p className="text-[9px] text-slate-500">Remaining</p>
              <p className="font-bold text-sm text-emerald-600">{formatINR(report.remaining)}</p>
            </div>
          </div>

          <p className="text-[10px] font-semibold text-slate-700 mb-1.5">Category Breakdown</p>
          <div className="space-y-1 mb-3">
            {report.categories.slice(0, 5).map((c) => (
              <div key={c.category} className="flex items-center justify-between text-[10px]">
                <span className="text-slate-600">{c.category}</span>
                <span className="font-medium">
                  {formatINR(c.spent)} / {formatINR(c.limit)}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[10px] font-semibold text-slate-700 mb-1.5">Top Merchants</p>
          <div className="space-y-1 mb-3">
            {report.topMerchants.map((m) => (
              <div key={m.merchant} className="flex items-center justify-between text-[10px]">
                <span className="text-slate-600">{m.merchant}</span>
                <span className="font-medium">{formatINR(m.total)}</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] font-semibold text-slate-700 mb-1.5">AI Insights</p>
          <div className="space-y-1">
            {report.insights.slice(0, 3).map((ins, i) => (
              <p key={i} className="text-[9px] text-slate-600 leading-tight">
                • {ins.headline}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={downloadPDF}
        disabled={downloading}
        className="btn-press w-full gradient-mint text-ink-950 font-semibold rounded-2xl py-4 flex items-center justify-center gap-2.5 shadow-glow disabled:opacity-60 animate-fade-up"
        style={{ animationDelay: '80ms' }}
      >
        {done ? (
          <>
            <Check className="w-5 h-5" /> Opened — Save as PDF
          </>
        ) : downloading ? (
          'Preparing report…'
        ) : (
          <>
            <Download className="w-5 h-5" /> Download PDF Report
          </>
        )}
      </button>

      <p className="text-xs text-slate-500 text-center mt-3 animate-fade-up" style={{ animationDelay: '120ms' }}>
        Opens a print-ready page. Choose "Save as PDF" in the print dialog.
      </p>
    </div>
  );
}

function buildReportHTML(report: ReturnType<typeof buildReportData>): string {
  const rows = report.categories
    .map(
      (c) => `
      <tr>
        <td>${c.category}</td>
        <td style="text-align:right">${formatINR(c.spent)}</td>
        <td style="text-align:right">${formatINR(c.limit)}</td>
        <td style="text-align:right">${c.spentPct.toFixed(0)}%</td>
        <td>${statusLabel(c.status)}</td>
      </tr>`,
    )
    .join('');

  const merchantRows = report.topMerchants
    .map(
      (m, i) => `
      <tr>
        <td>${i + 1}. ${m.merchant}</td>
        <td style="text-align:right">${formatINR(m.total)}</td>
        <td style="text-align:right">${m.count} visits</td>
      </tr>`,
    )
    .join('');

  const insightList = report.insights
    .map(
      (ins) => `
      <div class="insight">
        <div class="insight-icon">${ins.icon === 'leak' ? '⚠' : ins.icon === 'tip' ? '💡' : '🔁'}</div>
        <div>
          <strong>${ins.headline}</strong>
          <p>${ins.detail}</p>
        </div>
      </div>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Spendora Report — ${report.monthLabel}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; max-width: 720px; margin: 0 auto; padding: 32px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1FE89F; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-mark { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #1FE89F, #14B8A6); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; }
    .logo h1 { margin: 0; font-size: 20px; }
    .month { color: #666; font-size: 13px; }
    h2 { font-size: 15px; margin: 24px 0 10px; color: #333; }
    .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .stat { background: #f6f8f7; border-radius: 12px; padding: 14px; }
    .stat-label { font-size: 11px; color: #888; }
    .stat-value { font-size: 20px; font-weight: 700; margin-top: 2px; }
    .stat-value.green { color: #00B370; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
    th { text-align: left; background: #f6f8f7; padding: 8px 10px; border-radius: 8px 8px 0 0; font-size: 11px; text-transform: uppercase; color: #666; }
    td { padding: 8px 10px; border-bottom: 1px solid #eee; }
    .insights { display: flex; flex-direction: column; gap: 10px; }
    .insight { display: flex; gap: 10px; background: #f6f8f7; border-radius: 10px; padding: 12px; }
    .insight-icon { font-size: 20px; }
    .insight strong { font-size: 13px; }
    .insight p { margin: 3px 0 0; font-size: 12px; color: #555; line-height: 1.4; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
    @media print { body { padding: 16px; } }
  </style></head><body>
  <div class="header">
    <div class="logo">
      <div class="logo-mark">S</div>
      <h1>Spendora</h1>
    </div>
    <div class="month">${report.monthLabel} · ${report.profileName}</div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-label">Total Spent</div><div class="stat-value">${formatINR(report.totalSpent)}</div></div>
    <div class="stat"><div class="stat-label">Total Budget</div><div class="stat-value">${formatINR(report.totalBudget)}</div></div>
    <div class="stat"><div class="stat-label">Remaining</div><div class="stat-value green">${formatINR(report.remaining)}</div></div>
  </div>
  <h2>Category Breakdown</h2>
  <table><thead><tr><th>Category</th><th style="text-align:right">Spent</th><th style="text-align:right">Budget</th><th style="text-align:right">Used</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
  <h2>Top Merchants</h2>
  <table><thead><tr><th>Merchant</th><th style="text-align:right">Total</th><th style="text-align:right">Visits</th></tr></thead><tbody>${merchantRows}</tbody></table>
  <h2>Nova's AI Insights</h2>
  <div class="insights">${insightList}</div>
  <div class="footer">Generated by Spendora — AI Finance Assistant for Students</div>
  </body></html>`;
}

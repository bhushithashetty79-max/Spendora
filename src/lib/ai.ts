import { CATEGORIES, type Category, type Expense, type Budget, type ParsedExpense, type DashboardStats, type CategoryStat, type BudgetStatus } from '@/types';

/* ------------------------------------------------------------------ */
/* 1. EXPENSE CATEGORIZATION (text + voice)                            */
/*  Implements the Spendora expense-parsing prompt deterministically: */
/*  amount (never invented), category (7), merchant, note, source.     */
/* ------------------------------------------------------------------ */

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  Food: ['mess', 'canteen', 'food', 'lunch', 'dinner', 'breakfast', 'tea', 'coffee', 'cafe', 'restaurant', 'snack', 'zomato', 'swiggy', 'dominos', 'mcdonalds', 'pizza', 'burger', 'chai', 'samosa', 'dosa', 'biryani', 'tiffin', 'groceries', 'grocery', 'milk', 'bread', 'fruits'],
  Travel: ['auto', 'rickshaw', 'cab', 'uber', 'ola', 'rapido', 'metro', 'bus', 'train', 'irctc', 'fuel', 'petrol', 'diesel', 'bike', 'parking', 'toll', 'flight', 'indigo', 'spicejet'],
  Education: ['book', 'books', 'stationery', 'pen', 'notes', 'course', 'udemy', 'coursera', 'certification', 'exam', 'fee', 'fees', 'tuition', 'library', 'print', 'xerox', 'photocopy', 'lab'],
  Entertainment: ['movie', 'pvr', 'netflix', 'prime', 'hotstar', 'spotify', 'game', 'gaming', 'steam', 'concert', 'show', 'ticket', 'museum', 'arcade', 'bowling'],
  Shopping: ['shirt', 'jeans', 'clothes', 'clothing', 'shoes', 'sneakers', 'flipkart', 'amazon', 'myntra', 'ajio', 'mall', 'accessory', 'bag', 'watch', 'gadget', 'electronics', 'phone', 'earbuds'],
  Bills: ['bill', 'recharge', 'prepaid', 'postpaid', 'wifi', 'internet', 'electricity', 'water', 'gas', 'rent', 'emi', 'subscription', 'phone bill', 'mobile'],
  Other: [],
};

const MERCHANT_HINTS = [
  'swiggy', 'zomato', 'dominos', 'mcdonalds', 'uber', 'ola', 'rapido', 'amazon', 'flipkart', 'myntra', 'ajio',
  'netflix', 'spotify', 'pvr', 'irctc', 'udemy', 'coursera', 'big bazaar', 'reliance', 'dmart', 'star bazaar',
  'more', 'jio', 'airtel', 'vi', 'bsnl', 'tata', 'nesto', 'cafe coffee day', 'starbucks', 'chai point',
];

const STOPWORDS = new Set(['i', 'spent', 'on', 'for', 'the', 'a', 'an', 'at', 'to', 'of', 'in', 'my', 'bought', 'paid', 'buy', 'got', 'from', 'rs', 'inr', 'rupees', 'rupee', '₹', 'via', 'using', 'upi', 'today', 'yesterday', 'this', 'that', 'is', 'was']);

function extractAmount(text: string): number | null {
  // Match "250", "250 rs", "rs 250", "₹250", "250.50"
  const patterns = [
    /₹\s*(\d+(?:\.\d{1,2})?)/i,
    /(?:rs|inr|rupees?)\.?\s*(\d+(?:\.\d{1,2})?)/i,
    /\b(\d+(?:\.\d{1,2})?)\s*(?:rs|inr|rupees?)\b/i,
    /\b(\d+(?:\.\d{1,2})?)\b/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = parseFloat(m[1]);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

function detectCategory(text: string): Category {
  const lower = text.toLowerCase();
  for (const cat of CATEGORIES) {
    if (CATEGORY_KEYWORDS[cat].some((kw) => lower.includes(kw))) return cat;
  }
  return 'Other';
}

function detectMerchant(text: string): string | null {
  const lower = text.toLowerCase();
  for (const m of MERCHANT_HINTS) {
    if (lower.includes(m)) return m.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // "at <X>" / "from <X>" pattern
  const atMatch = text.match(/(?:at|from)\s+([a-z][a-z0-9\s&'-]{1,24})/i);
  if (atMatch) return atMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
  return null;
}

function cleanNote(text: string): string {
  const words = text
    .replace(/[₹]/g, '')
    .replace(/\b(?:rs|inr|rupees?)\b/gi, '')
    .replace(/\d+(?:\.\d{1,2})?/g, '')
    .split(/\s+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w && !STOPWORDS.has(w));
  const unique = [...new Set(words)].slice(0, 5);
  const note = unique.join(' ').replace(/\s+/g, ' ').trim();
  return note || text.trim().slice(0, 40);
}

export function parseExpenseText(text: string, source: 'text' | 'voice' = 'text'): ParsedExpense {
  const amount = extractAmount(text);
  const category = detectCategory(text);
  const merchant = detectMerchant(text);
  const note = cleanNote(text);
  return { amount, category, merchant, note, source };
}

/* ------------------------------------------------------------------ */
/* 2. RECEIPT SCANNER (OCR)                                            */
/*  Parses OCR text into an array of line items.                        */
/* ------------------------------------------------------------------ */

export interface ParsedReceiptItem {
  amount: number;
  category: Category;
  merchant: string | null;
  note: string;
  source: 'receipt';
}

export interface ParsedReceipt {
  items: ParsedReceiptItem[];
  needs_manual_entry: boolean;
}

export function parseReceipt(ocrText: string): ParsedReceipt {
  const lines = ocrText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return { items: [], needs_manual_entry: true };

  const merchant = lines[0].replace(/[^a-zA-Z0-9\s&'-]/g, '').trim() || null;
  const items: ParsedReceiptItem[] = [];
  let garbled = 0;

  // Skip subtotal/total/tax lines
  const skipRe = /^(subtotal|total|tax|gst|cgst|sgst|net|amount|grand|balance|change|cash|card|upi|thank|visit|www|http|phone|tel|date|time|bill|invoice|no\.?)/i;

  for (const line of lines.slice(1)) {
    if (skipRe.test(line)) continue;
    const m = line.match(/(\d+(?:\.\d{1,2})?)\s*(?:rs|inr|₹)?$/i) || line.match(/(?:rs|inr|₹)\s*(\d+(?:\.\d{1,2})?)/i);
    if (!m) {
      garbled++;
      continue;
    }
    const amount = parseFloat(m[1]);
    if (Number.isNaN(amount) || amount <= 0) continue;
    const desc = line.replace(m[0], '').replace(/[^a-zA-Z0-9\s-]/g, '').trim().slice(0, 40) || 'item';
    items.push({
      amount,
      category: detectCategory(desc),
      merchant,
      note: cleanNote(desc),
      source: 'receipt',
    });
  }

  // If more than half the lines were unparseable, flag for manual entry
  const needs_manual_entry = garbled > lines.length / 2 && items.length === 0;
  return { items, needs_manual_entry };
}

/* ------------------------------------------------------------------ */
/* 3. BUDGET TRACKING (pure logic)                                      */
/* ------------------------------------------------------------------ */

export function getDaysInMonth(date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getDaysElapsed(date = new Date()): number {
  return date.getDate();
}

export function getTimePct(date = new Date()): number {
  return (getDaysElapsed(date) / getDaysInMonth(date)) * 100;
}

export function getBudgetStatus(spentPct: number, timePct: number): BudgetStatus {
  if (spentPct >= 100) return 'over';
  if (spentPct >= 80) return 'approaching';
  if (spentPct > timePct + 15) return 'pacing';
  return 'ok';
}

export function computeCategoryStats(expenses: Expense[], budgets: Budget[], date = new Date()): CategoryStat[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  const monthExpenses = expenses.filter((e) => {
    const t = new Date(e.created_at).getTime();
    return t >= monthStart.getTime() && t <= monthEnd.getTime();
  });

  return CATEGORIES.map((category) => {
    const spent = monthExpenses
      .filter((e) => e.category === category)
      .reduce((s, e) => s + Number(e.amount), 0);
    const limit = budgets.find((b) => b.category === category)?.limit_amount ?? 0;
    const spentPct = limit > 0 ? (spent / limit) * 100 : 0;
    const status = limit > 0 ? getBudgetStatus(spentPct, getTimePct(date)) : 'ok';
    return { category, spent, limit, spentPct, status };
  });
}

export function computeDashboardStats(expenses: Expense[], budgets: Budget[], date = new Date()): DashboardStats {
  const cats = computeCategoryStats(expenses, budgets, date);
  const totalSpent = cats.reduce((s, c) => s + c.spent, 0);
  const totalBudget = cats.reduce((s, c) => s + c.limit, 0);
  const remaining = Math.max(0, totalBudget - totalSpent);
  const remainingPct = totalBudget > 0 ? (remaining / totalBudget) * 100 : 0;
  const timePct = getTimePct(date);
  return { totalSpent, totalBudget, remaining, remainingPct, timePct, categories: cats };
}

/* ------------------------------------------------------------------ */
/* 4. NOVA — AI ASSISTANT                                               */
/*  Answers using ONLY the user's data. <80 words. Cites numbers.       */
/* ------------------------------------------------------------------ */

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function topMerchants(expenses: Expense[], date = new Date()): { merchant: string; total: number; count: number }[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthExpenses = expenses.filter((e) => {
    const t = new Date(e.created_at);
    return t.getFullYear() === year && t.getMonth() === month;
  });
  const map = new Map<string, { total: number; count: number }>();
  for (const e of monthExpenses) {
    const key = e.merchant || e.note || 'Unknown';
    const cur = map.get(key) ?? { total: 0, count: 0 };
    cur.total += Number(e.amount);
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([merchant, v]) => ({ merchant, ...v }))
    .sort((a, b) => b.total - a.total);
}

function biggestExpense(expenses: Expense[], date = new Date()): Expense | null {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthExpenses = expenses.filter((e) => {
    const t = new Date(e.created_at);
    return t.getFullYear() === year && t.getMonth() === month;
  });
  if (!monthExpenses.length) return null;
  return monthExpenses.reduce((max, e) => (Number(e.amount) > Number(max.amount) ? e : max));
}

const NOVA_INTRO = "Hi, I'm Nova — your Spendora finance buddy. I can see your spending and budgets, so ask me anything like \"how much did I spend on food?\" or \"am I on track this month?\". Let's keep your wallet happy.";

export function novaIntro(): string {
  return NOVA_INTRO;
}

export function novaReply(question: string, ctx: { expenses: Expense[]; budgets: Budget[]; profile: { name: string; monthly_income: number } | null }): string {
  const q = question.toLowerCase();
  const stats = computeDashboardStats(ctx.expenses, ctx.budgets);
  const cats = stats.categories.filter((c) => c.spent > 0);
  const merchants = topMerchants(ctx.expenses);
  const biggest = biggestExpense(ctx.expenses);

  // Greeting / identity
  if (/\b(hi|hello|hey|who are you|what can you do|help)\b/.test(q) && !/\bspent|spend|budget|food|travel|save|money/i.test(q)) {
    return "I'm Nova, your Spendora assistant. I can see your expenses and budgets. Ask me about your spending, which category you're over on, or for a quick saving tip.";
  }

  // Total spent this month
  if (/\b(total|how much|spent this month|this month|overall|all)\b/.test(q) && !/\b(food|travel|education|entertainment|shopping|bills|other)\b/.test(q)) {
    let reply = `You've spent ${formatINR(stats.totalSpent)} this month`;
    if (stats.totalBudget > 0) reply += ` of your ${formatINR(stats.totalBudget)} budget — ${stats.remainingPct.toFixed(0)}% left.`;
    else reply += '.';
    if (stats.timePct > 0) reply += ` We're ${stats.timePct.toFixed(0)}% through the month.`;
    reply += ' Want a tip to stay on track?';
    return reply;
  }

  // Per-category questions
  for (const c of stats.categories) {
    if (q.includes(c.category.toLowerCase())) {
      let reply = `You've spent ${formatINR(c.spent)} on ${c.category}`;
      if (c.limit > 0) {
        reply += ` — ${c.spentPct.toFixed(0)}% of your ${formatINR(c.limit)} limit.`;
        if (c.status === 'over') reply += " You're over budget on this. Worth pulling back.";
        else if (c.status === 'approaching') reply += " You're approaching your limit.";
        else if (c.status === 'pacing') reply += " You're spending faster than the month is moving.";
        else reply += " You're within budget.";
      } else {
        reply += ". No budget set for this category yet.";
      }
      return reply;
    }
  }

  // Budget / on-track question
  if (/\b(budget|on track|over budget|remaining|left|limit)\b/.test(q)) {
    const over = stats.categories.filter((c) => c.status === 'over');
    const approaching = stats.categories.filter((c) => c.status === 'approaching');
    const pacing = stats.categories.filter((c) => c.status === 'pacing');
    let reply = `You have ${formatINR(stats.remaining)} left across all budgets`;
    if (stats.totalBudget > 0) reply += ` (${stats.remainingPct.toFixed(0)}%)`;
    reply += '.';
    if (over.length) reply += ` Over budget: ${over.map((c) => c.category).join(', ')}.`;
    if (approaching.length) reply += ` Approaching limit: ${approaching.map((c) => c.category).join(', ')}.`;
    if (pacing.length) reply += ` Pacing fast: ${pacing.map((c) => c.category).join(', ')}.`;
    if (!over.length && !approaching.length && !pacing.length) reply += " You're on track — nice.";
    return reply;
  }

  // Top merchants
  if (/\b(merchant|where|top|most|spent most)\b/.test(q)) {
    if (!merchants.length) return "You haven't logged any expenses this month yet. Add one and I'll show where your money goes.";
    const top = merchants.slice(0, 3);
    let reply = "Your top merchants this month: ";
    reply += top.map((m, i) => `${i + 1}. ${m.merchant} (${formatINR(m.total)}, ${m.count}x)`).join('; ') + '.';
    return reply;
  }

  // Biggest expense
  if (/\b(biggest|largest|highest|most expensive)\b/.test(q)) {
    if (!biggest) return "No expenses logged this month yet.";
    return `Your biggest expense this month was ${formatINR(Number(biggest.amount))} on ${biggest.category}${biggest.merchant ? ` at ${biggest.merchant}` : ''}.`;
  }

  // Saving tips
  if (/\b(save|saving|tip|advice|how do i|reduce|cut)\b/.test(q)) {
    const topCat = [...cats].sort((a, b) => b.spent - a.spent)[0];
    if (topCat) {
      return `Your biggest spend is ${topCat.category} at ${formatINR(topCat.spent)}. Try setting a weekly cap for it — e.g. ${formatINR(Math.round(topCat.limit > 0 ? topCat.limit / 4 : topCat.spent * 0.75 / 1))}/week — and track it here. Small caps beat big resolutions.`;
    }
    return "Add a few expenses and set budgets — then I can give you a specific saving tip based on where your money actually goes.";
  }

  // Income
  if (/\b(income|earn|salary|make)\b/.test(q)) {
    if (ctx.profile?.monthly_income) {
      const leftAfterSpending = ctx.profile.monthly_income - stats.totalSpent;
      return `Your monthly income is ${formatINR(ctx.profile.monthly_income)}. After this month's spending (${formatINR(stats.totalSpent)}), you have ${formatINR(leftAfterSpending)} unallocated. Consider saving 20% first, then spending.`;
    }
    return "I don't see a monthly income set. Add it in Profile and I can compare your spending against it.";
  }

  // Out-of-scope
  if (/\b(invest|stock|crypto|bitcoin|mutual fund|insurance|loan|emi calculator)\b/.test(q)) {
    return "That's outside what I track — I only see your Spendora expenses and budgets. For investing or loans, try a dedicated app. I can help you find room to save first, though.";
  }

  // Fallback — give a snapshot
  let reply = `Here's your snapshot: ${formatINR(stats.totalSpent)} spent this month`;
  if (stats.totalBudget > 0) reply += `, ${stats.remainingPct.toFixed(0)}% of budget remaining`;
  reply += '.';
  if (cats.length) {
    const top = [...cats].sort((a, b) => b.spent - a.spent)[0];
    reply += ` Most spent on ${top.category} (${formatINR(top.spent)}).`;
  }
  reply += ' Ask me about a specific category or "am I on track?"';
  return reply;
}

/* ------------------------------------------------------------------ */
/* 5. MONTHLY AI INSIGHTS                                               */
/* ------------------------------------------------------------------ */

export interface Insight {
  icon: 'leak' | 'tip' | 'habit';
  headline: string;
  detail: string;
}

export function generateInsights(expenses: Expense[], budgets: Budget[]): Insight[] {
  const stats = computeDashboardStats(expenses, budgets);
  const cats = stats.categories.filter((c) => c.spent > 0);
  const merchants = topMerchants(expenses);
  const biggest = biggestExpense(expenses);
  const insights: Insight[] = [];

  // 1) Top 3 money leaks (reference actual budget numbers)
  const leaks = stats.categories
    .filter((c) => c.limit > 0 && c.spent > 0)
    .sort((a, b) => b.spentPct - a.spentPct)
    .slice(0, 3);

  for (const leak of leaks) {
    if (leak.status === 'over') {
      insights.push({
        icon: 'leak',
        headline: `${leak.category} is over budget`,
        detail: `You've spent ${formatINR(leak.spent)} against a ${formatINR(leak.limit)} limit — ${leak.spentPct.toFixed(0)}% used. This is your biggest leak this month.`,
      });
    } else if (leak.status === 'approaching') {
      insights.push({
        icon: 'leak',
        headline: `${leak.category} is approaching its limit`,
        detail: `${formatINR(leak.spent)} of ${formatINR(leak.limit)} spent (${leak.spentPct.toFixed(0)}%). Only ${formatINR(Math.max(0, leak.limit - leak.spent))} left this month.`,
      });
    } else if (leak.status === 'pacing') {
      insights.push({
        icon: 'leak',
        headline: `${leak.category} is pacing fast`,
        detail: `At ${leak.spentPct.toFixed(0)}% of your ${formatINR(leak.limit)} budget while the month is only ${stats.timePct.toFixed(0)}% done. Slow down here.`,
      });
    }
  }

  // If no budget-based leaks, surface biggest spend as a leak
  if (insights.filter((i) => i.icon === 'leak').length === 0 && cats.length) {
    const top = [...cats].sort((a, b) => b.spent - a.spent)[0];
    insights.push({
      icon: 'leak',
      headline: `${top.category} is your top spend`,
      detail: `You've spent ${formatINR(top.spent)} on ${top.category} this month${top.limit > 0 ? ` (${top.spentPct.toFixed(0)}% of budget)` : ''}. Set a tighter limit to cap it.`,
    });
  }

  // 2) 3 saving tips tied to real patterns
  if (merchants[0]) {
    insights.push({
      icon: 'tip',
      headline: `Cap spending at ${merchants[0].merchant}`,
      detail: `${merchants[0].merchant} is your top merchant at ${formatINR(merchants[0].total)} across ${merchants[0].count} visits. Limit to 2 visits/week to save ~${formatINR(Math.round(merchants[0].total * 0.3))}.`,
    });
  }
  if (biggest) {
    insights.push({
      icon: 'tip',
      headline: `Watch big one-off spends`,
      detail: `Your largest expense was ${formatINR(Number(biggest.amount))} on ${biggest.category}. Split big purchases across months or wait 24h before buying.`,
    });
  }
  const foodCat = stats.categories.find((c) => c.category === 'Food');
  if (foodCat && foodCat.spent > 0) {
    insights.push({
      icon: 'tip',
      headline: `Cook 3 meals a week`,
      detail: `Food is at ${formatINR(foodCat.spent)}${foodCat.limit > 0 ? ` of ${formatINR(foodCat.limit)}` : ''}. Replacing 3 mess/food-delivery meals with home cooking can save ~${formatINR(Math.round(foodCat.spent * 0.25))}/month.`,
    });
  } else if (cats.length) {
    const top = [...cats].sort((a, b) => b.spent - a.spent)[0];
    insights.push({
      icon: 'tip',
      headline: `Set a weekly cap on ${top.category}`,
      detail: `You've spent ${formatINR(top.spent)} on ${top.category}. A weekly cap of ${formatINR(Math.round(top.spent * 0.75 / 4))} keeps you honest without a big cut.`,
    });
  }

  // 3) One habit to change this week
  if (stats.categories.some((c) => c.status === 'over' || c.status === 'approaching')) {
    const worst = stats.categories.find((c) => c.status === 'over') ?? stats.categories.find((c) => c.status === 'approaching');
    if (worst) {
      insights.push({
        icon: 'habit',
        headline: `This week: pause ${worst.category} spends`,
        detail: `${worst.category} is at ${worst.spentPct.toFixed(0)}% of budget. Skip non-essential ${worst.category.toLowerCase()} for the next 7 days and revisit next Monday.`,
      });
    }
  } else {
    insights.push({
      icon: 'habit',
      headline: `This week: log every expense`,
      detail: `Consistent logging beats perfect budgets. Add each expense the moment you spend — voice or text — so your limits reflect reality.`,
    });
  }

  return insights.slice(0, 7);
}

/* ------------------------------------------------------------------ */
/* 6. PDF REPORT — text content                                         */
/* ------------------------------------------------------------------ */

export interface ReportData {
  monthLabel: string;
  totalSpent: number;
  totalBudget: number;
  remaining: number;
  categories: CategoryStat[];
  topMerchants: { merchant: string; total: number; count: number }[];
  insights: Insight[];
  profileName: string;
}

export function buildReportData(expenses: Expense[], budgets: Budget[], profileName: string, date = new Date()): ReportData {
  const stats = computeDashboardStats(expenses, budgets, date);
  const monthLabel = date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  return {
    monthLabel,
    totalSpent: stats.totalSpent,
    totalBudget: stats.totalBudget,
    remaining: stats.remaining,
    categories: stats.categories.filter((c) => c.spent > 0 || c.limit > 0),
    topMerchants: topMerchants(expenses, date).slice(0, 3),
    insights: generateInsights(expenses, budgets),
    profileName,
  };
}

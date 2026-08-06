export const CATEGORIES = [
  'Food',
  'Travel',
  'Education',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type ExpenseSource = 'text' | 'voice' | 'receipt';

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: Category;
  merchant: string | null;
  note: string;
  source: ExpenseSource;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: Category;
  limit_amount: number;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  monthly_income: number;
  currency: string;
  theme: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ParsedExpense {
  amount: number | null;
  category: Category;
  merchant: string | null;
  note: string;
  source: ExpenseSource;
}

export type BudgetStatus = 'ok' | 'approaching' | 'over' | 'pacing';

export interface CategoryStat {
  category: Category;
  spent: number;
  limit: number;
  spentPct: number;
  status: BudgetStatus;
}

export interface DashboardStats {
  totalSpent: number;
  totalBudget: number;
  remaining: number;
  remainingPct: number;
  timePct: number;
  categories: CategoryStat[];
}

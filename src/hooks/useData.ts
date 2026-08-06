import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Expense, Budget, ChatMessage, Category } from '@/types';

export function useExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });
    setExpenses((data as Expense[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const addExpense = async (input: {
    amount: number;
    category: Category;
    merchant: string | null;
    note: string;
    source: Expense['source'];
    created_at?: string;
  }) => {
    const payload = { ...input, created_at: input.created_at ?? new Date().toISOString() };
    const { data, error } = await supabase.from('expenses').insert(payload).select().single();
    if (error) return { error: error.message };
    setExpenses((prev) => [data as Expense, ...prev]);
    return { error: null };
  };

  const updateExpense = async (id: string, patch: Partial<Expense>) => {
    const { data, error } = await supabase.from('expenses').update(patch).eq('id', id).select().single();
    if (error) return { error: error.message };
    setExpenses((prev) => prev.map((e) => (e.id === id ? (data as Expense) : e)));
    return { error: null };
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) return { error: error.message };
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    return { error: null };
  };

  return { expenses, loading, addExpense, updateExpense, deleteExpense, reload: load };
}

export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('budgets').select('*');
    setBudgets((data as Budget[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const upsertBudget = async (category: Category, limit_amount: number) => {
    const existing = budgets.find((b) => b.category === category);
    if (existing) {
      const { data, error } = await supabase
        .from('budgets')
        .update({ limit_amount })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) return { error: error.message };
      setBudgets((prev) => prev.map((b) => (b.id === existing.id ? (data as Budget) : b)));
    } else {
      const { data, error } = await supabase
        .from('budgets')
        .insert({ category, limit_amount })
        .select()
        .single();
      if (error) return { error: error.message };
      setBudgets((prev) => [...prev, data as Budget]);
    }
    return { error: null };
  };

  return { budgets, loading, upsertBudget, reload: load };
}

export function useChats() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: true });
    setMessages((data as ChatMessage[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const addMessage = async (role: 'user' | 'assistant', content: string) => {
    const { data, error } = await supabase.from('chats').insert({ role, content }).select().single();
    if (error) return { error: error.message };
    setMessages((prev) => [...prev, data as ChatMessage]);
    return { error: null };
  };

  const clearChats = async () => {
    const { error } = await supabase.from('chats').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) return { error: error.message };
    setMessages([]);
    return { error: null };
  };

  return { messages, loading, addMessage, clearChats, reload: load };
}

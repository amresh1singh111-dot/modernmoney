import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Transaction, Category, Goal, GoalContribution, TuitionPlan, Budget, Reminder } from '@/lib/types';
import { FALLBACK_RATES, type ExchangeRateData } from '@/lib/currency';

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (!error && data) setCategories(data as Category[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { categories, loading, refetch };
}

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false });
    if (!error && data) setTransactions(data as Transaction[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addTransaction = useCallback(
    async (tx: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'category'>) => {
      if (!user) return { error: 'Not authenticated' };
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: tx.type,
        amount_original: tx.amount_original,
        currency_original: tx.currency_original,
        category_id: tx.category_id,
        description: tx.description,
        location: tx.location,
        transaction_date: tx.transaction_date,
        is_recurring: tx.is_recurring,
        receipt_url: tx.receipt_url ?? null,
      });
      if (!error) await refetch();
      return { error: error?.message ?? null };
    },
    [user, refetch],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) await refetch();
      return { error: error?.message ?? null };
    },
    [refetch],
  );

  return { transactions, loading, refetch, addTransaction, deleteTransaction };
}

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setGoals(data as Goal[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addGoal = useCallback(
    async (goal: Pick<Goal, 'name' | 'target_amount' | 'currency' | 'target_date' | 'icon' | 'color'>) => {
      if (!user) return { error: 'Not authenticated' };
      const { error } = await supabase.from('goals').insert({
        user_id: user.id,
        name: goal.name,
        target_amount: goal.target_amount,
        currency: goal.currency,
        target_date: goal.target_date,
        icon: goal.icon,
        color: goal.color,
      });
      if (!error) await refetch();
      return { error: error?.message ?? null };
    },
    [user, refetch],
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (!error) await refetch();
      return { error: error?.message ?? null };
    },
    [refetch],
  );

  const contributeToGoal = useCallback(
    async (goalId: string, amount: number, note?: string) => {
      if (!user) return { error: 'Not authenticated' };
      // Insert contribution and update saved_amount atomically
      const { error: contribError } = await supabase.from('goal_contributions').insert({
        user_id: user.id,
        goal_id: goalId,
        amount,
        note: note ?? null,
      });
      if (contribError) return { error: contribError.message };

      // Fetch current goal to compute new saved_amount
      const { data: goal } = await supabase
        .from('goals')
        .select('saved_amount, target_amount')
        .eq('id', goalId)
        .maybeSingle();
      if (goal) {
        const newSaved = (goal as Goal).saved_amount + amount;
        const isComplete = newSaved >= (goal as Goal).target_amount;
        await supabase
          .from('goals')
          .update({ saved_amount: newSaved, is_completed: isComplete })
          .eq('id', goalId);
      }
      await refetch();
      return { error: null };
    },
    [user, refetch],
  );

  return { goals, loading, refetch, addGoal, deleteGoal, contributeToGoal };
}

export function useTuitionPlans() {
  const { user } = useAuth();
  const [tuitionPlans, setTuitionPlans] = useState<TuitionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('tuition_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('deadline', { ascending: true });
    if (!error && data) setTuitionPlans(data as TuitionPlan[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addTuitionPlan = useCallback(
    async (plan: Pick<TuitionPlan, 'label' | 'amount_total' | 'amount_saved' | 'currency' | 'deadline' | 'period_type'>) => {
      if (!user) return { error: 'Not authenticated' };
      const { error } = await supabase.from('tuition_plans').insert({
        user_id: user.id,
        label: plan.label,
        amount_total: plan.amount_total,
        amount_saved: plan.amount_saved,
        currency: plan.currency,
        deadline: plan.deadline,
        period_type: plan.period_type,
      });
      if (!error) await refetch();
      return { error: error?.message ?? null };
    },
    [user, refetch],
  );

  const updateTuitionPlan = useCallback(
    async (id: string, updates: Partial<TuitionPlan>) => {
      const { error } = await supabase.from('tuition_plans').update(updates).eq('id', id);
      if (!error) await refetch();
      return { error: error?.message ?? null };
    },
    [refetch],
  );

  const deleteTuitionPlan = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('tuition_plans').delete().eq('id', id);
      if (!error) await refetch();
      return { error: error?.message ?? null };
    },
    [refetch],
  );

  return { tuitionPlans, loading, refetch, addTuitionPlan, updateTuitionPlan, deleteTuitionPlan };
}

export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('category_name', { ascending: true });
    if (!error && data) setBudgets(data as Budget[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addBudget = useCallback(
    async (budget: Pick<Budget, 'category_name' | 'limit_amount' | 'currency'>) => {
      if (!user) return { error: 'Not authenticated' };
      const { error } = await supabase.from('budgets').insert({
        user_id: user.id,
        category_name: budget.category_name,
        limit_amount: budget.limit_amount,
        currency: budget.currency,
      });
      if (!error) await refetch();
      return { error: error?.message ?? null };
    },
    [user, refetch],
  );

  const updateBudget = useCallback(
    async (id: string, updates: Partial<Budget>) => {
      const { error } = await supabase.from('budgets').update(updates).eq('id', id);
      if (!error) await refetch();
      return { error: error?.message ?? null };
    },
    [refetch],
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (!error) await refetch();
      return { error: error?.message ?? null };
    },
    [refetch],
  );

  return { budgets, loading, refetch, addBudget, updateBudget, deleteBudget };
}

export function useReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });
    if (!error && data) setReminders(data as Reminder[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addReminder = useCallback(
    async (reminder: Pick<Reminder, 'title' | 'description' | 'reminder_type' | 'due_date' | 'linked_id' | 'linked_type'>) => {
      if (!user) return { error: 'Not authenticated' };
      const { error } = await supabase.from('reminders').insert({
        user_id: user.id,
        title: reminder.title,
        description: reminder.description ?? null,
        reminder_type: reminder.reminder_type,
        due_date: reminder.due_date,
        linked_id: reminder.linked_id ?? null,
        linked_type: reminder.linked_type ?? null,
      });
      if (!error) await refetch();
      return { error: error?.message ?? null };
    },
    [user, refetch],
  );

  const updateReminder = useCallback(
    async (id: string, updates: Partial<Reminder>) => {
      const { error } = await supabase.from('reminders').update(updates).eq('id', id);
      if (!error) await refetch();
      return { error: error?.message ?? null };
    },
    [refetch],
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('reminders').delete().eq('id', id);
      if (!error) await refetch();
      return { error: error?.message ?? null };
    },
    [refetch],
  );

  return { reminders, loading, refetch, addReminder, updateReminder, deleteReminder };
}

export function useExchangeRates() {
  const [rateData, setRateData] = useState<ExchangeRateData>({
    rates: FALLBACK_RATES,
    date: new Date().toISOString().split('T')[0],
    source: 'fallback',
  });

  useEffect(() => {
    // For MVP, we use fallback rates. Live rate fetching can be added
    // via an edge function in a later phase. The "rates as of" date is shown.
    setRateData({
      rates: FALLBACK_RATES,
      date: new Date().toISOString().split('T')[0],
      source: 'fallback',
    });
  }, []);

  return rateData;
}

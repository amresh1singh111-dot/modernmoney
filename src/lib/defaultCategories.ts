import { supabase } from '@/lib/supabase';

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food', icon: 'UtensilsCrossed', color: '#f97316', type: 'expense' as const },
  { name: 'Transport', icon: 'Bus', color: '#3b82f6', type: 'expense' as const },
  { name: 'Entertainment', icon: 'Clapperboard', color: '#a855f7', type: 'expense' as const },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', type: 'expense' as const },
  { name: 'Bills', icon: 'ReceiptText', color: '#ef4444', type: 'expense' as const },
  { name: 'Health', icon: 'HeartPulse', color: '#14b8a6', type: 'expense' as const },
  { name: 'Education', icon: 'GraduationCap', color: '#6366f1', type: 'expense' as const },
  { name: 'Other', icon: 'CircleEllipsis', color: '#64748b', type: 'expense' as const },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'Briefcase', color: '#10b981', type: 'income' as const },
  { name: 'Allowance', icon: 'Wallet', color: '#22c55e', type: 'income' as const },
  { name: 'Part-time Job', icon: 'Clock', color: '#84cc16', type: 'income' as const },
  { name: 'Other Income', icon: 'Plus', color: '#65a30d', type: 'income' as const },
];

export async function seedDefaultCategories(userId: string) {
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (existing && existing.length > 0) return;

  const allCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES].map((c) => ({
    ...c,
    user_id: userId,
    is_custom: false,
  }));

  await supabase.from('categories').insert(allCategories);
}

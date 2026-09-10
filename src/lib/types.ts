export type AppMode = 'home' | 'student';

export type Profile = {
  id: string;
  mode: AppMode;
  display_currency: string;
  home_currency: string | null;
  current_currency: string | null;
  income_source: 'self' | 'parents' | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string | null;
  color: string | null;
  is_custom: boolean;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount_original: number;
  currency_original: string;
  category_id: string | null;
  description: string | null;
  location: string | null;
  transaction_date: string;
  receipt_url: string | null;
  is_recurring: boolean;
  created_at: string;
  category?: Category | null;
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  currency: string;
  target_date: string | null;
  icon: string | null;
  color: string | null;
  is_completed: boolean;
  created_at: string;
};

export type GoalContribution = {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  contribution_date: string;
  note: string | null;
  created_at: string;
};

export type TuitionPlan = {
  id: string;
  user_id: string;
  label: string;
  amount_total: number;
  amount_saved: number;
  currency: string;
  deadline: string;
  period_type: 'semester' | 'annual';
  is_paid: boolean;
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category_name: string;
  limit_amount: number;
  currency: string;
  is_recurring: boolean;
  created_at: string;
};

export type Reminder = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  reminder_type: 'tuition' | 'bill' | 'savings_milestone' | 'repayment';
  due_date: string;
  is_completed: boolean;
  linked_id: string | null;
  linked_type: 'tuition_plan' | 'goal' | 'budget' | 'transaction' | null;
  created_at: string;
};

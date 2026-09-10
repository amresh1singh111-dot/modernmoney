/*
# Initial MVP Schema — Adaptive Personal Finance App

## Overview
Creates the foundational tables for an adaptive personal-finance app with two modes
(Home Country and International Student). This migration establishes multi-currency
storage from day one: every transaction stores its original amount AND original currency
permanently, while display currency is a user-level preference that only affects rendering.

## New Tables

### profiles
- `id` (uuid, PK, references auth.users) — one row per authenticated user
- `mode` (text, NOT NULL) — 'home' or 'student'; determines which dashboard/tools are active
- `display_currency` (text, NOT NULL, default 'USD') — user's preferred display currency
- `home_currency` (text, nullable) — for International Student mode, the user's home country currency
- `current_currency` (text, nullable) — for International Student mode, the user's current country currency
- `income_source` (text, nullable) — 'self' or 'parents' (Home Country mode income setup)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### categories
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users) — owner
- `name` (text, NOT NULL) — category label (food, transport, etc.)
- `type` (text, NOT NULL, default 'expense') — 'expense' or 'income'
- `icon` (text, nullable) — lucide icon name for rendering
- `color` (text, nullable) — hex color for charts/indicators
- `is_custom` (boolean, NOT NULL, default false) — true for user-created categories
- `created_at` (timestamptz, default now())

### transactions
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users) — owner
- `type` (text, NOT NULL) — 'income' or 'expense'
- `amount_original` (numeric(14,2), NOT NULL) — original transaction amount, never changes
- `currency_original` (text, NOT NULL) — original transaction currency code (ISO 4217), never changes
- `category_id` (uuid, nullable, references categories) — category for this transaction
- `description` (text, nullable) — user-provided description/label
- `location` (text, nullable) — where the transaction occurred
- `transaction_date` (timestamptz, NOT NULL, default now()) — when the transaction happened
- `receipt_url` (text, nullable) — URL to receipt photo (storage path)
- `is_recurring` (boolean, NOT NULL, default false) — marks recurring transactions
- `created_at` (timestamptz, default now())

### goals
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users) — owner
- `name` (text, NOT NULL) — goal label (e.g. "Emergency Fund", "New Laptop")
- `target_amount` (numeric(14,2), NOT NULL) — target amount in display currency
- `saved_amount` (numeric(14,2), NOT NULL, default 0) — amount contributed so far
- `currency` (text, NOT NULL, default 'USD') — currency for this goal
- `target_date` (date, nullable) — optional deadline
- `icon` (text, nullable) — lucide icon name
- `color` (text, nullable) — hex color
- `is_completed` (boolean, NOT NULL, default false)
- `created_at` (timestamptz, default now())

### goal_contributions
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users) — owner
- `goal_id` (uuid, NOT NULL, references goals ON DELETE CASCADE) — which goal
- `amount` (numeric(14,2), NOT NULL) — contribution amount
- `contribution_date` (timestamptz, NOT NULL, default now()) — when contributed
- `note` (text, nullable) — optional note
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on ALL tables.
- profiles: user can read/update only their own profile row (id = auth.uid()).
- categories, transactions, goals, goal_contributions: full CRUD scoped to owner via user_id = auth.uid().
- All owner columns default to auth.uid() so inserts that omit user_id succeed.
- Policies use 4 separate statements per table (SELECT, INSERT, UPDATE, DELETE) — no FOR ALL.

## Important Notes
1. Multi-currency is baked into the transaction schema from day one (amount_original + currency_original).
   Display currency lives on profiles.display_currency and only affects rendering, never stored records.
2. The schema is designed to support future phases (recurring transactions, lending tracker, tuition planner,
   remittance tracking, reports, notifications, intelligence layer) without a rewrite — additional tables can
   be added later, and the transaction/goal structure already captures the data those features need.
3. goal_contributions is a separate ledger from transactions — contributions to a piggy bank are tracked
   independently so future forecasting can analyze savings rate separately from spending.
*/

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'home' CHECK (mode IN ('home', 'student')),
  display_currency text NOT NULL DEFAULT 'USD',
  home_currency text,
  current_currency text,
  income_source text CHECK (income_source IS NULL OR income_source IN ('self', 'parents')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============================================================================
-- CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  icon text,
  color text,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_categories" ON categories;
CREATE POLICY "select_own_categories" ON categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_categories" ON categories;
CREATE POLICY "insert_own_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_categories" ON categories;
CREATE POLICY "update_own_categories" ON categories FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_categories" ON categories;
CREATE POLICY "delete_own_categories" ON categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount_original numeric(14,2) NOT NULL,
  currency_original text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  description text,
  location text,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  receipt_url text,
  is_recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
CREATE POLICY "update_own_transactions" ON transactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
CREATE POLICY "delete_own_transactions" ON transactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- GOALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount numeric(14,2) NOT NULL,
  saved_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  target_date date,
  icon text,
  color text,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_goals" ON goals;
CREATE POLICY "select_own_goals" ON goals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_goals" ON goals;
CREATE POLICY "insert_own_goals" ON goals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_goals" ON goals;
CREATE POLICY "update_own_goals" ON goals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_goals" ON goals;
CREATE POLICY "delete_own_goals" ON goals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- GOAL CONTRIBUTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS goal_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  contribution_date timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_contributions" ON goal_contributions;
CREATE POLICY "select_own_contributions" ON goal_contributions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_contributions" ON goal_contributions;
CREATE POLICY "insert_own_contributions" ON goal_contributions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_contributions" ON goal_contributions;
CREATE POLICY "update_own_contributions" ON goal_contributions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_contributions" ON goal_contributions;
CREATE POLICY "delete_own_contributions" ON goal_contributions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user_id ON goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON goal_contributions(goal_id);

-- ============================================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, mode, display_currency)
  VALUES (NEW.id, 'home', 'USD')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

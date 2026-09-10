/*
# Tuition Planner, Living Expense Budgets, and Reminders

## Overview
Adds three new tables for the International Student mode layer:
- tuition_plans: semester/annual fees, payment deadlines, amount saved, and computed gap
- budgets: monthly caps per category (living expenses: rent, food, transport, phone, utilities, custom)
- reminders: tuition deadlines, bill due dates, savings milestones, repayment requests

These tables support the automatic budget allocation system: the app checks incoming/available
money against fixed tuition + living targets so the user doesn't do the math by hand.

## New Tables

### tuition_plans
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users) — owner
- `label` (text, NOT NULL) — e.g. "Fall 2026 Semester", "Annual Tuition 2026-2027"
- `amount_total` (numeric(14,2), NOT NULL) — total tuition fee for this period
- `amount_saved` (numeric(14,2), NOT NULL, default 0) — amount already saved/paid
- `currency` (text, NOT NULL, default 'USD') — currency of the tuition fee
- `deadline` (date, NOT NULL) — payment deadline
- `period_type` (text, NOT NULL, default 'semester') — 'semester' or 'annual'
- `is_paid` (boolean, NOT NULL, default false) — whether fully paid
- `created_at` (timestamptz, default now())

### budgets
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users) — owner
- `category_name` (text, NOT NULL) — e.g. "Rent", "Food", "Transport", "Phone", "Utilities", or custom
- `limit_amount` (numeric(14,2), NOT NULL) — monthly cap for this category
- `currency` (text, NOT NULL, default 'USD') — currency of the budget cap
- `is_recurring` (boolean, NOT NULL, default true) — whether this recurs monthly
- `created_at` (timestamptz, default now())

### reminders
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users) — owner
- `title` (text, NOT NULL) — reminder title
- `description` (text, nullable) — additional details
- `reminder_type` (text, NOT NULL, default 'bill') — 'tuition', 'bill', 'savings_milestone', 'repayment'
- `due_date` (date, NOT NULL) — when the reminder is due
- `is_completed` (boolean, NOT NULL, default false) — whether dismissed/completed
- `linked_id` (uuid, nullable) — optional link to a tuition_plan, budget, or goal
- `linked_type` (text, nullable) — 'tuition_plan', 'goal', 'budget', 'transaction'
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on all three tables.
- Full CRUD scoped to owner via user_id = auth.uid().
- Owner columns default to auth.uid() so inserts that omit user_id succeed.
- 4 separate policies per table (SELECT, INSERT, UPDATE, DELETE) — no FOR ALL.

## Important Notes
1. tuition_plans stores the original currency permanently — consistent with the multi-currency design rule.
2. budgets track monthly caps; the app compares actual spending (from transactions) against these caps.
3. reminders can link to other entities via linked_id + linked_type, so alerts connect to relevant entries.
4. The schema supports future phases (recurring transactions, notifications) without a rewrite.
*/

-- ============================================================================
-- TUITION PLANS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tuition_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  amount_total numeric(14,2) NOT NULL,
  amount_saved numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  deadline date NOT NULL,
  period_type text NOT NULL DEFAULT 'semester' CHECK (period_type IN ('semester', 'annual')),
  is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tuition_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tuition_plans" ON tuition_plans;
CREATE POLICY "select_own_tuition_plans" ON tuition_plans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tuition_plans" ON tuition_plans;
CREATE POLICY "insert_own_tuition_plans" ON tuition_plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tuition_plans" ON tuition_plans;
CREATE POLICY "update_own_tuition_plans" ON tuition_plans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tuition_plans" ON tuition_plans;
CREATE POLICY "delete_own_tuition_plans" ON tuition_plans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- BUDGETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  limit_amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  is_recurring boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_budgets" ON budgets;
CREATE POLICY "select_own_budgets" ON budgets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_budgets" ON budgets;
CREATE POLICY "insert_own_budgets" ON budgets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_budgets" ON budgets;
CREATE POLICY "update_own_budgets" ON budgets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_budgets" ON budgets;
CREATE POLICY "delete_own_budgets" ON budgets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- REMINDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  reminder_type text NOT NULL DEFAULT 'bill' CHECK (reminder_type IN ('tuition', 'bill', 'savings_milestone', 'repayment')),
  due_date date NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  linked_id uuid,
  linked_type text CHECK (linked_type IS NULL OR linked_type IN ('tuition_plan', 'goal', 'budget', 'transaction')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reminders" ON reminders;
CREATE POLICY "select_own_reminders" ON reminders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reminders" ON reminders;
CREATE POLICY "insert_own_reminders" ON reminders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reminders" ON reminders;
CREATE POLICY "update_own_reminders" ON reminders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reminders" ON reminders;
CREATE POLICY "delete_own_reminders" ON reminders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tuition_plans_user_id ON tuition_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_tuition_plans_deadline ON tuition_plans(deadline);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);

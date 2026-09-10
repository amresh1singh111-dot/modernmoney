import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTransactions, useGoals, useExchangeRates, useTuitionPlans, useBudgets } from '@/hooks/useData';
import { convertCurrency, formatCurrency, formatCurrencyWithCode } from '@/lib/currency';
import { ProgressBar, EmptyState } from '@/components/ui';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  ArrowDownCircle,
  ArrowUpCircle,
  GraduationCap,
  Calendar,
  PiggyBank,
  Home,
  AlertTriangle,
  Check,
  Bell,
} from 'lucide-react';
import type { Transaction, Goal } from '@/lib/types';

export function DashboardScreen() {
  const { profile } = useAuth();
  const { transactions, loading: txLoading } = useTransactions();
  const { goals, loading: goalsLoading } = useGoals();
  const { tuitionPlans, loading: tuitionLoading } = useTuitionPlans();
  const { budgets, loading: budgetLoading } = useBudgets();
  const rateData = useExchangeRates();

  const displayCurrency = profile?.display_currency ?? 'USD';
  const mode = profile?.mode ?? 'home';

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    let totalIncome = 0;
    let totalExpenses = 0;
    let monthIncome = 0;
    let monthExpenses = 0;
    let lastMonthIncome = 0;
    let lastMonthExpenses = 0;

    const byCategory: Record<string, { name: string; color: string; amount: number; icon: string }> = {};

    for (const tx of transactions) {
      const converted = convertCurrency(
        tx.amount_original,
        tx.currency_original,
        displayCurrency,
        rateData.rates,
      );
      totalIncome += tx.type === 'income' ? converted : 0;
      totalExpenses += tx.type === 'expense' ? converted : 0;

      const txDate = new Date(tx.transaction_date);
      if (txDate >= startOfMonth) {
        if (tx.type === 'income') monthIncome += converted;
        else {
          monthExpenses += converted;
          const catName = tx.category?.name ?? 'Uncategorized';
          const catColor = tx.category?.color ?? '#64748b';
          const catIcon = tx.category?.icon ?? 'CircleEllipsis';
          if (!byCategory[catName]) {
            byCategory[catName] = { name: catName, color: catColor, amount: 0, icon: catIcon };
          }
          byCategory[catName].amount += converted;
        }
      }

      if (txDate >= startOfLastMonth && txDate <= endOfLastMonth) {
        if (tx.type === 'income') lastMonthIncome += converted;
        else lastMonthExpenses += converted;
      }
    }

    const available = totalIncome - totalExpenses;
    const monthNet = monthIncome - monthExpenses;
    const lastMonthNet = lastMonthIncome - lastMonthExpenses;

    const categoryList = Object.values(byCategory).sort((a, b) => b.amount - a.amount);

    return {
      available,
      totalIncome,
      totalExpenses,
      monthIncome,
      monthExpenses,
      monthNet,
      lastMonthNet,
      lastMonthIncome,
      lastMonthExpenses,
      categoryList,
    };
  }, [transactions, displayCurrency, rateData.rates]);

  const recentTransactions = useMemo(
    () => transactions.slice(0, 6),
    [transactions],
  );

  const activeGoals = useMemo(
    () => goals.filter((g) => !g.is_completed).slice(0, 3),
    [goals],
  );

  // Student mode: tuition summary
  const tuitionSummary = useMemo(() => {
    const unpaid = tuitionPlans.filter((p) => !p.is_paid);
    const totalRequired = unpaid.reduce(
      (sum, p) => sum + convertCurrency(p.amount_total, p.currency, displayCurrency, rateData.rates),
      0,
    );
    const totalSaved = unpaid.reduce(
      (sum, p) => sum + convertCurrency(p.amount_saved, p.currency, displayCurrency, rateData.rates),
      0,
    );
    const totalGap = Math.max(0, totalRequired - totalSaved);
    const nextDeadline = unpaid
      .map((p) => ({ plan: p, days: Math.ceil((new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) }))
      .sort((a, b) => a.days - b.days)[0];
    return { totalRequired, totalSaved, totalGap, nextDeadline };
  }, [tuitionPlans, displayCurrency, rateData.rates]);

  // Student mode: living expense budget health
  const budgetHealth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const spending: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      if (new Date(tx.transaction_date) < startOfMonth) continue;
      const catName = tx.category?.name ?? 'Uncategorized';
      const converted = convertCurrency(tx.amount_original, tx.currency_original, displayCurrency, rateData.rates);
      spending[catName] = (spending[catName] ?? 0) + converted;
    }
    return budgets.map((b) => {
      const limit = convertCurrency(b.limit_amount, b.currency, displayCurrency, rateData.rates);
      const spent = spending[b.category_name] ?? 0;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      return {
        name: b.category_name,
        limit,
        spent,
        pct,
        status: spent > limit ? 'over' : pct >= 80 ? 'close' : 'ok',
      };
    });
  }, [budgets, transactions, displayCurrency, rateData.rates]);

  if (txLoading || goalsLoading || tuitionLoading || budgetLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasData = transactions.length > 0 || goals.length > 0 || tuitionPlans.length > 0 || budgets.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon={<Wallet size={32} />}
        title="Welcome to your financial dashboard"
        message={mode === 'student'
          ? "Once you start logging income, expenses, tuition plans, and savings goals, this is where you'll see your available money, tuition gap, living expense budget health, and goal progress — all at a glance."
          : "Once you start logging income, expenses, and savings goals, this is where you'll see your available money, spending breakdown, and goal progress — all at a glance."}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Mode badge */}
      <div className="flex items-center gap-2 text-sm text-muted">
        {mode === 'student' ? <GraduationCap size={16} /> : <Wallet size={16} />}
        {mode === 'student' ? 'International Student Mode' : 'Home Country Mode'}
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Available Money"
          value={formatCurrency(stats.available, displayCurrency)}
          icon={<Wallet size={20} />}
          color="primary"
        />
        <StatCard
          label="Income (This Month)"
          value={formatCurrency(stats.monthIncome, displayCurrency)}
          icon={<TrendingUp size={20} />}
          color="accent"
        />
        <StatCard
          label="Spent (This Month)"
          value={formatCurrency(stats.monthExpenses, displayCurrency)}
          icon={<TrendingDown size={20} />}
          color="danger"
        />
        <StatCard
          label="Net (This Month)"
          value={formatCurrency(stats.monthNet, displayCurrency)}
          icon={stats.monthNet >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          color={stats.monthNet >= 0 ? 'accent' : 'danger'}
        />
      </div>

      {/* Month comparison */}
      {stats.lastMonthNet !== 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-muted mb-2">
            <Calendar size={16} />
            Month-over-month comparison
          </div>
          <div className="flex flex-wrap gap-6">
            <ComparisonStat
              label="Income"
              current={stats.monthIncome}
              previous={stats.lastMonthIncome}
              currency={displayCurrency}
              positiveIsGood
            />
            <ComparisonStat
              label="Spending"
              current={stats.monthExpenses}
              previous={stats.lastMonthExpenses}
              currency={displayCurrency}
              positiveIsGood={false}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by category */}
        <div className="card p-6">
          <h3 className="font-bold font-display mb-4">Spending by Category</h3>
          {stats.categoryList.length === 0 ? (
            <p className="text-muted text-sm">No expenses logged this month yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.categoryList.map((cat) => {
                const pct = stats.monthExpenses > 0 ? (cat.amount / stats.monthExpenses) * 100 : 0;
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-muted">
                        {formatCurrency(cat.amount, displayCurrency)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <ProgressBar value={cat.amount} max={stats.monthExpenses} color={cat.color} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Goals overview */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold font-display">Goals</h3>
            <PiggyBank size={18} className="text-muted" />
          </div>
          {activeGoals.length === 0 ? (
            <p className="text-muted text-sm">No active savings goals yet.</p>
          ) : (
            <div className="space-y-4">
              {activeGoals.map((goal) => (
                <GoalMiniCard key={goal.id} goal={goal} displayCurrency={displayCurrency} rates={rateData.rates} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Student mode: Tuition section */}
      {mode === 'student' && tuitionPlans.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold font-display">Tuition Overview</h3>
            <GraduationCap size={18} className="text-muted" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-xs text-muted">Total Required</div>
              <div className="text-lg font-bold">{formatCurrency(tuitionSummary.totalRequired, displayCurrency)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Saved So Far</div>
              <div className="text-lg font-bold text-accent-600 dark:text-accent-400">{formatCurrency(tuitionSummary.totalSaved, displayCurrency)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Remaining Gap</div>
              <div className="text-lg font-bold text-warning-600 dark:text-warning-400">{formatCurrency(tuitionSummary.totalGap, displayCurrency)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Next Deadline</div>
              <div className="text-lg font-bold">
                {tuitionSummary.nextDeadline
                  ? `${tuitionSummary.nextDeadline.days >= 0 ? tuitionSummary.nextDeadline.days : 0}d`
                  : '—'}
              </div>
            </div>
          </div>
          {tuitionSummary.nextDeadline && (
            <div className="flex items-center gap-2 text-sm">
              {tuitionSummary.nextDeadline.days < 0 ? (
                <span className="flex items-center gap-1 text-danger-600 dark:text-danger-400">
                  <AlertTriangle size={14} /> {tuitionSummary.nextDeadline.plan.label} is overdue
                </span>
              ) : tuitionSummary.nextDeadline.days <= 30 ? (
                <span className="flex items-center gap-1 text-warning-600 dark:text-warning-400">
                  <AlertTriangle size={14} /> {tuitionSummary.nextDeadline.plan.label} due in {tuitionSummary.nextDeadline.days} days
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted">
                  <Calendar size={14} /> {tuitionSummary.nextDeadline.plan.label} due {new Date(tuitionSummary.nextDeadline.plan.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Student mode: Living expense budget health */}
      {mode === 'student' && budgetHealth.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold font-display">Budget Health</h3>
            <Home size={18} className="text-muted" />
          </div>
          <div className="space-y-3">
            {budgetHealth.map((b) => (
              <div key={b.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    {b.status === 'over' ? (
                      <AlertTriangle size={14} className="text-danger-500" />
                    ) : b.status === 'close' ? (
                      <AlertTriangle size={14} className="text-warning-500" />
                    ) : (
                      <Check size={14} className="text-accent-500" />
                    )}
                    <span className="font-medium">{b.name}</span>
                  </div>
                  <span className={`text-muted ${b.status === 'over' ? 'text-danger-600 dark:text-danger-400 font-semibold' : b.status === 'close' ? 'text-warning-600 dark:text-warning-400 font-semibold' : ''}`}>
                    {formatCurrency(b.spent, displayCurrency)} / {formatCurrency(b.limit, displayCurrency)}
                  </span>
                </div>
                <ProgressBar
                  value={b.spent}
                  max={b.limit}
                  color={b.status === 'over' ? '#ef4444' : b.status === 'close' ? '#f59e0b' : '#22c55e'}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="card p-6">
        <h3 className="font-bold font-display mb-4">Recent Activity</h3>
        {recentTransactions.length === 0 ? (
          <p className="text-muted text-sm">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} displayCurrency={displayCurrency} rates={rateData.rates} />
            ))}
          </div>
        )}
      </div>

      {/* Rates note */}
      <p className="text-xs text-muted text-center">
        Exchange rates as of {rateData.date}. Converted values use {' '}
        {rateData.source === 'live' ? 'live' : 'reference'} rates and are for display only —
        your original transaction amounts are never modified.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'primary' | 'accent' | 'danger' | 'warning';
}) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
    accent: 'bg-accent-50 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400',
    danger: 'bg-danger-50 text-danger-600 dark:bg-danger-900/20 dark:text-danger-400',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-900/20 dark:text-warning-400',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted font-medium">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold font-display">{value}</div>
    </div>
  );
}

function ComparisonStat({
  label,
  current,
  previous,
  currency,
  positiveIsGood,
}: {
  label: string;
  current: number;
  previous: number;
  currency: string;
  positiveIsGood: boolean;
}) {
  if (previous === 0) return null;
  const delta = current - previous;
  const pctChange = (delta / previous) * 100;
  const isPositive = delta >= 0;
  const isGood = positiveIsGood ? isPositive : !isPositive;
  return (
    <div>
      <div className="text-sm text-muted">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold">{formatCurrency(current, currency)}</span>
        <span className={`text-sm font-semibold ${isGood ? 'text-accent-600 dark:text-accent-400' : 'text-danger-600 dark:text-danger-400'}`}>
          {isPositive ? '+' : ''}{pctChange.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function GoalMiniCard({ goal, displayCurrency, rates }: { goal: Goal; displayCurrency: string; rates: Record<string, number> }) {
  const target = convertCurrency(goal.target_amount, goal.currency, displayCurrency, rates);
  const saved = convertCurrency(goal.saved_amount, goal.currency, displayCurrency, rates);
  const pct = target > 0 ? (saved / target) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <div className="flex items-center gap-2">
          <Target size={14} style={{ color: goal.color ?? '#3b82f6' }} />
          <span className="font-medium">{goal.name}</span>
        </div>
        <span className="text-muted">
          {formatCurrency(saved, displayCurrency)} / {formatCurrency(target, displayCurrency)}
        </span>
      </div>
      <ProgressBar value={saved} max={target} color={goal.color ?? '#3b82f6'} />
      <div className="text-xs text-muted mt-1">{pct.toFixed(0)}% complete</div>
    </div>
  );
}

function TransactionRow({ tx, displayCurrency, rates }: { tx: Transaction; displayCurrency: string; rates: Record<string, number> }) {
  const converted = convertCurrency(tx.amount_original, tx.currency_original, displayCurrency, rates);
  const isIncome = tx.type === 'income';
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            isIncome
              ? 'bg-accent-50 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400'
              : 'bg-danger-50 text-danger-600 dark:bg-danger-900/20 dark:text-danger-400'
          }`}
        >
          {isIncome ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
        </div>
        <div>
          <div className="text-sm font-medium">
            {tx.description ?? tx.category?.name ?? (isIncome ? 'Income' : 'Expense')}
          </div>
          <div className="text-xs text-muted">
            {new Date(tx.transaction_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            {tx.location ? ` · ${tx.location}` : ''}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-semibold ${isIncome ? 'text-accent-600 dark:text-accent-400' : ''}`}>
          {isIncome ? '+' : '-'}{formatCurrency(converted, displayCurrency)}
        </div>
        {tx.currency_original !== displayCurrency && (
          <div className="text-xs text-muted">
            {formatCurrencyWithCode(tx.amount_original, tx.currency_original)}
          </div>
        )}
      </div>
    </div>
  );
}

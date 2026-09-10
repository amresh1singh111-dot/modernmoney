import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBudgets, useTransactions, useExchangeRates } from '@/hooks/useData';
import { convertCurrency, formatCurrency, CURRENCIES } from '@/lib/currency';
import { Modal, EmptyState, ConfirmDialog, ProgressBar } from '@/components/ui';
import {
  Plus,
  Trash2,
  Home,
  UtensilsCrossed,
  Bus,
  Smartphone,
  Zap,
  Loader2,
  Check,
  AlertTriangle,
  CircleEllipsis,
} from 'lucide-react';
import type { Budget, Transaction } from '@/lib/types';

const LIVING_CATEGORIES = [
  { name: 'Rent', icon: 'Home', color: '#3b82f6' },
  { name: 'Food', icon: 'UtensilsCrossed', color: '#f97316' },
  { name: 'Transport', icon: 'Bus', color: '#10b981' },
  { name: 'Phone', icon: 'Smartphone', color: '#a855f7' },
  { name: 'Utilities', icon: 'Zap', color: '#f59e0b' },
];

export function LivingExpensesScreen() {
  const { profile } = useAuth();
  const { budgets, addBudget, updateBudget, deleteBudget, loading: budgetLoading } = useBudgets();
  const { transactions, loading: txLoading } = useTransactions();
  const rateData = useExchangeRates();
  const displayCurrency = profile?.display_currency ?? 'USD';

  const [showAdd, setShowAdd] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [categoryName, setCategoryName] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [currency, setCurrency] = useState(displayCurrency);
  const [isCustom, setIsCustom] = useState(false);

  const resetForm = () => {
    setCategoryName('');
    setLimitAmount('');
    setCurrency(displayCurrency);
    setIsCustom(false);
    setError(null);
  };

  // Current month spending by category
  const monthSpending = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const spending: Record<string, number> = {};

    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const txDate = new Date(tx.transaction_date);
      if (txDate < startOfMonth) continue;

      const catName = tx.category?.name ?? 'Uncategorized';
      const converted = convertCurrency(tx.amount_original, tx.currency_original, displayCurrency, rateData.rates);
      spending[catName] = (spending[catName] ?? 0) + converted;
    }
    return spending;
  }, [transactions, displayCurrency, rateData.rates]);

  // Total budget and total spent
  const totalBudget = useMemo(() => {
    return budgets.reduce(
      (sum, b) => sum + convertCurrency(b.limit_amount, b.currency, displayCurrency, rateData.rates),
      0,
    );
  }, [budgets, displayCurrency, rateData.rates]);

  const totalSpent = useMemo(() => {
    return budgets.reduce((sum, b) => {
      const spent = monthSpending[b.category_name] ?? 0;
      return sum + Math.min(spent, convertCurrency(b.limit_amount, b.currency, displayCurrency, rateData.rates));
    }, 0);
  }, [budgets, monthSpending, displayCurrency, rateData.rates]);

  const actualSpent = useMemo(() => {
    return budgets.reduce((sum, b) => sum + (monthSpending[b.category_name] ?? 0), 0);
  }, [budgets, monthSpending]);

  const handleSave = async () => {
    setError(null);
    const amt = parseFloat(limitAmount);
    if (!categoryName.trim()) { setError('Enter a category name'); return; }
    if (!amt || amt <= 0) { setError('Enter a valid budget limit'); return; }
    setFormLoading(true);

    if (editBudget) {
      const { error: updateError } = await updateBudget(editBudget.id, {
        category_name: categoryName.trim(),
        limit_amount: amt,
        currency,
      });
      setFormLoading(false);
      if (updateError) { setError(updateError); return; }
      setEditBudget(null);
    } else {
      const { error: addError } = await addBudget({
        category_name: categoryName.trim(),
        limit_amount: amt,
        currency,
      });
      setFormLoading(false);
      if (addError) { setError(addError); return; }
    }
    resetForm();
    setShowAdd(false);
  };

  const openEdit = (budget: Budget) => {
    setEditBudget(budget);
    setCategoryName(budget.category_name);
    setLimitAmount(String(budget.limit_amount));
    setCurrency(budget.currency);
    setIsCustom(!LIVING_CATEGORIES.some((c) => c.name === budget.category_name));
    setShowAdd(true);
  };

  if (budgetLoading || txLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total Monthly Budget" value={formatCurrency(totalBudget, displayCurrency)} icon={<Home size={20} />} color="primary" />
        <SummaryCard label="Spent This Month" value={formatCurrency(actualSpent, displayCurrency)} icon={<UtensilsCrossed size={20} />} color={actualSpent > totalBudget ? 'danger' : 'accent'} />
        <SummaryCard label="Remaining" value={formatCurrency(Math.max(0, totalBudget - actualSpent), displayCurrency)} icon={<Check size={20} />} color="accent" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-display">Living Expense Budgets</h2>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <EmptyState
          icon={<Home size={32} />}
          title="No living expense budgets yet"
          message="Set monthly caps for rent, food, transport, phone, utilities, and any custom categories. The app compares your actual spending against these caps and warns you when you're close to or over the limit."
          action={
            <button onClick={() => { resetForm(); setShowAdd(true); }} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Set your first budget
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const limit = convertCurrency(budget.limit_amount, budget.currency, displayCurrency, rateData.rates);
            const spent = monthSpending[budget.category_name] ?? 0;
            const pct = limit > 0 ? (spent / limit) * 100 : 0;
            const isOver = spent > limit;
            const isClose = !isOver && pct >= 80;
            const catConfig = LIVING_CATEGORIES.find((c) => c.name === budget.category_name);
            const color = catConfig?.color ?? '#64748b';

            return (
              <div key={budget.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
                      <CategoryIcon name={catConfig?.icon} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{budget.category_name}</div>
                      <div className="text-xs text-muted">
                        Budget: {formatCurrency(limit, displayCurrency)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${isOver ? 'text-danger-600 dark:text-danger-400' : isClose ? 'text-warning-600 dark:text-warning-400' : ''}`}>
                        {formatCurrency(spent, displayCurrency)}
                      </div>
                      <div className="text-xs text-muted">{pct.toFixed(0)}% used</div>
                    </div>
                    <button onClick={() => openEdit(budget)} className="btn-ghost text-sm">Edit</button>
                    <button onClick={() => setDeleteId(budget.id)} className="btn-ghost text-danger-500 hover:text-danger-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <ProgressBar value={spent} max={limit} color={isOver ? '#ef4444' : isClose ? '#f59e0b' : color} />
                {isOver && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-danger-600 dark:text-danger-400">
                    <AlertTriangle size={14} /> Over budget by {formatCurrency(spent - limit, displayCurrency)}
                  </div>
                )}
                {isClose && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-warning-600 dark:text-warning-400">
                    <AlertTriangle size={14} /> Approaching limit — {formatCurrency(limit - spent, displayCurrency)} left
                  </div>
                )}
                {!isOver && !isClose && pct > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted">
                    <Check size={14} /> On track — {formatCurrency(limit - spent, displayCurrency)} remaining
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditBudget(null); resetForm(); }}
        title={editBudget ? 'Edit Budget' : 'Add Budget'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            {!isCustom ? (
              <div className="grid grid-cols-3 gap-2">
                {LIVING_CATEGORIES.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setCategoryName(c.name)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      categoryName === c.name
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${c.color}20`, color: c.color }}>
                      <CategoryIcon name={c.icon} />
                    </div>
                    <span className="text-xs font-medium">{c.name}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setIsCustom(true); setCategoryName(''); }}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary-400 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-muted">
                    <CircleEllipsis size={16} />
                  </div>
                  <span className="text-xs font-medium text-muted">Custom</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  className="input-field"
                />
                <button onClick={() => { setIsCustom(false); setCategoryName(''); }} className="text-sm text-primary-600 dark:text-primary-400">
                  Use preset categories
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Monthly Limit</label>
              <input
                type="number"
                step="0.01"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                placeholder="0.00"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-field">
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <button onClick={handleSave} disabled={formLoading} className="btn-primary w-full flex items-center justify-center gap-2">
            {formLoading && <Loader2 size={18} className="animate-spin" />}
            {editBudget ? 'Update Budget' : 'Add Budget'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteBudget(deleteId)}
        title="Delete budget"
        message="This will remove the monthly budget cap for this category. Your transactions will not be affected."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'primary' | 'accent' | 'warning' | 'danger';
}) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
    accent: 'bg-accent-50 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-900/20 dark:text-warning-400',
    danger: 'bg-danger-50 text-danger-600 dark:bg-danger-900/20 dark:text-danger-400',
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

function CategoryIcon({ name }: { name?: string }) {
  const icons: Record<string, React.ReactNode> = {
    Home: <Home size={18} />,
    UtensilsCrossed: <UtensilsCrossed size={18} />,
    Bus: <Bus size={18} />,
    Smartphone: <Smartphone size={18} />,
    Zap: <Zap size={18} />,
  };
  return icons[name ?? ''] ?? <CircleEllipsis size={18} />;
}

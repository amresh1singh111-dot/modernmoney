import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTuitionPlans, useExchangeRates, useTransactions } from '@/hooks/useData';
import { convertCurrency, formatCurrency, CURRENCIES } from '@/lib/currency';
import { Modal, EmptyState, ConfirmDialog, ProgressBar } from '@/components/ui';
import {
  Plus,
  Trash2,
  GraduationCap,
  Loader2,
  Calendar,
  AlertTriangle,
  Check,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import type { TuitionPlan } from '@/lib/types';

export function TuitionScreen() {
  const { profile } = useAuth();
  const { tuitionPlans, addTuitionPlan, updateTuitionPlan, deleteTuitionPlan, loading } = useTuitionPlans();
  const { transactions } = useTransactions();
  const rateData = useExchangeRates();
  const displayCurrency = profile?.display_currency ?? 'USD';

  const [showAdd, setShowAdd] = useState(false);
  const [contributePlan, setContributePlan] = useState<TuitionPlan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [label, setLabel] = useState('');
  const [amountTotal, setAmountTotal] = useState('');
  const [amountSaved, setAmountSaved] = useState('');
  const [currency, setCurrency] = useState(displayCurrency);
  const [deadline, setDeadline] = useState('');
  const [periodType, setPeriodType] = useState<'semester' | 'annual'>('semester');

  // Contribute form
  const [contributeAmount, setContributeAmount] = useState('');

  const resetAddForm = () => {
    setLabel('');
    setAmountTotal('');
    setAmountSaved('');
    setCurrency(displayCurrency);
    setDeadline('');
    setPeriodType('semester');
    setError(null);
  };

  // Compute available money (income - expenses) in display currency
  const availableMoney = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const tx of transactions) {
      const converted = convertCurrency(tx.amount_original, tx.currency_original, displayCurrency, rateData.rates);
      if (tx.type === 'income') income += converted;
      else expenses += converted;
    }
    return income - expenses;
  }, [transactions, displayCurrency, rateData.rates]);

  // Total tuition gap across all plans
  const totalGap = useMemo(() => {
    return tuitionPlans.reduce((sum, plan) => {
      if (plan.is_paid) return sum;
      const total = convertCurrency(plan.amount_total, plan.currency, displayCurrency, rateData.rates);
      const saved = convertCurrency(plan.amount_saved, plan.currency, displayCurrency, rateData.rates);
      return sum + Math.max(0, total - saved);
    }, 0);
  }, [tuitionPlans, displayCurrency, rateData.rates]);

  // Auto-allocation: how much of available money should go to tuition
  const autoAllocation = useMemo(() => {
    if (totalGap <= 0) return 0;
    return Math.min(availableMoney, totalGap);
  }, [totalGap, availableMoney]);

  const handleAdd = async () => {
    setError(null);
    const total = parseFloat(amountTotal);
    const saved = parseFloat(amountSaved) || 0;
    if (!label.trim()) { setError('Enter a label'); return; }
    if (!total || total <= 0) { setError('Enter a valid total amount'); return; }
    if (!deadline) { setError('Pick a deadline'); return; }
    setFormLoading(true);
    const { error: planError } = await addTuitionPlan({
      label: label.trim(),
      amount_total: total,
      amount_saved: saved,
      currency,
      deadline,
      period_type: periodType,
    });
    setFormLoading(false);
    if (planError) { setError(planError); return; }
    resetAddForm();
    setShowAdd(false);
  };

  const handleContribute = async () => {
    if (!contributePlan) return;
    setError(null);
    const amt = parseFloat(contributeAmount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    setFormLoading(true);
    const newSaved = contributePlan.amount_saved + amt;
    const isPaid = newSaved >= contributePlan.amount_total;
    const { error: updateError } = await updateTuitionPlan(contributePlan.id, {
      amount_saved: newSaved,
      is_paid: isPaid,
    });
    setFormLoading(false);
    if (updateError) { setError(updateError); return; }
    setContributePlan(null);
    setContributeAmount('');
  };

  const daysUntil = (deadline: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dl = new Date(deadline);
    const diff = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Available Money"
          value={formatCurrency(availableMoney, displayCurrency)}
          icon={<Wallet size={20} />}
          color="primary"
        />
        <SummaryCard
          label="Total Tuition Gap"
          value={formatCurrency(totalGap, displayCurrency)}
          icon={<AlertTriangle size={20} />}
          color={totalGap > 0 ? 'warning' : 'accent'}
        />
        <SummaryCard
          label="Auto-Allocation Suggested"
          value={formatCurrency(autoAllocation, displayCurrency)}
          icon={<TrendingUp size={20} />}
          color="accent"
        />
      </div>

      {autoAllocation > 0 && (
        <div className="card p-4 bg-accent-50 dark:bg-accent-900/10 border-accent-200 dark:border-accent-800">
          <div className="flex items-start gap-3">
            <TrendingUp size={18} className="text-accent-600 dark:text-accent-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-accent-800 dark:text-accent-300">
                Automatic Budget Allocation
              </p>
              <p className="text-sm text-accent-700 dark:text-accent-400 mt-0.5">
                Based on your available money and tuition obligations, set aside{' '}
                <span className="font-bold">{formatCurrency(autoAllocation, displayCurrency)}</span> for tuition.
                This leaves you{' '}
                <span className="font-bold">{formatCurrency(Math.max(0, availableMoney - autoAllocation), displayCurrency)}</span> for living expenses.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-display">Tuition Plans</h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Tuition Plan
        </button>
      </div>

      {tuitionPlans.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={32} />}
          title="No tuition plans yet"
          message="Add your semester or annual tuition fees with payment deadlines. The app will track how much you've saved, compute the remaining gap, and suggest how much to set aside automatically."
          action={
            <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Add your first tuition plan
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tuitionPlans.map((plan) => (
            <TuitionCard
              key={plan.id}
              plan={plan}
              displayCurrency={displayCurrency}
              rates={rateData.rates}
              onContribute={() => setContributePlan(plan)}
              onDelete={() => setDeleteId(plan.id)}
              daysUntil={daysUntil(plan.deadline)}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetAddForm(); }} title="Add Tuition Plan">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Fall 2026 Semester"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Period</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as 'semester' | 'annual')}
                className="input-field"
              >
                <option value="semester">Semester</option>
                <option value="annual">Annual</option>
              </select>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Total Fee</label>
              <input
                type="number"
                step="0.01"
                value={amountTotal}
                onChange={(e) => setAmountTotal(e.target.value)}
                placeholder="0.00"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Already Saved</label>
              <input
                type="number"
                step="0.01"
                value={amountSaved}
                onChange={(e) => setAmountSaved(e.target.value)}
                placeholder="0.00"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Payment Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input-field"
            />
          </div>

          {error && (
            <div className="text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <button onClick={handleAdd} disabled={formLoading} className="btn-primary w-full flex items-center justify-center gap-2">
            {formLoading && <Loader2 size={18} className="animate-spin" />}
            Add Tuition Plan
          </button>
        </div>
      </Modal>

      {/* Contribute Modal */}
      <Modal
        open={!!contributePlan}
        onClose={() => { setContributePlan(null); setContributeAmount(''); setError(null); }}
        title={`Record Payment: ${contributePlan?.label ?? ''}`}
      >
        <div className="space-y-4">
          {contributePlan && (
            <div className="card p-4 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted">Saved so far</span>
                <span className="font-semibold">
                  {formatCurrency(
                    convertCurrency(contributePlan.amount_saved, contributePlan.currency, displayCurrency, rateData.rates),
                    displayCurrency,
                  )}{' / '}
                  {formatCurrency(
                    convertCurrency(contributePlan.amount_total, contributePlan.currency, displayCurrency, rateData.rates),
                    displayCurrency,
                  )}
                </span>
              </div>
              <ProgressBar
                value={convertCurrency(contributePlan.amount_saved, contributePlan.currency, displayCurrency, rateData.rates)}
                max={convertCurrency(contributePlan.amount_total, contributePlan.currency, displayCurrency, rateData.rates)}
                color="#6366f1"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Payment Amount</label>
            <input
              type="number"
              step="0.01"
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              placeholder="0.00"
              className="input-field"
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <button onClick={handleContribute} disabled={formLoading} className="btn-primary w-full flex items-center justify-center gap-2">
            {formLoading && <Loader2 size={18} className="animate-spin" />}
            Record Payment
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteTuitionPlan(deleteId)}
        title="Delete tuition plan"
        message="This will permanently delete this tuition plan. This cannot be undone."
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

function TuitionCard({
  plan,
  displayCurrency,
  rates,
  onContribute,
  onDelete,
  daysUntil,
}: {
  plan: TuitionPlan;
  displayCurrency: string;
  rates: Record<string, number>;
  onContribute: () => void;
  onDelete: () => void;
  daysUntil: number;
}) {
  const total = convertCurrency(plan.amount_total, plan.currency, displayCurrency, rates);
  const saved = convertCurrency(plan.amount_saved, plan.currency, displayCurrency, rates);
  const gap = Math.max(0, total - saved);
  const pct = total > 0 ? Math.min(100, (saved / total) * 100) : 0;
  const isPaid = plan.is_paid;
  const isUrgent = !isPaid && daysUntil <= 30 && daysUntil >= 0;
  const isOverdue = !isPaid && daysUntil < 0;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="font-semibold">{plan.label}</div>
            <div className="text-xs text-muted capitalize">{plan.period_type}</div>
          </div>
        </div>
        {isPaid ? (
          <div className="flex items-center gap-1 text-accent-600 dark:text-accent-400 text-sm font-semibold">
            <Check size={16} /> Paid
          </div>
        ) : isOverdue ? (
          <div className="flex items-center gap-1 text-danger-600 dark:text-danger-400 text-sm font-semibold">
            <AlertTriangle size={16} /> Overdue
          </div>
        ) : isUrgent ? (
          <div className="flex items-center gap-1 text-warning-600 dark:text-warning-400 text-sm font-semibold">
            <AlertTriangle size={16} /> {daysUntil}d left
          </div>
        ) : (
          <div className="flex items-center gap-1 text-muted text-sm">
            <Calendar size={14} /> {daysUntil}d left
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-semibold">{formatCurrency(saved, displayCurrency)}</span>
        <span className="text-muted">{formatCurrency(total, displayCurrency)}</span>
      </div>
      <ProgressBar value={saved} max={total} color="#6366f1" />

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted">{pct.toFixed(0)}% saved</span>
        {!isPaid && gap > 0 && (
          <span className="text-xs text-muted">Gap: {formatCurrency(gap, displayCurrency)}</span>
        )}
      </div>

      <div className="text-xs text-muted mt-2">
        Deadline: {new Date(plan.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>

      <div className="flex gap-2 mt-4">
        {!isPaid && (
          <button onClick={onContribute} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
            <Plus size={16} /> Record Payment
          </button>
        )}
        <button onClick={onDelete} className="btn-secondary text-sm text-danger-500 hover:text-danger-600">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

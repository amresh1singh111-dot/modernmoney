import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useGoals, useExchangeRates } from '@/hooks/useData';
import { convertCurrency, formatCurrency, CURRENCIES } from '@/lib/currency';
import { Modal, EmptyState, ConfirmDialog, ProgressBar } from '@/components/ui';
import { Plus, Trash2, Target, PiggyBank, Loader2, Check, TrendingUp } from 'lucide-react';
import type { Goal } from '@/lib/types';

const GOAL_SUGGESTIONS = [
  { name: 'Emergency Fund', icon: 'ShieldCheck', color: '#10b981' },
  { name: 'New Laptop', icon: 'Laptop', color: '#3b82f6' },
  { name: 'Travel', icon: 'Plane', color: '#f59e0b' },
  { name: 'Tuition', icon: 'GraduationCap', color: '#6366f1' },
  { name: 'Money to Send Home', icon: 'Send', color: '#ec4899' },
  { name: 'Custom Goal', icon: 'Target', color: '#64748b' },
];

export function GoalsScreen() {
  const { profile } = useAuth();
  const { goals, addGoal, deleteGoal, contributeToGoal, loading } = useGoals();
  const rateData = useExchangeRates();
  const displayCurrency = profile?.display_currency ?? 'USD';

  const [showAdd, setShowAdd] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currency, setCurrency] = useState(displayCurrency);
  const [targetDate, setTargetDate] = useState('');
  const [suggestion, setSuggestion] = useState<typeof GOAL_SUGGESTIONS[0] | null>(null);

  // Contribute form
  const [contributeAmount, setContributeAmount] = useState('');

  const resetAddForm = () => {
    setName('');
    setTargetAmount('');
    setCurrency(displayCurrency);
    setTargetDate('');
    setSuggestion(null);
    setError(null);
  };

  const handleAdd = async () => {
    setError(null);
    const amt = parseFloat(targetAmount);
    if (!name.trim()) {
      setError('Enter a goal name');
      return;
    }
    if (!amt || amt <= 0) {
      setError('Enter a valid target amount');
      return;
    }
    setFormLoading(true);
    const { error: goalError } = await addGoal({
      name: name.trim(),
      target_amount: amt,
      currency,
      target_date: targetDate || null,
      icon: suggestion?.icon ?? 'Target',
      color: suggestion?.color ?? '#3b82f6',
    });
    setFormLoading(false);
    if (goalError) {
      setError(goalError);
      return;
    }
    resetAddForm();
    setShowAdd(false);
  };

  const handleContribute = async () => {
    if (!contributeGoal) return;
    setError(null);
    const amt = parseFloat(contributeAmount);
    if (!amt || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setFormLoading(true);
    const { error: contribError } = await contributeToGoal(contributeGoal.id, amt);
    setFormLoading(false);
    if (contribError) {
      setError(contribError);
      return;
    }
    setContributeGoal(null);
    setContributeAmount('');
  };

  const totalSaved = useMemo(() => {
    return goals.reduce(
      (sum, g) => sum + convertCurrency(g.saved_amount, g.currency, displayCurrency, rateData.rates),
      0,
    );
  }, [goals, displayCurrency, rateData.rates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Total Saved Across Goals</p>
          <p className="text-3xl font-bold font-display mt-1">{formatCurrency(totalSaved, displayCurrency)}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> New Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={<PiggyBank size={32} />}
          title="No savings goals yet"
          message="Create digital piggy banks for the things you're saving toward — an emergency fund, a new laptop, travel, or money to send home. Set a target, contribute over time, and watch your progress grow."
          action={
            <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Create your first goal
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              displayCurrency={displayCurrency}
              rates={rateData.rates}
              onContribute={() => setContributeGoal(goal)}
              onDelete={() => setDeleteId(goal.id)}
            />
          ))}
        </div>
      )}

      {/* Add Goal Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetAddForm(); }} title="New Savings Goal">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Quick suggestions</label>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_SUGGESTIONS.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => {
                    setSuggestion(s);
                    setName(s.name);
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    suggestion?.name === s.name
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}20`, color: s.color }}>
                    <SuggestionIcon name={s.icon} />
                  </div>
                  <span className="text-xs font-medium text-center">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Goal name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Target amount</label>
              <input
                type="number"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
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

          <div>
            <label className="block text-sm font-medium mb-1.5">Target date (optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
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
            Create Goal
          </button>
        </div>
      </Modal>

      {/* Contribute Modal */}
      <Modal open={!!contributeGoal} onClose={() => { setContributeGoal(null); setContributeAmount(''); setError(null); }} title={`Contribute to ${contributeGoal?.name ?? ''}`}>
        <div className="space-y-4">
          {contributeGoal && (
            <div className="card p-4 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted">Current progress</span>
                <span className="font-semibold">
                  {formatCurrency(
                    convertCurrency(contributeGoal.saved_amount, contributeGoal.currency, displayCurrency, rateData.rates),
                    displayCurrency,
                  )}{' / '}
                  {formatCurrency(
                    convertCurrency(contributeGoal.target_amount, contributeGoal.currency, displayCurrency, rateData.rates),
                    displayCurrency,
                  )}
                </span>
              </div>
              <ProgressBar
                value={convertCurrency(contributeGoal.saved_amount, contributeGoal.currency, displayCurrency, rateData.rates)}
                max={convertCurrency(contributeGoal.target_amount, contributeGoal.currency, displayCurrency, rateData.rates)}
                color={contributeGoal.color ?? '#3b82f6'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Amount to add</label>
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
            <TrendingUp size={18} /> Add to Goal
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteGoal(deleteId)}
        title="Delete goal"
        message="This will permanently delete the goal and all its contribution history. This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function GoalCard({
  goal,
  displayCurrency,
  rates,
  onContribute,
  onDelete,
}: {
  goal: Goal;
  displayCurrency: string;
  rates: Record<string, number>;
  onContribute: () => void;
  onDelete: () => void;
}) {
  const target = convertCurrency(goal.target_amount, goal.currency, displayCurrency, rates);
  const saved = convertCurrency(goal.saved_amount, goal.currency, displayCurrency, rates);
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  const remaining = Math.max(0, target - saved);
  const isComplete = goal.is_completed || saved >= target;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${goal.color ?? '#3b82f6'}20`, color: goal.color ?? '#3b82f6' }}
          >
            <SuggestionIcon name={goal.icon ?? 'Target'} />
          </div>
          <div>
            <div className="font-semibold">{goal.name}</div>
            {goal.target_date && (
              <div className="text-xs text-muted">
                Target: {new Date(goal.target_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>
        {isComplete && (
          <div className="flex items-center gap-1 text-accent-600 dark:text-accent-400 text-sm font-semibold">
            <Check size={16} /> Done
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-semibold">{formatCurrency(saved, displayCurrency)}</span>
        <span className="text-muted">{formatCurrency(target, displayCurrency)}</span>
      </div>
      <ProgressBar value={saved} max={target} color={goal.color ?? '#3b82f6'} />

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted">{pct.toFixed(0)}% complete</span>
        {!isComplete && remaining > 0 && (
          <span className="text-xs text-muted">{formatCurrency(remaining, displayCurrency)} to go</span>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        {!isComplete && (
          <button onClick={onContribute} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
            <Plus size={16} /> Contribute
          </button>
        )}
        <button onClick={onDelete} className="btn-secondary text-sm text-danger-500 hover:text-danger-600">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function SuggestionIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    ShieldCheck: <Target size={18} />,
    Laptop: <Target size={18} />,
    Plane: <Target size={18} />,
    GraduationCap: <Target size={18} />,
    Send: <Target size={18} />,
    Target: <Target size={18} />,
    PiggyBank: <PiggyBank size={18} />,
  };
  return icons[name] ?? <Target size={18} />;
}

import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTransactions, useCategories, useExchangeRates } from '@/hooks/useData';
import { convertCurrency, formatCurrency, CURRENCIES } from '@/lib/currency';
import { Modal, EmptyState, ConfirmDialog } from '@/components/ui';
import { Plus, Trash2, ArrowDownCircle, Briefcase, Wallet, Clock, Loader2 } from 'lucide-react';
import type { Transaction } from '@/lib/types';

export function IncomeScreen() {
  const { profile } = useAuth();
  const { transactions, addTransaction, deleteTransaction, loading } = useTransactions();
  const { categories } = useCategories();
  const rateData = useExchangeRates();
  const displayCurrency = profile?.display_currency ?? 'USD';

  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incomeTransactions = useMemo(
    () => transactions.filter((t) => t.type === 'income'),
    [transactions],
  );

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories],
  );

  const totalIncome = useMemo(() => {
    return incomeTransactions.reduce(
      (sum, tx) => sum + convertCurrency(tx.amount_original, tx.currency_original, displayCurrency, rateData.rates),
      0,
    );
  }, [incomeTransactions, displayCurrency, rateData.rates]);

  // Form state
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(displayCurrency);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const resetForm = () => {
    setAmount('');
    setCurrency(displayCurrency);
    setCategoryId('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setError(null);
  };

  const handleAdd = async () => {
    setError(null);
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setFormLoading(true);
    const { error: txError } = await addTransaction({
      type: 'income',
      amount_original: amt,
      currency_original: currency,
      category_id: categoryId || null,
      description: description || null,
      location: null,
      transaction_date: new Date(date).toISOString(),
      is_recurring: false,
    });
    setFormLoading(false);
    if (txError) {
      setError(txError);
      return;
    }
    resetForm();
    setShowAdd(false);
  };

  const incomeSource = profile?.income_source;
  const sourceLabel = incomeSource === 'parents' ? 'Allowance & Family Support' : 'Self-Earned Income';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{sourceLabel}</p>
          <p className="text-3xl font-bold font-display mt-1">{formatCurrency(totalIncome, displayCurrency)}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Log Income
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : incomeTransactions.length === 0 ? (
        <EmptyState
          icon={<ArrowDownCircle size={32} />}
          title="No income logged yet"
          message="Log your salary, allowance, or any other income to start tracking what's coming in. Each entry keeps its original currency — you can change your display currency anytime without affecting the stored amounts."
          action={
            <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Log your first income
            </button>
          }
        />
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {incomeTransactions.map((tx) => (
            <IncomeRow
              key={tx.id}
              tx={tx}
              displayCurrency={displayCurrency}
              rates={rateData.rates}
              onDelete={() => setDeleteId(tx.id)}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetForm(); }} title="Log Income">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field">
              <option value="">Select category...</option>
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Amount</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
            <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. October salary, monthly allowance"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
            Add Income
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteTransaction(deleteId)}
        title="Delete income entry"
        message="Are you sure you want to delete this income record? This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function IncomeRow({
  tx,
  displayCurrency,
  rates,
  onDelete,
}: {
  tx: Transaction;
  displayCurrency: string;
  rates: Record<string, number>;
  onDelete: () => void;
}) {
  const converted = convertCurrency(tx.amount_original, tx.currency_original, displayCurrency, rates);
  const cat = tx.category;
  const icon = cat?.icon ?? 'Plus';
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400 flex items-center justify-center">
          <CategoryIcon name={icon} />
        </div>
        <div>
          <div className="font-medium text-sm">{tx.description ?? cat?.name ?? 'Income'}</div>
          <div className="text-xs text-muted">
            {new Date(tx.transaction_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            {tx.currency_original !== displayCurrency && ` · ${formatCurrency(tx.amount_original, tx.currency_original)}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-accent-600 dark:text-accent-400">
          +{formatCurrency(converted, displayCurrency)}
        </span>
        <button onClick={onDelete} className="btn-ghost text-danger-500 hover:text-danger-600">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function CategoryIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    Briefcase: <Briefcase size={18} />,
    Wallet: <Wallet size={18} />,
    Clock: <Clock size={18} />,
    Plus: <Plus size={18} />,
  };
  return icons[name] ?? <Plus size={18} />;
}

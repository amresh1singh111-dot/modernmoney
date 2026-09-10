import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTransactions, useCategories, useExchangeRates } from '@/hooks/useData';
import { convertCurrency, formatCurrency, CURRENCIES } from '@/lib/currency';
import { Modal, EmptyState, ConfirmDialog } from '@/components/ui';
import { Plus, Trash2, ArrowUpCircle, Loader2, MapPin } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { Transaction } from '@/lib/types';

export function ExpensesScreen() {
  const { profile } = useAuth();
  const { transactions, addTransaction, deleteTransaction, loading } = useTransactions();
  const { categories } = useCategories();
  const rateData = useExchangeRates();
  const displayCurrency = profile?.display_currency ?? 'USD';

  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expenseTransactions = useMemo(
    () => transactions.filter((t) => t.type === 'expense'),
    [transactions],
  );

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  );

  const totalExpenses = useMemo(() => {
    return expenseTransactions.reduce(
      (sum, tx) => sum + convertCurrency(tx.amount_original, tx.currency_original, displayCurrency, rateData.rates),
      0,
    );
  }, [expenseTransactions, displayCurrency, rateData.rates]);

  // Form state
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(displayCurrency);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const resetForm = () => {
    setAmount('');
    setCurrency(displayCurrency);
    setCategoryId('');
    setDescription('');
    setLocation('');
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
      type: 'expense',
      amount_original: amt,
      currency_original: currency,
      category_id: categoryId || null,
      description: description || null,
      location: location || null,
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Total Expenses</p>
          <p className="text-3xl font-bold font-display mt-1">{formatCurrency(totalExpenses, displayCurrency)}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Log Expense
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : expenseTransactions.length === 0 ? (
        <EmptyState
          icon={<ArrowUpCircle size={32} />}
          title="No expenses logged yet"
          message="Track your spending by logging expenses with a category and location. Every entry stores its original currency permanently — your display currency only changes what you see on screen."
          action={
            <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Log your first expense
            </button>
          }
        />
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {expenseTransactions.map((tx) => (
            <ExpenseRow
              key={tx.id}
              tx={tx}
              displayCurrency={displayCurrency}
              rates={rateData.rates}
              onDelete={() => setDeleteId(tx.id)}
            />
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetForm(); }} title="Log Expense">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {expenseCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    categoryId === c.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${c.color}20`, color: c.color ?? '#64748b' }}>
                    <DynamicIcon name={c.icon} size={16} />
                  </div>
                  <span className="text-xs font-medium">{c.name}</span>
                </button>
              ))}
            </div>
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
              placeholder="e.g. Lunch at cafeteria, bus ticket"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Location (optional)</label>
            <div className="relative">
              <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Campus, Downtown"
                className="input-field pl-11"
              />
            </div>
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
            Add Expense
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteTransaction(deleteId)}
        title="Delete expense entry"
        message="Are you sure you want to delete this expense record? This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function ExpenseRow({
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
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${cat?.color ?? '#64748b'}20`, color: cat?.color ?? '#64748b' }}
        >
          <DynamicIcon name={cat?.icon} size={18} />
        </div>
        <div>
          <div className="font-medium text-sm">{tx.description ?? cat?.name ?? 'Expense'}</div>
          <div className="text-xs text-muted">
            {cat?.name && `${cat.name} · `}
            {new Date(tx.transaction_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            {tx.location ? ` · ${tx.location}` : ''}
            {tx.currency_original !== displayCurrency && ` · ${formatCurrency(tx.amount_original, tx.currency_original)}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold">{formatCurrency(converted, displayCurrency)}</span>
        <button onClick={onDelete} className="btn-ghost text-danger-500 hover:text-danger-600">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function DynamicIcon({ name, size = 18 }: { name?: string | null; size?: number }) {
  if (!name) return <ArrowUpCircle size={size} />;
  const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name];
  return IconComp ? <IconComp size={size} /> : <ArrowUpCircle size={size} />;
}

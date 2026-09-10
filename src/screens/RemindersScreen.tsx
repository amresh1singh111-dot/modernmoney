import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useReminders, useTuitionPlans, useGoals, useExchangeRates } from '@/hooks/useData';
import { convertCurrency, formatCurrency } from '@/lib/currency';
import { Modal, EmptyState, ConfirmDialog } from '@/components/ui';
import {
  Plus,
  Trash2,
  Bell,
  Loader2,
  Calendar,
  GraduationCap,
  Receipt,
  Target,
  HandCoins,
  Check,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type { Reminder } from '@/lib/types';

const REMINDER_TYPES = [
  { type: 'tuition' as const, label: 'Tuition Deadline', icon: 'GraduationCap', color: '#6366f1' },
  { type: 'bill' as const, label: 'Bill Due', icon: 'Receipt', color: '#f59e0b' },
  { type: 'savings_milestone' as const, label: 'Savings Milestone', icon: 'Target', color: '#10b981' },
  { type: 'repayment' as const, label: 'Repayment Request', icon: 'HandCoins', color: '#ec4899' },
];

export function RemindersScreen() {
  const { profile } = useAuth();
  const { reminders, addReminder, updateReminder, deleteReminder, loading } = useReminders();
  const { tuitionPlans } = useTuitionPlans();
  const { goals } = useGoals();
  const rateData = useExchangeRates();
  const displayCurrency = profile?.display_currency ?? 'USD';

  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderType, setReminderType] = useState<Reminder['reminder_type']>('bill');
  const [dueDate, setDueDate] = useState('');
  const [linkedType, setLinkedType] = useState<string>('');
  const [linkedId, setLinkedId] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setReminderType('bill');
    setDueDate('');
    setLinkedType('');
    setLinkedId('');
    setError(null);
  };

  const handleAdd = async () => {
    setError(null);
    if (!title.trim()) { setError('Enter a title'); return; }
    if (!dueDate) { setError('Pick a due date'); return; }
    setFormLoading(true);
    const { error: reminderError } = await addReminder({
      title: title.trim(),
      description: description.trim() || null,
      reminder_type: reminderType,
      due_date: dueDate,
      linked_id: linkedId || null,
      linked_type: linkedType || null,
    });
    setFormLoading(false);
    if (reminderError) { setError(reminderError); return; }
    resetForm();
    setShowAdd(false);
  };

  const daysUntil = (dueDate: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dl = new Date(dueDate);
    return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const sortedReminders = useMemo(() => {
    return [...reminders].sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [reminders]);

  const upcomingCount = useMemo(
    () => reminders.filter((r) => !r.is_completed && daysUntil(r.due_date) <= 7).length,
    [reminders],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-primary-500" />
            <h2 className="text-lg font-bold font-display">Reminders</h2>
          </div>
          {upcomingCount > 0 && (
            <p className="text-sm text-warning-600 dark:text-warning-400 mt-1">
              {upcomingCount} reminder{upcomingCount > 1 ? 's' : ''} due in the next 7 days
            </p>
          )}
        </div>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Reminder
        </button>
      </div>

      {reminders.length === 0 ? (
        <EmptyState
          icon={<Bell size={32} />}
          title="No reminders yet"
          message="Set reminders for tuition deadlines, bill due dates, savings milestones, and repayment requests. Each reminder links directly to the relevant entry so you never hit a dead end."
          action={
            <button onClick={() => { resetForm(); setShowAdd(true); }} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Create your first reminder
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sortedReminders.map((reminder) => {
            const days = daysUntil(reminder.due_date);
            const config = REMINDER_TYPES.find((r) => r.type === reminder.reminder_type) ?? REMINDER_TYPES[1];
            const isCompleted = reminder.is_completed;
            const isOverdue = !isCompleted && days < 0;
            const isUrgent = !isCompleted && days >= 0 && days <= 7;

            return (
              <div
                key={reminder.id}
                className={`card p-4 transition-opacity ${isCompleted ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${config.color}20`, color: config.color }}
                    >
                      <ReminderIcon name={config.icon} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${isCompleted ? 'line-through' : ''}`}>
                          {reminder.title}
                        </span>
                        {isOverdue && (
                          <span className="flex items-center gap-1 text-xs text-danger-600 dark:text-danger-400 font-semibold">
                            <AlertTriangle size={12} /> Overdue
                          </span>
                        )}
                        {isUrgent && (
                          <span className="flex items-center gap-1 text-xs text-warning-600 dark:text-warning-400 font-semibold">
                            <Clock size={12} /> {days === 0 ? 'Today' : `${days}d left`}
                          </span>
                        )}
                      </div>
                      {reminder.description && (
                        <p className="text-xs text-muted mt-0.5">{reminder.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(reminder.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-xs text-muted capitalize">
                          {reminder.reminder_type.replace('_', ' ')}
                        </span>
                        {reminder.linked_type && (
                          <span className="text-xs text-primary-600 dark:text-primary-400">
                            Linked to {reminder.linked_type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!isCompleted && (
                      <button
                        onClick={() => updateReminder(reminder.id, { is_completed: true })}
                        className="btn-ghost text-accent-600 dark:text-accent-400"
                        title="Mark as done"
                      >
                        <Check size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteId(reminder.id)}
                      className="btn-ghost text-danger-500 hover:text-danger-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetForm(); }} title="Add Reminder">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {REMINDER_TYPES.map((r) => (
                <button
                  key={r.type}
                  type="button"
                  onClick={() => setReminderType(r.type)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    reminderType === r.type
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${r.color}20`, color: r.color }}>
                    <ReminderIcon name={r.icon} />
                  </div>
                  <span className="text-xs font-medium">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fall semester tuition due"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Link to existing entity */}
          {(reminderType === 'tuition' || reminderType === 'savings_milestone') && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium mb-1.5">
                Link to {reminderType === 'tuition' ? 'Tuition Plan' : 'Savings Goal'} (optional)
              </label>
              {reminderType === 'tuition' ? (
                <select
                  value={linkedId}
                  onChange={(e) => {
                    setLinkedId(e.target.value);
                    setLinkedType(e.target.value ? 'tuition_plan' : '');
                  }}
                  className="input-field"
                >
                  <option value="">No link</option>
                  {tuitionPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} — {formatCurrency(convertCurrency(p.amount_total, p.currency, displayCurrency, rateData.rates), displayCurrency)}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={linkedId}
                  onChange={(e) => {
                    setLinkedId(e.target.value);
                    setLinkedType(e.target.value ? 'goal' : '');
                  }}
                  className="input-field"
                >
                  <option value="">No link</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} — {formatCurrency(convertCurrency(g.target_amount, g.currency, displayCurrency, rateData.rates), displayCurrency)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <button onClick={handleAdd} disabled={formLoading} className="btn-primary w-full flex items-center justify-center gap-2">
            {formLoading && <Loader2 size={18} className="animate-spin" />}
            Add Reminder
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteReminder(deleteId)}
        title="Delete reminder"
        message="This will permanently delete this reminder. This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function ReminderIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    GraduationCap: <GraduationCap size={18} />,
    Receipt: <Receipt size={18} />,
    Target: <Target size={18} />,
    HandCoins: <HandCoins size={18} />,
    Bell: <Bell size={18} />,
  };
  return icons[name] ?? <Bell size={18} />;
}

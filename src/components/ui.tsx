import { type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} card p-6 animate-scale-in max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold font-display">{title}</h2>
          <button onClick={onClose} className="btn-ghost -mr-2">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ProgressBar({ value, max, color = '#3b82f6' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
      <div
        className="h-full rounded-full progress-bar"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-muted text-sm max-w-sm mb-4">{message}</p>
      {action}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-muted mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={danger ? 'btn-primary bg-danger-600 hover:bg-danger-700' : 'btn-primary'}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CURRENCIES, getCurrencyInfo } from '@/lib/currency';
import { Wallet, GraduationCap, Check, Loader2, Globe, Info } from 'lucide-react';
import type { AppMode } from '@/lib/types';

export function SettingsScreen() {
  const { profile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<AppMode>(profile?.mode ?? 'home');
  const [displayCurrency, setDisplayCurrency] = useState(profile?.display_currency ?? 'USD');
  const [homeCurrency, setHomeCurrency] = useState(profile?.home_currency ?? 'USD');
  const [currentCurrency, setCurrentCurrency] = useState(profile?.current_currency ?? 'USD');
  const [incomeSource, setIncomeSource] = useState<'self' | 'parents'>(profile?.income_source ?? 'self');

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const updates: Record<string, unknown> = {
      mode,
      display_currency: displayCurrency,
      income_source: mode === 'home' ? incomeSource : null,
    };
    if (mode === 'student') {
      updates.home_currency = homeCurrency;
      updates.current_currency = currentCurrency;
    }
    const { error: updateError } = await updateProfile(updates as never);
    setSaving(false);
    if (updateError) {
      setError(updateError);
      return;
    }
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Mode Selection */}
      <SettingsSection title="App Mode" description="Switch between Home Country and International Student modes. Switching does not delete your data — it only changes which dashboard and tools are active.">
        <div className="grid grid-cols-2 gap-3">
          <ModeOption
            selected={mode === 'home'}
            onClick={() => setMode('home')}
            icon={<Wallet size={22} />}
            title="Home Country"
            description="Everyday personal finance management"
          />
          <ModeOption
            selected={mode === 'student'}
            onClick={() => setMode('student')}
            icon={<GraduationCap size={22} />}
            title="International Student"
            description="Tuition, multi-currency, work tracking"
          />
        </div>
      </SettingsSection>

      {/* Display Currency */}
      <SettingsSection title="Display Currency" description="This only affects what's shown on screen. Your original transaction amounts and currencies are never modified — they're stored permanently as entered.">
        <div className="relative">
          <Globe size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)} className="input-field pl-11">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name} ({c.symbol})
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-muted mt-2">
          Currently displaying in: {getCurrencyInfo(displayCurrency).name}
        </p>
      </SettingsSection>

      {/* Student Mode: Dual Currency */}
      {mode === 'student' && (
        <SettingsSection title="Dual Currency Tracking" description="As an international student, track both your current country's currency and your home currency simultaneously — see what your money is worth here and back home without switching display currency.">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Home Country Currency</label>
              <select value={homeCurrency} onChange={(e) => setHomeCurrency(e.target.value)} className="input-field">
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Current Country Currency</label>
              <select value={currentCurrency} onChange={(e) => setCurrentCurrency(e.target.value)} className="input-field">
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </SettingsSection>
      )}

      {/* Income Source (Home mode only) */}
      {mode === 'home' && (
        <SettingsSection title="Income Source" description="How do you get your money? This helps the app tailor your income tracking experience.">
          <div className="grid grid-cols-2 gap-3">
            <ModeOption
              selected={incomeSource === 'self'}
              onClick={() => setIncomeSource('self')}
              icon={<Wallet size={20} />}
              title="I earn my own"
              description="Salary or self-earned income"
            />
            <ModeOption
              selected={incomeSource === 'parents'}
              onClick={() => setIncomeSource('parents')}
              icon={<Wallet size={20} />}
              title="Parents support me"
              description="Allowance or family support"
            />
          </div>
        </SettingsSection>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          Save Changes
        </button>
        {savedMsg && (
          <span className="text-sm text-accent-600 dark:text-accent-400 animate-fade-in flex items-center gap-1">
            <Check size={16} /> Saved
          </span>
        )}
        {error && <span className="text-sm text-danger-600 dark:text-danger-400">{error}</span>}
      </div>

      {/* Disclaimer */}
      <div className="card p-4 flex items-start gap-3">
        <Info size={18} className="text-muted flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted">
          Adaptiv is a planning tool, not a financial advisor. Projections and summaries are for
          informational purposes only and should never be treated as guaranteed financial advice.
          Currency conversion rates are reference values and may differ from live market rates.
        </p>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <h3 className="font-bold font-display mb-1">{title}</h3>
      <p className="text-sm text-muted mb-4">{description}</p>
      {children}
    </div>
  );
}

function ModeOption({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <div className={`mb-2 ${selected ? 'text-primary-600 dark:text-primary-400' : 'text-muted'}`}>
        {icon}
      </div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-muted mt-0.5">{description}</div>
    </button>
  );
}

import { useState, type ReactNode } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { seedDefaultCategories } from '@/lib/defaultCategories';
import { Wallet, GraduationCap, Moon, Sun, ArrowRight, Mail, Lock, Loader2 } from 'lucide-react';
import { CURRENCIES } from '@/lib/currency';
import type { AppMode } from '@/lib/types';

function AuthScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AppMode>('home');
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [incomeSource, setIncomeSource] = useState<'self' | 'parents'>('self');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) {
          setError(signUpError);
          return;
        }
        // The DB trigger creates a default profile on signup; we update it with the user's choices
        await new Promise((r) => setTimeout(r, 500));
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          await supabase.from('profiles').update({
            mode,
            display_currency: displayCurrency,
            income_source: mode === 'home' ? incomeSource : null,
          }).eq('id', authData.user.id);
          await seedDefaultCategories(authData.user.id);
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError);
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 btn-ghost z-10"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      {/* Left panel — branding */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-700 dark:to-slate-900" />
        <div className="relative z-10 max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Wallet size={28} />
            </div>
            <h1 className="text-2xl font-bold font-display">Adaptiv</h1>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold font-display mb-4 leading-tight">
            Personal finance that adapts to your life
          </h2>
          <p className="text-white/80 text-lg leading-relaxed mb-8">
            Whether you're managing money at home or juggling tuition abroad as an
            international student, Adaptiv reshapes itself around your situation.
          </p>
          <div className="space-y-3">
            {[
              'Track income and expenses with multi-currency support',
              'Set savings goals and watch them grow',
              'Switch between Home and International Student modes anytime',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-white/90">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <ArrowRight size={12} />
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md animate-slide-up">
          <h2 className="text-2xl font-bold font-display mb-1">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-muted text-sm mb-6">
            {isSignUp ? 'Start managing your money smarter today.' : 'Sign in to continue to your dashboard.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-11"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="input-field pl-11"
                />
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-4 pt-2 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium mb-2">How do you want to use Adaptiv?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <ModeCard
                      selected={mode === 'home'}
                      onClick={() => setMode('home')}
                      icon={<Wallet size={22} />}
                      title="Home Country"
                      description="Everyday personal finance"
                    />
                    <ModeCard
                      selected={mode === 'student'}
                      onClick={() => setMode('student')}
                      icon={<GraduationCap size={22} />}
                      title="International Student"
                      description="Tuition, currencies & more"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Display currency</label>
                  <select
                    value={displayCurrency}
                    onChange={(e) => setDisplayCurrency(e.target.value)}
                    className="input-field"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                {mode === 'home' && (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-medium mb-2">How do you get your money?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <ModeCard
                        selected={incomeSource === 'self'}
                        onClick={() => setIncomeSource('self')}
                        icon={<Wallet size={20} />}
                        title="I earn my own"
                        description="Salary or self-earned"
                      />
                      <ModeCard
                        selected={incomeSource === 'parents'}
                        onClick={() => setIncomeSource('parents')}
                        icon={<Wallet size={20} />}
                        title="Parents support"
                        description="Allowance / family"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 rounded-lg px-4 py-2.5 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 size={18} className="animate-spin" />}
              {isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-muted surface">or</span>
            </div>
          </div>

          <button
            onClick={signInWithGoogle}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="text-center text-sm text-muted mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-primary-600 dark:text-primary-400 font-semibold hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default AuthScreen;

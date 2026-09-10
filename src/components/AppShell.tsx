import { useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Target,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Wallet,
  GraduationCap,
  Home,
  Bell,
} from 'lucide-react';
import type { AppMode } from '@/lib/types';

export type Page = 'dashboard' | 'income' | 'expenses' | 'goals' | 'tuition' | 'living' | 'reminders' | 'settings';

type NavItem = {
  id: Page;
  label: string;
  icon: ReactNode;
};

const HOME_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'income', label: 'Income', icon: <ArrowDownCircle size={20} /> },
  { id: 'expenses', label: 'Expenses', icon: <ArrowUpCircle size={20} /> },
  { id: 'goals', label: 'Goals', icon: <Target size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

const STUDENT_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'tuition', label: 'Tuition Planner', icon: <GraduationCap size={20} /> },
  { id: 'living', label: 'Living Expenses', icon: <Home size={20} /> },
  { id: 'income', label: 'Income & Work', icon: <ArrowDownCircle size={20} /> },
  { id: 'goals', label: 'Savings Goals', icon: <Target size={20} /> },
  { id: 'reminders', label: 'Reminders', icon: <Bell size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

export function AppShell({
  currentPage,
  onNavigate,
  children,
}: {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mode = profile?.mode ?? 'home';
  const nav = mode === 'student' ? STUDENT_NAV : HOME_NAV;

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 surface fixed h-full">
        <SidebarContent nav={nav} currentPage={currentPage} onNavigate={handleNavigate} mode={mode} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 flex flex-col surface border-r border-slate-200 dark:border-slate-800 animate-slide-up">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 btn-ghost">
              <X size={20} />
            </button>
            <SidebarContent nav={nav} currentPage={currentPage} onNavigate={handleNavigate} mode={mode} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 surface border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden btn-ghost">
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-bold font-display capitalize">
              {nav.find((n) => n.id === currentPage)?.label ?? 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="btn-ghost" aria-label="Toggle theme">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button onClick={signOut} className="btn-ghost" aria-label="Sign out">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  nav,
  currentPage,
  onNavigate,
  mode,
}: {
  nav: NavItem[];
  currentPage: Page;
  onNavigate: (p: Page) => void;
  mode: AppMode;
}) {
  return (
    <>
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white">
          <Wallet size={22} />
        </div>
        <div>
          <div className="font-bold font-display text-lg">Adaptiv</div>
          <div className="text-xs text-muted flex items-center gap-1">
            {mode === 'student' ? <GraduationCap size={12} /> : <Wallet size={12} />}
            {mode === 'student' ? 'Student Mode' : 'Home Mode'}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentPage === item.id
                ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
                : 'text-muted hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="text-xs text-muted">
          Planning tool, not financial advice.
        </div>
      </div>
    </>
  );
}

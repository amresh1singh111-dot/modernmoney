import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import AuthScreen from '@/screens/AuthScreen';
import { AppShell, type Page } from '@/components/AppShell';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { IncomeScreen } from '@/screens/IncomeScreen';
import { ExpensesScreen } from '@/screens/ExpensesScreen';
import { GoalsScreen } from '@/screens/GoalsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { TuitionScreen } from '@/screens/TuitionScreen';
import { LivingExpensesScreen } from '@/screens/LivingExpensesScreen';
import { RemindersScreen } from '@/screens/RemindersScreen';
import { seedDefaultCategories } from '@/lib/defaultCategories';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  // Seed default categories for new users who don't have them yet
  useEffect(() => {
    if (user?.id && profile) {
      seedDefaultCategories(user.id);
    }
  }, [user?.id, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <AppShell currentPage={page} onNavigate={setPage}>
      {page === 'dashboard' && <DashboardScreen />}
      {page === 'income' && <IncomeScreen />}
      {page === 'expenses' && <ExpensesScreen />}
      {page === 'goals' && <GoalsScreen />}
      {page === 'tuition' && <TuitionScreen />}
      {page === 'living' && <LivingExpensesScreen />}
      {page === 'reminders' && <RemindersScreen />}
      {page === 'settings' && <SettingsScreen />}
    </AppShell>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

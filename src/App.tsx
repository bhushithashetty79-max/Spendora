import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/screens/AuthScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { AnalyticsScreen } from '@/screens/AnalyticsScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';
import { NovaScreen } from '@/screens/NovaScreen';
import { PayScreen } from '@/screens/PayScreen';
import { ReportsScreen } from '@/screens/ReportsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { BudgetScreen } from '@/screens/BudgetScreen';
import { BottomNav, type TabId } from '@/components/BottomNav';
import { Settings } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 gradient-mint rounded-2xl blur-xl opacity-50 animate-pulse-ring" />
          <div className="relative w-14 h-14 rounded-2xl gradient-mint flex items-center justify-center shadow-glow animate-pulse-ring" />
        </div>
        <p className="text-sm text-slate-400">Loading Spendora…</p>
      </div>
    </div>
  );
}

function AppShell() {
  const { session, loading } = useAuth();
  const [tab, setTab] = useState<TabId>('dashboard');
  const [budgetsOpen, setBudgetsOpen] = useState(false);

  if (loading) return <LoadingScreen />;
  if (!session) return <AuthScreen />;

  return (
    <div className="min-h-screen">
      {tab === 'dashboard' && (
        <DashboardScreen />
      )}
      {tab === 'analytics' && <AnalyticsScreen />}
      {tab === 'insights' && <InsightsScreen />}
      {tab === 'nova' && <NovaScreen />}
      {tab === 'pay' && <PayScreen />}
      {tab === 'reports' && <ReportsScreen />}
      {tab === 'profile' && <ProfileScreen onOpenBudgets={() => setBudgetsOpen(true)} />}

      {/* Floating settings button on dashboard */}
      {tab === 'dashboard' && (
        <button
          onClick={() => setBudgetsOpen(true)}
          className="fixed top-5 right-4 z-30 btn-press w-10 h-10 rounded-2xl glass flex items-center justify-center text-slate-300 hover:text-mint-300"
          aria-label="Budget settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}

      {budgetsOpen && <BudgetScreen onClose={() => setBudgetsOpen(false)} />}

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<AppShell />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
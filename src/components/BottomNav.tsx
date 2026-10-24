import { Home, BarChart3, Sparkles, MessageSquare, FileText, User, Wallet } from 'lucide-react';

export type TabId = 'dashboard' | 'analytics' | 'insights' | 'nova' | 'pay' | 'reports' | 'profile';

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof Home;
}

const ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'insights', label: 'Insights', icon: Sparkles },
  { id: 'nova', label: 'Nova', icon: MessageSquare },
  { id: 'pay', label: 'Pay', icon: Wallet },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'profile', label: 'Profile', icon: User },
];

export function BottomNav({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto max-w-2xl glass rounded-3xl px-1 py-1.5 flex items-center justify-between shadow-lift gap-0.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`nav-item btn-press flex-1 min-w-0 ${isActive ? 'nav-item-active' : ''}`}
            >
              {isActive && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full gradient-mint shadow-glow-sm" />
              )}
              <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.4 : 2} />
              <span className="truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
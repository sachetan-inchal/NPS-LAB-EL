import { Maximize2, Minimize2, RotateCcw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { useDashboardStore } from '@/store/dashboardStore';
import { formatTimestamp } from '@/lib/time';

export function Header() {
  const { tab, setTab, presentationMode, togglePresentation, serverTime, resetDashboard } = useDashboardStore();

  const tabs = [
    { id: 'overview' as const, label: 'Operations Center' },
    { id: 'demo' as const, label: 'Demonstration' },
    { id: 'presentation' as const, label: 'Presentation' },
  ];

  const handleReset = async () => {
    await api.resetSimulation();
    resetDashboard();
  };

  return (
    <header className={`sticky top-0 z-50 border-b border-soc-border/60 bg-soc-bg/90 backdrop-blur-xl ${presentationMode ? 'py-4' : ''}`}>
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`font-bold tracking-tight ${presentationMode ? 'text-2xl' : 'text-lg'}`}>
              ZTON Security Operations Center
            </h1>
            <p className="text-xs text-soc-muted">
              Zero Trust Overlay Network · Server time: {serverTime ? formatTimestamp(serverTime) : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <nav className="hidden md:flex gap-1 bg-soc-card/60 rounded-lg p-1 border border-soc-border/40">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  tab === t.id ? 'bg-soc-accent text-white shadow' : 'text-soc-muted hover:text-soc-text'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <Button variant="outline" size="sm" onClick={handleReset} className="hidden lg:flex">
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
          <Button variant="outline" size="icon" onClick={togglePresentation}>
            {presentationMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}

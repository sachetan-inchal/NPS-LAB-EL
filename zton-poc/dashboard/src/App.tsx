import { Header } from '@/components/layout/Header';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAppMode } from '@/hooks/useAppMode';
import { useDashboardStore } from '@/store/dashboardStore';
import { OverviewPage } from '@/pages/OverviewPage';
import { DemoPage } from '@/pages/DemoPage';
import { PresentationPage } from '@/pages/PresentationPage';
import { DeviceClientPage } from '@/pages/DeviceClientPage';
import { Shield } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen soc-grid-bg flex items-center justify-center">
      <div className="text-center">
        <Shield className="w-12 h-12 text-soc-accent mx-auto mb-4 animate-pulse" />
        <p className="text-soc-muted">Loading ZTON…</p>
      </div>
    </div>
  );
}

function HubDashboard() {
  useDashboardData();
  const { tab, presentationMode } = useDashboardStore();

  return (
    <div className={`min-h-screen soc-grid-bg ${presentationMode ? 'presentation-mode' : ''}`}>
      <Header />
      <main className={`mx-auto px-6 py-6 ${presentationMode ? 'max-w-[1600px]' : 'max-w-[1440px]'}`}>
        {tab === 'overview' && <OverviewPage />}
        {tab === 'demo' && <DemoPage />}
        {tab === 'presentation' && <PresentationPage />}
      </main>
      <footer className="border-t border-soc-border/40 px-6 py-3 text-xs text-soc-muted flex justify-between">
        <span>ZTON SOC Dashboard · Hub (8080) · Open Laptop B (:8081) Phone B (:8082) Phone A (:8083) in other tabs to send packets</span>
        <span className="font-mono hidden lg:inline">AES-GCM + Ed25519 · UDP Overlay</span>
      </footer>
    </div>
  );
}

export default function App() {
  const appMode = useAppMode();

  if (appMode === 'loading') return <LoadingScreen />;
  if (appMode === 'device') return <DeviceClientPage />;
  return <HubDashboard />;
}

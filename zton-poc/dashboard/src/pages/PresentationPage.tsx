import { motion } from 'framer-motion';
import { StatsPanel } from '@/components/dashboard/StatsPanel';
import { NetworkTopology } from '@/components/topology/NetworkTopology';
import { SecurityEvents } from '@/components/panels/SecurityEvents';
import { EncryptionVisualizer } from '@/components/panels/EncryptionVisualizer';
import { DemoScenarios } from '@/components/panels/DemoScenarios';
import { useDashboardStore } from '@/store/dashboardStore';
import { AnimatedCounter } from '@/components/ui/animated-counter';

export function PresentationPage() {
  const { stats, events, scenarios, presentationMode } = useDashboardStore();
  const scale = presentationMode ? 'text-4xl' : 'text-3xl';

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-panel p-8 text-center"
      >
        <h2 className={`font-bold mb-2 ${scale}`}>Zero Trust Overlay Network</h2>
        <p className="text-soc-muted text-lg">Raw UDP · Mutual Authentication · Per-Packet Encryption</p>
        <div className="flex justify-center gap-12 mt-8">
          <div>
            <AnimatedCounter value={stats?.accepted ?? 0} className={`font-mono font-bold text-emerald-400 ${scale}`} />
            <p className="text-sm text-soc-muted mt-1">Accepted</p>
          </div>
          <div>
            <AnimatedCounter value={stats?.dropped ?? 0} className={`font-mono font-bold text-red-400 ${scale}`} />
            <p className="text-sm text-soc-muted mt-1">Dropped</p>
          </div>
          <div>
            <AnimatedCounter value={stats?.replay_blocked ?? 0} className={`font-mono font-bold text-amber-400 ${scale}`} />
            <p className="text-sm text-soc-muted mt-1">Replay Blocked</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NetworkTopology />
        <EncryptionVisualizer active={!!stats?.running} />
      </div>

      <StatsPanel stats={stats} />
      <DemoScenarios scenarios={scenarios} />
      <SecurityEvents events={events.slice(0, 8)} />
    </div>
  );
}

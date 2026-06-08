import { motion } from 'framer-motion';
import { StatsPanel } from '@/components/dashboard/StatsPanel';
import { FabricRealityPanel } from '@/components/dashboard/FabricRealityPanel';
import { NetworkTopology } from '@/components/topology/NetworkTopology';
import { SecurityEvents } from '@/components/panels/SecurityEvents';
import { EncryptionVisualizer } from '@/components/panels/EncryptionVisualizer';
import { DemoScenarios } from '@/components/panels/DemoScenarios';
import { PacketStream } from '@/components/panels/PacketStream';
import { useDashboardStore } from '@/store/dashboardStore';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { formatTimestamp } from '@/lib/time';

export function PresentationPage() {
  const { stats, events, scenarios, presentationMode, serverTime, packets, fabricStatus } = useDashboardStore();
  const scale = presentationMode ? 'text-5xl' : 'text-4xl';

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-panel p-8 text-center"
      >
        <h2 className={`font-bold mb-2 ${scale}`}>Zero Trust Overlay Network</h2>
        <p className="text-soc-muted text-xl">Raw UDP · Mutual Authentication · Per-Packet Encryption</p>
        <p className="text-sm text-soc-muted mt-2 font-mono">{serverTime ? formatTimestamp(serverTime) : ''}</p>
        <div className="flex justify-center gap-16 mt-10">
          <div>
            <AnimatedCounter value={stats.accepted} className={`font-mono font-bold text-emerald-400 ${scale}`} />
            <p className="text-lg text-soc-muted mt-2">Accepted</p>
          </div>
          <div>
            <AnimatedCounter value={stats.dropped} className={`font-mono font-bold text-red-400 ${scale}`} />
            <p className="text-lg text-soc-muted mt-2">Dropped</p>
          </div>
          <div>
            <AnimatedCounter value={stats.replay_blocked} className={`font-mono font-bold text-amber-400 ${scale}`} />
            <p className="text-lg text-soc-muted mt-2">Replay Blocked</p>
          </div>
          <div>
            <AnimatedCounter value={stats.total_sent} className={`font-mono font-bold text-blue-400 ${scale}`} />
            <p className="text-lg text-soc-muted mt-2">Total Packets</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NetworkTopology />
        <EncryptionVisualizer active={!!stats.running} />
      </div>

      <FabricRealityPanel fabric={fabricStatus} />
      <StatsPanel stats={stats} />
      <DemoScenarios scenarios={scenarios} />
      <PacketStream packets={packets.slice(0, 15)} />
      <SecurityEvents events={events.slice(0, 10)} />
    </div>
  );
}

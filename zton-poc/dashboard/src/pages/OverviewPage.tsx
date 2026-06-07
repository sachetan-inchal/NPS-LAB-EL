import { SystemStatusPanel } from '@/components/dashboard/SystemStatusPanel';
import { StatsPanel } from '@/components/dashboard/StatsPanel';
import { TrafficCharts } from '@/components/charts/TrafficCharts';
import { NetworkTopology } from '@/components/topology/NetworkTopology';
import { PacketGenerator } from '@/components/panels/PacketGenerator';
import { PacketStream } from '@/components/panels/PacketStream';
import { SecurityEvents } from '@/components/panels/SecurityEvents';
import { EncryptionVisualizer } from '@/components/panels/EncryptionVisualizer';
import { PolicyPanel } from '@/components/panels/PolicyPanel';
import { useDashboardStore } from '@/store/dashboardStore';
import { Card } from '@/components/ui/card';
import { Monitor, Laptop, Smartphone } from 'lucide-react';

export function OverviewPage() {
  const { systemStatus, stats, packets, events, policies } = useDashboardStore();
  return (
    <div className="space-y-4">
      <Card className="border-soc-accent/40 bg-gradient-to-r from-blue-500/10 to-indigo-500/5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-soc-accent" />
          4-Tab Demo — open these in separate browser tabs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
          <a href="http://localhost:8080" className="p-3 rounded-lg bg-soc-card border border-soc-accent/50 text-soc-accent font-medium">
            Tab 8080 — Hub (this page) — watch traffic
          </a>
          <a href="http://localhost:8081" target="_blank" rel="noreferrer" className="p-3 rounded-lg bg-soc-card border border-soc-border hover:border-emerald-500/50 flex items-center gap-2">
            <Laptop className="w-4 h-4" /> Tab 8081 — Laptop B — send packets
          </a>
          <a href="http://localhost:8082" target="_blank" rel="noreferrer" className="p-3 rounded-lg bg-soc-card border border-soc-border hover:border-emerald-500/50 flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> Tab 8082 — Phone B — viewer
          </a>
          <a href="http://localhost:8083" target="_blank" rel="noreferrer" className="p-3 rounded-lg bg-soc-card border border-red-500/30 hover:border-red-500/50 flex items-center gap-2 text-red-300">
            <Smartphone className="w-4 h-4" /> Tab 8083 — Phone A — blocked
          </a>
        </div>
      </Card>
      <SystemStatusPanel status={systemStatus} />
      <StatsPanel stats={stats} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><NetworkTopology /></div>
        <EncryptionVisualizer active={!!stats?.running} />
      </div>
      <TrafficCharts stats={stats} />
      <PacketGenerator />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <PacketStream packets={packets} />
        <SecurityEvents events={events} />
      </div>
      <PolicyPanel policies={policies} />
    </div>
  );
}

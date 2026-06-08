import { DemoScenarios } from '@/components/panels/DemoScenarios';
import { PacketGenerator } from '@/components/panels/PacketGenerator';
import { PacketStream } from '@/components/panels/PacketStream';
import { PacketInspector } from '@/components/panels/PacketInspector';
import { SecurityEvents } from '@/components/panels/SecurityEvents';
import { EncryptionVisualizer } from '@/components/panels/EncryptionVisualizer';
import { PolicyPanel } from '@/components/panels/PolicyPanel';
import { StatsPanel } from '@/components/dashboard/StatsPanel';
import { useDashboardStore } from '@/store/dashboardStore';

export function DemoPage() {
  const { scenarios, packets, events, policies, stats, selectedPacket, setSelectedPacket } = useDashboardStore();
  return (
    <div className="space-y-4">
      <StatsPanel stats={stats} />
      <DemoScenarios scenarios={scenarios} />
      <PacketGenerator />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EncryptionVisualizer active={!!stats?.running} />
        <PolicyPanel policies={policies} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <PacketStream
            packets={packets}
            selectedId={selectedPacket?.packet_id ?? selectedPacket?.id}
            onSelect={setSelectedPacket}
          />
        </div>
        <PacketInspector packet={selectedPacket} onClose={() => setSelectedPacket(null)} />
      </div>
      <SecurityEvents events={events} />
    </div>
  );
}

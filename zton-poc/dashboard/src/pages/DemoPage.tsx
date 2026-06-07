import { DemoScenarios } from '@/components/panels/DemoScenarios';
import { PacketGenerator } from '@/components/panels/PacketGenerator';
import { PacketStream } from '@/components/panels/PacketStream';
import { SecurityEvents } from '@/components/panels/SecurityEvents';
import { EncryptionVisualizer } from '@/components/panels/EncryptionVisualizer';
import { PolicyPanel } from '@/components/panels/PolicyPanel';
import { useDashboardStore } from '@/store/dashboardStore';

export function DemoPage() {
  const { scenarios, packets, events, policies, stats } = useDashboardStore();
  return (
    <div className="space-y-4">
      <DemoScenarios scenarios={scenarios} />
      <PacketGenerator />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EncryptionVisualizer active={!!stats?.running} />
        <PolicyPanel policies={policies} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <PacketStream packets={packets} />
        <SecurityEvents events={events} />
      </div>
    </div>
  );
}

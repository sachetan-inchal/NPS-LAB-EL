import { Activity, Cpu, Lock, Network, Server } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusToVariant } from '@/components/ui/badge';
import type { SystemStatus } from '@/types';

const ICONS = [Server, Network, Activity, Lock, Cpu];

export function SystemStatusPanel({ status }: { status: SystemStatus | null }) {
  if (!status) return null;
  const items = [
    status.controller,
    status.router,
    status.overlay,
    status.encryption,
    { status: status.connected_nodes.status, label: `Connected Nodes (${status.connected_nodes.count})` },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
        <Badge variant="online">Live</Badge>
      </CardHeader>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {items.map((item, i) => {
          const Icon = ICONS[i];
          return (
            <div key={item.label} className="bg-soc-card/60 rounded-lg p-3 border border-soc-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-soc-accent" />
                <span className="text-xs text-soc-muted truncate">{item.label}</span>
              </div>
              <Badge variant={statusToVariant(item.status)}>{item.status}</Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

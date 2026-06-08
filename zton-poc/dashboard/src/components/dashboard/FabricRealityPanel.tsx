import { ExternalLink, GitBranch, Network, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusToVariant } from '@/components/ui/badge';
import type { FabricStatus } from '@/types';

const STATUS_CLASS: Record<string, string> = {
  active: 'border-emerald-500/25 bg-emerald-500/5',
  waiting: 'border-amber-500/25 bg-amber-500/5',
  'next-step': 'border-blue-500/25 bg-blue-500/5',
};

export function FabricRealityPanel({ fabric }: { fabric: FabricStatus | null }) {
  if (!fabric) return null;

  const services = [fabric.controller, fabric.router];

  return (
    <Card>
      <CardHeader>
        <CardTitle>OpenZiti Fabric Reality</CardTitle>
        <Badge variant={fabric.fabric_online ? 'online' : 'warning'}>
          {fabric.fabric_online ? 'Fabric Online' : 'Fabric Waiting'}
        </Badge>
      </CardHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-1 space-y-2">
          {services.map((svc) => (
            <div key={svc.name} className="p-3 rounded-lg border border-soc-border/50 bg-soc-card/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{svc.name}</p>
                  <p className="text-xs text-soc-muted font-mono truncate">{svc.host}:{svc.port}</p>
                </div>
                <Badge variant={statusToVariant(svc.status)}>{svc.status}</Badge>
              </div>
              <p className="text-xs text-soc-muted mt-2">{svc.detail}</p>
            </div>
          ))}

          <a
            href={fabric.console_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-2 p-3 rounded-lg border border-soc-accent/40 text-soc-accent hover:bg-soc-accent/10"
          >
            <span className="text-sm font-medium">Ziti Admin Console</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
          {fabric.truth_model.map((item, idx) => {
            const Icon = idx === 0 ? ShieldCheck : idx === 1 ? Network : GitBranch;
            return (
              <div key={item.id} className={`p-4 rounded-lg border ${STATUS_CLASS[item.status] ?? 'border-soc-border/50 bg-soc-card/60'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-soc-accent" />
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
                <p className="text-xs leading-5 text-soc-muted">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

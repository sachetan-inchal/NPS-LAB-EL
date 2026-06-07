import { CheckCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import type { Policy } from '@/types';

export function PolicyPanel({ policies }: { policies: Policy[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Zero Trust Policy Engine</CardTitle>
        <span className="text-xs text-soc-muted">Identity-aware access control</span>
      </CardHeader>
      <div className="space-y-2">
        {policies.filter((p) => p.effect !== 'info').map((p) => {
          const isAllow = p.effect === 'allow';
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                isAllow ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
              }`}
            >
              {isAllow
                ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                : <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
              <div>
                <p className="text-sm font-medium">
                  <span className={isAllow ? 'text-emerald-400' : 'text-red-400'}>
                    {isAllow ? 'Allow' : 'Deny'}:
                  </span>{' '}
                  {p.source} → {p.target}
                </p>
                <p className="text-xs text-soc-muted font-mono">{p.rule}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

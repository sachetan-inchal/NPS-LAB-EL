import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import type { SecurityEvent } from '@/types';

const LEVEL_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  INFO: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  SUCCESS: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  WARNING: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  CRITICAL: { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

export function SecurityEvents({ events }: { events: SecurityEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Events</CardTitle>
        <span className="text-xs text-soc-muted">SOC Feed</span>
      </CardHeader>
      <div className="space-y-2 max-h-[320px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {events.map((e, i) => {
            const cfg = LEVEL_CONFIG[e.level] ?? LEVEL_CONFIG.INFO;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={`${e.timestamp}-${i}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 p-3 rounded-lg border ${cfg.bg}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold font-mono ${cfg.color}`}>[{e.level}]</span>
                    <span className="text-xs text-soc-muted">{e.timestamp?.slice(11, 19)}</span>
                  </div>
                  <p className="text-sm text-soc-text">{e.message}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {events.length === 0 && (
          <p className="text-center text-soc-muted py-8 text-sm">Awaiting security events…</p>
        )}
      </div>
    </Card>
  );
}

import { Play, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import type { Scenario } from '@/types';

const SCENARIO_ICONS: Record<string, string> = {
  s1: '🟢', s2: '🟡', s3: '🔵', s4: '🔴',
};

export function DemoScenarios({ scenarios }: { scenarios: Scenario[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Demonstration Scenarios</CardTitle>
        <Zap className="w-4 h-4 text-amber-400" />
      </CardHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {scenarios.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-soc-card/60 border border-soc-border/40 rounded-lg p-4 hover:border-soc-accent/40 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <span>{SCENARIO_ICONS[s.id]}</span>
                  Scenario {i + 1}: {s.name}
                </h4>
                <p className="text-xs text-soc-muted mt-1">{s.description}</p>
              </div>
            </div>
            <div className="flex gap-2 text-xs text-soc-muted font-mono mb-3">
              <span>{s.count} pkts</span>
              <span>·</span>
              <span>{s.payload_type}</span>
              {s.replay_pct > 0 && <><span>·</span><span>{(s.replay_pct * 100).toFixed(0)}% replay</span></>}
            </div>
            <Button size="sm" className="w-full" onClick={() => api.runScenario(s.id)}>
              <Play className="w-3 h-3" /> Run Scenario
            </Button>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

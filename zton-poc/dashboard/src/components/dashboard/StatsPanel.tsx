import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import type { DashboardStats } from '@/types';
import { ArrowDownLeft, ArrowUpRight, Ban, CheckCircle, RefreshCw, Users } from 'lucide-react';

const METRICS = [
  { key: 'total_sent', label: 'Packets Sent', icon: ArrowUpRight, color: 'text-blue-400' },
  { key: 'total_received', label: 'Packets Received', icon: ArrowDownLeft, color: 'text-indigo-400' },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle, color: 'text-emerald-400' },
  { key: 'dropped', label: 'Dropped', icon: Ban, color: 'text-red-400' },
  { key: 'replay_blocked', label: 'Replay Blocked', icon: RefreshCw, color: 'text-amber-400' },
  { key: 'active_sessions', label: 'Active Sessions', icon: Users, color: 'text-purple-400' },
] as const;

export function StatsPanel({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return null; // stats always initialized to zeros in store
  return (
    <Card>
      <CardHeader>
        <CardTitle>Packet Statistics</CardTitle>
        {stats.running && (
          <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-xs text-soc-success font-mono">SIMULATION RUNNING</motion.span>
        )}
      </CardHeader>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {METRICS.map(({ key, label, icon: Icon, color }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-soc-card/60 rounded-lg p-4 border border-soc-border/40"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-soc-muted">{label}</span>
            </div>
            <AnimatedCounter value={stats[key]} className={`text-2xl font-bold font-mono ${color}`} />
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

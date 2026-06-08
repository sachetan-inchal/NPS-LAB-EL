import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { Ban, CheckCircle, RefreshCw, Send } from 'lucide-react';

const tooltipStyle = {
  backgroundColor: '#1a2234',
  border: '1px solid #2a3548',
  borderRadius: '8px',
  fontSize: '12px',
};

interface DeviceMetricsProps {
  sent: number;
  accepted: number;
  dropped: number;
  replayBlocked: number;
  traffic: Array<{ time: string; accepted: number; dropped: number; volume: number; replay?: number }>;
}

export function DeviceMetricsPanel({ sent, accepted, dropped, replayBlocked, traffic }: DeviceMetricsProps) {
  const chartData = traffic.length > 0 ? traffic : [
    { time: '--', accepted: 0, dropped: 0, volume: 0, pps: 0, replay: 0 },
  ];
  const withPps = chartData.map((p, i) => ({
    ...p,
    name: p.time,
    pps: p.accepted + p.dropped,
    replay: p.replay ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Packets Sent', value: sent, icon: Send, color: 'text-blue-400' },
          { label: 'Accepted', value: accepted, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Dropped', value: dropped, icon: Ban, color: 'text-red-400' },
          { label: 'Replay Blocked', value: replayBlocked, icon: RefreshCw, color: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-soc-muted">{label}</span>
            </div>
            <AnimatedCounter value={value} className={`text-2xl font-bold font-mono ${color}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Accepted vs Dropped</CardTitle></CardHeader>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={withPps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3548" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="accepted" name="Accepted" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="dropped" name="Dropped" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader><CardTitle>Packets Per Second</CardTitle></CardHeader>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={withPps}>
              <defs>
                <linearGradient id="devPps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3548" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="pps" name="Pkts" stroke="#3b82f6" fill="url(#devPps)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader><CardTitle>Replay Attempts</CardTitle></CardHeader>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={withPps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3548" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="replay" name="Replay" stroke="#f59e0b" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader><CardTitle>Traffic Volume (encrypted bytes)</CardTitle></CardHeader>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={withPps}>
              <defs>
                <linearGradient id="devVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3548" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="volume" name="Bytes" stroke="#6366f1" fill="url(#devVol)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

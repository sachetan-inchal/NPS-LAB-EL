import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend,
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStats } from '@/types';
import { formatTimeShort } from '@/lib/time';

const tooltipStyle = {
  backgroundColor: '#1a2234',
  border: '1px solid #2a3548',
  borderRadius: '8px',
  fontSize: '12px',
};

export function TrafficCharts({ stats }: { stats: DashboardStats | null }) {
  const traffic = stats?.traffic ?? [];
  const chartData = traffic.length > 0
    ? traffic.map((t, i) => ({
        name: formatTimeShort(t.time) || `#${i + 1}`,
        pps: t.pps,
        accepted: t.accepted,
        dropped: t.dropped,
        replay: t.replay ?? 0,
      }))
    : [{ name: '—', pps: 0, accepted: 0, dropped: 0, replay: 0 }];

  const volumeData = (stats?.volume_by_type?.length ? stats.volume_by_type : [])
    .map((v) => ({ type: v.type.replace(' Message', '').replace(' Stream', ''), volume: v.volume }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle>Packets Per Second</CardTitle></CardHeader>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="ppsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3548" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="pps" stroke="#3b82f6" fill="url(#ppsGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <CardHeader><CardTitle>Accepted vs Dropped (from packet history)</CardTitle></CardHeader>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3548" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="accepted" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="dropped" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <CardHeader><CardTitle>Replay Blocked</CardTitle></CardHeader>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3548" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="replay" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <CardHeader><CardTitle>Traffic Volume by Type</CardTitle></CardHeader>
        <ResponsiveContainer width="100%" height={200}>
          {volumeData.length > 0 ? (
            <BarChart data={volumeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3548" />
              <XAxis type="number" stroke="#64748b" fontSize={11} />
              <YAxis dataKey="type" type="category" stroke="#64748b" fontSize={11} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="volume" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-soc-muted">No accepted traffic yet</div>
          )}
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

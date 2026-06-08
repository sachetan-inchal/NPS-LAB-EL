import { useState } from 'react';
import { Play, Square, RotateCcw, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { useDashboardStore } from '@/store/dashboardStore';

const PAYLOAD_SIZES = [
  { label: '1 KB', value: 1024 },
  { label: '10 KB', value: 10240 },
  { label: '100 KB', value: 102400 },
  { label: '1 MB', value: 1048576 },
];

const REPLAY_OPTIONS = [
  { label: '0%', value: 0 },
  { label: '5%', value: 0.05 },
  { label: '10%', value: 0.10 },
  { label: '25%', value: 0.25 },
];

export function PacketGenerator() {
  const { payloadTypes, stats, resetDashboard } = useDashboardStore();
  const [count, setCount] = useState(100);
  const [payloadType, setPayloadType] = useState('Sensor Data');
  const [payloadSize, setPayloadSize] = useState(10240);
  const [replayPct, setReplayPct] = useState(0);
  const [loading, setLoading] = useState(false);

  const types = payloadTypes.length ? payloadTypes : ['Chat Message', 'Sensor Data', 'Video Stream', 'Voice Stream', 'File Transfer'];

  const intervalMs = count >= 1000 ? 5 : count >= 100 ? 15 : 30;

  const handleStart = async () => {
    setLoading(true);
    await api.startSimulation({ count, payload_type: payloadType, payload_size: payloadSize, replay_pct: replayPct, interval_ms: intervalMs });
    setLoading(false);
  };

  const handleReset = async () => {
    await api.resetSimulation();
    resetDashboard();
  };

  const handleClearLogs = async () => {
    await api.clearLogs();
    useDashboardStore.getState().setEvents([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Packet Generator</CardTitle>
        {stats.running && <span className="text-xs text-amber-400 font-mono animate-pulse">RUNNING — live counters updating</span>}
      </CardHeader>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="text-xs text-soc-muted block mb-1">Packet Count</label>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}
            className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm font-mono">
            {[10, 100, 1000, 10000].map((n) => <option key={n} value={n}>{n.toLocaleString()}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-soc-muted block mb-1">Payload Type</label>
          <select value={payloadType} onChange={(e) => setPayloadType(e.target.value)}
            className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm">
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-soc-muted block mb-1">Payload Size</label>
          <select value={payloadSize} onChange={(e) => setPayloadSize(Number(e.target.value))}
            className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm">
            {PAYLOAD_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-soc-muted block mb-1">Replay Attack %</label>
          <select value={replayPct} onChange={(e) => setReplayPct(Number(e.target.value))}
            className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm">
            {REPLAY_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleStart} disabled={loading || stats.running}><Play className="w-4 h-4" /> Start Test</Button>
        <Button variant="destructive" onClick={() => api.stopSimulation()}><Square className="w-4 h-4" /> Stop</Button>
        <Button variant="outline" onClick={handleReset}><RotateCcw className="w-4 h-4" /> Reset Dashboard</Button>
        <Button variant="outline" onClick={handleClearLogs}><Trash2 className="w-4 h-4" /> Clear Logs</Button>
      </div>
      <p className="text-xs text-soc-muted mt-3">
        All statistics are computed from packet history — {stats.total_sent} packets recorded.
      </p>
    </Card>
  );
}

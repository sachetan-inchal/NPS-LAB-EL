import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle, Laptop, MessageSquare, Mic,
  Radio, Send, Shield, Smartphone, Thermometer, Video, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, statusToVariant } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviceMetricsPanel } from '@/components/device/DeviceMetricsPanel';
import { EncryptionPreview, type EncryptionResult } from '@/components/device/EncryptionPreview';
import { deviceApi } from '@/services/api';
import { formatTimestamp } from '@/lib/time';
import type { DeviceStatus } from '@/store/dashboardStore';

const PRESETS = [
  { id: 'chat', label: 'Chat Message', icon: MessageSquare, msg: 'CHAT: Hello from ZTON overlay — secure message' },
  { id: 'sensor', label: 'Sensor Data', icon: Thermometer, msg: 'SENSOR: temp=23.4°C humidity=61% pressure=1013hPa' },
  { id: 'video', label: 'Video Stream', icon: Video, msg: 'VIDEO_CHUNK: frame=1847 size=4096 codec=mjpeg' },
  { id: 'voice', label: 'Voice Stream', icon: Mic, msg: 'VOICE: opus_frame_120ms seq=442' },
  { id: 'file', label: 'File Transfer', icon: Radio, msg: 'FILE: report.pdf size=256KB checksum=sha256:abc123' },
];

const TARGET_OPTIONS: Record<string, { value: string; label: string; help: string }[]> = {
  'laptop-b': [
    {
      value: '',
      label: 'Send to Hub only (Laptop A — tab 8080)',
      help: 'Packet goes to the central hub. Hub decrypts and logs ACCEPTED. Use this for most demos.',
    },
    {
      value: 'phone-b',
      label: 'Send to Phone B (tab 8082) via Hub',
      help: 'Hub receives your packet, then forwards an encrypted copy to Phone B. Open tab 8082 to see Phone B receive and decrypt it.',
    },
  ],
  'phone-b': [
    {
      value: '',
      label: 'Send to Hub only (Laptop A — tab 8080)',
      help: 'Phone B sends to the hub. To receive messages, stay on this tab — Laptop B must choose "Send to Phone B" as target.',
    },
  ],
  'phone-a': [
    {
      value: '',
      label: 'Send to Hub (will always be DENIED)',
      help: 'Phone A is on the deny-list. Zero-trust policy blocks ALL packets — you will never get ACCEPT on this device (by design).',
    },
  ],
};

const DEVICE_META: Record<string, { color: string; icon: typeof Laptop; port: string }> = {
  'laptop-b': { color: 'from-blue-600 to-cyan-600', icon: Laptop, port: '8081' },
  'phone-b': { color: 'from-emerald-600 to-teal-600', icon: Smartphone, port: '8082' },
  'phone-a': { color: 'from-red-600 to-orange-600', icon: Smartphone, port: '8083' },
};

interface LivePacket {
  timestamp: string;
  sender: string;
  decision: string;
  status: string;
  message: string;
  payload_size: number;
  nonce: number;
}

export function DeviceClientPage() {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('');
  const [activePreset, setActivePreset] = useState('chat');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [log, setLog] = useState<Array<{ time: string; kind: string; text: string }>>([]);
  const [hubStats, setHubStats] = useState({ sent: 0, accepted: 0, dropped: 0, replay_blocked: 0 });
  const [traffic, setTraffic] = useState<Array<{ time: string; accepted: number; dropped: number; volume: number }>>([]);
  const [livePackets, setLivePackets] = useState<LivePacket[]>([]);
  const [lastEncrypted, setLastEncrypted] = useState<EncryptionResult | null>(null);

  const deviceId = status?.device_id ?? '';

  const refresh = useCallback(async () => {
    try {
      const m = await deviceApi.metrics();
      if (!m.ok) return;

      setStatus({
        device_id: m.device_id,
        device_name: m.device_name,
        role: 'node',
        hub: '',
        authorized: m.authorized,
        registered: m.registered,
        policy_result: m.authorized ? 'ALLOW' : 'DENY',
        local_port: 0,
        targets: [],
        packets_sent: m.stats.total_sent,
        packets_accepted: m.stats.accepted,
        packets_denied: m.stats.dropped,
        events: m.events,
      });

      setHubStats({
        sent: m.stats.total_sent,
        accepted: m.stats.accepted,
        dropped: m.stats.dropped,
        replay_blocked: m.stats.replay_blocked,
      });
      setTraffic(m.traffic ?? []);
      setLivePackets((m.packets ?? []) as unknown as LivePacket[]);
      setLog(
        (m.events || []).slice().reverse().map((e) => ({
          time: formatTimestamp(e.timestamp),
          kind: e.kind,
          text: e.message,
        })),
      );

      const encryptedEv = [...(m.events || [])].reverse().find((e) => e.kind === 'encrypted');
      if (encryptedEv?.stats) {
        const st = encryptedEv.stats as Record<string, unknown>;
        setLastEncrypted({
          plaintext: String(st.plaintext ?? st.plaintext_preview ?? encryptedEv.message ?? ''),
          ciphertext_preview: String(st.ciphertext_preview ?? 'gAAAAA…'),
          original_bytes: st.original_bytes as number | undefined,
          compressed_bytes: st.compressed_bytes as number | undefined,
          encrypted_bytes: st.encrypted_bytes as number | undefined,
          sequence: st.sequence as number | undefined,
          target_label: encryptedEv.target ? `${encryptedEv.target} (forwarded by hub)` : 'Hub (Laptop A — port 8080)',
        });
      }
    } catch { /* retry */ }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 800);
    return () => clearInterval(t);
  }, [refresh]);

  const meta = DEVICE_META[deviceId] ?? { color: 'from-gray-600 to-gray-700', icon: Shield, port: '?' };
  const Icon = meta.icon;
  const authorized = status?.authorized !== false;
  const targets = TARGET_OPTIONS[deviceId] ?? [{ value: '', label: 'Hub', help: '' }];
  const selectedTargetHelp = targets.find((t) => t.value === target)?.help ?? '';

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.id);
    setMessage(preset.msg);
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text) {
      setFeedback({ type: 'err', text: 'Type a message or click a preset button first.' });
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      const res = await deviceApi.send(text, target);
      if (res.ok && res.stats) {
        const s = res.stats as EncryptionResult & Record<string, unknown>;
        setLastEncrypted({
          plaintext: text,
          ciphertext_preview: String(s.ciphertext_preview ?? 'gAAAAA…'),
          original_bytes: s.original_bytes as number,
          compressed_bytes: s.compressed_bytes as number,
          encrypted_bytes: s.encrypted_bytes as number,
          sequence: s.sequence as number,
          target_label: String(s.target_label ?? (target || 'hub')),
          session_id: String(s.session_id ?? ''),
        });
        setFeedback({
          type: authorized ? 'ok' : 'err',
          text: authorized
            ? `Encrypted & sent → ${s.target_label ?? 'hub'}. Check pipeline below.`
            : `Encrypted locally but Hub will DENY — Phone A is unauthorized (zero-trust demo).`,
        });
        setTimeout(refresh, 400);
        setTimeout(refresh, 1000);
      } else {
        setFeedback({ type: 'err', text: res.error ?? 'Send failed' });
      }
    } catch (e) {
      setFeedback({ type: 'err', text: String(e) });
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen soc-grid-bg">
      <header className="border-b border-soc-border/60 bg-soc-bg/90 backdrop-blur-xl px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{status?.device_name ?? 'ZTON Device'}</h1>
            <p className="text-sm text-soc-muted">
              Device Console · Port {meta.port} · Hub feedback live below
            </p>
          </div>
          <Badge variant={authorized ? 'online' : 'danger'}>
            {authorized ? 'AUTHORIZED' : 'UNAUTHORIZED'}
          </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* Live metrics from hub */}
        <Card className="border-emerald-500/20">
          <CardHeader>
            <CardTitle>Live Traffic Analytics — This Device</CardTitle>
            <Badge variant="online">Updates every 1s</Badge>
          </CardHeader>
          <DeviceMetricsPanel
            sent={hubStats.sent}
            accepted={hubStats.accepted}
            dropped={hubStats.dropped}
            replayBlocked={hubStats.replay_blocked}
            traffic={traffic}
          />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Send panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Step 1 — Payload Type</CardTitle></CardHeader>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => {
                  const PIcon = p.icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        activePreset === p.id
                          ? 'bg-soc-accent text-white border-soc-accent'
                          : 'bg-soc-card border-soc-border text-soc-muted hover:border-soc-accent/50'
                      }`}
                    >
                      <PIcon className="w-3.5 h-3.5" />{p.label}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Step 2 — Your Message</CardTitle></CardHeader>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type here…"
                rows={3}
                className="w-full bg-soc-card border border-soc-border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-soc-accent/50"
              />
            </Card>

            <Card>
              <CardHeader><CardTitle>Step 3 — Who receives this packet?</CardTitle></CardHeader>
              {!authorized && (
                <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
                  <strong>Phone A is ALWAYS denied.</strong> This device is on the zero-trust block list.
                  Every packet gets <strong>DENY</strong> — there is no ACCEPT on port 8083 (that is the demo point).
                </div>
              )}
              {deviceId === 'laptop-b' && (
                <p className="text-xs text-soc-muted mb-2">
                  <strong>Hub only</strong> = hub logs it on tab 8080.
                  <strong> Phone B</strong> = hub forwards encrypted copy to tab 8082.
                </p>
              )}
              <div className="flex flex-col gap-3">
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="bg-soc-card border border-soc-border rounded-lg px-4 py-2.5 text-sm"
                >
                  {targets.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {selectedTargetHelp && (
                  <p className="text-xs text-blue-300/90 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    ℹ️ {selectedTargetHelp}
                  </p>
                )}
                <Button
                  size="lg"
                  variant={authorized ? 'default' : 'destructive'}
                  onClick={handleSend}
                  disabled={sending}
                >
                  <Send className="w-5 h-5" />
                  {authorized ? 'Send Encrypted Packet' : 'Attempt Send (Denied)'}
                </Button>
              </div>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-3 flex items-center gap-2 p-3 rounded-lg text-sm ${
                    feedback.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {feedback.type === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  {feedback.text}
                </motion.div>
              )}
            </Card>
          </div>

          {/* Encryption + logs */}
          <div className="space-y-4">
            <EncryptionPreview data={lastEncrypted} />

            <Card>
              <CardHeader>
                <CardTitle>Hub Packet Log (this device)</CardTitle>
                <a href="http://localhost:8080" target="_blank" rel="noreferrer" className="text-xs text-soc-accent">Open Hub 8080 →</a>
              </CardHeader>
              <div className="overflow-x-auto max-h-52 overflow-y-auto">
                <table className="w-full text-xs font-mono">
                  <thead className="sticky top-0 bg-soc-panel">
                    <tr className="text-soc-muted border-b border-soc-border">
                      <th className="text-left py-2 px-2">Timestamp</th>
                      <th className="text-left py-2 px-2">Decision</th>
                      <th className="text-left py-2 px-2">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {livePackets.length === 0 && (
                      <tr><td colSpan={3} className="py-6 text-center text-soc-muted">Send a packet — results appear here</td></tr>
                    )}
                    {livePackets.map((p, i) => (
                      <tr key={i} className="border-b border-soc-border/30">
                        <td className="py-2 px-2 text-soc-muted whitespace-nowrap">{formatTimestamp(p.timestamp)}</td>
                        <td className="py-2 px-2">
                          <Badge variant={statusToVariant(p.status)}>{p.status}</Badge>
                        </td>
                        <td className="py-2 px-2 truncate max-w-[180px]">{p.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Activity</CardTitle>
                <Badge variant={status?.registered ? 'online' : 'warning'}>
                  {status?.registered ? 'Connected' : 'Connecting…'}
                </Badge>
              </CardHeader>
              <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-xs">
                {log.map((entry, i) => (
                  <div key={i} className={`p-2 rounded border ${
                    entry.kind === 'deny' ? 'border-red-500/30 bg-red-500/5' :
                    entry.kind === 'encrypted' ? 'border-amber-500/30 bg-amber-500/5' :
                    entry.kind === 'packet' || entry.kind === 'sent' ? 'border-emerald-500/30 bg-emerald-500/5' :
                    'border-soc-border/40'
                  }`}>
                    <span className="text-soc-muted">{entry.time}</span> [{entry.kind}] {entry.text}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

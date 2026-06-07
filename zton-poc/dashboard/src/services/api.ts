import type {
  DashboardStats, PacketRecord, Policy, Scenario,
  SecurityEvent, SimulateConfig, SystemStatus, TopologyEdge, TopologyNode,
} from '@/types';
import type { DeviceStatus } from '@/store/dashboardStore';

const SOC = '/api/soc';
const BASE = '/api';

async function fetchSoc<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SOC}${path}`, init);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

async function fetchBase<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  status: () => fetchSoc<SystemStatus>('/status'),
  stats: () => fetchSoc<DashboardStats>('/stats'),
  packets: (limit = 100) => fetchSoc<{ packets: PacketRecord[] }>(`/packets?limit=${limit}`),
  events: (limit = 50) => fetchSoc<{ events: SecurityEvent[] }>(`/events?limit=${limit}`),
  policies: () => fetchSoc<{ policies: Policy[] }>('/policies'),
  topology: () => fetchSoc<{ nodes: TopologyNode[]; edges: TopologyEdge[] }>('/topology'),
  scenarios: () => fetchSoc<{ scenarios: Scenario[]; payload_types: string[] }>('/scenarios'),
  startSimulation: (config: SimulateConfig) =>
    fetchSoc('/simulate/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) }),
  stopSimulation: () => fetchSoc('/simulate/stop', { method: 'POST' }),
  resetSimulation: () => fetchSoc('/simulate/reset', { method: 'POST' }),
  runScenario: (id: string) => fetchSoc(`/scenarios/${id}/run`, { method: 'POST' }),
};

/** Device node APIs (ports 8081–8083) */
export const deviceApi = {
  status: () => fetchBase<DeviceStatus>('/status'),
  send: (message: string, target_id = '') =>
    fetchBase<{ ok: boolean; stats?: Record<string, unknown>; error?: string }>('/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, target_id }),
    }),
  events: () => fetchBase<{ events: DeviceStatus['events'] }>('/events'),
  metrics: () => fetchBase<{
    ok: boolean;
    device_id: string;
    device_name: string;
    registered: boolean;
    authorized: boolean;
    stats: { total_sent: number; accepted: number; dropped: number; replay_blocked: number };
    traffic: Array<{ time: string; accepted: number; dropped: number; volume: number }>;
    packets: Array<Record<string, unknown>>;
    events: DeviceStatus['events'];
    server_time: string;
  }>('/device/metrics'),
  detectRole: async (): Promise<'hub' | 'node'> => {
    const s = await fetchBase<{ role: string }>('/status');
    return s.role === 'node' ? 'node' : 'hub';
  },
};

const HUB_URL = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:8080`
  : 'http://localhost:8080';

/** Fetch live metrics from the hub (port 8080) — works from device tabs via CORS */
export const hubLiveApi = {
  stats: (deviceId: string) =>
    fetch(`${HUB_URL}/api/live/stats?device_id=${deviceId}`).then((r) => r.json()) as Promise<{
      accepted: number; dropped: number; total_sent: number; replay_blocked: number;
    }>,
  traffic: (deviceId: string) =>
    fetch(`${HUB_URL}/api/live/traffic?device_id=${deviceId}`).then((r) => r.json()) as Promise<{
      points: Array<{ time: string; accepted: number; dropped: number; volume: number }>;
    }>,
  packets: (deviceId: string) =>
    fetch(`${HUB_URL}/api/live/packets?device_id=${deviceId}&limit=20`).then((r) => r.json()) as Promise<{
      packets: Array<Record<string, unknown>>;
    }>,
};

export function connectSocWebSocket(onMessage: (data: unknown) => void): WebSocket {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/api/soc/ws`);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  ws.onclose = () => setTimeout(() => connectSocWebSocket(onMessage), 3000);
  return ws;
}

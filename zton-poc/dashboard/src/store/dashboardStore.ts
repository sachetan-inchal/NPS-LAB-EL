import { create } from 'zustand';
import type {
  DashboardStats, PacketRecord, Policy, Scenario,
  SecurityEvent, SystemStatus, TopologyEdge, TopologyNode,
} from '@/types';

export interface DeviceStatus {
  role: string;
  device_id: string;
  device_name: string;
  authorized: boolean;
  registered: boolean;
  policy_result: string;
  hub: string;
  local_port?: number;
  targets: string[];
  packets_sent?: number;
  packets_accepted?: number;
  packets_denied?: number;
  events: Array<{ kind: string; message: string; stats?: Record<string, number>; timestamp: string; target?: string }>;
}

interface DashboardState {
  tab: 'overview' | 'demo' | 'presentation';
  presentationMode: boolean;
  appMode: 'loading' | 'hub' | 'device';
  deviceStatus: DeviceStatus | null;
  systemStatus: SystemStatus | null;
  stats: DashboardStats | null;
  packets: PacketRecord[];
  events: SecurityEvent[];
  policies: Policy[];
  scenarios: Scenario[];
  payloadTypes: string[];
  topology: { nodes: TopologyNode[]; edges: TopologyEdge[] };
  activeFlow: { source: string; target: string; status: 'allowed' | 'blocked' } | null;
  setTab: (tab: DashboardState['tab']) => void;
  togglePresentation: () => void;
  setAppMode: (mode: DashboardState['appMode']) => void;
  setDeviceStatus: (s: DeviceStatus | null) => void;
  setSystemStatus: (s: SystemStatus) => void;
  setStats: (s: DashboardStats) => void;
  setPackets: (p: PacketRecord[]) => void;
  prependPacket: (p: PacketRecord) => void;
  setEvents: (e: SecurityEvent[]) => void;
  prependEvent: (e: SecurityEvent) => void;
  setPolicies: (p: Policy[]) => void;
  setScenarios: (s: Scenario[], types: string[]) => void;
  setTopology: (nodes: TopologyNode[], edges: TopologyEdge[]) => void;
  setActiveFlow: (flow: DashboardState['activeFlow']) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  tab: 'overview',
  presentationMode: false,
  appMode: 'loading',
  deviceStatus: null,
  systemStatus: null,
  stats: null,
  packets: [],
  events: [],
  policies: [],
  scenarios: [],
  payloadTypes: [],
  topology: { nodes: [], edges: [] },
  activeFlow: null,
  setTab: (tab) => set({ tab }),
  togglePresentation: () => set((s) => ({ presentationMode: !s.presentationMode })),
  setAppMode: (appMode) => set({ appMode }),
  setDeviceStatus: (deviceStatus) => set({ deviceStatus }),
  setSystemStatus: (systemStatus) => set({ systemStatus }),
  setStats: (stats) => set({ stats }),
  setPackets: (packets) => set({ packets }),
  prependPacket: (p) => set((s) => ({ packets: [p, ...s.packets].slice(0, 200) })),
  setEvents: (events) => set({ events }),
  prependEvent: (e) => set((s) => ({ events: [e, ...s.events].slice(0, 100) })),
  setPolicies: (policies) => set({ policies }),
  setScenarios: (scenarios, payloadTypes) => set({ scenarios, payloadTypes }),
  setTopology: (nodes, edges) => set({ topology: { nodes, edges } }),
  setActiveFlow: (activeFlow) => set({ activeFlow }),
}));

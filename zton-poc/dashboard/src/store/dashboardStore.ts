import { create } from 'zustand';
import type {
  DashboardStats, FabricStatus, PacketRecord, Policy, Scenario,
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

const EMPTY_STATS: DashboardStats = {
  total_sent: 0,
  total_received: 0,
  accepted: 0,
  dropped: 0,
  replay_blocked: 0,
  active_sessions: 0,
  running: false,
  traffic: [],
  traffic_volume: 0,
  volume_by_type: [],
};

interface DashboardState {
  tab: 'overview' | 'demo' | 'presentation';
  presentationMode: boolean;
  appMode: 'loading' | 'hub' | 'device';
  deviceStatus: DeviceStatus | null;
  systemStatus: SystemStatus | null;
  fabricStatus: FabricStatus | null;
  stats: DashboardStats;
  packets: PacketRecord[];
  events: SecurityEvent[];
  policies: Policy[];
  scenarios: Scenario[];
  payloadTypes: string[];
  topology: { nodes: TopologyNode[]; edges: TopologyEdge[] };
  activeFlow: { source: string; target: string; status: 'allowed' | 'blocked' } | null;
  selectedPacket: PacketRecord | null;
  serverTime: string;
  setTab: (tab: DashboardState['tab']) => void;
  togglePresentation: () => void;
  setAppMode: (mode: DashboardState['appMode']) => void;
  setDeviceStatus: (s: DeviceStatus | null) => void;
  setSystemStatus: (s: SystemStatus) => void;
  setFabricStatus: (s: FabricStatus | null) => void;
  setStats: (s: DashboardStats) => void;
  setPackets: (p: PacketRecord[]) => void;
  setEvents: (e: SecurityEvent[]) => void;
  setPolicies: (p: Policy[]) => void;
  setScenarios: (s: Scenario[], types: string[]) => void;
  setTopology: (nodes: TopologyNode[], edges: TopologyEdge[]) => void;
  setActiveFlow: (flow: DashboardState['activeFlow']) => void;
  setSelectedPacket: (p: PacketRecord | null) => void;
  setServerTime: (t: string) => void;
  resetDashboard: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  tab: 'overview',
  presentationMode: false,
  appMode: 'loading',
  deviceStatus: null,
  systemStatus: null,
  fabricStatus: null,
  stats: EMPTY_STATS,
  packets: [],
  events: [],
  policies: [],
  scenarios: [],
  payloadTypes: [],
  topology: { nodes: [], edges: [] },
  activeFlow: null,
  selectedPacket: null,
  serverTime: '',
  setTab: (tab) => set({ tab }),
  togglePresentation: () => set((s) => ({ presentationMode: !s.presentationMode })),
  setAppMode: (appMode) => set({ appMode }),
  setDeviceStatus: (deviceStatus) => set({ deviceStatus }),
  setSystemStatus: (systemStatus) => set({ systemStatus, fabricStatus: systemStatus.fabric ?? null }),
  setFabricStatus: (fabricStatus) => set({ fabricStatus }),
  setStats: (stats) => set({ stats }),
  setPackets: (packets) => set({ packets }),
  setEvents: (events) => set({ events }),
  setPolicies: (policies) => set({ policies }),
  setScenarios: (scenarios, payloadTypes) => set({ scenarios, payloadTypes }),
  setTopology: (nodes, edges) => set({ topology: { nodes, edges } }),
  setActiveFlow: (activeFlow) => set({ activeFlow }),
  setSelectedPacket: (selectedPacket) => set({ selectedPacket }),
  setServerTime: (serverTime) => set({ serverTime }),
  resetDashboard: () => set({
    stats: EMPTY_STATS,
    packets: [],
    events: [],
    activeFlow: null,
    selectedPacket: null,
  }),
}));

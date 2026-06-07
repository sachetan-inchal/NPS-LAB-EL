export type StatusLevel = 'ONLINE' | 'OFFLINE' | 'WARNING';

export interface SystemStatus {
  controller: { status: string; label: string };
  router: { status: string; label: string };
  overlay: { status: string; label: string };
  encryption: { status: string; label: string };
  connected_nodes: { count: number; status: string; peers: string[] };
}

export interface DashboardStats {
  total_sent: number;
  total_received: number;
  accepted: number;
  dropped: number;
  replay_blocked: number;
  active_sessions: number;
  running: boolean;
  traffic: TrafficPoint[];
}

export interface TrafficPoint {
  time: string;
  pps: number;
  accepted: number;
  dropped: number;
}

export interface PacketRecord {
  id: string;
  timestamp: string;
  sender: string;
  sender_id: string;
  receiver: string;
  session_id: string;
  nonce: number;
  payload_type: string;
  encryption: string;
  decision: string;
  status: string;
  payload_size: number;
  ciphertext_preview: string;
  live?: boolean;
}

export interface SecurityEvent {
  level: string;
  message: string;
  timestamp: string;
  source: string;
}

export interface Policy {
  id: string;
  effect: 'allow' | 'deny' | 'info';
  source: string;
  target: string;
  rule: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  count: number;
  replay_pct: number;
  payload_type: string;
  payload_size: number;
  force_sender?: string;
}

export interface TopologyNode {
  id: string;
  label: string;
  type: string;
  status: string;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
}

export interface SimulateConfig {
  count: number;
  payload_type: string;
  payload_size: number;
  replay_pct: number;
  interval_ms: number;
}

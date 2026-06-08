export type StatusLevel = 'ONLINE' | 'OFFLINE' | 'WARNING';

export interface SystemStatus {
  controller: { status: string; label: string };
  router: { status: string; label: string };
  overlay: { status: string; label: string };
  encryption: { status: string; label: string };
  connected_nodes: { count: number; status: string; peers: string[] };
  fabric?: FabricStatus;
  server_time?: string;
}

export interface FabricService {
  name: string;
  host: string;
  port: number;
  status: string;
  detail: string;
}

export interface FabricTruthItem {
  id: string;
  label: string;
  status: 'active' | 'waiting' | 'next-step';
  description: string;
}

export interface FabricStatus {
  mode: string;
  fabric_online: boolean;
  controller: FabricService;
  router: FabricService;
  console_url: string;
  zton_transport: string;
  traffic_integration: string;
  truth_model: FabricTruthItem[];
  recommended_run: string;
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
  traffic_volume?: number;
  volume_by_type?: VolumePoint[];
  server_time?: string;
}

export interface TrafficPoint {
  time: string;
  pps: number;
  accepted: number;
  dropped: number;
  replay?: number;
  volume?: number;
}

export interface VolumePoint {
  type: string;
  volume: number;
}

export interface PacketRecord {
  packet_id?: string;
  id: string;
  timestamp: string;
  sender: string;
  sender_id: string;
  receiver: string;
  session_id: string;
  sequence_number?: number;
  nonce: number;
  payload_type: string;
  encryption: string;
  decision: string;
  status: string;
  reason?: string;
  payload_size: number;
  plaintext?: string;
  encrypted_payload?: string;
  ciphertext_preview: string;
  signature_b64?: string;
  is_replay?: boolean;
  live?: boolean;
}

export interface SecurityEvent {
  level: string;
  message: string;
  timestamp: string;
  source: string;
  packet_id?: string;
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
  kind?: string;
}

export interface SimulateConfig {
  count: number;
  payload_type: string;
  payload_size: number;
  replay_pct: number;
  interval_ms: number;
  force_sender?: string;
}

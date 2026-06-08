import { useEffect } from 'react';
import { api, connectSocWebSocket } from '@/services/api';
import { useDashboardStore } from '@/store/dashboardStore';
import type { DashboardStats, PacketRecord, SecurityEvent } from '@/types';

function normalizePacket(p: PacketRecord): PacketRecord {
  return {
    ...p,
    id: p.packet_id ?? p.id,
    packet_id: p.packet_id ?? p.id,
    nonce: p.sequence_number ?? p.nonce ?? 0,
    sequence_number: p.sequence_number ?? p.nonce ?? 0,
    ciphertext_preview: p.ciphertext_preview ?? p.encrypted_payload?.slice(0, 56) ?? '',
  };
}

export function useDashboardData() {
  useEffect(() => {
    const load = async () => {
      try {
        const [status, stats, packets, events, policies, topo, scenarios] = await Promise.all([
          api.status(),
          api.stats(),
          api.packets(),
          api.events(),
          api.policies(),
          api.topology(),
          api.scenarios(),
        ]);
        const s = useDashboardStore.getState();
        s.setSystemStatus(status);
        s.setStats(stats);
        s.setPackets(packets.packets.map(normalizePacket));
        s.setEvents(events.events);
        s.setPolicies(policies.policies);
        s.setTopology(topo.nodes, topo.edges);
        s.setScenarios(scenarios.scenarios, scenarios.payload_types);
        if (stats.server_time) s.setServerTime(stats.server_time);
        else if (status.server_time) s.setServerTime(status.server_time);
      } catch (err) {
        console.error('Dashboard load failed:', err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const ws = connectSocWebSocket((data) => {
      const msg = data as {
        type: string;
        update_type?: string;
        server_time?: string;
        stats?: DashboardStats & { traffic?: DashboardStats['traffic'] };
        latest_packet?: PacketRecord;
        latest_event?: SecurityEvent;
        volume_by_type?: DashboardStats['volume_by_type'];
        new_packet?: boolean;
        packets?: PacketRecord[];
        events?: SecurityEvent[];
      };

      const s = useDashboardStore.getState();
      if (msg.server_time) s.setServerTime(msg.server_time);

      if (msg.type === 'init' && msg.packets && msg.events) {
        s.setStats(msg.stats!);
        s.setPackets(msg.packets.map(normalizePacket));
        s.setEvents(msg.events);
        return;
      }

      if (msg.stats) {
        s.setStats({
          total_sent: msg.stats.total_sent ?? 0,
          total_received: msg.stats.total_received ?? msg.stats.total_sent ?? 0,
          accepted: msg.stats.accepted ?? 0,
          dropped: msg.stats.dropped ?? 0,
          replay_blocked: msg.stats.replay_blocked ?? 0,
          active_sessions: msg.stats.active_sessions ?? 0,
          running: Boolean(msg.stats.running),
          traffic: msg.stats.traffic ?? s.stats.traffic,
          traffic_volume: msg.stats.traffic_volume ?? 0,
          volume_by_type: msg.volume_by_type ?? s.stats.volume_by_type,
          server_time: msg.server_time,
        });
      }

      if (msg.latest_packet && msg.new_packet) {
        const pkt = normalizePacket(msg.latest_packet);
        const cur = s.packets;
        s.setPackets([pkt, ...cur.filter((p) => (p.packet_id ?? p.id) !== (pkt.packet_id ?? pkt.id))].slice(0, 500));
        s.setActiveFlow({
          source: pkt.sender_id || 'laptop-b',
          target: pkt.receiver || 'laptop-a',
          status: pkt.status === 'ACCEPTED' ? 'allowed' : 'blocked',
        });
        setTimeout(() => {
          if (useDashboardStore.getState().activeFlow?.source === pkt.sender_id) {
            useDashboardStore.getState().setActiveFlow(null);
          }
        }, 1200);
      }

      if (msg.latest_event) {
        const cur = s.events;
        const exists = cur.some(
          (e) => e.timestamp === msg.latest_event!.timestamp && e.message === msg.latest_event!.message,
        );
        if (!exists) s.setEvents([msg.latest_event, ...cur].slice(0, 100));
      }
    });

    const poll = setInterval(async () => {
      try {
        const [status, stats, packets, events] = await Promise.all([
          api.status(), api.stats(), api.packets(500), api.events(100),
        ]);
        const s = useDashboardStore.getState();
        s.setSystemStatus(status);
        s.setStats(stats);
        s.setPackets(packets.packets.map(normalizePacket));
        s.setEvents(events.events);
        if (stats.server_time) s.setServerTime(stats.server_time);
      } catch { /* retry */ }
    }, 2000);

    return () => {
      ws.close();
      clearInterval(poll);
    };
  }, []);
}

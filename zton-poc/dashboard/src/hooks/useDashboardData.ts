import { useEffect } from 'react';
import { api, connectSocWebSocket } from '@/services/api';
import { useDashboardStore } from '@/store/dashboardStore';
import type { PacketRecord, SecurityEvent } from '@/types';

export function useDashboardData() {
  const store = useDashboardStore();

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
        store.setSystemStatus(status);
        store.setStats(stats);
        store.setPackets(packets.packets);
        store.setEvents(events.events);
        store.setPolicies(policies.policies);
        store.setTopology(topo.nodes, topo.edges);
        store.setScenarios(scenarios.scenarios, scenarios.payload_types);
      } catch (err) {
        console.error('Dashboard load failed:', err);
      }
    };
    load();
    const interval = setInterval(async () => {
      try {
        const [stats, packets, events] = await Promise.all([
          api.stats(), api.packets(), api.events(),
        ]);
        store.setStats(stats);
        store.setPackets(packets.packets);
        store.setEvents(events.events);
      } catch { /* retry next tick */ }
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const ws = connectSocWebSocket((data) => {
      const msg = data as {
        type: string;
        stats?: Record<string, number>;
        latest_packet?: PacketRecord;
        latest_event?: SecurityEvent;
      };
      if (msg.type === 'tick') {
        if (msg.stats && store.stats) {
          store.setStats({
            ...store.stats,
            total_sent: msg.stats.total_sent ?? store.stats.total_sent,
            accepted: msg.stats.accepted ?? store.stats.accepted,
            dropped: msg.stats.dropped ?? store.stats.dropped,
            replay_blocked: msg.stats.replay_blocked ?? store.stats.replay_blocked,
            running: Boolean(msg.stats.running),
          });
        }
        if (msg.latest_packet) {
          store.prependPacket(msg.latest_packet);
          store.setActiveFlow({
            source: msg.latest_packet.sender_id,
            target: msg.latest_packet.receiver,
            status: msg.latest_packet.status === 'ACCEPTED' ? 'allowed' : 'blocked',
          });
          setTimeout(() => store.setActiveFlow(null), 2000);
        }
        if (msg.latest_event) store.prependEvent(msg.latest_event);
      }
    });
    return () => ws.close();
  }, []);
}

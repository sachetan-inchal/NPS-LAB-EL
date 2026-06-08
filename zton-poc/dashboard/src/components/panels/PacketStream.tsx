import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusToVariant } from '@/components/ui/badge';
import { formatTimeShort } from '@/lib/time';
import type { PacketRecord } from '@/types';

export function PacketStream({
  packets,
  onSelect,
  selectedId,
}: {
  packets: PacketRecord[];
  onSelect?: (p: PacketRecord) => void;
  selectedId?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Packet History</CardTitle>
        <span className="text-xs text-soc-muted font-mono">{packets.length} records · click to inspect</span>
      </CardHeader>
      <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-soc-panel z-10">
            <tr className="text-soc-muted border-b border-soc-border">
              <th className="text-left py-2 px-2">Time</th>
              <th className="text-left py-2 px-2">Sender</th>
              <th className="text-left py-2 px-2">Receiver</th>
              <th className="text-left py-2 px-2">Sequence</th>
              <th className="text-left py-2 px-2">Payload Type</th>
              <th className="text-left py-2 px-2">Status</th>
              <th className="text-left py-2 px-2">Decision</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {packets.map((p) => {
                const id = p.packet_id ?? p.id;
                const selected = selectedId === id;
                return (
                  <motion.tr
                    key={`${id}-${p.timestamp}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => onSelect?.(p)}
                    className={`border-b border-soc-border/30 cursor-pointer transition-colors ${
                      selected ? 'bg-soc-accent/15' : 'hover:bg-soc-card/40'
                    }`}
                  >
                    <td className="py-2 px-2 text-soc-muted whitespace-nowrap">{formatTimeShort(p.timestamp)}</td>
                    <td className="py-2 px-2">{p.sender}</td>
                    <td className="py-2 px-2">{p.receiver}</td>
                    <td className="py-2 px-2">{p.sequence_number ?? p.nonce}</td>
                    <td className="py-2 px-2">{p.payload_type}</td>
                    <td className="py-2 px-2">
                      <Badge variant={statusToVariant(p.status)}>{p.status}</Badge>
                    </td>
                    <td className="py-2 px-2">{p.decision}</td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        {packets.length === 0 && (
          <p className="text-center text-soc-muted py-10 text-sm">
            No packets yet — counters are zero until you run a scenario or send from device tabs (8081–8083).
          </p>
        )}
      </div>
    </Card>
  );
}

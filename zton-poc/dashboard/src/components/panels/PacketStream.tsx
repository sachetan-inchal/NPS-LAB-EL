import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusToVariant } from '@/components/ui/badge';
import type { PacketRecord } from '@/types';

export function PacketStream({ packets }: { packets: PacketRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Packet Stream</CardTitle>
        <span className="text-xs text-soc-muted font-mono">{packets.length} records</span>
      </CardHeader>
      <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-soc-panel z-10">
            <tr className="text-soc-muted border-b border-soc-border">
              <th className="text-left py-2 px-2">Timestamp</th>
              <th className="text-left py-2 px-2">Sender</th>
              <th className="text-left py-2 px-2">Receiver</th>
              <th className="text-left py-2 px-2">Session</th>
              <th className="text-left py-2 px-2">Nonce</th>
              <th className="text-left py-2 px-2">Type</th>
              <th className="text-left py-2 px-2">Encryption</th>
              <th className="text-left py-2 px-2">Decision</th>
              <th className="text-left py-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {packets.map((p) => (
                <motion.tr
                  key={`${p.id}-${p.timestamp}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border-b border-soc-border/30 hover:bg-soc-card/40"
                >
                  <td className="py-2 px-2 text-soc-muted">{p.timestamp?.slice(11, 19) ?? '—'}</td>
                  <td className="py-2 px-2">{p.sender}</td>
                  <td className="py-2 px-2">{p.receiver}</td>
                  <td className="py-2 px-2">{p.session_id}</td>
                  <td className="py-2 px-2">{p.nonce}</td>
                  <td className="py-2 px-2">{p.payload_type}</td>
                  <td className="py-2 px-2 text-soc-muted">{p.encryption}</td>
                  <td className="py-2 px-2">{p.decision}</td>
                  <td className="py-2 px-2">
                    <Badge variant={statusToVariant(p.status)}>{p.status}</Badge>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {packets.length === 0 && (
          <p className="text-center text-soc-muted py-8 text-sm">No packets yet — start a simulation or connect nodes</p>
        )}
      </div>
    </Card>
  );
}

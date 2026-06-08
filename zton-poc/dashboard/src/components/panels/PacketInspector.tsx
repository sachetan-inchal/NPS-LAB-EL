import { X, ArrowDown, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusToVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTimestamp } from '@/lib/time';
import type { PacketRecord } from '@/types';

export function PacketInspector({
  packet,
  onClose,
}: {
  packet: PacketRecord | null;
  onClose: () => void;
}) {
  if (!packet) {
    return (
      <Card className="border-dashed border-soc-border">
        <CardHeader><CardTitle>Packet Inspector</CardTitle></CardHeader>
        <p className="text-sm text-soc-muted pb-4 px-1">Click any row in Packet History to inspect plaintext, ciphertext, and policy decision.</p>
      </Card>
    );
  }

  const seq = packet.sequence_number ?? packet.nonce;
  const encrypted = packet.encrypted_payload ?? packet.ciphertext_preview ?? '—';
  const steps = [
    { label: 'Plaintext', value: packet.plaintext || '(policy denied before encrypt)', color: 'text-soc-text' },
    { label: 'Encrypted Payload (AES-GCM)', value: encrypted, color: 'text-amber-400' },
    { label: 'Ed25519 Signature', value: packet.signature_b64?.slice(0, 64) + (packet.signature_b64 && packet.signature_b64.length > 64 ? '…' : '') || '—', color: 'text-blue-300' },
  ];

  return (
    <Card className="border-soc-accent/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-soc-accent" />
          Packet Inspector
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
      </CardHeader>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2 text-xs font-mono text-soc-muted">
          <span>ID: {packet.packet_id ?? packet.id}</span>
          <span>·</span>
          <span>{formatTimestamp(packet.timestamp)}</span>
          <span>·</span>
          <span>Seq {seq}</span>
        </div>
        <div className="flex gap-2">
          <Badge variant={statusToVariant(packet.status)}>{packet.status}</Badge>
          <Badge variant={statusToVariant(packet.decision)}>{packet.decision}</Badge>
        </div>
        {packet.reason && (
          <p className="text-xs text-soc-muted bg-soc-card rounded-lg p-2 border border-soc-border">{packet.reason}</p>
        )}
        {steps.map((step, i) => (
          <div key={step.label}>
            <div className="bg-soc-card/80 border border-soc-border/50 rounded-lg p-3">
              <div className="text-xs text-soc-muted mb-1">{step.label}</div>
              <code className={`text-xs font-mono break-all ${step.color}`}>{step.value}</code>
            </div>
            {i < steps.length - 1 && (
              <div className="flex justify-center py-0.5"><ArrowDown className="w-4 h-4 text-soc-muted" /></div>
            )}
          </div>
        ))}
        <p className="text-xs text-soc-muted font-mono">
          {packet.sender} → {packet.receiver} · {packet.payload_type} · {packet.payload_size}B
        </p>
      </div>
    </Card>
  );
}

import { ArrowDown, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export interface EncryptionResult {
  plaintext: string;
  ciphertext_preview: string;
  original_bytes?: number;
  compressed_bytes?: number;
  encrypted_bytes?: number;
  sequence?: number;
  target_label?: string;
  session_id?: string;
  encryption?: string;
  authentication?: string;
  transport?: string;
}

export function EncryptionPreview({ data }: { data: EncryptionResult | null }) {
  if (!data) {
    return (
      <Card className="border-dashed border-soc-border">
        <CardHeader><CardTitle>Encryption Pipeline</CardTitle></CardHeader>
        <p className="text-sm text-soc-muted pb-4">Send a packet to see plaintext → encrypted → UDP flow</p>
      </Card>
    );
  }

  const steps = [
    { label: '① Plaintext (your message)', value: data.plaintext, color: 'text-soc-text' },
    { label: '② Compressed (zlib)', value: `${data.compressed_bytes ?? '?'} bytes`, color: 'text-soc-muted' },
    { label: '③ Encrypted (AES-GCM)', value: data.ciphertext_preview, color: 'text-amber-400' },
    { label: '④ Signed (Ed25519) + UDP packet', value: `→ ${data.target_label ?? 'hub'} · seq ${data.sequence ?? '?'} · session ${data.session_id ?? '?'}`, color: 'text-blue-400' },
  ];

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          Last Encrypted Packet
        </CardTitle>
      </CardHeader>
      <div className="space-y-1">
        {steps.map((step, i) => (
          <div key={step.label}>
            <div className="bg-soc-card/80 border border-soc-border/50 rounded-lg p-3">
              <div className="text-xs text-soc-muted mb-1">{step.label}</div>
              <code className={`text-xs font-mono break-all ${step.color}`}>{step.value}</code>
            </div>
            {i < steps.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ArrowDown className="w-4 h-4 text-soc-muted" />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-soc-muted mt-3 font-mono">
        {data.original_bytes}B original → {data.compressed_bytes}B compressed → {data.encrypted_bytes}B encrypted
      </p>
    </Card>
  );
}

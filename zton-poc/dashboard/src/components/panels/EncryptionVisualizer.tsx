
import { motion } from 'framer-motion';
import { ArrowDown, Lock, Radio, Server, CheckCircle2, AlertTriangle, ShieldX } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStore } from '@/store/dashboardStore';

export function EncryptionVisualizer({ active }: { active: boolean }) {
  const { packets, selectedPacket } = useDashboardStore();
  
  // Use selected packet if available, otherwise fallback to the most recent packet
  const packet = selectedPacket || packets[0];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'REPLAY DETECTED':
        return <AlertTriangle className="w-5 h-5 text-amber-500 animate-bounce" />;
      default:
        return <ShieldX className="w-5 h-5 text-red-500 animate-pulse" />;
    }
  };

  const isAccepted = packet ? packet.status === 'ACCEPTED' : true;
  const isDropped = packet ? packet.status === 'DROPPED' : false;

  const steps = [
    {
      label: 'Plaintext Payload',
      title: packet?.payload_type || 'Chat Message',
      value: packet?.plaintext || 'Waiting for packet...',
      color: 'text-sky-300 border-sky-500/30 bg-sky-950/20',
      glow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]',
    },
    {
      label: 'AES-GCM Encryption',
      title: 'Ciphertext Preview',
      value: packet?.encrypted_payload 
        ? packet.encrypted_payload.slice(0, 75) + (packet.encrypted_payload.length > 75 ? '...' : '')
        : 'AES-GCM 256-bit secure envelope',
      icon: Lock,
      color: 'text-amber-400 border-amber-500/30 bg-amber-950/20',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    },
    {
      label: 'UDP Overlay Packet',
      title: `UDP Port 9999 · Seq #${packet?.sequence_number ?? 0}`,
      value: packet?.signature_b64
        ? `Sig: ${packet.signature_b64.slice(0, 32)}... (Ed25519)`
        : 'Raw UDP Socket Transmission',
      icon: Radio,
      color: 'text-indigo-400 border-indigo-500/30 bg-indigo-950/20',
      glow: 'shadow-[0_0_15px_rgba(99,102,241,0.15)]',
    },
    {
      label: 'Decryption & Zero-Trust Verification',
      title: packet ? `Status: ${packet.status}` : 'Overlay Receiver',
      value: packet
        ? (isAccepted ? `Decrypted plaintext: "${packet.plaintext}"` : `Access Denied: ${packet.reason}`)
        : 'Awaiting network packet...',
      icon: Server,
      color: isDropped
        ? 'text-red-400 border-red-500/30 bg-red-950/20'
        : packet?.decision === 'REPLAY DETECTED'
          ? 'text-amber-400 border-amber-500/30 bg-amber-950/20'
          : 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
      glow: isDropped 
        ? 'shadow-[0_0_15px_rgba(239,68,68,0.25)]' 
        : packet?.decision === 'REPLAY DETECTED'
          ? 'shadow-[0_0_15px_rgba(245,158,11,0.25)]'
          : 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
      statusIcon: packet ? getStatusIcon(packet.decision || packet.status) : null,
    },
  ];

  return (
    <Card className="h-[380px] flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Security Pipeline</CardTitle>
            <span className="text-xs text-soc-muted">Live Per-Packet Encryption Pipeline</span>
          </div>
          {packet && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-soc-card border border-soc-border">
              Packet ID: {packet.packet_id?.slice(0, 8) || packet.id?.slice(0, 8)}
            </span>
          )}
        </div>
      </CardHeader>
      <div className="flex flex-col items-center gap-1 py-1 px-4 overflow-y-auto max-h-[300px]">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center w-full">
            <motion.div
              initial={{ opacity: 0.8, y: 5 }}
              animate={packet ? { opacity: 1, y: 0, scale: [1, 1.01, 1] } : { opacity: 0.8 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className={`w-full bg-soc-card/95 border rounded-lg p-2.5 text-center flex items-center justify-between gap-3 ${step.color} ${step.glow}`}
            >
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {step.icon && <step.icon className="w-3.5 h-3.5" />}
                  <span className="text-[10px] text-soc-muted uppercase tracking-wider font-semibold">{step.label}</span>
                </div>
                <div className="text-xs font-bold truncate">{step.title}</div>
                <code className="text-[11px] font-mono opacity-90 truncate block max-w-full">{step.value}</code>
              </div>
              {step.statusIcon && (
                <div className="flex-shrink-0">
                  {step.statusIcon}
                </div>
              )}
            </motion.div>
            {i < steps.length - 1 && (
              <motion.div 
                animate={active ? { y: [0, 2, 0], opacity: [0.6, 1, 0.6] } : {}} 
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
              >
                <ArrowDown className="w-3.5 h-3.5 text-soc-muted/60 my-0.5" />
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}


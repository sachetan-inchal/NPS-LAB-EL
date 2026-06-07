import { motion } from 'framer-motion';
import { ArrowDown, Lock, Radio, Server } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

const STEPS = [
  { label: 'Plaintext', value: 'HELLO ZTON', icon: null, color: 'text-soc-text' },
  { label: 'Encrypted Payload', value: 'gAAAAABl8xK9...', icon: Lock, color: 'text-amber-400' },
  { label: 'UDP Packet', value: 'SOCK_DGRAM :9999', icon: Radio, color: 'text-blue-400' },
  { label: 'Receiver', value: 'HELLO ZTON', icon: Server, color: 'text-emerald-400' },
];

export function EncryptionVisualizer({ active }: { active: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Encryption Pipeline</CardTitle>
        <span className="text-xs text-soc-muted">AES-GCM + Ed25519</span>
      </CardHeader>
      <div className="flex flex-col items-center gap-1 py-2">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center w-full">
            <motion.div
              animate={active ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
              transition={active ? { repeat: Infinity, duration: 2, delay: i * 0.4 } : {}}
              className="w-full max-w-sm bg-soc-card/80 border border-soc-border/50 rounded-lg p-3 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                {step.icon && <step.icon className={`w-4 h-4 ${step.color}`} />}
                <span className="text-xs text-soc-muted uppercase tracking-wider">{step.label}</span>
              </div>
              <code className={`text-sm font-mono ${step.color}`}>{step.value}</code>
            </motion.div>
            {i < STEPS.length - 1 && (
              <motion.div animate={active ? { y: [0, 4, 0] } : {}} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}>
                <ArrowDown className="w-4 h-4 text-soc-muted my-1" />
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

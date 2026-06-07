import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-mono uppercase tracking-wide',
  {
    variants: {
      variant: {
        online: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        offline: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
        warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        danger: 'bg-red-500/15 text-red-400 border border-red-500/30',
        info: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

export function Badge({ className, variant, children }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)}>{children}</span>;
}

export function statusToVariant(status: string): 'online' | 'offline' | 'warning' | 'danger' | 'info' {
  const s = status.toUpperCase();
  if (s === 'ONLINE' || s === 'ACCEPTED' || s === 'ALLOW') return 'online';
  if (s === 'OFFLINE' || s === 'DROPPED' || s === 'DENY' || s === 'BLOCKED') return 'danger';
  if (s === 'WARNING' || s === 'REPLAY DETECTED') return 'warning';
  return 'info';
}

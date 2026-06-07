import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { formatNumber } from '@/lib/utils';

export function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => formatNumber(Math.round(v)));
  const [text, setText] = useState('0');
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    spring.set(value);
    return display.on('change', (v) => setText(v));
  }, [value, spring, display]);

  return (
    <motion.span ref={ref} className={className} key={value}>
      {text}
    </motion.span>
  );
}

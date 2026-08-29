'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ensureGsapDefaults, prefersReducedMotion } from '@/lib/motion';

type UnreadBadgeProps = {
  count: number;
  className?: string;
};

/** Unread count pill — soft scale pulse when count becomes visible. */
export function UnreadBadge({ count, className = '' }: UnreadBadgeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || count <= 0) {
        prev.current = count;
        return;
      }
      if (prefersReducedMotion()) {
        prev.current = count;
        return;
      }
      // Pulse when unread appears or increases
      if (count > prev.current) {
        ensureGsapDefaults();
        gsap.fromTo(
          el,
          { scale: 0.7 },
          { scale: 1, duration: 0.35, ease: 'back.out(2)' },
        );
      }
      prev.current = count;
    },
    { dependencies: [count] },
  );

  if (count <= 0) return null;

  return (
    <span
      ref={ref}
      className={`bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

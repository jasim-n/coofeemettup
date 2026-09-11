'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ensureGsapDefaults, prefersReducedMotion } from '@/lib/motion';

type FadeInProps = {
  children: React.ReactNode;
  className?: string;
  /** Re-run when deps change (e.g. login step). */
  deps?: unknown[];
  delay?: number;
  duration?: number;
  y?: number;
};

/** Single block fade + rise on mount. Respects reduced motion. */
export function FadeIn({
  children,
  className = '',
  deps = [],
  delay = 0,
  duration = 0.45,
  y = 12,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      ensureGsapDefaults();
      gsap.fromTo(
        el,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      );
    },
    { scope: ref, dependencies: deps },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

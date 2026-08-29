'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ensureGsapDefaults, prefersReducedMotion } from '@/lib/motion';

type StaggerInProps = {
  children: React.ReactNode;
  className?: string;
  /** Selector for items to stagger; default: direct children */
  itemSelector?: string;
  /** Re-run when this key changes (e.g. filter results) */
  deps?: unknown[];
};

/**
 * One-shot stagger reveal for card grids. Skips when reduced motion is on.
 */
export function StaggerIn({
  children,
  className = '',
  itemSelector,
  deps = [],
}: StaggerInProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || prefersReducedMotion()) return;
      ensureGsapDefaults();
      const items = itemSelector
        ? root.querySelectorAll(itemSelector)
        : root.children;
      if (!items.length) return;
      gsap.fromTo(
        items,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.06,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      );
    },
    { scope: rootRef, dependencies: deps },
  );

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}

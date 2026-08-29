'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ensureGsapDefaults, prefersReducedMotion } from '@/lib/motion';

type EmptyMascotProps = {
  title: string;
  description?: string;
  /** Optional action under the copy */
  action?: React.ReactNode;
  className?: string;
  /** Speech-style quip above the mascot */
  quip?: string;
};

/**
 * Calm empty-state with the Nine Circles penguin — one soft enter, then still.
 */
export function EmptyMascot({
  title,
  description,
  action,
  className = '',
  quip = 'Nothing here yet — but the circle’s waiting.',
}: EmptyMascotProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      if (prefersReducedMotion()) return;
      ensureGsapDefaults();
      const mascot = root.querySelector('[data-empty-mascot]');
      const copy = root.querySelector('[data-empty-copy]');
      gsap.fromTo(
        mascot,
        { opacity: 0, y: 16, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'power2.out' },
      );
      gsap.fromTo(
        copy,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.45, delay: 0.12, ease: 'power2.out' },
      );
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      className={`rounded-3xl border border-dashed px-6 py-14 text-center ${className}`}
    >
      <div data-empty-mascot className="mx-auto mb-3 flex flex-col items-center">
        {quip && (
          <p className="mb-2 max-w-[14rem] rounded-2xl rounded-bl-md bg-secondary px-3 py-1.5 text-xs font-semibold text-ink">
            {quip}
          </p>
        )}
        <Image
          src="/brand/mascot-sm.png"
          alt=""
          width={96}
          height={96}
          className="size-24 object-contain"
          aria-hidden
        />
      </div>
      <div data-empty-copy>
        <p className="font-heading font-bold tracking-tight">{title}</p>
        {description && (
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">{description}</p>
        )}
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

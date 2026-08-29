'use client';

import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ensureGsapDefaults, prefersReducedMotion } from '@/lib/motion';

type SideDrawerProps = {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  title: string;
  children: React.ReactNode;
};

/**
 * Mobile slide-over panel. Desktop pages keep their side columns;
 * this is only for small screens.
 */
export function SideDrawer({
  open,
  onClose,
  side = 'left',
  title,
  children,
}: SideDrawerProps) {
  const [mounted, setMounted] = useState(open);
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fromLeft = side === 'left';

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!mounted || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, open, onClose]);

  useGSAP(
    () => {
      if (!mounted) return;
      const backdrop = backdropRef.current;
      const panel = panelRef.current;
      if (!backdrop || !panel) return;

      if (prefersReducedMotion()) {
        if (!open) setMounted(false);
        return;
      }

      ensureGsapDefaults();
      const xFrom = fromLeft ? '-100%' : '100%';

      if (open) {
        gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        gsap.fromTo(
          panel,
          { x: xFrom },
          { x: '0%', duration: 0.35, ease: 'power2.out' },
        );
      } else {
        const tl = gsap.timeline({
          onComplete: () => setMounted(false),
        });
        tl.to(panel, { x: xFrom, duration: 0.28, ease: 'power2.in' }, 0);
        tl.to(backdrop, { opacity: 0, duration: 0.22 }, 0);
      }
    },
    { dependencies: [open, mounted, fromLeft] },
  );

  if (!mounted) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal
      aria-label={title}
    >
      <button
        ref={backdropRef}
        type="button"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={`bg-card absolute inset-y-0 flex w-[min(100%,20rem)] flex-col shadow-glow will-change-transform ${
          fromLeft ? 'left-0 border-r' : 'right-0 border-l'
        }`}
      >
        <div className="border-border/60 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
          <p className="font-heading font-bold tracking-tight">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-muted grid size-9 place-items-center rounded-full"
            aria-label="Close panel"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </div>
  );
}

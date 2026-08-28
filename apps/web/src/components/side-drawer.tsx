'use client';

import { useEffect } from 'react';

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
  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open) return null;

  const fromLeft = side === 'left';

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={`bg-card absolute inset-y-0 flex w-[min(100%,20rem)] flex-col shadow-glow ${
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

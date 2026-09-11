'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ensureGsapDefaults, prefersReducedMotion } from '@/lib/motion';

type PageEnterProps = {
  children: React.ReactNode;
  className?: string;
};

/** Soft page content entrance on route change. */
export function PageEnter({ children, className = '' }: PageEnterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      ensureGsapDefaults();
      gsap.fromTo(
        el,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.38,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      );
    },
    { scope: ref, dependencies: [pathname] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  ensureGsapDefaults,
  prefersReducedMotion,
  PREMIUM_ENTER_EASE,
  PREMIUM_FADE_EASE,
  PREMIUM_LEAVE_EASE,
  PREMIUM_WIPE_EASE,
} from '@/lib/motion';
import { isPublicPath } from '@/lib/public-paths';
import { hrefKey, shouldAnimateNavClick, shouldUsePageTransition } from '@/lib/page-transition-nav';

/** Single ink wipe — buttery premium timing. */
const LEAVE_DURATION = 0.72;
const ENTER_DURATION = 0.82;
const CONTENT_SHIFT = '4%';
const CONTENT_ENTER_OFFSET = 0.08;

const GPU = { force3D: true } as const;

type PageTransitionContextValue = {
  navigate: (href: string) => void;
  isTransitioning: boolean;
};

const PageTransitionContext = createContext<PageTransitionContextValue | null>(null);

export function usePageTransition(): PageTransitionContextValue {
  const ctx = useContext(PageTransitionContext);
  if (!ctx) {
    throw new Error('usePageTransition must be used within PageTransitionProvider');
  }
  return ctx;
}

type PageTransitionProviderProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Single cover transition: content fades/drifts, ink panel wipes bottom-to-top,
 * then lifts off with premium easing to reveal the next page.
 */
export function PageTransitionProvider({ children, className = '' }: PageTransitionProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const innerRef = useRef<HTMLDivElement>(null);
  const wipeRef = useRef<HTMLDivElement>(null);

  const isTransitioningRef = useRef(false);
  const hasMountedRef = useRef(false);
  const pendingNavRef = useRef(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Render-safe fallback only; navigate() reads the live location when available.
  const currentKey = hrefKey(pathname);

  const resetMotion = useCallback(() => {
    const inner = innerRef.current;
    const wipe = wipeRef.current;
    if (inner) gsap.set(inner, { y: 0, opacity: 1, clearProps: 'transform,opacity' });
    if (wipe) gsap.set(wipe, { y: '100%', clearProps: 'transform' });
  }, []);

  const runEnter = useCallback(async () => {
    const inner = innerRef.current;
    const wipe = wipeRef.current;
    if (!inner || !wipe) return;

    if (prefersReducedMotion()) {
      resetMotion();
      return;
    }

    ensureGsapDefaults();
    gsap.set(inner, { y: CONTENT_SHIFT, opacity: 0 });
    gsap.set(wipe, { y: '0%' });

    await new Promise<void>((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      tl.to(
        wipe,
        { y: '-100%', duration: ENTER_DURATION, ease: PREMIUM_WIPE_EASE, ...GPU },
        0,
      );
      tl.to(
        inner,
        { y: '0%', duration: ENTER_DURATION, ease: PREMIUM_ENTER_EASE, ...GPU },
        CONTENT_ENTER_OFFSET,
      );
      tl.to(
        inner,
        {
          opacity: 1,
          duration: ENTER_DURATION * 0.9,
          ease: PREMIUM_FADE_EASE,
          clearProps: 'transform,opacity',
        },
        CONTENT_ENTER_OFFSET,
      );
    });
  }, [resetMotion]);

  const runLeave = useCallback(async () => {
    const inner = innerRef.current;
    const wipe = wipeRef.current;
    if (!inner || !wipe) return;

    if (prefersReducedMotion()) return;

    ensureGsapDefaults();
    gsap.set(wipe, { y: '100%' });

    await new Promise<void>((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      tl.to(
        inner,
        { y: `-${CONTENT_SHIFT}`, duration: LEAVE_DURATION, ease: PREMIUM_LEAVE_EASE, ...GPU },
        0,
      );
      tl.to(
        inner,
        { opacity: 0, duration: LEAVE_DURATION * 0.88, ease: PREMIUM_FADE_EASE },
        0,
      );
      tl.to(
        wipe,
        { y: '0%', duration: LEAVE_DURATION, ease: PREMIUM_WIPE_EASE, ...GPU },
        0.04,
      );
    });
  }, []);

  const navigate = useCallback(
    async (href: string) => {
      const nextKey = hrefKey(href);
      const hereKey =
        typeof window !== 'undefined'
          ? hrefKey(window.location.pathname + window.location.search)
          : currentKey;

      if (isTransitioningRef.current || nextKey === hereKey) {
        router.push(href);
        return;
      }

      const fromPath =
        typeof window !== 'undefined' ? window.location.pathname : pathname;
      if (!shouldUsePageTransition(fromPath, href)) {
        window.scrollTo(0, 0);
        router.push(href);
        return;
      }

      isTransitioningRef.current = true;
      pendingNavRef.current = true;
      setIsTransitioning(true);

      if (prefersReducedMotion()) {
        window.scrollTo(0, 0);
        router.push(href);
        return;
      }

      await runLeave();
      window.scrollTo(0, 0);
      router.push(href);
    },
    [currentKey, pathname, router, runLeave],
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    let active = true;
    void (async () => {
      if (isPublicPath(pathname)) {
        resetMotion();
        isTransitioningRef.current = false;
        pendingNavRef.current = false;
        setIsTransitioning(false);
        return;
      }

      if (!pendingNavRef.current && !prefersReducedMotion()) {
        const wipe = wipeRef.current;
        if (wipe) gsap.set(wipe, { y: '0%' });
      }

      await runEnter();
      if (!active) return;
      isTransitioningRef.current = false;
      pendingNavRef.current = false;
      setIsTransitioning(false);
    })();

    return () => {
      active = false;
    };
  }, [pathname, resetMotion, runEnter]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element | null)?.closest('a');
      if (!anchor || !shouldAnimateNavClick(anchor, e)) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      const fromPath = window.location.pathname;
      if (!shouldUsePageTransition(fromPath, href)) return;

      e.preventDefault();
      void navigate(href);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate]);

  return (
    <PageTransitionContext.Provider value={{ navigate, isTransitioning }}>
      <div
        ref={wipeRef}
        aria-hidden
        className="bg-ink pointer-events-none fixed inset-0 z-60 translate-y-full will-change-transform"
      />

      <div className={`overflow-x-clip ${className}`} aria-busy={isTransitioning}>
        <div ref={innerRef} className="min-h-full will-change-[transform,opacity]">
          {children}
        </div>
      </div>
    </PageTransitionContext.Provider>
  );
}

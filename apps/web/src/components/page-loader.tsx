'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  ensureGsapDefaults,
  prefersReducedMotion,
  PREMIUM_ENTER_EASE,
  PREMIUM_FADE_EASE,
  PREMIUM_WIPE_EASE,
} from '@/lib/motion';

type PageLoaderProps = {
  label?: string;
  variant?: 'fullscreen' | 'inline';
  active?: boolean;
  /** Counter has settled at 100 — safe to mount heavy content under the cover. */
  onReady?: () => void;
  onComplete?: () => void;
};

const HOLD_AT_100_MS = 320;
const EXIT_WIPE_DURATION = 0.95;
const LOAD_CAP = 88;
const GPU = { force3D: true } as const;

function formatCount(value: number): string {
  return String(Math.min(100, Math.max(0, Math.floor(value)))).padStart(3, '0');
}

function loadProgress(elapsedSec: number, variant: 'fullscreen' | 'inline'): number {
  const tau = variant === 'fullscreen' ? 2.4 : 1.9;
  return LOAD_CAP * (1 - Math.exp(-elapsedSec / tau));
}

function finishDuration(from: number): number {
  const remaining = Math.max(0, 100 - from);
  return 0.75 + (remaining / 100) * 0.85;
}

/**
 * Counter + bar are driven only through refs/DOM — no React state during ticks.
 */
export function PageLoader({
  label,
  variant = 'inline',
  active = true,
  onReady,
  onComplete,
}: PageLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const countElRef = useRef<HTMLSpanElement>(null);
  const statusElRef = useRef<HTMLParagraphElement>(null);
  const finishProxyRef = useRef<{ value: number } | null>(null);

  const progressRef = useRef(0);
  const loadStartRef = useRef(0);
  const activeRef = useRef(active);
  const variantRef = useRef(variant);
  const labelRef = useRef(label);
  const onReadyRef = useRef(onReady);
  const onCompleteRef = useRef(onComplete);
  const exitScheduledRef = useRef(false);
  const finishStartedRef = useRef(false);

  // Keep latest props readable from the ticker without restarting the effect.
  useLayoutEffect(() => {
    activeRef.current = active;
    variantRef.current = variant;
    labelRef.current = label;
    onReadyRef.current = onReady;
    onCompleteRef.current = onComplete;
  });

  const paintProgress = (value: number) => {
    const monotonic = Math.max(progressRef.current, Math.min(100, value));
    progressRef.current = monotonic;

    if (countElRef.current) {
      countElRef.current.textContent = formatCount(monotonic);
    }

    if (lineRef.current) {
      lineRef.current.style.transform = `scaleX(${monotonic / 100})`;
    }

    if (statusElRef.current) {
      statusElRef.current.textContent =
        monotonic >= 100 ? (labelRef.current ?? 'Ready') : (labelRef.current ?? 'Loading');
    }
  };

  useLayoutEffect(() => {
    paintProgress(progressRef.current);
  });

  useLayoutEffect(() => {
    if (variant !== 'fullscreen') return;

    document.documentElement.classList.add('page-loader-active');
    return () => {
      document.documentElement.classList.remove('page-loader-active');
    };
  }, [variant]);

  useEffect(() => {
    const cover = coverRef.current;
    const ui = uiRef.current;
    if (!cover) return;

    if (prefersReducedMotion()) {
      paintProgress(100);
      onReadyRef.current?.();
      const t = window.setTimeout(() => onCompleteRef.current?.(), 80);
      return () => window.clearTimeout(t);
    }

    ensureGsapDefaults();
    progressRef.current = 0;
    exitScheduledRef.current = false;
    finishStartedRef.current = false;
    finishProxyRef.current = null;
    loadStartRef.current = performance.now();
    paintProgress(0);
    gsap.set(cover, { y: '0%', clearProps: 'transform' });

    if (ui) {
      gsap.fromTo(
        ui,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.6, ease: PREMIUM_ENTER_EASE },
      );
    }

    const runExit = () => {
      if (exitScheduledRef.current) return;
      exitScheduledRef.current = true;

      const tl = gsap.timeline({ onComplete: () => onCompleteRef.current?.() });
      if (ui) {
        tl.to(ui, { opacity: 0, y: -10, duration: 0.4, ease: PREMIUM_FADE_EASE }, 0);
      }

      if (variantRef.current === 'fullscreen') {
        tl.to(
          cover,
          { y: '-100%', duration: EXIT_WIPE_DURATION, ease: PREMIUM_WIPE_EASE, ...GPU },
          0.14,
        );
      } else {
        tl.to(
          cover,
          {
            y: -16,
            opacity: 0,
            scale: 0.97,
            duration: 0.75,
            ease: PREMIUM_WIPE_EASE,
            ...GPU,
          },
          0.1,
        );
      }
    };

    const startFinish = () => {
      if (finishStartedRef.current) return;
      finishStartedRef.current = true;

      const proxy = { value: progressRef.current };
      finishProxyRef.current = proxy;

      gsap.to(proxy, {
        value: 100,
        duration: finishDuration(proxy.value),
        ease: 'power2.inOut',
        onUpdate: () => paintProgress(proxy.value),
        onComplete: () => {
          paintProgress(100);
          // Counter is static now — mount the page under the cover so its
          // render cost can't stall the ticker mid-count.
          onReadyRef.current?.();
          window.setTimeout(runExit, HOLD_AT_100_MS);
        },
      });
    };

    const tick = () => {
      if (finishStartedRef.current) return;

      if (activeRef.current) {
        const elapsed = (performance.now() - loadStartRef.current) / 1000;
        paintProgress(loadProgress(elapsed, variantRef.current));
        return;
      }

      gsap.ticker.remove(tick);
      startFinish();
    };

    gsap.ticker.add(tick);
    tick();

    return () => {
      gsap.ticker.remove(tick);
      if (finishProxyRef.current) gsap.killTweensOf(finishProxyRef.current);
    };
  }, [variant]);

  const countClassName =
    variant === 'fullscreen'
      ? 'font-heading text-[clamp(4.5rem,24vw,12rem)] leading-none font-bold tracking-tighter text-white/[0.12] tabular-nums select-none'
      : 'font-heading text-7xl leading-none font-bold tracking-tighter text-white/[0.12] tabular-nums select-none';

  if (variant === 'fullscreen') {
    return (
      <div ref={rootRef} className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        <div
          ref={coverRef}
          role="status"
          aria-live="polite"
          className="bg-ink text-ink-foreground absolute inset-0 flex flex-col will-change-transform"
        >
          <div ref={uiRef} className="flex h-full flex-col">
            <div className="relative flex flex-1 items-center justify-center px-6">
              <span ref={countElRef} aria-hidden className={countClassName} />
            </div>
            <div className="px-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
              <div className="bg-white/10 h-px overflow-hidden rounded-full">
                <div ref={lineRef} className="bg-primary h-full w-full origin-left scale-x-0" />
              </div>
              <p
                ref={statusElRef}
                className="mt-4 text-center text-[0.65rem] font-semibold tracking-[0.32em] text-white/45 uppercase"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="grid flex-1 place-items-center py-24">
      <div
        ref={coverRef}
        role="status"
        aria-live="polite"
        className="bg-ink text-ink-foreground shadow-glow relative flex w-[min(100%,20rem)] flex-col overflow-hidden rounded-3xl px-8 py-10 will-change-transform"
      >
        <div ref={uiRef}>
          <div className="relative flex min-h-[7rem] items-center justify-center">
            <span ref={countElRef} aria-hidden className={countClassName} />
          </div>
          <div className="w-full">
            <div className="bg-white/10 h-px overflow-hidden rounded-full">
              <div ref={lineRef} className="bg-primary h-full w-full origin-left scale-x-0" />
            </div>
            <p
              ref={statusElRef}
              className="mt-3 min-h-[1em] text-center text-[0.65rem] font-semibold tracking-[0.28em] text-white/50 uppercase"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

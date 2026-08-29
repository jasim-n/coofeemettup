'use client';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

/** Brand-default easing for UI motion. */
export const MOTION_EASE = 'power2.out';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Configure GSAP once for the app (safe to call repeatedly). */
let configured = false;
export function ensureGsapDefaults(): void {
  if (configured) return;
  configured = true;
  gsap.defaults({
    ease: MOTION_EASE,
    duration: 0.4,
  });
}

/**
 * Soft teal ring pulse on an element — join/request/accept success beat.
 * No-ops when reduced motion is on.
 */
export function pulseSuccess(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion()) return;
  ensureGsapDefaults();
  const ring = document.createElement('span');
  ring.setAttribute('aria-hidden', 'true');
  ring.className =
    'pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-primary';
  const parent = el;
  const prev = parent.style.position;
  if (getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }
  parent.appendChild(ring);
  gsap.fromTo(
    ring,
    { opacity: 0.85, scale: 0.92 },
    {
      opacity: 0,
      scale: 1.12,
      duration: 0.55,
      ease: 'power1.out',
      onComplete: () => {
        ring.remove();
        if (prev) parent.style.position = prev;
      },
    },
  );
}

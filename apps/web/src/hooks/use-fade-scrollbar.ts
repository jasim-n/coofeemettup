'use client';

import { useEffect, useRef } from 'react';

/**
 * Overlay-style scroll: thumb stays invisible until the user scrolls, then
 * fades away after idle. Pair with the `scrollbar-fade` CSS class so the
 * classic Windows scrollbar never takes layout width.
 */
export function useFadeScrollbar<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const onScroll = () => {
      el.dataset.scrolling = 'true';
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        delete el.dataset.scrolling;
      }, 900);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(hideTimer);
    };
  }, []);

  return ref;
}

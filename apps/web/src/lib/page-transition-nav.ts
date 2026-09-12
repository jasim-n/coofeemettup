import { isPublicPath } from '@/lib/public-paths';

const NO_TRANSITION = 'data-no-page-transition';

/** True for same-origin in-app links we should animate (not new tab, hash-only, etc.). */
export function shouldAnimateNavClick(anchor: HTMLAnchorElement, e: MouseEvent): boolean {
  if (e.defaultPrevented) return false;
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false;
  if (anchor.hasAttribute(NO_TRANSITION) || anchor.closest(`[${NO_TRANSITION}]`)) return false;

  const raw = anchor.getAttribute('href');
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) {
    return false;
  }

  try {
    const url = new URL(anchor.href, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Ink wipe transitions — off on public/auth/legal routes and opt-out links. */
export function shouldUsePageTransition(fromPathname: string, href: string): boolean {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    if (isPublicPath(fromPathname) || isPublicPath(url.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function hrefKey(href: string): string {
  const url = new URL(href, window.location.origin);
  return url.pathname + url.search;
}

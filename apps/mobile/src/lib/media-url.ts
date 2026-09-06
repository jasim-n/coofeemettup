/**
 * Absolute-ize media URLs for React Native.
 * Web can load `/covers/...` and `/showcase/...` from Next public/; RN cannot.
 */
const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const WEB_ORIGIN = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://www.9circles.pk').replace(/\/$/, '');

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (
    url.startsWith('/covers/') ||
    url.startsWith('/showcase/') ||
    url.startsWith('/brand/') ||
    url.startsWith('/hero')
  ) {
    return `${WEB_ORIGIN}${url}`;
  }
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

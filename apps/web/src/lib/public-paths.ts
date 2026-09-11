export const PUBLIC_PATHS = new Set([
  '/login',
  '/privacy',
  '/terms',
  '/community-guidelines',
]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

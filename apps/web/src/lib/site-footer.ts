/** Routes where the marketing footer should not appear. */
export function shouldShowSiteFooter(pathname: string): boolean {
  if (pathname === '/login') return false;
  if (pathname.includes('/chat')) return false;
  if (pathname.startsWith('/admin')) return false;
  return true;
}

export const NEWSLETTER_STORAGE_KEY = 'jrst_newsletter_email';

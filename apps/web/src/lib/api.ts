import { ApiClient } from '@jrst/api-client';
import { loadStoredAuthToken, TOKEN_KEY } from '@/lib/auth-storage';

export { TOKEN_KEY };

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Browser API client. Uses **bearer-token auth** (Authorization header), not
 * cookies: in production the web app and API live on different domains, so the
 * session cookie is a third-party cookie that browsers now block. The JWT is
 * restored from localStorage (remember me) or sessionStorage on load.
 */
export const api = new ApiClient({ baseUrl, clientType: 'mobile' });

if (typeof window !== 'undefined') {
  const saved = loadStoredAuthToken();
  if (saved) api.setAuthToken(saved);
}

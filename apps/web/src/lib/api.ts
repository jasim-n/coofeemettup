import { ApiClient } from '@jrst/api-client';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** localStorage key for the persisted bearer token. */
export const TOKEN_KEY = 'jrst_token';

/**
 * Browser API client. Uses **bearer-token auth** (Authorization header), not
 * cookies: in production the web app and API live on different domains, so the
 * session cookie is a third-party cookie that browsers now block. The JWT is
 * kept in localStorage and restored on load, so the session survives reloads.
 */
export const api = new ApiClient({ baseUrl, clientType: 'mobile' });

if (typeof window !== 'undefined') {
  const saved = window.localStorage.getItem(TOKEN_KEY);
  if (saved) api.setAuthToken(saved);
}

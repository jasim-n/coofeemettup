import { ApiClient } from '@jrst/api-client';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Shared browser API client. Holds the CSRF token in memory across the app. */
export const api = new ApiClient({ baseUrl });

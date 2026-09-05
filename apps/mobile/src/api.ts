import { ApiClient } from '@jrst/api-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export const TOKEN_KEY = 'jrst_token';
export const api = new ApiClient({ baseUrl: API_URL, clientType: 'mobile' });

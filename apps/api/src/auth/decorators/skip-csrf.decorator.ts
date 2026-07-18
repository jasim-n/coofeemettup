import { SetMetadata } from '@nestjs/common';

export const SKIP_CSRF_KEY = 'skipCsrf';

/**
 * Exempts a mutation from CSRF checks. Use ONLY for pre-session bootstrap
 * routes (e.g. OTP request/verify) that cannot yet hold a CSRF token; those
 * routes are protected by the OTP secret + rate limiting instead.
 */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

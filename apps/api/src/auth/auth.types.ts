import type { CookieOptions } from 'express';
import type { ConfigService } from '@nestjs/config';
import type { Role } from '../../generated/prisma/client';
import type { Env } from '../config/env';

export interface AuthUser {
  id: string;
  role: Role;
}

export interface SessionPayload {
  sub: string;
  role: Role;
}

export const SESSION_COOKIE = 'session';
export const CSRF_COOKIE = 'csrf_token';
export const CSRF_HEADER = 'x-csrf-token';
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function baseCookie(config: ConfigService<Env, true>): CookieOptions {
  return {
    sameSite: 'lax',
    secure: config.get('NODE_ENV', { infer: true }) === 'production',
    path: '/',
    maxAge: THIRTY_DAYS_MS,
  };
}

/** httpOnly session cookie (JWT). Not readable by JS. */
export function sessionCookieOptions(
  config: ConfigService<Env, true>,
): CookieOptions {
  return { ...baseCookie(config), httpOnly: true };
}

/** Double-submit CSRF cookie. Sent automatically; value also echoed in the
 * bootstrap response body so a cross-origin client can mirror it in the header. */
export function csrfCookieOptions(
  config: ConfigService<Env, true>,
): CookieOptions {
  return { ...baseCookie(config), httpOnly: false };
}

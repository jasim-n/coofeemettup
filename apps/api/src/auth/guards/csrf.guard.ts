import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SKIP_CSRF_KEY } from '../decorators/skip-csrf.decorator';
import { CSRF_COOKIE, CSRF_HEADER } from '../auth.types';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Double-submit-cookie CSRF: mutations must present a header token that
 * matches the CSRF cookie. Safe methods and @SkipCsrf() routes are exempt. */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method.toUpperCase())) return true;

    // Bearer-token (native) requests carry no cookies, so they're immune to CSRF.
    const bearer = req.headers.authorization;
    if (bearer && bearer.startsWith('Bearer ')) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (skip) return true;

    const cookies = req.cookies as Record<string, string | undefined>;
    const cookieToken = cookies?.[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER];
    if (
      !cookieToken ||
      typeof headerToken !== 'string' ||
      cookieToken !== headerToken
    ) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }
}

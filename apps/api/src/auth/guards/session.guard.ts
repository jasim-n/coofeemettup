import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SESSION_COOKIE, type SessionPayload } from '../auth.types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const cookies = req.cookies as Record<string, string | undefined>;
    const bearer = req.headers.authorization;
    // Native clients send a bearer token; web uses the httpOnly session cookie.
    const token =
      bearer && bearer.startsWith('Bearer ')
        ? bearer.slice(7)
        : cookies?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('Not authenticated');

    try {
      const payload = await this.jwt.verifyAsync<SessionPayload>(token);

      // Enforce account status — bans/suspensions take effect immediately.
      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { status: true, lastSeenAt: true },
      });
      if (!dbUser || dbUser.status !== 'ACTIVE') {
        throw new UnauthorizedException('Your account has been suspended');
      }

      // Presence: bump lastSeenAt at most once a minute (fire-and-forget).
      const stale =
        !dbUser.lastSeenAt || Date.now() - dbUser.lastSeenAt.getTime() > 60_000;
      if (stale) {
        void this.prisma.user
          .update({ where: { id: payload.sub }, data: { lastSeenAt: new Date() } })
          .catch(() => undefined);
      }

      req.user = { id: payload.sub, role: payload.role };
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid session');
    }
  }
}

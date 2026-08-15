import type { Role } from '@jrst/api-client';

/** Matches admin console access (ADMIN + ORGANIZER). */
export function isAdminRole(role: Role | string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'ORGANIZER';
}

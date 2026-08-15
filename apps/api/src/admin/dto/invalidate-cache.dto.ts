import { IsIn, IsOptional, IsString } from 'class-validator';

export class InvalidateCacheDto {
  /**
   * - `all` — every app cache namespace we own under Redis (`cache:tables:*`)
   * - `tables` — same as all table list caches
   * - `tables:browse` — shared OPEN browse list only
   * - `tables:mine` — one user's joined/hosted/saved (requires userId) or all mine keys
   */
  @IsIn(['all', 'tables', 'tables:browse', 'tables:mine'])
  scope!: 'all' | 'tables' | 'tables:browse' | 'tables:mine';

  /** Required when scope is `tables:mine` and you want a single user; omit to flush all mine:* keys. */
  @IsOptional()
  @IsString()
  userId?: string;
}

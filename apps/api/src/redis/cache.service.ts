import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

/** Shared Redis JSON cache for Tables discovery / meetup lists. */
@Injectable()
export class CacheService {
  static readonly TABLES_PREFIX = 'cache:tables:';
  static readonly BROWSE_OPEN = 'cache:tables:browse:open';
  /** Safety-net TTL; mutations also invalidate explicitly. */
  static readonly TTL_BROWSE_SEC = 60;
  static readonly TTL_MINE_SEC = 45;

  constructor(private readonly redis: RedisService) {}

  mineJoinedKey(userId: string): string {
    return `${CacheService.TABLES_PREFIX}mine:joined:${userId}`;
  }

  mineHostingKey(userId: string): string {
    return `${CacheService.TABLES_PREFIX}mine:hosting:${userId}`;
  }

  mineSavedKey(userId: string): string {
    return `${CacheService.TABLES_PREFIX}mine:saved:${userId}`;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      await this.redis.client.del(key);
      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(...keys: string[]): Promise<void> {
    const unique = [...new Set(keys.filter(Boolean))];
    if (unique.length === 0) return;
    await this.redis.client.del(...unique);
  }

  /** SCAN + DEL for a prefix (admin flush / broad invalidation). */
  async delByPrefix(prefix: string): Promise<number> {
    let cursor = '0';
    let removed = 0;
    do {
      const [next, keys] = await this.redis.client.scan(
        cursor,
        'MATCH',
        `${prefix}*`,
        'COUNT',
        200,
      );
      cursor = next;
      if (keys.length > 0) {
        removed += await this.redis.client.del(...keys);
      }
    } while (cursor !== '0');
    return removed;
  }

  async invalidateBrowse(): Promise<void> {
    await this.del(CacheService.BROWSE_OPEN);
  }

  async invalidateUserLists(userId: string): Promise<void> {
    if (!userId) return;
    await this.del(
      this.mineJoinedKey(userId),
      this.mineHostingKey(userId),
      this.mineSavedKey(userId),
    );
  }

  /**
   * After a table mutation: drop shared browse + host lists + any guest lists.
   */
  async invalidateTableMutation(opts: {
    hostId?: string | null;
    userIds?: Array<string | null | undefined>;
    browse?: boolean;
  }): Promise<void> {
    const browse = opts.browse !== false;
    if (browse) await this.invalidateBrowse();
    const users = new Set<string>();
    if (opts.hostId) users.add(opts.hostId);
    for (const id of opts.userIds ?? []) {
      if (id) users.add(id);
    }
    await Promise.all([...users].map((id) => this.invalidateUserLists(id)));
  }

  async invalidateAllTables(): Promise<number> {
    return this.delByPrefix(CacheService.TABLES_PREFIX);
  }

  async invalidateAll(): Promise<{ tables: number }> {
    const tables = await this.invalidateAllTables();
    return { tables };
  }
}

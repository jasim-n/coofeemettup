/**
 * In-memory stale-while-revalidate cache for Discover / Meetups list fetches.
 * Survives client-side navigations within the same tab (module singleton).
 */

type Entry<T> = {
  data: T;
  /** Serve instantly without network until this time. */
  freshUntil: number;
  /** After freshUntil, still serve but revalidate in background until staleUntil. */
  staleUntil: number;
};

const store = new Map<string, Entry<unknown>>();

const DEFAULT_FRESH_MS = 25_000;
const DEFAULT_STALE_MS = 120_000;

export async function swrGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { freshMs?: number; staleMs?: number },
): Promise<T> {
  const freshMs = opts?.freshMs ?? DEFAULT_FRESH_MS;
  const staleMs = opts?.staleMs ?? DEFAULT_STALE_MS;
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;

  if (hit && now < hit.staleUntil) {
    if (now > hit.freshUntil) {
      void fetcher()
        .then((data) => {
          const t = Date.now();
          store.set(key, {
            data,
            freshUntil: t + freshMs,
            staleUntil: t + staleMs,
          });
        })
        .catch(() => undefined);
    }
    return hit.data;
  }

  const data = await fetcher();
  const t = Date.now();
  store.set(key, {
    data,
    freshUntil: t + freshMs,
    staleUntil: t + staleMs,
  });
  return data;
}

/** Drop keys by exact match or prefix (e.g. `tables:`). */
export function invalidateDataCache(prefixOrKey?: string): void {
  if (!prefixOrKey) {
    store.clear();
    return;
  }
  if (store.has(prefixOrKey)) {
    store.delete(prefixOrKey);
  }
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefixOrKey)) store.delete(key);
  }
}

export function tablesCacheKeys(userId: string | null | undefined) {
  const uid = userId ?? 'anon';
  return {
    browse: `tables:browse:${uid}`,
    joined: `tables:joined:${uid}`,
    hosted: `tables:hosted:${uid}`,
    invites: `tables:invites:${uid}`,
  };
}

/** Call after any table/invite mutation so lists refresh on next visit. */
export function invalidateTablesClientCache(): void {
  invalidateDataCache('tables:');
}

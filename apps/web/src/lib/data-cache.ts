/**
 * In-memory + sessionStorage stale-while-revalidate cache for list fetches.
 * Survives client navigations and soft reloads in the same tab.
 */

type Entry<T> = {
  data: T;
  /** Serve instantly without network until this time. */
  freshUntil: number;
  /** After freshUntil, still serve but revalidate in background until staleUntil. */
  staleUntil: number;
};

const store = new Map<string, Entry<unknown>>();
const SS_PREFIX = 'jrst-swr:v1:';

/** Fresh window: instant, no network. Then SWR until stale. */
const DEFAULT_FRESH_MS = 60_000;
const DEFAULT_STALE_MS = 5 * 60_000;

function readSession<T>(key: string): Entry<T> | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + key);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as Entry<T>;
    if (!entry || typeof entry.staleUntil !== 'number') return undefined;
    if (Date.now() >= entry.staleUntil) {
      sessionStorage.removeItem(SS_PREFIX + key);
      return undefined;
    }
    return entry;
  } catch {
    return undefined;
  }
}

function writeSession<T>(key: string, entry: Entry<T>): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* quota / private mode */
  }
}

function removeSession(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SS_PREFIX + key);
  } catch {
    /* ignore */
  }
}

function remember<T>(key: string, entry: Entry<T>): void {
  store.set(key, entry);
  writeSession(key, entry);
}

/** Sync read for first paint — memory, then sessionStorage. */
export function peekCache<T>(key: string): T | undefined {
  const now = Date.now();
  const mem = store.get(key) as Entry<T> | undefined;
  if (mem && now < mem.staleUntil) return mem.data;

  const ss = readSession<T>(key);
  if (ss) {
    store.set(key, ss);
    return ss.data;
  }
  return undefined;
}

export async function swrGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { freshMs?: number; staleMs?: number },
): Promise<T> {
  const freshMs = opts?.freshMs ?? DEFAULT_FRESH_MS;
  const staleMs = opts?.staleMs ?? DEFAULT_STALE_MS;
  const now = Date.now();

  let hit = store.get(key) as Entry<T> | undefined;
  if (!hit || now >= hit.staleUntil) {
    const ss = readSession<T>(key);
    if (ss && now < ss.staleUntil) {
      hit = ss;
      store.set(key, ss);
    }
  }

  if (hit && now < hit.staleUntil) {
    if (now > hit.freshUntil) {
      void fetcher()
        .then((data) => {
          const t = Date.now();
          remember(key, {
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
  remember(key, {
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
    if (typeof window !== 'undefined') {
      try {
        const keys: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k?.startsWith(SS_PREFIX)) keys.push(k);
        }
        for (const k of keys) sessionStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
    return;
  }
  if (store.has(prefixOrKey)) {
    store.delete(prefixOrKey);
    removeSession(prefixOrKey);
  }
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefixOrKey)) {
      store.delete(key);
      removeSession(key);
    }
  }
  if (typeof window !== 'undefined') {
    try {
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(SS_PREFIX + prefixOrKey)) keys.push(k);
      }
      for (const k of keys) sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

export function tablesCacheKeys(userId: string | null | undefined) {
  const uid = userId ?? 'anon';
  return {
    browse: `tables:browse:${uid}`,
    joined: `tables:joined:${uid}`,
    hosted: `tables:hosted:${uid}`,
    invites: `tables:invites:${uid}`,
    saved: `tables:saved:${uid}`,
  };
}

/** Write-through helper (e.g. map poll) so other pages see fresh data. */
export function putCache<T>(
  key: string,
  data: T,
  opts?: { freshMs?: number; staleMs?: number },
): void {
  const freshMs = opts?.freshMs ?? DEFAULT_FRESH_MS;
  const staleMs = opts?.staleMs ?? DEFAULT_STALE_MS;
  const t = Date.now();
  remember(key, {
    data,
    freshUntil: t + freshMs,
    staleUntil: t + staleMs,
  });
}

/** Call after any table/invite mutation so lists refresh on next visit. */
export function invalidateTablesClientCache(): void {
  invalidateDataCache('tables:');
}

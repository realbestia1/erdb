import { getDb, ensureDbInitialized } from './db';

const PRUNE_INTERVAL_MS = 5 * 60 * 1000;

// ponytail: per-worker LRU in front of SQLite. Same catalog requested by
// thousands of users hits memory instead of blocking the event loop on sync I/O.
const LRU_MAX_ENTRIES = 300;
const LRU_MAX_VALUE_CHARS = 256 * 1024;
type LruEntry = { value: any; expiresAt: number };
const lru = new Map<string, LruEntry>();

const lruGet = (key: string): { hit: boolean; value?: any } => {
    const entry = lru.get(key);
    if (!entry) return { hit: false };
    if (entry.expiresAt <= Date.now()) {
        lru.delete(key);
        return { hit: false };
    }
    // Refresh recency.
    lru.delete(key);
    lru.set(key, entry);
    return { hit: true, value: entry.value };
};

const lruSet = (key: string, value: any, expiresAt: number, charLength: number) => {
    if (charLength > LRU_MAX_VALUE_CHARS) return;
    lru.delete(key);
    lru.set(key, { value, expiresAt });
    if (lru.size > LRU_MAX_ENTRIES) {
        const oldest = lru.keys().next().value;
        if (oldest !== undefined) lru.delete(oldest);
    }
};

const lruDelete = (key: string) => {
    lru.delete(key);
};

type GlobalMetadataState = typeof globalThis & {
  __erdbMetadataPruneTimer?: ReturnType<typeof setInterval>;
};

export const ensureMetadataPruneStarted = () => {
  const g = globalThis as GlobalMetadataState;
  if (g.__erdbMetadataPruneTimer) return;
  g.__erdbMetadataPruneTimer = setInterval(pruneExpiredMetadata, PRUNE_INTERVAL_MS);
  pruneExpiredMetadata();
};

// ponytail: prepared once, reused. Preparing per call re-parses SQL every time.
let stmts: {
    get: any;
    del: any;
    set: any;
    count: any;
    delOldest: any;
} | null = null;

const getStmts = () => {
    ensureDbInitialized();
    if (!stmts) {
        const db = getDb();
        stmts = {
            get: db.prepare('SELECT value, expires_at FROM metadata_cache WHERE key = ?'),
            del: db.prepare('DELETE FROM metadata_cache WHERE key = ?'),
            set: db.prepare(`
    INSERT OR REPLACE INTO metadata_cache (key, value, expires_at, last_accessed_at)
    VALUES (?, ?, ?, ?)
  `),
            count: db.prepare('SELECT COUNT(*) as count FROM metadata_cache'),
            delOldest: db.prepare(`
      DELETE FROM metadata_cache
      WHERE key IN (
        SELECT key FROM metadata_cache
        ORDER BY last_accessed_at ASC
        LIMIT ?
      )
    `),
        };
    }
    return stmts;
};

const parseStoredValue = <T>(raw: string): T => {
    try {
        return JSON.parse(raw);
    } catch {
        return raw as unknown as T;
    }
};

export const getMetadata = <T = any>(key: string): T | null => {
    ensureMetadataPruneStarted();
    const cached = lruGet(key);
    if (cached.hit) return cached.value as T;

    const s = getStmts();
    const now = Date.now();

    const row = s.get.get(key) as any;

    if (!row) return null;

    if (row.expires_at <= now) {
        s.del.run(key);
        return null;
    }

    // ponytail: no UPDATE last_accessed_at per read. That turned every cache
    // hit into a WAL write and blocked the event loop under load.
    const value = parseStoredValue<T>(row.value);
    lruSet(key, value, row.expires_at, String(row.value).length);
    return value;
};

export const setMetadata = (key: string, value: any, ttlMs: number) => {
    ensureMetadataPruneStarted();
    const s = getStmts();
    const now = Date.now();
    const expiresAt = now + ttlMs;

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    s.set.run(key, stringValue, expiresAt, now);
    lruSet(key, typeof value === 'string' ? value : parseStoredValue(stringValue), expiresAt, stringValue.length);

    // Optional: minor pruning during set to keep DB clean
    if (Math.random() < 0.05) { // 5% chance to prune expired on set
        pruneExpiredMetadata();
    }
};

export const deleteMetadata = (key: string) => {
    ensureMetadataPruneStarted();
    getStmts().del.run(key);
    lruDelete(key);
};

export const pruneExpiredMetadata = () => {
    ensureMetadataPruneStarted();
    const db = getDb();
    const now = Date.now();
    try {
        ensureDbInitialized();
        db.prepare('DELETE FROM metadata_cache WHERE expires_at <= ?').run(now);
    } catch {
        // Ignore prune failures (e.g. DB locked under burst); next tick retries.
    }
};

export const pruneOldestMetadata = (maxEntries: number) => {
    ensureMetadataPruneStarted();
    const s = getStmts();
    const currentCount = (s.count.get() as any).count;

    if (currentCount > maxEntries) {
        const overflow = currentCount - maxEntries;
        s.delOldest.run(overflow);
    }
};


import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { accountsDb } from './accountsDb';

const SALT_SIZE = 16;
const KEY_LEN = 64;

// ponytail: see getTokenConfig.
const TOKEN_CONFIG_CACHE_TTL_MS = 30 * 1000;
const TOKEN_CONFIG_CACHE_MAX = 200;
const tokenConfigCache = new Map<string, { config: any; updatedAt: number; expiresAt: number }>();

const invalidateTokenCache = (token: string) => {
  tokenConfigCache.delete(token);
};

/**
 * Generates a long random token starting with 'Tk-'
 */
export function generateRandomToken() {
  const bytes = randomBytes(24); // 24 bytes -> ~32 base64 characters
  return `Tk-${bytes.toString('hex')}`;
}

/**
 * Hashes a password using scrypt
 */
function hashPassword(password: string): string {
  const salt = randomBytes(SALT_SIZE).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_LEN);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  const [salt, key] = hash.split(':');
  if (!salt || !key) return false;
  const derivedKey = scryptSync(password, salt, KEY_LEN);
  return timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
}

export function getTokenConfig(token: string) {
  // ponytail: few shared tokens x thousands of image hits. 30s LRU avoids a
  // sync SQLite read + JSON.parse of a big config on every single image.
  // Worst case: config edits apply within 30s.
  const now = Date.now();
  const cached = tokenConfigCache.get(token);
  if (cached && cached.expiresAt > now) {
    return { config: cached.config, updatedAt: cached.updatedAt };
  }
  tokenConfigCache.delete(token);
  const row = accountsDb.prepare('SELECT config_json, updated_at FROM tokens WHERE token = ?').get(token) as { config_json: string, updated_at: number } | undefined;
  if (!row) return null;
  try {
    const parsed = {
      config: JSON.parse(row.config_json),
      updatedAt: row.updated_at
    };
    tokenConfigCache.set(token, { ...parsed, expiresAt: now + TOKEN_CONFIG_CACHE_TTL_MS });
    if (tokenConfigCache.size > TOKEN_CONFIG_CACHE_MAX) {
      const oldest = tokenConfigCache.keys().next().value;
      if (oldest !== undefined) tokenConfigCache.delete(oldest);
    }
    return { config: parsed.config, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

export function authenticateToken(token: string, password: string) {
  const row = accountsDb
    .prepare('SELECT password_hash, config_json, updated_at FROM tokens WHERE token = ?')
    .get(token) as { password_hash: string; config_json: string; updated_at: number } | undefined;

  if (!row) {
    throw new Error('Token not found');
  }

  if (!verifyPassword(password, row.password_hash)) {
    throw new Error('Invalid password');
  }

  try {
    return {
      token,
      config: JSON.parse(row.config_json),
      updatedAt: row.updated_at,
    };
  } catch {
    return {
      token,
      config: null,
      updatedAt: row.updated_at,
    };
  }
}

export function createToken(password: string, config: any) {
  const token = generateRandomToken();
  return createTokenWithValue(token, password, config);
}

export function createTokenWithValue(token: string, password: string, config: any) {
  const passwordHash = hashPassword(password);
  const now = Date.now();
  
  accountsDb.prepare(`
    INSERT INTO tokens (token, password_hash, config_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(token, passwordHash, JSON.stringify(config), now, now);
  
  return token;
}

export function updateToken(token: string, password: string, config: any) {
  const row = accountsDb.prepare('SELECT password_hash FROM tokens WHERE token = ?').get(token) as { password_hash: string } | undefined;
  if (!row) throw new Error('Token not found');
  
  if (!verifyPassword(password, row.password_hash)) {
    throw new Error('Invalid password');
  }
  
  const now = Date.now();
  accountsDb.prepare(`
    UPDATE tokens 
    SET config_json = ?, updated_at = ?
    WHERE token = ?
  `).run(JSON.stringify(config), now, token);
  invalidateTokenCache(token);
  
  return true;
}

export function updateTokenConfigWithoutPassword(token: string, config: any) {
  const row = accountsDb.prepare('SELECT token FROM tokens WHERE token = ?').get(token) as { token: string } | undefined;
  if (!row) throw new Error('Token not found');

  const now = Date.now();
  accountsDb.prepare(`
    UPDATE tokens
    SET config_json = ?, updated_at = ?
    WHERE token = ?
  `).run(JSON.stringify(config), now, token);
  invalidateTokenCache(token);

  return true;
}

export function deleteToken(token: string, password: string) {
  const row = accountsDb.prepare('SELECT password_hash FROM tokens WHERE token = ?').get(token) as { password_hash: string } | undefined;
  if (!row) throw new Error('Token not found');
  
  if (!verifyPassword(password, row.password_hash)) {
    throw new Error('Invalid password');
  }
  
  accountsDb.prepare('DELETE FROM tokens WHERE token = ?').run(token);
  invalidateTokenCache(token);
  return true;
}

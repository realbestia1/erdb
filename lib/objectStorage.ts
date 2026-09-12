import { dirname, join, sep } from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync, unlinkSync, readdirSync, rmSync } from 'node:fs';
import cluster from 'node:cluster';
import { getCacheTtlMsFromCacheControl } from './imageCacheTtl';
import { DATA_DIR } from './paths';
import { FINAL_IMAGE_RENDERER_CACHE_VERSION } from './routeConfig';

const CACHE_DIR = join(DATA_DIR, 'cache', 'images');
const FINAL_CACHE_DIR = join(CACHE_DIR, 'final');

type ObjectStorageResult = {
  body: ArrayBuffer;
  contentType: string;
  cacheControl: string;
};

const FALLBACK_IMAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const IMAGE_CACHE_PRUNE_INTERVAL_MS = 10 * 60 * 1000;

type GlobalObjectStorageState = typeof globalThis & {
  __erdbImageCachePruneTimer?: NodeJS.Timeout;
};

// Ensure cache directory exists
mkdirSync(CACHE_DIR, { recursive: true });

// Clean up legacy source image cache directory to save disk space
try {
  const sourceCacheDir = join(CACHE_DIR, 'source');
  if (existsSync(sourceCacheDir)) {
    rmSync(sourceCacheDir, { recursive: true, force: true });
  }
} catch (error) {
  console.error('Failed to clean up source image cache directory:', error);
}

const sanitizePathSegment = (segment: string) => segment.replace(/[^a-zA-Z0-9._-]/g, '_');

const getFilePath = (key: string) => {
  const normalizedKey = String(key || '')
    .split(/[/\\]/)
    .map((segment) => sanitizePathSegment(segment))
    .filter(Boolean);
  return join(CACHE_DIR, ...normalizedKey);
};

const deleteCachedObject = (filePath: string, metadataPath: string) => {
  try {
    unlinkSync(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.error(`[ERDB] Failed to delete image cache file ${filePath}:`, error);
    }
  }

  try {
    unlinkSync(metadataPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.error(`[ERDB] Failed to delete image cache metadata ${metadataPath}:`, error);
    }
  }
};

const isInvalidatedFinalImage = (filePath: string, metadataPath: string) => {
  if (!filePath.startsWith(`${FINAL_CACHE_DIR}${sep}`)) {
    return false;
  }

  try {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    return metadata.cacheVersion !== FINAL_IMAGE_RENDERER_CACHE_VERSION;
  } catch {
    return true;
  }
};

const isCachedObjectExpired = (filePath: string, metadataPath: string) => {
  try {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    const cacheControl = metadata.cacheControl || 'public, max-age=300';
    const ttlMs = getCacheTtlMsFromCacheControl(cacheControl, FALLBACK_IMAGE_CACHE_TTL_MS);
    const { mtimeMs } = statSync(filePath);
    return mtimeMs + ttlMs <= Date.now();
  } catch {
    return true;
  }
};

export const pruneExpiredObjectStorageImages = () => {
  const walk = (dirPath: string) => {
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        try {
          const remaining = readdirSync(entryPath);
          if (remaining.length === 0) {
            rmSync(entryPath, { recursive: true, force: true });
          }
        } catch {
          // Ignore cleanup failures for empty directories.
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (entry.name.endsWith('.json')) {
        const metadataPath = entryPath;
        const filePath = metadataPath.slice(0, -'.json'.length);
        if (!existsSync(filePath)) {
          deleteCachedObject(filePath, metadataPath);
        }
        continue;
      }

      const filePath = entryPath;
      const metadataPath = `${filePath}.json`;

      if (
        isInvalidatedFinalImage(filePath, metadataPath) ||
        !existsSync(metadataPath) ||
        isCachedObjectExpired(filePath, metadataPath)
      ) {
        deleteCachedObject(filePath, metadataPath);
      }
    }
  };

  try {
    walk(CACHE_DIR);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.error('[ERDB] Failed to prune image cache:', error);
    }
  }
};

const ensureObjectStoragePrunerStarted = () => {
  const globalState = globalThis as GlobalObjectStorageState;
  if (globalState.__erdbImageCachePruneTimer) {
    return;
  }

  // ponytail: full-tree walk is sync I/O over thousands of files. One worker
  // is enough; others would just block their event loops doing the same scan.
  if (cluster.isWorker && cluster.worker?.id !== 1) {
    return;
  }

  pruneExpiredObjectStorageImages();
  globalState.__erdbImageCachePruneTimer = setInterval(pruneExpiredObjectStorageImages, IMAGE_CACHE_PRUNE_INTERVAL_MS);
};

export const isObjectStorageConfigured = () => true; // Always "configured" as local files

ensureObjectStoragePrunerStarted();

export const buildObjectStorageImageKey = (
  imageType: 'poster' | 'backdrop' | 'logo' | 'thumbnail',
  cacheHash: string,
  ext = 'png'
) => `final/${imageType}/${cacheHash}.${ext}`;
export const buildObjectStorageSourceImageKey = (id: string, variant: string) => `source/${id.replace(/[^a-zA-Z0-9]/g, '_')}_${variant}.png`;

// ponytail: hard cap on TMDB source files. Oldest (by mtime) evicted first,
// so disk stays bounded no matter how many distinct titles 5000 users browse.
export const enforceSourceCacheLimit = (maxFiles: number) => {
  if (!(maxFiles > 0)) return;
  try {
    const dir = join(CACHE_DIR, 'source');
    if (!existsSync(dir)) return;
    const entries: Array<{ filePath: string; mtimeMs: number }> = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || entry.name.endsWith('.json')) continue;
      const filePath = join(dir, entry.name);
      try {
        entries.push({ filePath, mtimeMs: statSync(filePath).mtimeMs });
      } catch {
        // Skip files that vanished mid-scan.
      }
    }
    const overflow = entries.length - maxFiles;
    if (overflow <= 0) return;
    entries.sort((a, b) => a.mtimeMs - b.mtimeMs);
    for (const victim of entries.slice(0, overflow)) {
      deleteCachedObject(victim.filePath, `${victim.filePath}.json`);
    }
  } catch {
    // Ignore eviction failures; expiry prune still bounds growth by TTL.
  }
};

export const getCachedImageFromObjectStorage = async (key: string): Promise<ObjectStorageResult | null> => {
  const filePath = getFilePath(key);
  const metadataPath = `${filePath}.json`;

  if (!existsSync(filePath) || !existsSync(metadataPath)) {
    return null;
  }

  try {
    const body = readFileSync(filePath);
    if (isCachedObjectExpired(filePath, metadataPath)) {
      deleteCachedObject(filePath, metadataPath);
      return null;
    }

    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    const cacheControl = metadata.cacheControl || 'public, max-age=300';

    return {
      body: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
      contentType: metadata.contentType || 'image/png',
      cacheControl,
    };
  } catch (error) {
    console.error(`Error reading cached image ${key}:`, error);
    return null;
  }
};

export const putCachedImageToObjectStorage = async (
  key: string,
  payload: { body: ArrayBuffer; contentType: string; cacheControl: string; cacheVersion?: string }
) => {
  const filePath = getFilePath(key);
  const metadataPath = `${filePath}.json`;

  try {
    // Ensure parent directories exist
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(filePath, Buffer.from(payload.body));
    writeFileSync(
      metadataPath,
      JSON.stringify({
        contentType: payload.contentType,
        cacheControl: payload.cacheControl,
        ...(payload.cacheVersion ? { cacheVersion: payload.cacheVersion } : {}),
      }),
      'utf8'
    );
  } catch (error) {
    console.error(`Error writing cached image ${key}:`, error);
  }
};

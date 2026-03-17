import { NextRequest } from 'next/server';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  ALL_RATING_PREFERENCES,
  RATING_PROVIDER_OPTIONS,
  normalizeRatingPreference,
  parseRatingPreferencesAllowEmpty,
  type RatingPreference,
} from '@/lib/ratingPreferences';
import {
  DEFAULT_BACKDROP_RATING_LAYOUT,
  normalizeBackdropRatingLayout,
  type BackdropRatingLayout,
} from '@/lib/backdropRatingLayout';
import {
  DEFAULT_POSTER_RATINGS_MAX_PER_SIDE,
  DEFAULT_POSTER_RATING_LAYOUT,
  getPosterRatingLayoutMaxBadges,
  getPosterRatingLayoutLimit,
  normalizePosterRatingLayout,
  normalizePosterRatingsMaxPerSide,
  type PosterRatingLayout,
} from '@/lib/posterRatingLayout';
import {
  DEFAULT_RATING_STYLE,
  normalizeRatingStyle,
  type RatingStyle,
} from '@/lib/ratingStyle';
import { getImdbRatingFromDataset } from '@/lib/imdbDataset';
import { scheduleImdbDatasetSync } from '@/lib/imdbDatasetSync';
// Removed mdblistRequestLogs import

import {
  buildObjectStorageImageKey,
  buildObjectStorageSourceImageKey,
  getCachedImageFromObjectStorage,
  isObjectStorageConfigured,
  putCachedImageToObjectStorage,
} from '@/lib/objectStorage';
import { getMetadata, setMetadata } from '@/lib/metadataCache';

export const runtime = 'nodejs';

type PosterTextPreference = 'original' | 'clean' | 'alternative';
type AnimeMappingProvider = 'mal' | 'anilist' | 'imdb' | 'tmdb' | 'anidb';
type StreamBadgeKey = '4k' | 'hdr' | 'dolbyvision' | 'dolbyatmos' | 'remux';
type BadgeKey = RatingPreference | StreamBadgeKey;
type QualityBadgesSide = 'left' | 'right';
type StreamQualityFlags = {
  has4k: boolean;
  hasHdr: boolean;
  hasDolbyVision: boolean;
  hasDolbyAtmos: boolean;
  hasRemux: boolean;
};
const FALLBACK_IMAGE_LANGUAGE = 'en';
const ALLOWED_IMAGE_TYPES = new Set(['poster', 'backdrop', 'logo']);
const ANIME_MAPPING_PROVIDER_SET = new Set<AnimeMappingProvider>([
  'mal',
  'anilist',
  'imdb',
  'tmdb',
  'anidb',
]);
const ANIME_NATIVE_INPUT_ID_PREFIX_SET = new Set(['kitsu', 'mal', 'anilist', 'anidb']);
const parseApiKeyList = (...values: Array<string | undefined>) => {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    for (const candidate of (value || '').split(/[\s,;]+/)) {
      const normalized = candidate.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
};
const toAnimeMappingProvider = (value?: string | null): AnimeMappingProvider | null => {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) return null;
  return ANIME_MAPPING_PROVIDER_SET.has(normalized as AnimeMappingProvider)
    ? (normalized as AnimeMappingProvider)
    : null;
};
const parseCacheTtlMs = (value: string | undefined, fallbackMs: number, minMs: number, maxMs: number) => {
  if (!value) return fallbackMs;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackMs;
  return Math.min(maxMs, Math.max(minMs, parsed));
};
const parseNonNegativeInt = (value?: string | null, max = Number.MAX_SAFE_INTEGER) => {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.min(max, Math.floor(parsed));
};
const FINAL_IMAGE_RENDERER_CACHE_VERSION = 'poster-backdrop-logo-v26';
const TMDB_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_TMDB_CACHE_TTL_MS,
  3 * 24 * 60 * 60 * 1000,
  10 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000
);
const MDBLIST_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_MDBLIST_CACHE_TTL_MS,
  3 * 24 * 60 * 60 * 1000,
  10 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000
);
const MDBLIST_OLD_MOVIE_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
  7 * 24 * 60 * 60 * 1000,
  60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000
);
const MDBLIST_OLD_MOVIE_AGE_DAYS = (() => {
  const rawValue = Number(process.env.ERDB_MDBLIST_OLD_MOVIE_AGE_DAYS);
  if (!Number.isFinite(rawValue) || rawValue <= 0) return 365;
  return Math.min(3650, Math.max(30, Math.floor(rawValue)));
})();
const MDBLIST_RATE_LIMIT_COOLDOWN_MS = parseCacheTtlMs(
  process.env.ERDB_MDBLIST_RATE_LIMIT_COOLDOWN_MS,
  24 * 60 * 60 * 1000,
  30 * 1000,
  7 * 24 * 60 * 60 * 1000
);
const IMDB_DATASET_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_IMDB_DATASET_CACHE_TTL_MS,
  7 * 24 * 60 * 60 * 1000,
  60 * 60 * 1000,
  365 * 24 * 60 * 60 * 1000
);
const KITSU_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_KITSU_CACHE_TTL_MS,
  3 * 24 * 60 * 60 * 1000,
  10 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000
);
const TORRENTIO_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_TORRENTIO_CACHE_TTL_MS,
  6 * 60 * 60 * 1000,
  10 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000
);
const TORRENTIO_BASE_URL = 'https://torrentio.strem.fun';
const TORRENTIO_LANGUAGE = 'italian';
const PROVIDER_ICON_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_PROVIDER_ICON_CACHE_TTL_MS,
  7 * 24 * 60 * 60 * 1000,
  60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000
);
const FINAL_IMAGE_CACHE_MAX_ENTRIES = 300;
const SOURCE_IMAGE_CACHE_MAX_ENTRIES = 128;
const METADATA_CACHE_MAX_ENTRIES = 2000;
const PROVIDER_ICON_CACHE_MAX_ENTRIES = 64;
const TMDB_ANIMATION_GENRE_ID = 16;
const MDBLIST_API_KEYS = parseApiKeyList(process.env.MDBLIST_API_KEYS, process.env.MDBLIST_API_KEY);
type TimedCacheEntry<T> = {
  value: T;
  expiresAt: number;
  lastAccessedAt: number;
};
type CachedJsonResponse = {
  ok: boolean;
  status: number;
  data: any;
};
type CachedJsonNetworkObserver = {
  onNetworkResponse?: (input: {
    key: string;
    url: string;
    status: number;
    ok: boolean;
    data: any;
    durationMs: number;
  }) => Promise<void> | void;
  onNetworkError?: (input: {
    key: string;
    url: string;
    errorMessage: string;
    durationMs: number;
  }) => Promise<void> | void;
};
type TorrentioBadgeCache = {
  flags: StreamQualityFlags;
};
type TorrentioBadgeResult = {
  badges: RatingBadge[];
  cacheTtlMs: number;
};
type RenderedImagePayload = {
  body: ArrayBuffer;
  contentType: string;
  cacheControl: string;
};
type PhaseDurations = {
  auth: number;
  tmdb: number;
  mdb: number;
  stream: number;
  render: number;
};
class HttpError extends Error {
  status: number;
  headers?: HeadersInit;

  constructor(message: string, status: number, headers?: HeadersInit) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}
const finalImageInFlight = new Map<string, Promise<RenderedImagePayload>>();
const sourceImageInFlight = new Map<string, Promise<RenderedImagePayload>>();
const metadataInFlight = new Map<string, Promise<CachedJsonResponse>>();
const providerIconInFlight = new Map<string, Promise<string | null>>();
const torrentioInFlight = new Map<string, Promise<TorrentioBadgeResult>>();
const mdbListRateLimitedUntil = new Map<string, number>();
let mdbListApiKeyCursor = 0;
const sha1Hex = (value: string) => createHash('sha1').update(value).digest('hex');
const safeCompareText = (left: string, right: string) => {
  if (!left || !right || left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
};
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const isImdbId = (value?: string | null) => {
  if (!value) return false;
  return /^tt\d+$/.test(value.trim());
};
const getDeterministicTtlMs = (baseTtlMs: number, seed: string) => {
  const normalizedSeed = String(seed || '').trim();
  if (!normalizedSeed) return baseTtlMs;

  const jitterWindowMs = Math.min(12 * 60 * 60 * 1000, Math.floor(baseTtlMs * 0.15));
  if (jitterWindowMs <= 0) return baseTtlMs;

  const hashPrefix = sha1Hex(normalizedSeed).slice(0, 8);
  const hashValue = Number.parseInt(hashPrefix, 16);
  if (!Number.isFinite(hashValue)) return baseTtlMs;

  const offsetMs = (hashValue % (jitterWindowMs + 1)) - Math.floor(jitterWindowMs / 2);
  return Math.max(60 * 1000, baseTtlMs + offsetMs);
};
const getCacheTtlMsFromCacheControl = (value: string | null | undefined, fallbackMs: number) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallbackMs;

  const sMaxAgeMatch = normalized.match(/s-maxage=(\d+)/);
  if (sMaxAgeMatch) {
    const ttlSeconds = Number(sMaxAgeMatch[1]);
    if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
      return ttlSeconds * 1000;
    }
  }

  const maxAgeMatch = normalized.match(/max-age=(\d+)/);
  if (maxAgeMatch) {
    const ttlSeconds = Number(maxAgeMatch[1]);
    if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
      return ttlSeconds * 1000;
    }
  }

  return fallbackMs;
};



// pruneCache and setCacheEntry removed as we now use metadataCache and objectStorage

const withDedupe = async <T,>(
  inFlightMap: Map<string, Promise<T>>,
  key: string,
  factory: () => Promise<T>
) => {
  const existing = inFlightMap.get(key);
  if (existing) return existing;
  const promise = factory().finally(() => {
    inFlightMap.delete(key);
  });
  inFlightMap.set(key, promise);
  return promise;
};

const measurePhase = async <T,>(phases: PhaseDurations, phase: keyof PhaseDurations, fn: () => Promise<T>) => {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    phases[phase] += performance.now() - start;
  }
};

const buildServerTimingHeader = (phases: PhaseDurations, totalMs: number) => {
  const parts = [
    `auth;dur=${phases.auth.toFixed(1)}`,
    `tmdb;dur=${phases.tmdb.toFixed(1)}`,
    `mdb;dur=${phases.mdb.toFixed(1)}`,
    `stream;dur=${phases.stream.toFixed(1)}`,
    `render;dur=${phases.render.toFixed(1)}`,
    `total;dur=${totalMs.toFixed(1)}`,
  ];
  return parts.join(', ');
};

const createImageHttpResponse = (
  payload: RenderedImagePayload,
  serverTiming: string,
  cacheStatus: 'hit' | 'miss' | 'shared'
) =>
  new Response(payload.body.slice(0), {
    status: 200,
    headers: {
      'Content-Type': payload.contentType,
      'Cache-Control': payload.cacheControl,
      Vary: 'Accept',
      'Server-Timing': serverTiming,
      'X-ERDB-Cache': cacheStatus,
    },
  });
const PERCENTAGE_RATING_PROVIDERS = new Set<RatingPreference>([
  'mdblist',
  'tomatoes',
  'tomatoesaudience',
  'metacritic',
  'trakt',
  'anilist',
  'kitsu',
]);
const ANIME_ONLY_RATING_PROVIDER_SET = new Set<RatingPreference>(['myanimelist', 'anilist', 'kitsu']);
const SCALE_SUFFIX_RATING_PROVIDERS: Partial<Record<RatingPreference, string>> = {
  tmdb: '/10',
  imdb: '/10',
  metacriticuser: '/10',
  letterboxd: '/5',
  myanimelist: '/10',
  rogerebert: '/4',
};
type RatingBadge = {
  key: BadgeKey;
  label: string;
  value: string;
  iconUrl: string;
  accentColor: string;
};
type OutputFormat = 'png' | 'jpeg' | 'webp';
const RATING_PROVIDER_META = new Map(
  RATING_PROVIDER_OPTIONS.map((provider) => [provider.id, provider] as const)
);
const STREAM_BADGE_META = new Map<StreamBadgeKey, { label: string; value: string; accentColor: string; iconUrl: string }>([
  [
    '4k',
    {
      label: '4K',
      value: '',
      accentColor: '#f59e0b',
      iconUrl: '',
    },
  ],
  [
    'hdr',
    {
      label: 'HDR',
      value: '',
      accentColor: '#10b981',
      iconUrl: '',
    },
  ],
  [
    'dolbyvision',
    {
      label: 'Dolby Vision',
      value: '',
      accentColor: '#60a5fa',
      iconUrl: '',
    },
  ],
  [
    'dolbyatmos',
    {
      label: 'Dolby Atmos',
      value: '',
      accentColor: '#22d3ee',
      iconUrl: '',
    },
  ],
  [
    'remux',
    {
      label: 'REMUX',
      value: '',
      accentColor: '#ef4444',
      iconUrl: '',
    },
  ],
]);
const STREAM_BADGE_ORDER: StreamBadgeKey[] = ['4k', 'hdr', 'dolbyvision', 'dolbyatmos', 'remux'];
const DEFAULT_QUALITY_BADGES_STYLE: RatingStyle = 'glass';
const LOGO_BASE_HEIGHT = 320;
const LOGO_FALLBACK_ASPECT_RATIO = 2.5;
const LOGO_MIN_WIDTH = 360;
const LOGO_MAX_WIDTH = 2200;

const buildProviderMonogram = (label: string) => {
  const cleaned = label.replace(/[^A-Za-z0-9]+/g, ' ').trim();
  if (!cleaned) return 'R';
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
};

const normalizeStreamBadgesSetting = (value?: string | null) => {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) return 'auto';
  if (['1', 'true', 'yes', 'on', 'torrentio'].includes(normalized)) return 'on';
  if (['0', 'false', 'no', 'off', 'none'].includes(normalized)) return 'off';
  return 'auto';
};

const normalizeQualityBadgesSide = (value?: string | null): QualityBadgesSide => {
  const normalized = (value || '').trim().toLowerCase();
  if (['right', 'r', 'end'].includes(normalized)) return 'right';
  return 'left';
};

const normalizeQualityBadgesStyle = (value?: string | null): RatingStyle => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'glass' || normalized === 'square' || normalized === 'plain') {
    return normalized;
  }
  return DEFAULT_QUALITY_BADGES_STYLE;
};

const createEmptyStreamFlags = (): StreamQualityFlags => ({
  has4k: false,
  hasHdr: false,
  hasDolbyVision: false,
  hasDolbyAtmos: false,
  hasRemux: false,
});

const parseStreamFlagsFromFilename = (filename: string): StreamQualityFlags => {
  const normalized = filename.toUpperCase();
  const hasDolbyVision =
    /\bDOVI\b/.test(normalized) || /\bDV\b/.test(normalized) || /DOLBY\s*VISION/.test(normalized);
  const hasHdr =
    /\bHDR10\+\b/.test(normalized) ||
    /\bHDR10\b/.test(normalized) ||
    /\bHDR\b/.test(normalized) ||
    /\bHLG\b/.test(normalized) ||
    hasDolbyVision;
  const hasDolbyAtmos = /\bATMOS\b/.test(normalized) || /DOLBY\s*ATMOS/.test(normalized);
  const has4k =
    /\b2160P\b/.test(normalized) ||
    /\b2160\b/.test(normalized) ||
    /\b4K\b/.test(normalized) ||
    /\bUHD\b/.test(normalized) ||
    /\bULTRAHD\b/.test(normalized);
  const hasRemux = /\bREMUX\b/.test(normalized);
  return { has4k, hasHdr, hasDolbyVision, hasDolbyAtmos, hasRemux };
};

const mergeStreamFlags = (left: StreamQualityFlags, right: StreamQualityFlags): StreamQualityFlags => ({
  has4k: left.has4k || right.has4k,
  hasHdr: left.hasHdr || right.hasHdr,
  hasDolbyVision: left.hasDolbyVision || right.hasDolbyVision,
  hasDolbyAtmos: left.hasDolbyAtmos || right.hasDolbyAtmos,
  hasRemux: left.hasRemux || right.hasRemux,
});

const extractTorrentioFilenames = (payload: any) => {
  const streams = Array.isArray(payload?.streams) ? payload.streams : [];
  const filenames: string[] = [];
  for (const stream of streams) {
    const filename =
      (typeof stream?.filename === 'string' && stream.filename) ||
      (typeof stream?.behaviorHints?.filename === 'string' && stream.behaviorHints.filename) ||
      (typeof stream?.title === 'string' && stream.title) ||
      (typeof stream?.name === 'string' && stream.name) ||
      '';
    if (filename) filenames.push(filename);
  }
  return filenames;
};

const collectStreamFlags = (filenames: string[]) => {
  let flags = createEmptyStreamFlags();
  for (const filename of filenames) {
    if (!filename) continue;
    flags = mergeStreamFlags(flags, parseStreamFlagsFromFilename(filename));
    if (flags.has4k && flags.hasHdr && flags.hasDolbyVision && flags.hasDolbyAtmos && flags.hasRemux) {
      break;
    }
  }
  return flags;
};

const buildStreamBadgesFromFlags = (flags: StreamQualityFlags): RatingBadge[] => {
  const badges: RatingBadge[] = [];
  const flagMap: Record<StreamBadgeKey, boolean> = {
    '4k': flags.has4k,
    hdr: flags.hasHdr,
    dolbyvision: flags.hasDolbyVision,
    dolbyatmos: flags.hasDolbyAtmos,
    remux: flags.hasRemux,
  };
  for (const key of STREAM_BADGE_ORDER) {
    if (!flagMap[key]) continue;
    const meta = STREAM_BADGE_META.get(key);
    if (!meta) continue;
    badges.push({
      key,
      label: meta.label,
      value: meta.value,
      iconUrl: meta.iconUrl,
      accentColor: meta.accentColor,
    });
  }
  return badges;
};

const buildTorrentioUrl = (type: 'movie' | 'series', id: string) =>
  `${TORRENTIO_BASE_URL}/language=${TORRENTIO_LANGUAGE}/stream/${type}/${encodeURIComponent(id)}.json`;

const fetchTorrentioBadges = async (input: {
  type: 'movie' | 'series';
  id: string;
  phases: PhaseDurations;
  cacheTtlMs?: number;
}): Promise<TorrentioBadgeResult> => {
  const trimmedId = input.id.trim();
  if (!trimmedId) {
    return { badges: [], cacheTtlMs: TORRENTIO_CACHE_TTL_MS };
  }
  const cacheKey = `torrentio:${input.type}:${trimmedId}:lang:${TORRENTIO_LANGUAGE}`;
  const ttlMs =
    typeof input.cacheTtlMs === 'number' && Number.isFinite(input.cacheTtlMs) && input.cacheTtlMs > 0
      ? input.cacheTtlMs
      : getDeterministicTtlMs(TORRENTIO_CACHE_TTL_MS, cacheKey);
  const cached = getMetadata<TorrentioBadgeCache>(cacheKey);
  if (cached) {
    return { badges: buildStreamBadgesFromFlags(cached.flags), cacheTtlMs: ttlMs };
  }

  return withDedupe(torrentioInFlight, cacheKey, async () => {
    const warm = getMetadata<TorrentioBadgeCache>(cacheKey);
    if (warm) {
      return { badges: buildStreamBadgesFromFlags(warm.flags), cacheTtlMs: ttlMs };
    }

    let response: Response | null = null;
    try {
      response = await measurePhase(input.phases, 'stream', () =>
        fetch(buildTorrentioUrl(input.type, trimmedId), { cache: 'no-store' })
      );
    } catch {
      const failureTtl = Math.min(ttlMs, 2 * 60 * 1000);
      setMetadata(cacheKey, { flags: createEmptyStreamFlags() }, failureTtl);
      return { badges: [], cacheTtlMs: failureTtl };
    }

    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const flags = collectStreamFlags(extractTorrentioFilenames(payload));
    const targetTtl = response.ok ? ttlMs : Math.min(ttlMs, 2 * 60 * 1000);
    setMetadata(cacheKey, { flags }, targetTtl);
    return { badges: buildStreamBadgesFromFlags(flags), cacheTtlMs: targetTtl };
  });
};

const formatRatingNumber = (value: number) => {
  const rounded = value.toFixed(1);
  return rounded.endsWith('.0') ? rounded.slice(0, -2) : rounded;
};

const formatDisplayRatingValue = (provider: RatingPreference, baseValue: string) => {
  if (baseValue === 'N/A') return baseValue;

  if (PERCENTAGE_RATING_PROVIDERS.has(provider)) {
    return baseValue.endsWith('%') ? baseValue : `${baseValue}%`;
  }

  const suffix = SCALE_SUFFIX_RATING_PROVIDERS[provider];
  if (suffix && !baseValue.includes('/') && !baseValue.endsWith('%')) {
    return `${baseValue}${suffix}`;
  }

  return baseValue;
};

const shouldRenderRatingValue = (value: string | null | undefined) => {
  if (!value) return false;
  const normalized = value.trim();
  if (!normalized) return false;
  if (normalized.toUpperCase() === 'N/A') return false;

  const numericCandidate = normalized
    .replace('%', '')
    .split('/')[0]
    .replace(',', '.')
    .trim();
  const numericValue = Number(numericCandidate);
  if (!Number.isNaN(numericValue) && numericValue === 0) return false;

  return true;
};

const pickOutputFormat = (imageType: 'poster' | 'backdrop' | 'logo', acceptHeader?: string | null): OutputFormat => {
  if (imageType === 'logo') return 'png';
  const accept = (acceptHeader || '').toLowerCase();
  return accept.includes('image/webp') ? 'webp' : 'jpeg';
};

const outputFormatToContentType = (format: OutputFormat) => {
  if (format === 'webp') return 'image/webp';
  if (format === 'jpeg') return 'image/jpeg';
  return 'image/png';
};

const outputFormatToExtension = (format: OutputFormat) => {
  if (format === 'webp') return 'webp';
  if (format === 'jpeg') return 'jpg';
  return 'png';
};

const isTmdbAnimationTitle = (media: any) => {
  const genreIds = Array.isArray(media?.genre_ids) ? media.genre_ids : [];
  if (genreIds.some((genreId: any) => Number(genreId) === TMDB_ANIMATION_GENRE_ID)) {
    return true;
  }

  const genres = Array.isArray(media?.genres) ? media.genres : [];
  return genres.some((genre: any) => {
    if (Number(genre?.id) === TMDB_ANIMATION_GENRE_ID) {
      return true;
    }

    return String(genre?.name || '').trim().toLowerCase() === 'animation';
  });
};

const normalizeRatingValue = (value: unknown): string | null => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return formatRatingNumber(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = Number(trimmed.replace(',', '.'));
    if (!Number.isNaN(normalized) && Number.isFinite(normalized)) {
      return formatRatingNumber(normalized);
    }
  }

  if (value && typeof value === 'object') {
    const nested = value as { value?: unknown; rating?: unknown; score?: unknown };
    return normalizeRatingValue(nested.value ?? nested.rating ?? nested.score);
  }

  return null;
};

const isNegativeRatingValue = (value: string | null | undefined) => {
  if (!value) return false;
  const numericCandidate = value
    .replace('%', '')
    .split('/')[0]
    .replace(',', '.')
    .trim();
  const numericValue = Number(numericCandidate);
  return !Number.isNaN(numericValue) && numericValue < 0;
};

const collectMDBListRatings = (payload: any) => {
  const result = new Map<RatingPreference, string>();
  const items = payload?.ratings;
  if (!Array.isArray(items)) {
    const directMdbListScore = normalizeRatingValue(
      payload?.score ?? payload?.mdblist_score ?? payload?.mdblist ?? null
    );
    if (directMdbListScore && !isNegativeRatingValue(directMdbListScore)) {
      result.set('mdblist', directMdbListScore);
    }
    return result;
  }

  for (const item of items) {
    const sourceRaw = String(item?.source || item?.name || item?.provider || '');
    const source = normalizeRatingPreference(sourceRaw);
    if (!source || result.has(source)) continue;
    const rating = normalizeRatingValue(item?.value ?? item?.rating ?? item?.score);
    if (rating && !(source === 'mdblist' && isNegativeRatingValue(rating))) {
      result.set(source, rating);
    }
  }

  if (!result.has('mdblist')) {
    const directMdbListScore = normalizeRatingValue(
      payload?.score ?? payload?.mdblist_score ?? payload?.mdblist ?? null
    );
    if (directMdbListScore && !isNegativeRatingValue(directMdbListScore)) {
      result.set('mdblist', directMdbListScore);
    }
  }

  return result;
};

const getMdbListApiKeysInPriorityOrder = () => {
  if (!MDBLIST_API_KEYS.length) return [];

  const now = Date.now();
  const availableKeys = MDBLIST_API_KEYS.filter((apiKey) => {
    const limitedUntil = mdbListRateLimitedUntil.get(apiKey) || 0;
    return limitedUntil <= now;
  });
  const candidates = availableKeys.length ? availableKeys : MDBLIST_API_KEYS;
  const startIndex = mdbListApiKeyCursor % candidates.length;
  mdbListApiKeyCursor = (mdbListApiKeyCursor + 1) % candidates.length;

  return [...candidates.slice(startIndex), ...candidates.slice(0, startIndex)];
};

const markMdbListApiKeyRateLimited = (apiKey: string) => {
  mdbListRateLimitedUntil.set(apiKey, Date.now() + MDBLIST_RATE_LIMIT_COOLDOWN_MS);
};

const getMdbListResponseMessage = (payload: any) =>
  [
    payload?.error,
    payload?.message,
    payload?.detail,
    payload?.description,
    payload?.status_message,
    payload?.response,
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
    .toLowerCase();

const isMdbListRateLimitedResponse = (response: CachedJsonResponse) => {
  if (response.status === 429) return true;

  const message = getMdbListResponseMessage(response.data);
  if (!message) return false;

  return ['rate limit', 'too many requests', 'quota', 'limit reached', 'limit exceeded', 'throttle'].some(
    (token) => message.includes(token)
  );
};

const shouldRetryMdbListWithAnotherKey = (response: CachedJsonResponse) => {
  if (isMdbListRateLimitedResponse(response)) return true;
  return response.status === 401 || response.status === 403 || response.status >= 500;
};

const getRatingCacheTtlMs = ({
  id,
  mediaType,
  releaseDate,
  defaultTtlMs,
  oldTtlMs,
}: {
  id: string;
  mediaType: 'movie' | 'tv';
  releaseDate?: string | null;
  defaultTtlMs: number;
  oldTtlMs: number;
}) => {
  let ttlMs = defaultTtlMs;

  if (mediaType === 'movie') {
    const normalizedReleaseDate = String(releaseDate || '').trim();
    if (normalizedReleaseDate) {
      const releaseTimestamp = Date.parse(`${normalizedReleaseDate}T00:00:00Z`);
      if (Number.isFinite(releaseTimestamp)) {
        const movieAgeMs = Date.now() - releaseTimestamp;
        if (movieAgeMs >= MDBLIST_OLD_MOVIE_AGE_DAYS * 24 * 60 * 60 * 1000) {
          ttlMs = Math.max(defaultTtlMs, oldTtlMs);
        }
      }
    }
  }

  return getDeterministicTtlMs(ttlMs, id);
};

const getMdbListCacheTtlMs = ({
  imdbId,
  mediaType,
  releaseDate,
}: {
  imdbId: string;
  mediaType: 'movie' | 'tv';
  releaseDate?: string | null;
}) => {
  return getRatingCacheTtlMs({
    id: imdbId,
    mediaType,
    releaseDate,
    defaultTtlMs: MDBLIST_CACHE_TTL_MS,
    oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
  });
};

const fetchMdbListRatings = async ({
  imdbId,
  cacheTtlMs,
  phases,
  requestSource,
  imageType,
  cleanId,
  manualApiKey,
}: {
  imdbId: string;
  cacheTtlMs: number;
  phases: PhaseDurations;
  requestSource?: string;
  imageType?: string;
  cleanId?: string;
  manualApiKey?: string | null;
}) => {
  const normalizedImdbId = String(imdbId || '').trim();
  const apiKeys = manualApiKey ? [manualApiKey] : getMdbListApiKeysInPriorityOrder();

  if (!normalizedImdbId || !apiKeys.length) return null;

  for (const apiKey of apiKeys) {
    try {
      const apiKeyHash = sha1Hex(apiKey).slice(0, 12);
      const response = await fetchJsonCached(
        `mdblist:${normalizedImdbId}:key:${sha1Hex(apiKey)}`,
        `https://mdblist.com/api/?apikey=${encodeURIComponent(apiKey)}&i=${encodeURIComponent(normalizedImdbId)}`,
        cacheTtlMs,
        phases,
        'mdb'
      );

      if (isMdbListRateLimitedResponse(response)) {
        markMdbListApiKeyRateLimited(apiKey);
        continue;
      }

      if (!response.ok) {
        if (shouldRetryMdbListWithAnotherKey(response)) {
          continue;
        }
        return null;
      }

      return collectMDBListRatings(response.data);
    } catch {
      // Try the next key before giving up on MDBList entirely.
    }
  }

  return null;
};

const normalizeKitsuId = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const asInt = Math.trunc(value);
    return asInt > 0 ? String(asInt) : null;
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase().startsWith('kitsu:') ? trimmed.slice(6) : trimmed;
  if (!normalized) return null;
  const match = normalized.match(/\d+/);
  return match ? match[0] : null;
};

const normalizeTmdbId = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const asInt = Math.trunc(value);
    return asInt > 0 ? String(asInt) : null;
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\d+/);
  return match ? match[0] : null;
};

const extractKitsuIdFromAnimemapping = (payload: any) => {
  const candidates = [
    payload?.requested?.resolvedKitsuId,
    payload?.kitsu?.id,
    payload?.mappings?.ids?.kitsu,
    payload?.data?.requested?.resolvedKitsuId,
    payload?.data?.kitsu?.id,
    payload?.data?.mappings?.ids?.kitsu,
  ];

  for (const candidate of candidates) {
    const kitsuId = normalizeKitsuId(candidate);
    if (kitsuId) return kitsuId;
  }

  return null;
};

const extractTmdbIdFromAnimemapping = (payload: any) => {
  const candidates = [
    payload?.mappings?.ids?.tmdb,
    payload?.data?.mappings?.ids?.tmdb,
  ];

  for (const candidate of candidates) {
    const tmdbId = normalizeTmdbId(candidate);
    if (tmdbId) return tmdbId;
  }

  return null;
};

const extractAnimeSubtypeFromAnimemapping = (payload: any) => {
  const candidates = [
    payload?.requested?.subtype,
    payload?.subtype,
    payload?.kitsu?.subtype,
    payload?.mappings?.subtype,
    payload?.data?.requested?.subtype,
    payload?.data?.subtype,
    payload?.data?.kitsu?.subtype,
    payload?.data?.mappings?.subtype,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const normalized = candidate.trim().toLowerCase();
    if (normalized) return normalized;
  }

  return null;
};

const fetchKitsuIdFromReverseMapping = async ({
  provider,
  externalId,
  season,
  phases,
}: {
  provider: AnimeMappingProvider;
  externalId: string;
  season?: string | null;
  phases: PhaseDurations;
}) => {
  const normalizedExternalId = externalId.trim();
  if (!normalizedExternalId) return null;

  const normalizedSeason = (season || '').trim();
  const seasonQuery = normalizedSeason ? `?s=${encodeURIComponent(normalizedSeason)}` : '';
  const cacheKey = `kitsu:reverse:${provider}:${normalizedExternalId}:s:${normalizedSeason || '-'}`;
  const url = `https://animemapping.stremio.dpdns.org/${provider}/${encodeURIComponent(normalizedExternalId)}${seasonQuery}`;

  try {
    const response = await fetchJsonCached(
      cacheKey,
      url,
      KITSU_CACHE_TTL_MS,
      phases,
      'tmdb'
    );
    if (!response.ok) return null;
    const payload = response.data;
    if (payload?.ok === false) return null;
    return extractKitsuIdFromAnimemapping(payload);
  } catch {
    return null;
  }
};

const fetchTmdbIdFromReverseMapping = async ({
  provider,
  externalId,
  season,
  phases,
}: {
  provider: AnimeMappingProvider;
  externalId: string;
  season?: string | null;
  phases: PhaseDurations;
}) => {
  const normalizedExternalId = externalId.trim();
  if (!normalizedExternalId) return null;

  const normalizedSeason = (season || '').trim();
  const seasonQuery = normalizedSeason ? `?s=${encodeURIComponent(normalizedSeason)}` : '';
  const cacheKey = `tmdb:reverse:${provider}:${normalizedExternalId}:s:${normalizedSeason || '-'}`;
  const url = `https://animemapping.stremio.dpdns.org/${provider}/${encodeURIComponent(normalizedExternalId)}${seasonQuery}`;

  try {
    const response = await fetchJsonCached(
      cacheKey,
      url,
      KITSU_CACHE_TTL_MS,
      phases,
      'tmdb'
    );
    if (!response.ok) return null;
    const payload = response.data;
    if (payload?.ok === false) return null;
    return extractTmdbIdFromAnimemapping(payload);
  } catch {
    return null;
  }
};

const fetchKitsuAnimeAttributes = async (kitsuId: string, phases: PhaseDurations) => {
  const normalizedKitsuId = String(kitsuId || '').trim();
  if (!normalizedKitsuId) return null;

  try {
    const response = await fetchJsonCached(
      `kitsu:anime:${normalizedKitsuId}:details`,
      `https://kitsu.io/api/edge/anime/${encodeURIComponent(normalizedKitsuId)}`,
      KITSU_CACHE_TTL_MS,
      phases,
      'mdb',
      {
        headers: {
          Accept: 'application/vnd.api+json',
        },
      }
    );
    if (!response.ok) return null;

    return response.data?.data?.attributes || null;
  } catch {
    return null;
  }
};

const pickKitsuImageUrl = (image: any) => {
  const candidates = [
    image?.original,
    image?.large,
    image?.medium,
    image?.small,
    image?.tiny,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const normalized = candidate.trim();
    if (normalized) return normalized;
  }

  return null;
};

const normalizeKitsuTitleCandidate = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || null;
};

const pickKitsuOriginalTitle = (attributes: any) => {
  const titles = attributes?.titles;
  const candidates = [
    titles?.en_jp,
    attributes?.canonicalTitle,
    titles?.ja_jp,
    titles?.en,
    titles?.en_us,
    typeof attributes?.slug === 'string' ? attributes.slug.replace(/-/g, ' ') : null,
  ];

  if (titles && typeof titles === 'object') {
    candidates.push(...Object.values(titles));
  }

  for (const candidate of candidates) {
    const normalized = normalizeKitsuTitleCandidate(candidate);
    if (normalized) return normalized;
  }

  return null;
};

const pickPosterTitleFromMedia = (
  media: any,
  mediaType: 'movie' | 'tv' | null,
  fallbackTitle?: string | null
) => {
  const candidates = [
    mediaType === 'movie' ? media?.title : mediaType === 'tv' ? media?.name : null,
    mediaType === 'movie' ? media?.original_title : mediaType === 'tv' ? media?.original_name : null,
    media?.title,
    media?.name,
    media?.original_title,
    media?.original_name,
    fallbackTitle,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const normalized = candidate.replace(/\s+/g, ' ').trim();
    if (normalized) return normalized;
  }
  return null;
};

const fetchKitsuFallbackAsset = async (
  kitsuId: string,
  imageType: 'poster' | 'backdrop' | 'logo',
  phases: PhaseDurations
) => {
  const normalizedKitsuId = String(kitsuId || '').trim();
  if (!normalizedKitsuId) return null;

  const attributes = await fetchKitsuAnimeAttributes(normalizedKitsuId, phases);
  if (!attributes) return null;

  const posterUrl = pickKitsuImageUrl(attributes?.posterImage);
  const coverUrl = pickKitsuImageUrl(attributes?.coverImage);
  const rating = normalizeRatingValue(attributes?.averageRating);
  const originalTitle = pickKitsuOriginalTitle(attributes);

  if (imageType === 'logo' && originalTitle) {
    const generatedLogo = buildGeneratedLogoDataUrl(originalTitle);
    return {
      imageUrl: generatedLogo.dataUrl,
      rating,
      title: originalTitle,
      logoAspectRatio: generatedLogo.aspectRatio,
    };
  }

  if (imageType === 'poster') {
    return {
      imageUrl: posterUrl || coverUrl,
      rating,
      title: originalTitle,
      logoAspectRatio: null,
    };
  }

  if (imageType === 'backdrop') {
    return {
      imageUrl: coverUrl || posterUrl,
      rating,
      title: originalTitle,
      logoAspectRatio: null,
    };
  }

  return {
    imageUrl: posterUrl || coverUrl,
    rating,
    title: originalTitle,
    logoAspectRatio: null,
  };
};

const fetchKitsuRating = async (kitsuId: string, phases: PhaseDurations) => {
  const attributes = await fetchKitsuAnimeAttributes(kitsuId, phases);
  return normalizeRatingValue(attributes?.averageRating);
};

const fetchJsonCached = async (
  key: string,
  url: string,
  ttlMs: number,
  phases: PhaseDurations,
  phase: keyof PhaseDurations,
  init?: RequestInit,
  observer?: CachedJsonNetworkObserver
): Promise<CachedJsonResponse> => {


  const cached = getMetadata<CachedJsonResponse>(key);
  if (cached) {
    return cached;
  }

  return withDedupe(metadataInFlight, key, async () => {

    const fromCache = getMetadata<CachedJsonResponse>(key);
    if (fromCache) return fromCache;



    const fetchStartedAt = Date.now();
    let response: Response;
    try {
      response = await measurePhase(phases, phase, () =>
        fetch(url, {
          cache: 'no-store',
          ...init,
        })
      );
    } catch (error) {
      if (observer?.onNetworkError) {
        try {
          await observer.onNetworkError({
            key,
            url,
            errorMessage: error instanceof Error ? error.message : 'Network error',
            durationMs: Date.now() - fetchStartedAt,
          });
        } catch {
          // Ignore observer failures for monitoring hooks.
        }
      }
      throw error;
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    const payload: CachedJsonResponse = {
      ok: response.ok,
      status: response.status,
      data,
    };
    if (observer?.onNetworkResponse) {
      try {
        await observer.onNetworkResponse({
          key,
          url,
          status: response.status,
          ok: response.ok,
          data,
          durationMs: Date.now() - fetchStartedAt,
        });
      } catch {
        // Ignore observer failures for monitoring hooks.
      }
    }
    const failureTtlMs = Math.min(ttlMs, 2 * 60 * 1000);
    const targetTtlMs = response.ok ? ttlMs : failureTtlMs;
    setMetadata(key, payload, targetTtlMs);

    return payload;
  });
};

const normalizeImageLanguage = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'us' || normalized === 'en-us') return 'en';
  if (normalized.includes('-')) return normalized.split('-')[0];
  return normalized;
};

const buildIncludeImageLanguage = (preferredLang: string, fallbackLang: string) => {
  const languages = [normalizeImageLanguage(preferredLang), normalizeImageLanguage(fallbackLang), 'null']
    .filter(Boolean) as string[];
  return [...new Set(languages)].join(',');
};

const pickByLanguageWithFallback = (
  items: any[] = [],
  preferredLang: string,
  fallbackLang: string
) => {
  if (!Array.isArray(items) || items.length === 0) return null;

  const preferred = normalizeImageLanguage(preferredLang);
  const fallback = normalizeImageLanguage(fallbackLang);

  if (preferred) {
    const preferredItem = items.find((item: any) => normalizeImageLanguage(item?.iso_639_1) === preferred);
    if (preferredItem) return preferredItem;
  }

  if (fallback) {
    const fallbackItem = items.find((item: any) => normalizeImageLanguage(item?.iso_639_1) === fallback);
    if (fallbackItem) return fallbackItem;
  }

  return items[0];
};

const pickPosterByPreference = (
  posters: any[] = [],
  preference: PosterTextPreference,
  preferredLang: string,
  fallbackLang: string,
  originalPosterPath?: string | null
) => {
  if (!Array.isArray(posters) || posters.length === 0) return null;

  const canonicalOriginalPath =
    originalPosterPath ||
    pickByLanguageWithFallback(posters, preferredLang, fallbackLang)?.file_path ||
    posters[0]?.file_path ||
    null;
  const originalPoster = canonicalOriginalPath
    ? posters.find((poster: any) => poster.file_path === canonicalOriginalPath)
    : null;
  const fallbackOriginal = originalPoster || (canonicalOriginalPath ? { file_path: canonicalOriginalPath } : posters[0]);
  const alternativePosters = posters.filter(
    (poster: any) => poster.file_path !== canonicalOriginalPath
  );

  if (preference === 'clean') {
    return (
      posters.find((poster: any) => !poster.iso_639_1) ||
      pickByLanguageWithFallback(posters, preferredLang, fallbackLang) ||
      fallbackOriginal
    );
  }

  if (preference === 'original') {
    return fallbackOriginal;
  }

  return (
    pickByLanguageWithFallback(alternativePosters, preferredLang, fallbackLang) ||
    alternativePosters[0] ||
    fallbackOriginal
  );
};

const pickBackdropByPreference = (
  backdrops: any[] = [],
  preference: PosterTextPreference,
  preferredLang: string,
  fallbackLang: string,
  originalBackdropPath?: string | null
) => {
  if (!Array.isArray(backdrops) || backdrops.length === 0) return null;

  const canonicalOriginalPath =
    originalBackdropPath ||
    pickByLanguageWithFallback(backdrops, preferredLang, fallbackLang)?.file_path ||
    backdrops[0]?.file_path ||
    null;
  const originalBackdrop = canonicalOriginalPath
    ? backdrops.find((backdrop: any) => backdrop.file_path === canonicalOriginalPath)
    : null;
  const fallbackOriginal =
    originalBackdrop || (canonicalOriginalPath ? { file_path: canonicalOriginalPath } : backdrops[0]);
  const alternativeBackdrops = backdrops.filter(
    (backdrop: any) => backdrop.file_path !== canonicalOriginalPath
  );

  if (preference === 'clean') {
    return (
      backdrops.find((backdrop: any) => !backdrop.iso_639_1) ||
      pickByLanguageWithFallback(backdrops, preferredLang, fallbackLang) ||
      fallbackOriginal
    );
  }

  if (preference === 'original') {
    return fallbackOriginal;
  }

  return (
    pickByLanguageWithFallback(alternativeBackdrops, preferredLang, fallbackLang) ||
    alternativeBackdrops[0] ||
    fallbackOriginal
  );
};

type FastRenderInput = {
  imageType: 'poster' | 'backdrop' | 'logo';
  outputFormat: OutputFormat;
  imgUrl: string;
  outputWidth: number;
  outputHeight: number;
  imageWidth?: number;
  imageHeight?: number;
  finalOutputHeight: number;
  logoBadgeBandHeight: number;
  logoBadgeMaxWidth: number;
  logoBadgesPerRow: number;
  posterRowHorizontalInset: number;
  posterTitleText?: string | null;
  posterLogoUrl?: string | null;
  badgeIconSize: number;
  badgeFontSize: number;
  badgePaddingX: number;
  badgePaddingY: number;
  badgeGap: number;
  badgeTopOffset: number;
  badgeBottomOffset: number;
  badges: RatingBadge[];
  qualityBadges: RatingBadge[];
  qualityBadgesSide: QualityBadgesSide;
  qualityBadgesStyle: RatingStyle;
  posterRatingsLayout: PosterRatingLayout;
  posterRatingsMaxPerSide: number | null;
  backdropRatingsLayout: BackdropRatingLayout;
  ratingStyle: RatingStyle;
  topBadges: RatingBadge[];
  bottomBadges: RatingBadge[];
  leftBadges: RatingBadge[];
  rightBadges: RatingBadge[];
  cacheControl: string;
};

let sharpFactoryPromise: Promise<any | null> | null = null;
let sharpConfigured = false;
const configureSharp = (sharp: any) => {
  if (sharpConfigured || !sharp) return;
  sharpConfigured = true;

  const concurrency = parseNonNegativeInt(process.env.ERDB_SHARP_CONCURRENCY, 64);
  if (concurrency && concurrency > 0) {
    sharp.concurrency(concurrency);
  }

  const cacheOptions: { memory?: number; files?: number; items?: number } = {};
  const memory = parseNonNegativeInt(process.env.ERDB_SHARP_CACHE_MEMORY_MB, 8192);
  const files = parseNonNegativeInt(process.env.ERDB_SHARP_CACHE_FILES, 20000);
  const items = parseNonNegativeInt(process.env.ERDB_SHARP_CACHE_ITEMS, 2000);
  if (memory !== null) cacheOptions.memory = memory;
  if (files !== null) cacheOptions.files = files;
  if (items !== null) cacheOptions.items = items;
  if (Object.keys(cacheOptions).length > 0) {
    sharp.cache(cacheOptions);
  }
};
const getSharpFactory = async () => {
  if (!sharpFactoryPromise) {
    sharpFactoryPromise = import('sharp')
      .then((mod: any) => {
        const sharp = mod.default || mod;
        configureSharp(sharp);
        return sharp;
      })
      .catch((error) => {
        throw new Error(
          `sharp is required for ERDB image rendering: ${error instanceof Error ? error.message : 'unknown error'}`
        );
      });
  }
  return sharpFactoryPromise;
};

const bufferToArrayBuffer = (buffer: Buffer): ArrayBuffer =>
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

const toImageContentType = (value: string | null) => {
  const normalized = (value || '').split(';')[0]?.trim().toLowerCase();
  return normalized?.startsWith('image/') ? normalized : 'image/png';
};

const buildSourceImageFallbackCacheControl = (ttlMs: number) => {
  const ttlSeconds = Math.max(60, Math.floor(ttlMs / 1000));
  return `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=3600`;
};

const isTmdbSourceImageUrl = (value: string) => {
  try {
    return new URL(value).hostname === 'image.tmdb.org';
  } catch {
    return false;
  }
};

const buildProviderIconStorageKey = (iconUrl: string) => `icons/${sha1Hex(iconUrl)}.png`;

const readProviderIconFromStorage = async (iconUrl: string): Promise<string | null> => {
  if (!isObjectStorageConfigured()) return null;
  try {
    const payload = await getCachedImageFromObjectStorage(buildProviderIconStorageKey(iconUrl));
    if (!payload) return null;
    const buffer = Buffer.from(payload.body);
    const contentType = toImageContentType(payload.contentType);
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
};

const writeProviderIconToStorage = async (iconUrl: string, buffer: Buffer) => {
  if (!isObjectStorageConfigured()) return;
  try {
    await putCachedImageToObjectStorage(buildProviderIconStorageKey(iconUrl), {
      body: bufferToArrayBuffer(buffer),
      contentType: 'image/png',
      cacheControl: buildSourceImageFallbackCacheControl(PROVIDER_ICON_CACHE_TTL_MS),
    });
  } catch {
    // Ignore icon cache write failures.
  }
};

const pickTmdbImageSize = (imageType: 'poster' | 'backdrop' | 'logo', outputWidth: number) => {
  if (imageType === 'poster') return 'w500';
  if (imageType === 'backdrop') return 'w1280';
  if (imageType === 'logo') {
    return outputWidth <= 500 ? 'w500' : 'original';
  }
  return 'original';
};

const buildTmdbImageUrl = (
  imageType: 'poster' | 'backdrop' | 'logo',
  imgPath: string,
  outputWidth: number
) => {
  const size = pickTmdbImageSize(imageType, outputWidth);
  return `https://image.tmdb.org/t/p/${size}${imgPath}`;
};

const fetchSourceImageUncached = async (
  imgUrl: string,
  fallbackTtlMs: number
): Promise<RenderedImagePayload> => {
  const sourceResponse = await fetch(imgUrl, { cache: 'no-store' });
  if (!sourceResponse.ok) {
    throw new HttpError('Image not found', sourceResponse.status || 404);
  }

  return {
    body: await sourceResponse.arrayBuffer(),
    contentType: sourceResponse.headers.get('content-type') || 'image/jpeg',
    cacheControl:
      sourceResponse.headers.get('cache-control') || buildSourceImageFallbackCacheControl(fallbackTtlMs),
  };
};

const getSourceImagePayload = async (
  imgUrl: string,
  fallbackTtlMs = TMDB_CACHE_TTL_MS
): Promise<RenderedImagePayload> => {
  const normalizedImgUrl = String(imgUrl || '').trim();
  if (!normalizedImgUrl) {
    throw new HttpError('Image not found', 404);
  }

  const sharedCacheable = isTmdbSourceImageUrl(normalizedImgUrl);
  if (!sharedCacheable) {
    return fetchSourceImageUncached(normalizedImgUrl, fallbackTtlMs);
  }

  // Local image cache removed in favor of objectStorage

  const sourceHash = sha1Hex(normalizedImgUrl);
  const sourceObjectStorageKey = `source/${sourceHash}`;
  const objectStorageEnabled = isObjectStorageConfigured();

  const readSharedSourcePayload = async () => {
    if (!objectStorageEnabled) return null;


    const objectPayload = await getCachedImageFromObjectStorage(sourceObjectStorageKey);
    if (!objectPayload) {
      return null;
    }

    const payload: RenderedImagePayload = {
      body: objectPayload.body,
      contentType: objectPayload.contentType,
      cacheControl: objectPayload.cacheControl,
    };
    return payload;
  };

  if (objectStorageEnabled) {
    try {
      const sharedPayload = await readSharedSourcePayload();
      if (sharedPayload) {
        return sharedPayload;
      }
    } catch {
      // Ignore distributed cache read failures and continue with fetch path.
    }
  }

  return withDedupe(sourceImageInFlight, normalizedImgUrl, async () => {
    // Local warming removed

    if (objectStorageEnabled) {
      try {
        const sharedPayload = await readSharedSourcePayload();
        if (sharedPayload) {
          return sharedPayload;
        }
      } catch {
        // Ignore distributed cache read failures inside in-flight dedupe path.
      }
    }


    const payload = await fetchSourceImageUncached(normalizedImgUrl, fallbackTtlMs);

    if (objectStorageEnabled) {
      try {
        await putCachedImageToObjectStorage(sourceObjectStorageKey, payload);
      } catch {
        // Ignore distributed cache persistence failures for source images.
      }
    }

    return payload;
  });
};

const getProviderIconDataUri = async (iconUrl: string): Promise<string | null> => {
  const normalizedIconUrl = iconUrl.trim();
  if (!normalizedIconUrl) return null;
  if (normalizedIconUrl.startsWith('data:')) {
    return normalizedIconUrl;
  }

  const localCached = getMetadata<string>(normalizedIconUrl);
  if (localCached) {
    return localCached;
  }

  return withDedupe(providerIconInFlight, normalizedIconUrl, async () => {
    const warmLocal = getMetadata<string>(normalizedIconUrl);
    if (warmLocal) return warmLocal;

    const storageCached = await readProviderIconFromStorage(normalizedIconUrl);
    if (storageCached) {
      setMetadata(normalizedIconUrl, storageCached, PROVIDER_ICON_CACHE_TTL_MS);
      return storageCached;
    }

    try {
      const response = await fetch(normalizedIconUrl, { cache: 'no-store' });
      if (!response.ok) return null;

      const sourceBuffer = Buffer.from(await response.arrayBuffer());
      const sharp = await getSharpFactory();
      const outputBuffer = await sharp(sourceBuffer)
        .resize(96, 96, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png({ compressionLevel: 6 })
        .toBuffer();
      const outputContentType = 'image/png';

      const dataUri = `data:${outputContentType};base64,${outputBuffer.toString('base64')}`;
      setMetadata(normalizedIconUrl, dataUri, PROVIDER_ICON_CACHE_TTL_MS);
      await writeProviderIconToStorage(normalizedIconUrl, outputBuffer);

      return dataUri;
    } catch {
      return null;
    }
  });
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const splitTitleForGeneratedLogo = (title: string) => {
  const normalized = title.replace(/\s+/g, ' ').trim();
  if (!normalized) return ['Kitsu'];

  const words = normalized.split(' ').filter(Boolean);
  if (words.length <= 2 && normalized.length <= 24) return [normalized];

  const maxLines = 4;
  const targetLineLength =
    normalized.length >= 56 ? 13 : normalized.length >= 42 ? 15 : normalized.length >= 30 ? 17 : 19;
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    const currentLimit = lines.length === 0 ? targetLineLength + 1 : targetLineLength;
    if (currentLine && nextLine.length > currentLimit && lines.length < maxLines - 1) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }
    currentLine = nextLine;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length > maxLines) {
    const head = lines.slice(0, maxLines - 1);
    const tail = lines.slice(maxLines - 1).join(' ');
    return [...head, tail];
  }

  return lines;
};

const estimateGeneratedLogoLineWidth = (line: string, fontSize: number) =>
  [...line].reduce((acc, ch) => {
    if (ch === ' ') return acc + fontSize * 0.30;
    if (/[WMwm]/.test(ch)) return acc + fontSize * 0.92;
    if (/[A-Z]/.test(ch)) return acc + fontSize * 0.74;
    if (/[0-9]/.test(ch)) return acc + fontSize * 0.66;
    if (/[\-_:/'".,!?&]/.test(ch)) return acc + fontSize * 0.36;
    return acc + fontSize * 0.60;
  }, 0);

const buildGeneratedLogoDataUrl = (title: string) => {
  const lines = splitTitleForGeneratedLogo(title);
  const maxLineLength = Math.max(...lines.map((line) => line.length), 1);
  const width = Math.max(
    760,
    Math.min(LOGO_MAX_WIDTH, Math.round(maxLineLength * 68 + 280))
  );
  const height = LOGO_BASE_HEIGHT;
  const aspectRatio = width / height;
  const baseFontSize = lines.length === 1 ? 172 : lines.length === 2 ? 136 : lines.length === 3 ? 108 : 86;
  const compressedFontSize = Math.max(58, Math.floor((width - 160) / Math.max(maxLineLength, 1) * 1.72));
  const preliminaryFontSize = Math.min(baseFontSize, compressedFontSize);
  const availableLineWidth = Math.max(420, width - 150);
  const longestEstimatedLineWidth = Math.max(
    ...lines.map((line) => estimateGeneratedLogoLineWidth(line, preliminaryFontSize)),
    1
  );
  const widthFitScale = Math.min(1, availableLineWidth / longestEstimatedLineWidth);
  const fontSize = Math.max(54, Math.floor(preliminaryFontSize * widthFitScale));
  const lineHeight = Math.round(fontSize * 0.96);
  const totalTextHeight = lineHeight * (lines.length - 1);
  const startY = Math.round(height / 2 - totalTextHeight / 2 + fontSize * 0.34);
  const strokeWidth = Math.max(4, Math.round(fontSize * 0.07));
  const letterSpacing = Math.max(1, Math.round(fontSize * 0.015));
  const tspans = lines
    .map((line, index) => {
      const y = startY + index * lineHeight;
      const estimatedLineWidth = estimateGeneratedLogoLineWidth(line, fontSize);
      const textLength =
        estimatedLineWidth > availableLineWidth
          ? ` textLength="${availableLineWidth}" lengthAdjust="spacingAndGlyphs"`
          : '';
      return `<tspan x="${Math.round(width / 2)}" y="${y}"${textLength}>${escapeXml(line)}</tspan>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <filter id="logo-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.38" />
  </filter>
</defs>
<text x="${Math.round(width / 2)}" y="${startY}" text-anchor="middle" font-family="Arial Narrow, Trebuchet MS, Arial, sans-serif" font-size="${fontSize}" font-weight="800" font-style="italic" letter-spacing="${letterSpacing}" fill="#ffffff" stroke="rgba(0,0,0,0.65)" stroke-width="${strokeWidth}" paint-order="stroke fill" filter="url(#logo-shadow)">${tspans}</text>
</svg>`;
  return {
    dataUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    aspectRatio,
  };
};

const splitTitleForPosterText = (title: string) => {
  const lines = splitTitleForGeneratedLogo(title);
  if (lines.length <= 2) return lines;
  return [lines[0], lines.slice(1).join(' ')];
};

const buildPosterTitleSvg = (title: string, maxWidth: number) => {
  const normalized = title.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  const lines = splitTitleForPosterText(normalized);
  const width = Math.max(260, Math.round(maxWidth));
  const availableLineWidth = Math.max(220, width - 48);
  const maxLineLength = Math.max(...lines.map((line) => line.length), 1);
  const baseFontSize = lines.length === 1 ? 64 : 54;
  const compressedFontSize = Math.floor((availableLineWidth / Math.max(1, maxLineLength)) * 1.35);
  const preliminaryFontSize = Math.min(baseFontSize, compressedFontSize);
  const longestEstimatedLineWidth = Math.max(
    ...lines.map((line) => estimateGeneratedLogoLineWidth(line, preliminaryFontSize)),
    1
  );
  const widthFitScale = Math.min(1, availableLineWidth / longestEstimatedLineWidth);
  const fontSize = Math.max(26, Math.floor(preliminaryFontSize * widthFitScale));
  const lineHeight = Math.round(fontSize * 1.08);
  const height = Math.round(lineHeight * lines.length);
  const startY = Math.round(fontSize * 0.9);
  const strokeWidth = Math.max(2, Math.round(fontSize * 0.1));
  const letterSpacing = Math.max(1, Math.round(fontSize * 0.015));
  const tspans = lines
    .map((line, index) => {
      const y = startY + index * lineHeight;
      const estimatedLineWidth = estimateGeneratedLogoLineWidth(line, fontSize);
      const textLength =
        estimatedLineWidth > availableLineWidth
          ? ` textLength="${availableLineWidth}" lengthAdjust="spacingAndGlyphs"`
          : '';
      return `<tspan x="${Math.round(width / 2)}" y="${y}"${textLength}>${escapeXml(line)}</tspan>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <filter id="poster-title-shadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.5" />
  </filter>
</defs>
<text x="${Math.round(width / 2)}" y="${startY}" text-anchor="middle" font-family="'Noto Sans','DejaVu Sans',Arial,sans-serif" font-size="${fontSize}" font-weight="800" letter-spacing="${letterSpacing}" fill="#ffffff" stroke="rgba(0,0,0,0.65)" stroke-width="${strokeWidth}" paint-order="stroke fill" filter="url(#poster-title-shadow)">${tspans}</text>
</svg>`;
  return { svg, width, height };
};

const chunkBy = <T,>(items: T[], size: number): T[][] => {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

type BadgeLayoutMetrics = {
  iconSize: number;
  fontSize: number;
  paddingX: number;
  paddingY: number;
  gap: number;
};
type PosterBadgeGroups = {
  topBadges: RatingBadge[];
  bottomBadges: RatingBadge[];
  leftBadges: RatingBadge[];
  rightBadges: RatingBadge[];
};
type BackdropBadgeRegion = {
  left: number;
  width: number;
};
const DEFAULT_BADGE_MIN_METRICS: BadgeLayoutMetrics = {
  iconSize: 24,
  fontSize: 18,
  paddingX: 8,
  paddingY: 6,
  gap: 6,
};
const getBadgeTextRightInset = (
  value: string,
  fontSize: number,
  paddingX: number,
  compactText = false
) => {
  const normalized = value.trim();
  const baseInset = Math.max(
    compactText ? 2 : 4,
    Math.round(fontSize * (compactText ? 0.12 : 0.16)) + Math.round(paddingX * 0.24)
  );
  const trailingPercentInset =
    normalized.endsWith('%')
      ? Math.max(
          compactText ? 6 : 5,
          Math.round(fontSize * (compactText ? 0.18 : 0.14))
        )
      : 0;
  return baseInset + trailingPercentInset;
};

const estimateBadgeTextWidth = (
  value: string,
  fontSize: number,
  compactText = false
) => {
  const normalized = value.trim();
  if (!normalized) {
    return Math.round(fontSize * (compactText ? 1.14 : 1.3));
  }
  const measureChar = (ch: string) => {
    if (/[0-9]/.test(ch)) return fontSize * (compactText ? 0.51 : 0.56);
    if (ch === '%') return fontSize * (compactText ? 0.56 : 0.62);
    if (ch === '/' || ch === '|') return fontSize * (compactText ? 0.34 : 0.40);
    if (ch === '.' || ch === ',' || ch === ':') return fontSize * (compactText ? 0.22 : 0.28);
    if (ch === ' ') return fontSize * (compactText ? 0.24 : 0.30);
    return fontSize * (compactText ? 0.54 : 0.58);
  };
  const measuredTextWidth = [...normalized].reduce((acc, ch) => acc + measureChar(ch), 0);
  const safetyRightPadding = Math.max(
    compactText ? 1 : 2,
    Math.round(
      fontSize *
      (normalized.endsWith('%') || normalized.includes('/')
        ? compactText ? 0.20 : 0.28
        : compactText ? 0.04 : 0.06)
    )
  );
  const structureWidth = Math.round(normalized.length * fontSize * (compactText ? 0.38 : 0.44));
  return Math.max(
    Math.round(fontSize * (compactText ? 0.92 : 1.00)),
    Math.round(measuredTextWidth + safetyRightPadding),
    structureWidth
  );
};

const estimateBadgeWidth = (
  value: string,
  fontSize: number,
  paddingX: number,
  iconSize: number,
  gap: number,
  compactText = false
) => {
  const textWidth = estimateBadgeTextWidth(value, fontSize, compactText);
  const rightInset = getBadgeTextRightInset(value, fontSize, paddingX, compactText);
  return Math.max(
    iconSize + paddingX + gap + textWidth + rightInset,
    iconSize + paddingX + gap + rightInset + Math.round(fontSize * (compactText ? 1.12 : 1.25))
  );
};
const getMinimumCompressedBadgeWidth = (
  value: string,
  fontSize: number,
  paddingX: number,
  iconSize: number,
  gap: number,
  compactText = false
) =>
  iconSize +
  paddingX +
  gap +
  getBadgeTextRightInset(value, fontSize, paddingX, compactText) +
  Math.round(fontSize * (compactText ? 0.82 : 0.92));

const measureBadgeRowWidth = (
  rowBadges: RatingBadge[],
  metrics: BadgeLayoutMetrics,
  compactText = false
) => {
  if (rowBadges.length === 0) return 0;
  return (
    rowBadges.reduce(
      (acc, badge) =>
        acc +
        estimateBadgeWidth(
          badge.value,
          metrics.fontSize,
          metrics.paddingX,
          metrics.iconSize,
          metrics.gap,
          compactText
        ),
      0
    ) +
    Math.max(0, rowBadges.length - 1) * metrics.gap
  );
};

const fitPosterBadgeMetricsToWidth = (
  rows: RatingBadge[][],
  outputWidth: number,
  initialMetrics: BadgeLayoutMetrics,
  minMetrics: BadgeLayoutMetrics = DEFAULT_BADGE_MIN_METRICS,
  compactText = false,
  preserveContent = false
) => {
  const maxRowWidth = Math.max(0, outputWidth - 24);
  const metrics: BadgeLayoutMetrics = { ...initialMetrics };

  const measureWidestRow = () =>
    rows.reduce((maxWidth, row) => Math.max(maxWidth, measureBadgeRowWidth(row, metrics, compactText)), 0);

  let widestRow = measureWidestRow();
  let attempts = 0;

  while (widestRow > maxRowWidth && attempts < 20) {
    const ratio = Math.max(0.84, Math.min(0.96, maxRowWidth / widestRow));
    if (preserveContent) {
      const chromeRatio = Math.max(0.68, ratio * ratio);
      const verticalRatio = Math.max(0.76, ratio * ratio);
      const iconRatio = Math.max(0.88, Math.min(0.97, ratio + 0.05));
      const fontRatio = Math.max(0.92, Math.min(0.98, ratio + 0.09));
      metrics.paddingX = Math.max(minMetrics.paddingX, Math.floor(metrics.paddingX * chromeRatio));
      metrics.paddingY = Math.max(minMetrics.paddingY, Math.floor(metrics.paddingY * verticalRatio));
      metrics.gap = Math.max(minMetrics.gap, Math.floor(metrics.gap * chromeRatio));
      metrics.iconSize = Math.max(minMetrics.iconSize, Math.floor(metrics.iconSize * iconRatio));
      metrics.fontSize = Math.max(minMetrics.fontSize, Math.floor(metrics.fontSize * fontRatio));
    } else {
      metrics.iconSize = Math.max(minMetrics.iconSize, Math.floor(metrics.iconSize * ratio));
      metrics.fontSize = Math.max(minMetrics.fontSize, Math.floor(metrics.fontSize * ratio));
      metrics.paddingX = Math.max(minMetrics.paddingX, Math.floor(metrics.paddingX * ratio));
      metrics.paddingY = Math.max(minMetrics.paddingY, Math.floor(metrics.paddingY * ratio));
      metrics.gap = Math.max(minMetrics.gap, Math.floor(metrics.gap * ratio));
    }

    // When the ratio stalls near the minimums, force a small extra shrink.
    if (widestRow > maxRowWidth) {
      if (metrics.paddingX > minMetrics.paddingX) metrics.paddingX -= 1;
      else if (metrics.gap > minMetrics.gap) metrics.gap -= 1;
      else if (metrics.paddingY > minMetrics.paddingY) metrics.paddingY -= 1;
      else if (!preserveContent && metrics.fontSize > minMetrics.fontSize) metrics.fontSize -= 1;
      else if (metrics.iconSize > minMetrics.iconSize) metrics.iconSize -= 1;
      else if (metrics.fontSize > minMetrics.fontSize) metrics.fontSize -= 1;
      else break;
    }

    widestRow = measureWidestRow();
    attempts += 1;
  }

  while (widestRow > maxRowWidth) {
    if (metrics.gap > minMetrics.gap) metrics.gap -= 1;
    else if (metrics.paddingX > minMetrics.paddingX) metrics.paddingX -= 1;
    else if (metrics.paddingY > minMetrics.paddingY) metrics.paddingY -= 1;
    else if (metrics.iconSize > minMetrics.iconSize) metrics.iconSize -= 1;
    else if (metrics.fontSize > minMetrics.fontSize) metrics.fontSize -= 1;
    else break;
    widestRow = measureWidestRow();
  }

  return metrics;
};

const measureBadgeColumnHeight = (columnBadges: RatingBadge[], metrics: BadgeLayoutMetrics) => {
  if (columnBadges.length === 0) return 0;
  const badgeHeight = metrics.iconSize + metrics.paddingY * 2;
  return columnBadges.length * badgeHeight + Math.max(0, columnBadges.length - 1) * metrics.gap;
};

const getMaxBadgeColumnCount = (
  outputHeight: number,
  metrics: BadgeLayoutMetrics,
  topOffset: number,
  bottomOffset: number
) => {
  const availableHeight = Math.max(0, outputHeight - topOffset - bottomOffset);
  const badgeHeight = metrics.iconSize + metrics.paddingY * 2;
  const step = badgeHeight + metrics.gap;
  if (badgeHeight <= 0 || step <= 0) return 1;
  return Math.max(1, Math.floor((availableHeight + metrics.gap) / step));
};

const fitPosterBadgeMetricsToHeight = (
  columns: RatingBadge[][],
  outputHeight: number,
  initialMetrics: BadgeLayoutMetrics,
  topOffset: number,
  bottomOffset: number,
  minMetrics: BadgeLayoutMetrics = DEFAULT_BADGE_MIN_METRICS
) => {
  const maxColumnHeight = Math.max(0, outputHeight - topOffset - bottomOffset);
  const metrics: BadgeLayoutMetrics = { ...initialMetrics };

  const measureTallestColumn = () =>
    columns.reduce((maxHeight, column) => Math.max(maxHeight, measureBadgeColumnHeight(column, metrics)), 0);

  let tallestColumn = measureTallestColumn();
  let attempts = 0;

  while (tallestColumn > maxColumnHeight && attempts < 12) {
    const ratio = Math.max(0.84, Math.min(0.96, maxColumnHeight / tallestColumn));
    metrics.iconSize = Math.max(minMetrics.iconSize, Math.floor(metrics.iconSize * ratio));
    metrics.fontSize = Math.max(minMetrics.fontSize, Math.floor(metrics.fontSize * ratio));
    metrics.paddingX = Math.max(minMetrics.paddingX, Math.floor(metrics.paddingX * ratio));
    metrics.paddingY = Math.max(minMetrics.paddingY, Math.floor(metrics.paddingY * ratio));
    metrics.gap = Math.max(minMetrics.gap, Math.floor(metrics.gap * ratio));

    if (tallestColumn > maxColumnHeight) {
      if (metrics.paddingY > minMetrics.paddingY) metrics.paddingY -= 1;
      else if (metrics.gap > minMetrics.gap) metrics.gap -= 1;
      else if (metrics.fontSize > minMetrics.fontSize) metrics.fontSize -= 1;
      else if (metrics.iconSize > minMetrics.iconSize) metrics.iconSize -= 1;
      else if (metrics.paddingX > minMetrics.paddingX) metrics.paddingX -= 1;
      else break;
    }

    tallestColumn = measureTallestColumn();
    attempts += 1;
  }

  return metrics;
};

const splitPosterBadgesByLayout = (
  badges: RatingBadge[],
  layout: PosterRatingLayout,
  maxPerColumn?: number
): PosterBadgeGroups => {
  const totalLimit = getPosterRatingLayoutMaxBadges(layout, maxPerColumn);
  const limitedBadges = typeof totalLimit === 'number' ? badges.slice(0, totalLimit) : badges;
  const columnLimit = typeof maxPerColumn === 'number' ? Math.max(1, maxPerColumn) : null;
  if (layout === 'top') {
    return { topBadges: limitedBadges, bottomBadges: [], leftBadges: [], rightBadges: [] };
  }
  if (layout === 'bottom') {
    return { topBadges: [], bottomBadges: limitedBadges, leftBadges: [], rightBadges: [] };
  }
  if (layout === 'left') {
    return {
      topBadges: [],
      bottomBadges: [],
      leftBadges: columnLimit ? limitedBadges.slice(0, columnLimit) : limitedBadges,
      rightBadges: [],
    };
  }
  if (layout === 'right') {
    return {
      topBadges: [],
      bottomBadges: [],
      leftBadges: [],
      rightBadges: columnLimit ? limitedBadges.slice(0, columnLimit) : limitedBadges,
    };
  }

  if (layout === 'left-right') {
    const columnSize = columnLimit || Math.ceil(limitedBadges.length / 2);
    return {
      topBadges: [],
      bottomBadges: [],
      leftBadges: limitedBadges.slice(0, columnSize),
      rightBadges: limitedBadges.slice(columnSize, columnSize * 2),
    };
  }

  const primary = limitedBadges.slice(0, 3);
  const secondary = limitedBadges.slice(3, 6);
  return { topBadges: primary, bottomBadges: secondary, leftBadges: [], rightBadges: [] };
};

const getBackdropBadgeRegion = (
  outputWidth: number,
  layout: BackdropRatingLayout
): BackdropBadgeRegion => {
  if (layout !== 'right') {
    return { left: 0, width: outputWidth };
  }

  const width = Math.min(outputWidth - 24, Math.max(280, Math.floor(outputWidth * 0.46)));
  return {
    left: Math.max(12, outputWidth - width - 12),
    width,
  };
};

const getBadgeOuterRadius = (height: number, ratingStyle: RatingStyle) =>
  ratingStyle === 'square' ? Math.max(10, Math.round(height * 0.24)) : Math.round(height / 2);

const getBadgeIconRadius = (iconSize: number, ratingStyle: RatingStyle) =>
  ratingStyle === 'square' ? Math.max(6, Math.round(iconSize * 0.22)) : Math.round(iconSize / 2);

const buildQualityBadgeSvg = (
  key: StreamBadgeKey,
  height: number,
  widthOverride?: number,
  style: RatingStyle = DEFAULT_QUALITY_BADGES_STYLE
) => {
  const h = Math.max(32, Math.round(height * 0.9));
  const radius = style === 'glass' ? Math.round(h / 2) : Math.round(h * 0.18);
  const strokeWidth =
    style === 'glass'
      ? Math.max(1, Math.round(h * 0.04))
      : style === 'square'
        ? Math.max(1, Math.round(h * 0.05))
        : Math.max(2, Math.round(h * 0.08));
  const innerPadding = Math.max(10, Math.round(h * 0.16));
  const fontFamily = `'Noto Sans','DejaVu Sans',Arial,sans-serif`;
  const baseRect = (width: number, stroke: string, fill: string, extra = '') =>
    `<rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${Math.max(0, width - strokeWidth)}" height="${Math.max(0, h - strokeWidth)}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${extra}/>`;
  const resolveChrome = (accentColor: string) => {
    if (style === 'plain') return null;
    if (style === 'glass') {
      return {
        stroke: 'rgba(255,255,255,0.45)',
        fill: 'rgba(17,24,39,0.70)',
      };
    }
    return { stroke: accentColor, fill: '#0b0b0b' };
  };
  const buildRect = (width: number, accentColor: string, extra = '') => {
    const chrome = resolveChrome(accentColor);
    if (!chrome) return '';
    return baseRect(width, chrome.stroke, chrome.fill, extra);
  };

  if (key === '4k') {
    const width = widthOverride ?? Math.round(h * 1.55);
    const bigSize = Math.round(h * 0.56);
    const smallSize = Math.round(h * 0.2);
    const bigY = Math.round(h * 0.58);
    const smallY = Math.round(h * 0.86);
    const color = '#f7c948';
    const rect = buildRect(width, color);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">
${rect}
<text x="${width / 2}" y="${bigY}" font-family="${fontFamily}" font-size="${bigSize}" font-weight="800" text-anchor="middle" fill="${color}">4K</text>
<text x="${width / 2}" y="${smallY}" font-family="${fontFamily}" font-size="${smallSize}" font-weight="700" text-anchor="middle" fill="${color}" letter-spacing="0.06em">ULTRA HD</text>
</svg>`;
    return { svg, width, height: h };
  }

  if (key === 'hdr') {
    const width = widthOverride ?? Math.round(h * 1.6);
    const bigSize = Math.round(h * 0.5);
    const smallSize = Math.round(h * 0.2);
    const bigY = Math.round(h * 0.57);
    const smallY = Math.round(h * 0.86);
    const rect =
      style === 'square'
        ? baseRect(width, 'url(#hdrBorder)', '#0b0b0b')
        : buildRect(width, '#e5e7eb');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">
<defs>
  <linearGradient id="hdrBorder" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#22c55e"/>
    <stop offset="50%" stop-color="#22d3ee"/>
    <stop offset="100%" stop-color="#facc15"/>
  </linearGradient>
</defs>
${rect}
<text x="${width / 2}" y="${bigY}" font-family="${fontFamily}" font-size="${bigSize}" font-weight="800" text-anchor="middle" fill="white">HDR</text>
<text x="${width / 2}" y="${smallY}" font-family="${fontFamily}" font-size="${smallSize}" font-weight="700" text-anchor="middle" fill="#a7f3d0" letter-spacing="0.05em">TRUE COLOR</text>
</svg>`;
    return { svg, width, height: h };
  }

  if (key === 'dolbyvision') {
    const width = widthOverride ?? Math.round(h * 1.95);
    const topSize = Math.round(h * 0.22);
    const bottomSize = Math.round(h * 0.42);
    const topY = Math.round(h * 0.36);
    const bottomY = Math.round(h * 0.73);
    const textLength = Math.max(40, Math.floor(width - innerPadding * 2));
    const rect = buildRect(width, '#e5e7eb');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">
${rect}
<text x="${width / 2}" y="${topY}" font-family="${fontFamily}" font-size="${topSize}" font-weight="700" text-anchor="middle" fill="#e5e7eb" letter-spacing="0.18em" textLength="${textLength}" lengthAdjust="spacingAndGlyphs">DOLBY</text>
<text x="${width / 2}" y="${bottomY}" font-family="${fontFamily}" font-size="${bottomSize}" font-weight="800" text-anchor="middle" fill="#e5e7eb" textLength="${textLength}" lengthAdjust="spacingAndGlyphs">VISION</text>
</svg>`;
    return { svg, width, height: h };
  }

  if (key === 'dolbyatmos') {
    const width = widthOverride ?? Math.round(h * 1.95);
    const topSize = Math.round(h * 0.22);
    const bottomSize = Math.round(h * 0.42);
    const topY = Math.round(h * 0.36);
    const bottomY = Math.round(h * 0.73);
    const textLength = Math.max(40, Math.floor(width - innerPadding * 2));
    const rect = buildRect(width, '#e5e7eb');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">
${rect}
<text x="${width / 2}" y="${topY}" font-family="${fontFamily}" font-size="${topSize}" font-weight="700" text-anchor="middle" fill="#e5e7eb" letter-spacing="0.18em" textLength="${textLength}" lengthAdjust="spacingAndGlyphs">DOLBY</text>
<text x="${width / 2}" y="${bottomY}" font-family="${fontFamily}" font-size="${bottomSize}" font-weight="800" text-anchor="middle" fill="#e5e7eb" textLength="${textLength}" lengthAdjust="spacingAndGlyphs">ATMOS</text>
</svg>`;
    return { svg, width, height: h };
  }

  if (key === 'remux') {
    const width = widthOverride ?? Math.round(h * 1.55);
    const textSize = Math.round(h * 0.42);
    const textY = Math.round(h * 0.63);
    const color = '#ef4444';
    const rect = buildRect(width, color);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">
${rect}
<text x="${width / 2}" y="${textY}" font-family="${fontFamily}" font-size="${textSize}" font-weight="800" text-anchor="middle" fill="${color}" letter-spacing="0.08em">REMUX</text>
</svg>`;
    return { svg, width, height: h };
  }

  return null;
};

const buildBadgeSvg = ({
  width,
  height,
  iconSize,
  fontSize,
  paddingX,
  gap,
  accentColor,
  monogram,
  iconDataUri,
  value,
  ratingStyle,
  compactText = false,
}: {
  width: number;
  height: number;
  iconSize: number;
  fontSize: number;
  paddingX: number;
  gap: number;
  accentColor: string;
  monogram: string;
  iconDataUri?: string | null;
  value: string;
  ratingStyle: RatingStyle;
  compactText?: boolean;
}) => {
  const radius = getBadgeOuterRadius(height, ratingStyle);
  const iconRadius = getBadgeIconRadius(iconSize, ratingStyle);
  const iconCx = paddingX + Math.round(iconSize / 2);
  const iconCy = Math.round(height / 2);
  const iconFontSize = Math.max(12, Math.round(iconSize * 0.42));
  const valueX = paddingX + iconSize + gap;
  const valueY = Math.round(height / 2 + fontSize * 0.36);
  const valueTextWidth = estimateBadgeTextWidth(value, fontSize, compactText);
  const valueRightInset = getBadgeTextRightInset(value, fontSize, paddingX, compactText);
  const valueAvailableWidth = Math.max(0, width - valueX - valueRightInset);
  const valueTextLength =
    compactText && valueTextWidth > valueAvailableWidth
      ? ` textLength="${valueAvailableWidth}" lengthAdjust="spacingAndGlyphs"`
      : '';
  const valueFontFamily = compactText
    ? `'Noto Sans','DejaVu Sans','Arial Narrow','Liberation Sans Narrow','Nimbus Sans Narrow','Roboto Condensed',Arial,sans-serif`
    : `'Noto Sans','DejaVu Sans',Arial,sans-serif`;
  const valueLetterSpacing = compactText ? ' letter-spacing="-0.04em"' : '';
  const iconX = paddingX;
  const iconY = Math.round((height - iconSize) / 2);
  const iconShape =
    ratingStyle === 'plain'
      ? ''
      : ratingStyle === 'square'
        ? `<rect x="${iconX + 0.75}" y="${iconY + 0.75}" width="${Math.max(0, iconSize - 1.5)}" height="${Math.max(0, iconSize - 1.5)}" rx="${iconRadius}" fill="rgb(10,10,10)" />`
        : `<circle cx="${iconCx}" cy="${iconCy}" r="${iconRadius}" fill="${accentColor}" stroke="rgba(255,255,255,0.45)" />`;
  const iconClipPath =
    ratingStyle === 'plain'
      ? ''
      : ratingStyle === 'square'
        ? `<rect x="${iconX + 1.5}" y="${iconY + 1.5}" width="${Math.max(0, iconSize - 3)}" height="${Math.max(0, iconSize - 3)}" rx="${Math.max(4, iconRadius - 1)}" />`
        : `<circle cx="${iconCx}" cy="${iconCy}" r="${Math.max(1, iconRadius - 1)}" />`;
  const iconBorder =
    ratingStyle === 'plain'
      ? ''
      : ratingStyle === 'square'
        ? ''
        : `<circle cx="${iconCx}" cy="${iconCy}" r="${iconRadius}" fill="none" stroke="rgba(255,255,255,0.45)" />`;
  const outerRect =
    ratingStyle === 'plain'
      ? ''
      : `<rect x="0.75" y="0.75" width="${Math.max(0, width - 1.5)}" height="${Math.max(0, height - 1.5)}" rx="${radius}" fill="${ratingStyle === 'square' ? 'rgb(5,5,5)' : 'rgb(17,24,39)'}" fill-opacity="${ratingStyle === 'square' ? '0.94' : '0.70'}" stroke="${ratingStyle === 'square' ? accentColor : 'rgba(255,255,255,0.30)'}" stroke-width="${ratingStyle === 'square' ? '1.5' : '1'}" />`;
  const monogramFill = ratingStyle === 'glass' ? 'white' : accentColor;
  const textShadowFilter =
    ratingStyle === 'plain'
      ? `<defs><filter id="text-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="2.4" flood-color="#000000" flood-opacity="0.55" /></filter></defs>`
      : '';
  const iconImage =
    !iconDataUri
      ? ''
      : ratingStyle === 'plain'
        ? `<image href="${iconDataUri}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid meet" />`
        : `<defs><clipPath id="icon-clip">${iconClipPath}</clipPath></defs><image href="${iconDataUri}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#icon-clip)" />${iconBorder}`;
  const monogramText =
    iconDataUri
      ? ''
      : `<text x="${iconCx}" y="${Math.round(iconCy + iconFontSize * 0.34)}" font-family="Arial, sans-serif" font-size="${iconFontSize}" font-weight="700" text-anchor="middle" fill="${monogramFill}">${escapeXml(monogram)}</text>${iconBorder}`;
  const valueFilter = ratingStyle === 'plain' ? ' filter="url(#text-shadow)"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${textShadowFilter}
${outerRect}
${iconShape}
${iconImage}
${monogramText}
<text x="${valueX}" y="${valueY}" font-family="${valueFontFamily}" font-size="${fontSize}" font-weight="800" fill="white"${valueFilter}${valueLetterSpacing}${valueTextLength}>${escapeXml(value)}</text>
</svg>`;
};

const renderWithSharp = async (
  input: FastRenderInput,
  phases: PhaseDurations
): Promise<RenderedImagePayload> => {
  const sharp = await getSharpFactory();

  return await measurePhase(phases, 'render', async () => {
    const imageWidth = input.imageWidth ?? input.outputWidth;
    const imageHeight = input.imageHeight ?? input.outputHeight;
    const imageLeft = Math.max(0, Math.floor((input.outputWidth - imageWidth) / 2));
    const sourcePayload = await getSourceImagePayload(input.imgUrl);
    const sourceBuffer = Buffer.from(sourcePayload.body);
    const overlays: Array<{ input: Buffer; top: number; left: number }> = [];

    const preparedImage = input.imageType === 'logo'
      ? sharp(sourceBuffer).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      : sharp(sourceBuffer);
    const resizedImageBuffer: Buffer = await preparedImage
      .resize(imageWidth, imageHeight, {
        fit: input.imageType === 'logo' ? 'contain' : 'cover',
        position: 'center',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 1 })
      .toBuffer();
    overlays.push({ input: resizedImageBuffer, top: 0, left: imageLeft });

    const iconByProvider = new Map<BadgeKey, string | null>();
    if (input.badges.length > 0) {
      const iconEntries = await Promise.all(
        input.badges.map(async (badge) => {
          const iconDataUri = await getProviderIconDataUri(badge.iconUrl);
          return [badge.key, iconDataUri] as const;
        })
      );
      for (const [providerKey, iconDataUri] of iconEntries) {
        iconByProvider.set(providerKey, iconDataUri);
      }
    }

    const badgeHeight = input.badgeIconSize + input.badgePaddingY * 2;
    const compactPosterRowText =
      input.imageType === 'poster' &&
      input.posterRatingsLayout !== 'left' &&
      input.posterRatingsLayout !== 'right' &&
      input.posterRatingsLayout !== 'left-right';
    const posterRowRegionWidth = Math.max(0, input.outputWidth - input.posterRowHorizontalInset * 2);
    const alignPosterRowWithQuality =
      input.imageType === 'poster' &&
      input.qualityBadges.length > 0 &&
      (input.posterRatingsLayout === 'top' ||
        input.posterRatingsLayout === 'bottom' ||
        input.posterRatingsLayout === 'top-bottom');
    const posterRowAlign: 'left' | 'center' | 'right' = alignPosterRowWithQuality
      ? input.qualityBadgesSide === 'right'
        ? 'right'
        : 'left'
      : 'center';
    const posterTitleSpec =
      input.imageType === 'poster' && input.posterTitleText
        ? buildPosterTitleSvg(input.posterTitleText, posterRowRegionWidth)
        : null;
    let posterLogoSpec: { buffer: Buffer; width: number; height: number } | null = null;
    if (input.imageType === 'poster' && input.posterLogoUrl) {
      try {
        const logoPayload = await getSourceImagePayload(input.posterLogoUrl);
        const logoBuffer = Buffer.from(logoPayload.body);
        const logoMeta = await sharp(logoBuffer).metadata();
        if (logoMeta.width && logoMeta.height) {
          const maxLogoWidth = Math.min(posterRowRegionWidth, Math.round(input.outputWidth * 0.78));
          const maxLogoHeight = Math.max(48, Math.round(input.outputHeight * 0.16));
          const scale = Math.min(
            1,
            maxLogoWidth / logoMeta.width,
            maxLogoHeight / logoMeta.height
          );
          const logoWidth = Math.max(1, Math.round(logoMeta.width * scale));
          const logoHeight = Math.max(1, Math.round(logoMeta.height * scale));
          const resizedLogoBuffer = await sharp(logoBuffer)
            .resize(logoWidth, logoHeight, { fit: 'fill' })
            .png()
            .toBuffer();
          posterLogoSpec = { buffer: resizedLogoBuffer, width: logoWidth, height: logoHeight };
        }
      } catch {
        posterLogoSpec = null;
      }
    }
    const composeBadgeRow = (
      rowBadges: RatingBadge[],
      rowY: number,
      options?: {
        maxRowWidth?: number;
        regionLeft?: number;
        regionWidth?: number;
        align?: 'left' | 'center' | 'right';
      }
    ) => {
      if (rowBadges.length === 0) return;
      const rowEntries = rowBadges.map((badge) => {
        const badgeWidth = estimateBadgeWidth(
          badge.value,
          input.badgeFontSize,
          input.badgePaddingX,
          input.badgeIconSize,
          input.badgeGap,
          compactPosterRowText
        );
        const minBadgeWidth = getMinimumCompressedBadgeWidth(
          badge.value,
          input.badgeFontSize,
          input.badgePaddingX,
          input.badgeIconSize,
          input.badgeGap,
          compactPosterRowText
        );
        return { badge, badgeWidth, minBadgeWidth };
      });
      const regionLeft = Math.max(0, Math.floor(options?.regionLeft ?? 0));
      const regionWidth = Math.max(0, Math.floor(options?.regionWidth ?? input.outputWidth));
      const regionRight = Math.min(input.outputWidth, regionLeft + regionWidth);
      const effectiveMaxWidth =
        typeof options?.maxRowWidth === 'number'
          ? Math.min(options.maxRowWidth, Math.max(0, regionWidth - 24))
          : Math.max(0, regionWidth - 24);
      let rowGap = input.badgeGap;
      const measureCurrentRowWidth = () =>
        rowEntries.reduce((acc, entry) => acc + entry.badgeWidth, 0) +
        Math.max(0, rowEntries.length - 1) * rowGap;
      let rowWidth = measureCurrentRowWidth();
      if (rowWidth > effectiveMaxWidth && rowEntries.length > 1 && rowGap > 0) {
        const shrinkPerGap = Math.min(
          rowGap,
          Math.max(1, Math.ceil((rowWidth - effectiveMaxWidth) / (rowEntries.length - 1)))
        );
        rowGap = Math.max(0, rowGap - shrinkPerGap);
        rowWidth = measureCurrentRowWidth();
      }
      if (rowWidth > effectiveMaxWidth) {
        let overflow = rowWidth - effectiveMaxWidth;
        let guard = 0;
        while (overflow > 0 && guard < rowEntries.length * 8) {
          let changed = false;
          for (const entry of rowEntries) {
            if (overflow <= 0) break;
            const shrinkable = Math.max(0, entry.badgeWidth - entry.minBadgeWidth);
            if (shrinkable <= 0) continue;
            const shrink = Math.min(shrinkable, Math.max(1, Math.ceil(overflow / rowEntries.length)));
            entry.badgeWidth -= shrink;
            overflow -= shrink;
            changed = true;
          }
          if (!changed) break;
          rowWidth = measureCurrentRowWidth();
          overflow = Math.max(0, rowWidth - effectiveMaxWidth);
          guard += 1;
        }
        rowWidth = measureCurrentRowWidth();
      }
      const shouldSpreadRow =
        input.imageType === 'poster' &&
        (input.posterRatingsLayout === 'top' ||
          input.posterRatingsLayout === 'bottom' ||
          input.posterRatingsLayout === 'top-bottom') &&
        rowEntries.length === 3;
      const shouldCenterSecond =
        input.imageType === 'poster' &&
        (input.posterRatingsLayout === 'top' ||
          input.posterRatingsLayout === 'bottom' ||
          input.posterRatingsLayout === 'top-bottom') &&
        rowEntries.length === 2;
      if (shouldCenterSecond) {
        const edgeInset = 12;
        const leftX = regionLeft + edgeInset;
        const centerX = regionLeft + Math.floor(regionWidth / 2) - Math.floor(rowEntries[1].badgeWidth / 2);
        const overlaps = leftX + rowEntries[0].badgeWidth + rowGap > centerX;
        if (!overlaps) {
          const positions = [leftX, centerX];
          for (let index = 0; index < rowEntries.length; index += 1) {
            const entry = rowEntries[index];
            const monogram = buildProviderMonogram(
              entry.badge.label || String(entry.badge.key).toUpperCase()
            );
            const badgeSvg = buildBadgeSvg({
              width: entry.badgeWidth,
              height: badgeHeight,
              iconSize: input.badgeIconSize,
              fontSize: input.badgeFontSize,
              paddingX: input.badgePaddingX,
              gap: input.badgeGap,
              accentColor: entry.badge.accentColor,
              monogram,
              iconDataUri: iconByProvider.get(entry.badge.key) || null,
              value: entry.badge.value,
              ratingStyle: input.ratingStyle,
              compactText: compactPosterRowText,
            });
            overlays.push({ input: Buffer.from(badgeSvg), top: rowY, left: positions[index] });
          }
          return;
        }
      }
      if (shouldSpreadRow) {
        const edgeInset = 12;
        const leftX = regionLeft + edgeInset;
        const centerX = regionLeft + Math.floor(regionWidth / 2) - Math.floor(rowEntries[1].badgeWidth / 2);
        const rightX = Math.max(regionLeft, regionRight - rowEntries[2].badgeWidth - edgeInset);
        const overlaps =
          leftX + rowEntries[0].badgeWidth + rowGap > centerX ||
          centerX + rowEntries[1].badgeWidth + rowGap > rightX;
        if (!overlaps) {
          const positions = [leftX, centerX, rightX];
          for (let index = 0; index < rowEntries.length; index += 1) {
            const entry = rowEntries[index];
            const monogram = buildProviderMonogram(
              entry.badge.label || String(entry.badge.key).toUpperCase()
            );
            const badgeSvg = buildBadgeSvg({
              width: entry.badgeWidth,
              height: badgeHeight,
              iconSize: input.badgeIconSize,
              fontSize: input.badgeFontSize,
              paddingX: input.badgePaddingX,
              gap: input.badgeGap,
              accentColor: entry.badge.accentColor,
              monogram,
              iconDataUri: iconByProvider.get(entry.badge.key) || null,
              value: entry.badge.value,
              ratingStyle: input.ratingStyle,
              compactText: compactPosterRowText,
            });
            overlays.push({ input: Buffer.from(badgeSvg), top: rowY, left: positions[index] });
          }
          return;
        }
      }
      const align = options?.align || 'center';
      const preferredEdgeInset = 12;
      const dynamicEdgeInset =
        rowWidth > effectiveMaxWidth
          ? Math.max(0, Math.min(preferredEdgeInset, Math.floor((regionWidth - rowWidth) / 2)))
          : preferredEdgeInset;
      const minRowX = regionLeft + dynamicEdgeInset;
      const maxRowX = Math.max(regionLeft, regionRight - rowWidth - dynamicEdgeInset);
      let rowX =
        align === 'left'
          ? minRowX
          : align === 'right'
            ? maxRowX
            : regionLeft + Math.floor((regionWidth - rowWidth) / 2);
      if (rowWidth > effectiveMaxWidth) {
        rowX =
          align === 'right'
            ? Math.max(regionLeft, regionRight - rowWidth)
            : align === 'left'
              ? regionLeft
              : regionLeft + Math.floor((regionWidth - rowWidth) / 2);
      }
      rowX = Math.max(regionLeft, Math.min(rowX, Math.max(regionLeft, regionRight - rowWidth)));

      for (const entry of rowEntries) {
        const monogram = buildProviderMonogram(
          entry.badge.label || String(entry.badge.key).toUpperCase()
        );
        const badgeSvg = buildBadgeSvg({
          width: entry.badgeWidth,
          height: badgeHeight,
          iconSize: input.badgeIconSize,
          fontSize: input.badgeFontSize,
          paddingX: input.badgePaddingX,
          gap: input.badgeGap,
          accentColor: entry.badge.accentColor,
          monogram,
          iconDataUri: iconByProvider.get(entry.badge.key) || null,
          value: entry.badge.value,
          ratingStyle: input.ratingStyle,
          compactText: compactPosterRowText,
        });
        overlays.push({ input: Buffer.from(badgeSvg), top: rowY, left: rowX });
        rowX += entry.badgeWidth + rowGap;
      }
    };
    const composePosterCleanOverlayAboveBottom = (bottomRowY: number) => {
      if (input.imageType !== 'poster') return;
      const overlay = posterLogoSpec
        ? {
            buffer: posterLogoSpec.buffer,
            width: posterLogoSpec.width,
            height: posterLogoSpec.height,
          }
        : posterTitleSpec
          ? {
              buffer: Buffer.from(posterTitleSpec.svg),
              width: posterTitleSpec.width,
              height: posterTitleSpec.height,
            }
          : null;
      if (!overlay) return;
      const overlayGap = Math.max(8, Math.round(input.badgeGap * 0.9));
      let overlayY = Math.round(bottomRowY - overlayGap - overlay.height);
      const topRowBottom =
        input.topBadges.length > 0
          ? input.badgeTopOffset + badgeHeight + input.badgeGap
          : input.badgeTopOffset;
      if (overlayY < topRowBottom) {
        overlayY = topRowBottom;
      }
      if (overlayY + overlay.height + overlayGap > bottomRowY) {
        return;
      }
      const overlayX = Math.max(
        input.posterRowHorizontalInset,
        Math.round((input.outputWidth - overlay.width) / 2)
      );
      overlays.push({ input: overlay.buffer, top: overlayY, left: overlayX });
    };
    const composeBadgeColumn = (
      columnBadges: RatingBadge[],
      side: 'left' | 'right',
      maxBadgeWidth: number,
      origin: 'top' | 'bottom' = 'top'
    ) => {
      if (columnBadges.length === 0) return;
      const widths = columnBadges.map((badge) =>
        estimateBadgeWidth(
          badge.value,
          input.badgeFontSize,
          input.badgePaddingX,
          input.badgeIconSize,
          input.badgeGap
        )
      );
      let rowY =
        origin === 'bottom'
          ? Math.max(input.badgeTopOffset, input.outputHeight - input.badgeBottomOffset - badgeHeight)
          : input.badgeTopOffset;
      for (let index = 0; index < columnBadges.length; index += 1) {
        const badge = columnBadges[index];
        const badgeWidth = Math.min(widths[index], maxBadgeWidth);
        const rowX =
          side === 'left'
            ? 12
            : Math.max(12, input.outputWidth - badgeWidth - 12);
        const monogram = buildProviderMonogram(
          badge.label || String(badge.key).toUpperCase()
        );
        const badgeSvg = buildBadgeSvg({
          width: badgeWidth,
          height: badgeHeight,
          iconSize: input.badgeIconSize,
          fontSize: input.badgeFontSize,
          paddingX: input.badgePaddingX,
          gap: input.badgeGap,
          accentColor: badge.accentColor,
          monogram,
          iconDataUri: iconByProvider.get(badge.key) || null,
          value: badge.value,
          ratingStyle: input.ratingStyle,
        });
        overlays.push({ input: Buffer.from(badgeSvg), top: rowY, left: rowX });
        rowY += origin === 'bottom' ? -(badgeHeight + input.badgeGap) : badgeHeight + input.badgeGap;
      }
    };
    const composeQualityBadgeColumn = (
      columnBadges: RatingBadge[],
      startY: number,
      side: QualityBadgesSide
    ) => {
      if (columnBadges.length === 0) return;
      const qualityHeight = Math.max(44, Math.round(badgeHeight * 1.25));
      const uniformBadgeWidth = Math.min(
        Math.max(72, Math.round(qualityHeight * 1.75)),
        Math.max(72, input.outputWidth - 24)
      );
      let rowY = Math.max(input.badgeTopOffset, startY);
      for (let index = 0; index < columnBadges.length; index += 1) {
        const badge = columnBadges[index];
        if (!STREAM_BADGE_META.has(badge.key as StreamBadgeKey)) continue;
        const spec = buildQualityBadgeSvg(
          badge.key as StreamBadgeKey,
          qualityHeight,
          uniformBadgeWidth,
          input.qualityBadgesStyle
        );
        if (!spec) continue;
        const badgeWidth = Math.min(spec.width, uniformBadgeWidth);
        const badgeHeightForRow = spec.height;
        const rowX =
          side === 'right'
            ? Math.max(12, input.outputWidth - badgeWidth - 12)
            : 12;
        overlays.push({ input: Buffer.from(spec.svg), top: rowY, left: rowX });
        rowY += badgeHeightForRow + input.badgeGap;
      }
    };
    const composeQualityBadgeRow = (
      rowBadges: RatingBadge[],
      rowY: number,
      baseHeight?: number
    ) => {
      if (rowBadges.length === 0) return;
      const maxRowWidth = Math.max(0, input.outputWidth - 24);
      let qualityHeight = Math.max(36, Math.round(baseHeight ?? badgeHeight * 1.05));
      let badgeWidth = Math.min(
        Math.max(64, Math.round(qualityHeight * 1.75)),
        Math.max(64, input.outputWidth - 24)
      );
      let rowGap = input.badgeGap;
      let rowWidth = rowBadges.length * badgeWidth + Math.max(0, rowBadges.length - 1) * rowGap;
      if (rowWidth > maxRowWidth && rowBadges.length > 1) {
        const ratio = Math.max(0.45, maxRowWidth / rowWidth);
        const heightRatio = Math.max(0.75, Math.min(1, ratio));
        qualityHeight = Math.max(32, Math.floor(qualityHeight * heightRatio));
        badgeWidth = Math.min(
          Math.max(60, Math.floor(badgeWidth * ratio)),
          Math.max(60, input.outputWidth - 24)
        );
        rowWidth = rowBadges.length * badgeWidth + Math.max(0, rowBadges.length - 1) * rowGap;
        if (rowWidth > maxRowWidth) {
          const availableForGaps = Math.max(0, maxRowWidth - rowBadges.length * badgeWidth);
          rowGap = Math.max(0, Math.floor(availableForGaps / (rowBadges.length - 1)));
          rowWidth = rowBadges.length * badgeWidth + Math.max(0, rowBadges.length - 1) * rowGap;
        }
      }
      let rowX = Math.floor((input.outputWidth - rowWidth) / 2);
      rowX = Math.max(12, Math.min(rowX, Math.max(12, input.outputWidth - rowWidth - 12)));
      for (const badge of rowBadges) {
        if (!STREAM_BADGE_META.has(badge.key as StreamBadgeKey)) continue;
        const spec = buildQualityBadgeSvg(
          badge.key as StreamBadgeKey,
          qualityHeight,
          badgeWidth,
          input.qualityBadgesStyle
        );
        if (!spec) continue;
        overlays.push({ input: Buffer.from(spec.svg), top: rowY, left: rowX });
        rowX += badgeWidth + rowGap;
      }
    };
    const renderQualityBadgeColumnAt = (
      columnBadges: RatingBadge[],
      startY: number,
      x: number,
      qualityHeight: number,
      uniformBadgeWidth: number
    ) => {
      if (columnBadges.length === 0) return;
      let rowY = Math.max(input.badgeTopOffset, startY);
      const clampedX = Math.max(
        12,
        Math.min(Math.round(x), Math.max(12, input.outputWidth - uniformBadgeWidth - 12))
      );
      for (let index = 0; index < columnBadges.length; index += 1) {
        const badge = columnBadges[index];
        if (!STREAM_BADGE_META.has(badge.key as StreamBadgeKey)) continue;
        const spec = buildQualityBadgeSvg(
          badge.key as StreamBadgeKey,
          qualityHeight,
          uniformBadgeWidth,
          input.qualityBadgesStyle
        );
        if (!spec) continue;
        overlays.push({ input: Buffer.from(spec.svg), top: rowY, left: clampedX });
        rowY += spec.height + input.badgeGap;
      }
    };

    if (input.imageType === 'logo') {
      if (input.badges.length > 0 && input.logoBadgeBandHeight > 0 && input.logoBadgesPerRow > 0) {
        const rows = chunkBy(input.badges, input.logoBadgesPerRow);
        const rowsTotalHeight =
          rows.length * badgeHeight + Math.max(0, rows.length - 1) * input.badgeGap;
        let rowY =
          input.outputHeight +
          Math.max(0, Math.floor((input.logoBadgeBandHeight - rowsTotalHeight) / 2));
        for (const row of rows) {
          composeBadgeRow(row, rowY, { maxRowWidth: input.logoBadgeMaxWidth });
          rowY += badgeHeight + input.badgeGap;
        }
      }
    } else if (
      input.badges.length > 0 ||
      (input.imageType === 'poster' && (posterTitleSpec || posterLogoSpec))
    ) {
      if (input.imageType === 'backdrop') {
        if (input.backdropRatingsLayout === 'right-vertical') {
          const maxBadgeWidth = Math.max(180, Math.floor(input.outputWidth * 0.28));
          composeBadgeColumn(input.rightBadges, 'right', maxBadgeWidth);
        } else {
          const backdropRegion = getBackdropBadgeRegion(input.outputWidth, input.backdropRatingsLayout);
          let rowY = input.badgeTopOffset;
          if (input.topBadges.length > 0) {
            composeBadgeRow(input.topBadges, rowY, {
              regionLeft: backdropRegion.left,
              regionWidth: backdropRegion.width,
            });
            rowY += badgeHeight + input.badgeGap;
          }
          if (input.bottomBadges.length > 0) {
            composeBadgeRow(input.bottomBadges, rowY, {
              regionLeft: backdropRegion.left,
              regionWidth: backdropRegion.width,
            });
          }
        }
      } else if (input.imageType === 'poster') {
        const bottomRowY = Math.max(
          input.badgeTopOffset,
          input.outputHeight - input.badgeBottomOffset - badgeHeight
        );
        if (input.posterRatingsLayout === 'left' || input.posterRatingsLayout === 'right') {
          const maxBadgeWidth = Math.max(180, Math.floor(input.outputWidth * 0.46));
          composeBadgeColumn(
            input.posterRatingsLayout === 'left' ? input.leftBadges : input.rightBadges,
            input.posterRatingsLayout,
            maxBadgeWidth
          );
        } else if (input.posterRatingsLayout === 'left-right') {
          const maxBadgeWidth = Math.max(160, Math.floor((input.outputWidth - 36) / 2));
          composeBadgeColumn(input.leftBadges, 'left', maxBadgeWidth);
          composeBadgeColumn(input.rightBadges, 'right', maxBadgeWidth);
        } else {
          if (input.topBadges.length > 0) {
            composeBadgeRow(input.topBadges, input.badgeTopOffset, {
              regionLeft: input.posterRowHorizontalInset,
              regionWidth: posterRowRegionWidth,
              align: posterRowAlign,
            });
          }
          if (input.bottomBadges.length > 0) {
            composeBadgeRow(input.bottomBadges, bottomRowY, {
              regionLeft: input.posterRowHorizontalInset,
              regionWidth: posterRowRegionWidth,
              align: posterRowAlign,
            });
          }
        }
        composePosterCleanOverlayAboveBottom(bottomRowY);
      }
    }

    if (input.imageType === 'poster' && input.qualityBadges.length > 0) {
      const qualityPlacement =
        input.posterRatingsLayout === 'left'
          ? 'right'
          : input.posterRatingsLayout === 'right'
            ? 'left'
            : input.posterRatingsLayout === 'left-right'
              ? 'bottom'
              : input.posterRatingsLayout === 'top'
                ? 'bottom'
                : input.posterRatingsLayout === 'bottom'
                  ? 'top'
                  : input.qualityBadgesSide;
      const metrics: BadgeLayoutMetrics = {
        iconSize: input.badgeIconSize,
        fontSize: input.badgeFontSize,
        paddingX: input.badgePaddingX,
        paddingY: input.badgePaddingY,
        gap: input.badgeGap,
      };
      const qualityBadgeHeight = Math.max(44, Math.round(badgeHeight * 1.25));
      if (qualityPlacement === 'bottom') {
        const bottomQualityHeight = Math.max(36, Math.round(badgeHeight * 1.05));
        const bottomY = Math.max(
          input.badgeTopOffset,
          input.outputHeight - input.badgeBottomOffset - bottomQualityHeight
        );
        composeQualityBadgeRow(input.qualityBadges, bottomY, bottomQualityHeight);
      } else if (qualityPlacement === 'top') {
        const topQualityHeight = Math.max(36, Math.round(badgeHeight * 1.05));
        const topY = input.badgeTopOffset;
        composeQualityBadgeRow(input.qualityBadges, topY, topQualityHeight);
      } else {
        const qualityTotalHeight =
          input.qualityBadges.length * qualityBadgeHeight +
          Math.max(0, input.qualityBadges.length - 1) * input.badgeGap;
        const centeredStartY = Math.max(
          input.badgeTopOffset,
          Math.round((input.outputHeight - qualityTotalHeight) / 2)
        );
        let qualityStartY = centeredStartY;
        const shouldTopAlignQuality =
          (input.posterRatingsLayout === 'left' || input.posterRatingsLayout === 'right') &&
          (qualityPlacement === 'left' || qualityPlacement === 'right');
        if (shouldTopAlignQuality) {
          qualityStartY = input.badgeTopOffset;
        } else if (input.topBadges.length > 0) {
          const belowTop = input.badgeTopOffset + badgeHeight + input.badgeGap;
          qualityStartY = Math.max(qualityStartY, belowTop);
        } else {
          const sideBadges = qualityPlacement === 'right' ? input.rightBadges : input.leftBadges;
          if (sideBadges.length > 0) {
            const sideColumnHeight = measureBadgeColumnHeight(sideBadges, metrics);
            if (sideColumnHeight > 0) {
              const belowSide = input.badgeTopOffset + sideColumnHeight + input.badgeGap;
              qualityStartY = Math.max(qualityStartY, belowSide);
            }
          }
        }
        composeQualityBadgeColumn(input.qualityBadges, qualityStartY, qualityPlacement);
      }
    }

    if (input.imageType === 'backdrop' && input.qualityBadges.length > 0) {
      const qualityHeight = Math.max(44, Math.round(badgeHeight * 1.25));
      const uniformBadgeWidth = Math.min(
        Math.max(72, Math.round(qualityHeight * 1.75)),
        Math.max(72, input.outputWidth - 24)
      );
      const usableQualityBadges = input.qualityBadges.filter((badge) =>
        STREAM_BADGE_META.has(badge.key as StreamBadgeKey)
      );
      if (usableQualityBadges.length > 0) {
        const leftColumn: RatingBadge[] = [];
        const rightColumn: RatingBadge[] = [];
        for (const badge of usableQualityBadges) {
          if (leftColumn.length < 2) {
            leftColumn.push(badge);
          } else if (rightColumn.length < 2) {
            rightColumn.push(badge);
          } else if (leftColumn.length <= rightColumn.length) {
            leftColumn.push(badge);
          } else {
            rightColumn.push(badge);
          }
        }
        const columnHeight = (column: RatingBadge[]) =>
          column.length * qualityHeight + Math.max(0, column.length - 1) * input.badgeGap;
        const maxColumnHeight = Math.max(columnHeight(leftColumn), columnHeight(rightColumn));
        const ratingsOnRight =
          input.backdropRatingsLayout === 'right' || input.backdropRatingsLayout === 'right-vertical';
        const startY = input.badgeTopOffset;
        const columnGap = Math.max(8, Math.round(input.badgeGap * 0.8));

        if (rightColumn.length === 0) {
          const centerX = input.outputWidth / 2;
          const singleX = Math.round(centerX - uniformBadgeWidth / 2);
          renderQualityBadgeColumnAt(
            leftColumn,
            startY,
            singleX,
            qualityHeight,
            uniformBadgeWidth
          );
        } else {
          let leftX = 12;
          let rightX = Math.max(12, input.outputWidth - uniformBadgeWidth - 12);
          if (ratingsOnRight) {
            const centerX = input.outputWidth / 2;
            leftX = centerX - columnGap - uniformBadgeWidth;
            rightX = centerX + columnGap;
          } else {
            const metrics: BadgeLayoutMetrics = {
              iconSize: input.badgeIconSize,
              fontSize: input.badgeFontSize,
              paddingX: input.badgePaddingX,
              paddingY: input.badgePaddingY,
              gap: input.badgeGap,
            };
            const backdropRegion = getBackdropBadgeRegion(
              input.outputWidth,
              input.backdropRatingsLayout
            );
            const effectiveMaxWidth = Math.max(0, backdropRegion.width - 24);
            const topRowWidth = Math.min(
              measureBadgeRowWidth(input.topBadges, metrics),
              effectiveMaxWidth
            );
            const bottomRowWidth = Math.min(
              measureBadgeRowWidth(input.bottomBadges, metrics),
              effectiveMaxWidth
            );
            const ratingBlockWidth = Math.max(topRowWidth, bottomRowWidth);
            const ratingCenterX = backdropRegion.left + backdropRegion.width / 2;
            const ratingLeft = ratingCenterX - ratingBlockWidth / 2;
            const ratingRight = ratingCenterX + ratingBlockWidth / 2;
            leftX = ratingLeft - columnGap - uniformBadgeWidth;
            rightX = ratingRight + columnGap;
          }

          renderQualityBadgeColumnAt(
            leftColumn,
            startY,
            leftX,
            qualityHeight,
            uniformBadgeWidth
          );
          renderQualityBadgeColumnAt(
            rightColumn,
            startY,
            rightX,
            qualityHeight,
            uniformBadgeWidth
          );
        }
      }
    }

    const background =
      input.imageType === 'logo'
        ? { r: 0, g: 0, b: 0, alpha: 0 }
        : { r: 17, g: 17, b: 17, alpha: 1 };

    const pipeline = sharp({
      create: {
        width: input.outputWidth,
        height: input.finalOutputHeight,
        channels: 4,
        background,
      },
    }).composite(overlays);

    let finalBuffer: Buffer;
    let outputContentType = outputFormatToContentType(input.outputFormat);
    if (input.outputFormat === 'webp') {
      finalBuffer = await pipeline.webp({ quality: 80, effort: 3 }).toBuffer();
    } else if (input.outputFormat === 'jpeg') {
      finalBuffer = await pipeline.jpeg({ quality: 82 }).toBuffer();
    } else {
      finalBuffer = await pipeline.png({ compressionLevel: 1 }).toBuffer();
    }

    return {
      body: bufferToArrayBuffer(finalBuffer),
      contentType: outputContentType,
      cacheControl: input.cacheControl,
    };
  });
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const requestStartedAt = performance.now();
  const phases: PhaseDurations = {
    auth: 0,
    tmdb: 0,
    mdb: 0,
    stream: 0,
    render: 0,
  };
  const respond = (body: string, status: number, headers?: HeadersInit) => {
    const finalHeaders = new Headers(headers);
    const totalMs = performance.now() - requestStartedAt;
    finalHeaders.set('Server-Timing', buildServerTimingHeader(phases, totalMs));
    return new Response(body, { status, headers: finalHeaders });
  };

  const { type, id } = await params;
  if (!ALLOWED_IMAGE_TYPES.has(type)) {
    return respond('Invalid image type', 400);
  }
  scheduleImdbDatasetSync();
  const imageType = type as 'poster' | 'backdrop' | 'logo';
  const outputFormat = pickOutputFormat(imageType, request.headers.get('accept'));
  const cleanId = id.replace('.jpg', '');

  // Extract configuration from query parameters
  const lang = request.nextUrl.searchParams.get('lang') || FALLBACK_IMAGE_LANGUAGE;
  const globalRatings = request.nextUrl.searchParams.get('ratings');
  const posterRatings = request.nextUrl.searchParams.get('posterRatings') ?? globalRatings;
  const backdropRatings = request.nextUrl.searchParams.get('backdropRatings') ?? globalRatings;
  const logoRatings = request.nextUrl.searchParams.get('logoRatings') ?? globalRatings;
  const imageTextParam =
    request.nextUrl.searchParams.get('imageText') || request.nextUrl.searchParams.get('posterText');
  const imageText = imageTextParam || (type === 'backdrop' ? 'clean' : 'original');
  const posterRatingsLayout = normalizePosterRatingLayout(request.nextUrl.searchParams.get('posterRatingsLayout'));
  const posterRatingsMaxPerSide = normalizePosterRatingsMaxPerSide(request.nextUrl.searchParams.get('posterRatingsMaxPerSide'));
  const backdropRatingsLayout = normalizeBackdropRatingLayout(request.nextUrl.searchParams.get('backdropRatingsLayout'));
  const globalStreamBadgesSetting = normalizeStreamBadgesSetting(request.nextUrl.searchParams.get('streamBadges'));
  const posterStreamBadgesSetting = normalizeStreamBadgesSetting(
    request.nextUrl.searchParams.get('posterStreamBadges') || request.nextUrl.searchParams.get('streamBadges')
  );
  const backdropStreamBadgesSetting = normalizeStreamBadgesSetting(
    request.nextUrl.searchParams.get('backdropStreamBadges') || request.nextUrl.searchParams.get('streamBadges')
  );
  const streamBadgesSetting =
    imageType === 'poster'
      ? posterStreamBadgesSetting
      : imageType === 'backdrop'
        ? backdropStreamBadgesSetting
        : globalStreamBadgesSetting;
  const qualityBadgesSide = normalizeQualityBadgesSide(
    request.nextUrl.searchParams.get('qualityBadgesSide') ||
      request.nextUrl.searchParams.get('qualityBadgesPosition')
  );
  const globalQualityBadgesStyle = normalizeQualityBadgesStyle(
    request.nextUrl.searchParams.get('qualityBadgesStyle')
  );
  const posterQualityBadgesStyle = normalizeQualityBadgesStyle(
    request.nextUrl.searchParams.get('posterQualityBadgesStyle') ||
      request.nextUrl.searchParams.get('qualityBadgesStyle')
  );
  const backdropQualityBadgesStyle = normalizeQualityBadgesStyle(
    request.nextUrl.searchParams.get('backdropQualityBadgesStyle') ||
      request.nextUrl.searchParams.get('qualityBadgesStyle')
  );
  const qualityBadgesStyle =
    imageType === 'poster'
      ? posterQualityBadgesStyle
      : imageType === 'backdrop'
        ? backdropQualityBadgesStyle
        : globalQualityBadgesStyle;
  const ratingStyleParam =
    request.nextUrl.searchParams.get('ratingStyle') || request.nextUrl.searchParams.get('style');
  const ratingStyle = ratingStyleParam
    ? normalizeRatingStyle(ratingStyleParam)
    : type === 'logo'
      ? 'plain'
      : DEFAULT_RATING_STYLE;
  const mdblistKey = request.nextUrl.searchParams.get('mdblistKey') || request.nextUrl.searchParams.get('mdblist_key');
  const tmdbKey = request.nextUrl.searchParams.get('tmdbKey') || request.nextUrl.searchParams.get('tmdb_key');

  const parts = cleanId.split(':');
  const idPrefix = (parts[0] || '').trim().toLowerCase();
  const inputAnimeMappingProvider = toAnimeMappingProvider(idPrefix);
  let inputAnimeMappingExternalId =
    inputAnimeMappingProvider && typeof parts[1] === 'string' && parts[1].trim().length > 0
      ? parts[1].trim()
      : null;
  let mediaId = parts[0];
  let season: string | null = null;
  let episode: string | null = null;
  let isTmdb = false;
  let isKitsu = false;
  let explicitTmdbMediaType: 'movie' | 'tv' | null = null;
  const hasNativeAnimeInput = ANIME_NATIVE_INPUT_ID_PREFIX_SET.has(idPrefix);
  let hasConfirmedAnimeMapping = hasNativeAnimeInput;
  let allowAnimeOnlyRatings = hasNativeAnimeInput;

  if (idPrefix === 'tmdb') {
    isTmdb = true;
    const explicitTypeCandidate = (parts[1] || '').trim().toLowerCase();
    if (explicitTypeCandidate === 'movie' || explicitTypeCandidate === 'tv') {
      explicitTmdbMediaType = explicitTypeCandidate as 'movie' | 'tv';
      mediaId = parts[2];
      season = parts.length > 3 ? parts[3] : null;
      episode = parts.length > 4 ? parts[4] : null;
      if (mediaId) {
        inputAnimeMappingExternalId = mediaId;
      }
    } else {
      mediaId = parts[1];
      season = parts.length > 2 ? parts[2] : null;
      episode = parts.length > 3 ? parts[3] : null;
    }
  } else if (idPrefix === 'kitsu') {
    isKitsu = true;
    mediaId = parts[1];
    episode = parts.length > 2 ? parts[2] : null;
  } else if (idPrefix === 'imdb' && inputAnimeMappingExternalId) {
    mediaId = inputAnimeMappingExternalId;
    season = parts.length > 2 ? parts[2] : null;
    episode = parts.length > 3 ? parts[3] : null;
  } else if (inputAnimeMappingProvider && inputAnimeMappingExternalId) {
    mediaId = inputAnimeMappingExternalId;
    season = parts.length > 2 ? parts[2] : null;
    episode = parts.length > 3 ? parts[3] : null;
  } else {
    season = parts.length > 1 ? parts[1] : null;
    episode = parts.length > 2 ? parts[2] : null;
  }

  const requestedImageLang = normalizeImageLanguage(lang) || FALLBACK_IMAGE_LANGUAGE;
  const includeImageLanguage = buildIncludeImageLanguage(requestedImageLang, FALLBACK_IMAGE_LANGUAGE);
  const posterTextPreference: PosterTextPreference =
    imageText === 'clean' || imageText === 'alternative' || imageText === 'original'
      ? (imageText as PosterTextPreference)
      : 'original';
  const ratingsForType =
    imageType === 'poster'
      ? posterRatings
      : imageType === 'backdrop'
        ? backdropRatings
        : logoRatings;
  const ratingPreferences =
    ratingsForType === null || ratingsForType === undefined
      ? [...ALL_RATING_PREFERENCES]
      : parseRatingPreferencesAllowEmpty(ratingsForType);
  const shouldApplyRatings = ratingPreferences.length > 0;
  const shouldApplyStreamBadges =
    imageType !== 'logo' &&
    (streamBadgesSetting === 'on' || streamBadgesSetting === 'auto') &&
    !hasNativeAnimeInput;
  const streamBadgesSeedTtlMs = shouldApplyStreamBadges
    ? getDeterministicTtlMs(TORRENTIO_CACHE_TTL_MS, cleanId)
    : null;
  const streamBadgesSeedWindow =
    shouldApplyStreamBadges && streamBadgesSeedTtlMs
      ? Math.floor(Date.now() / streamBadgesSeedTtlMs)
      : null;
  const streamBadgesCacheKeySeed = shouldApplyStreamBadges
    ? `torrentio:${streamBadgesSeedWindow ?? 0}`
    : 'off';
  const shouldCacheFinalImage =
    shouldApplyRatings || shouldApplyStreamBadges || (imageType === 'poster' && posterTextPreference === 'clean');
  const effectiveRatingPreferences = shouldApplyRatings ? ratingPreferences : [];
  const selectedRatings = new Set<RatingPreference>(ratingPreferences);
  const renderSeedKey = [
    FINAL_IMAGE_RENDERER_CACHE_VERSION,
    imageType,
    outputFormat,
    cleanId,
    requestedImageLang,
    posterTextPreference,
    imageType === 'poster' ? posterRatingsLayout : '-',
    imageType === 'poster' ? String(posterRatingsMaxPerSide ?? 'auto') : '-',
    imageType === 'poster' ? qualityBadgesSide : '-',
    imageType !== 'logo' ? qualityBadgesStyle : '-',
    imageType === 'backdrop' ? backdropRatingsLayout : '-',
    ratingStyle,
    effectiveRatingPreferences.join(',') || 'none',
    streamBadgesCacheKeySeed,
    'v1', // Static version since we no longer have tokenConfigVersion
  ].join('|');
  const objectStorageEnabled = isObjectStorageConfigured();

  if (!tmdbKey) {
    return respond('TMDB API Key (tmdbKey) is required', 400);
  }

  const hadSharedRender = shouldCacheFinalImage && finalImageInFlight.has(renderSeedKey);
  let objectStorageHit = false;

  try {
    const renderedImage = await withDedupe(finalImageInFlight, renderSeedKey, async () => {
      let media = null;
      let mediaType: 'movie' | 'tv' | null = null;
      let useRawKitsuFallback = false;
      let rawFallbackImageUrl: string | null = null;
      let rawFallbackKitsuRating: string | null = null;
      let rawFallbackTitle: string | null = null;
      let rawFallbackLogoAspectRatio: number | null = null;
      let mappedImdbId: string | null = null;

      if (isTmdb) {
        if (explicitTmdbMediaType) {
          const tmdbResponse = await fetchJsonCached(
            `tmdb:${explicitTmdbMediaType}:${mediaId}`,
            `https://api.themoviedb.org/3/${explicitTmdbMediaType}/${mediaId}?api_key=${tmdbKey}`,
            TMDB_CACHE_TTL_MS,
            phases,
            'tmdb'
          );
          if (tmdbResponse.ok) {
            media = tmdbResponse.data;
            mediaType = explicitTmdbMediaType;
          }
        } else {
          // Try to fetch as movie
          const movieResponse = await fetchJsonCached(
            `tmdb:movie:${mediaId}`,
            `https://api.themoviedb.org/3/movie/${mediaId}?api_key=${tmdbKey}`,
            TMDB_CACHE_TTL_MS,
            phases,
            'tmdb'
          );
          if (movieResponse.ok) {
            media = movieResponse.data;
            mediaType = 'movie';
          } else {
            // Try as TV
            const tvResponse = await fetchJsonCached(
              `tmdb:tv:${mediaId}`,
              `https://api.themoviedb.org/3/tv/${mediaId}?api_key=${tmdbKey}`,
              TMDB_CACHE_TTL_MS,
              phases,
              'tmdb'
            );
            if (tvResponse.ok) {
              media = tvResponse.data;
              mediaType = 'tv';
            }
          }
        }
      } else if (isKitsu) {
        let mappingUrl = `https://animemapping.stremio.dpdns.org/kitsu/${mediaId}`;
        if (episode) {
          mappingUrl += `?ep=${episode}`;
        }
        const mappingResponse = await fetchJsonCached(
          `kitsu:mapping:${mediaId}:${episode || '-'}`,
          mappingUrl,
          KITSU_CACHE_TTL_MS,
          phases,
          'tmdb'
        );
        const mappingData = mappingResponse.data || {};
        const mappingSubtype = extractAnimeSubtypeFromAnimemapping(mappingData);
        const mappingImdbCandidates = [
          mappingData.mappings?.ids?.imdb,
          mappingData.mappings?.ids?.imdb_id,
          mappingData.mappings?.imdb,
          mappingData.imdb_id,
          mappingData.imdb,
        ];
        for (const candidate of mappingImdbCandidates) {
          const normalized = typeof candidate === 'string' ? candidate.trim() : '';
          if (isImdbId(normalized)) {
            mappedImdbId = normalized;
            break;
          }
        }

        let tmdbId = '';
        const tmdbEpisode = mappingData.mappings?.tmdb_episode || mappingData.tmdb_episode;
        if (episode && tmdbEpisode) {
          tmdbId = tmdbEpisode.id;
          season = tmdbEpisode.season;
          episode = tmdbEpisode.episode;
        } else if (mappingData.mappings?.ids?.tmdb) {
          tmdbId = mappingData.mappings.ids.tmdb;
        }

        // For season-level Kitsu IDs (no explicit season), infer season from ep=1 mapping.
        if (mappingSubtype !== 'movie' && !season) {
          const seasonProbeResponse = await fetchJsonCached(
            `kitsu:mapping:${mediaId}:1`,
            `https://animemapping.stremio.dpdns.org/kitsu/${mediaId}?ep=1`,
            KITSU_CACHE_TTL_MS,
            phases,
            'tmdb'
          );
          const seasonProbeData = seasonProbeResponse.data;
          const seasonProbeEpisode = seasonProbeData?.mappings?.tmdb_episode || seasonProbeData?.tmdb_episode;
          if (seasonProbeEpisode?.season) {
            season = seasonProbeEpisode.season;
          }
        }

        if (!tmdbId) {
          const kitsuFallbackAsset = await fetchKitsuFallbackAsset(mediaId, imageType, phases);
          rawFallbackImageUrl = kitsuFallbackAsset?.imageUrl || null;
          rawFallbackKitsuRating = kitsuFallbackAsset?.rating || null;
          rawFallbackTitle = kitsuFallbackAsset?.title || null;
          rawFallbackLogoAspectRatio = kitsuFallbackAsset?.logoAspectRatio ?? null;
          if (!rawFallbackImageUrl) {
            throw new HttpError('TMDB ID not found for Kitsu ID', 404);
          }
          useRawKitsuFallback = true;
          allowAnimeOnlyRatings = false;
          hasConfirmedAnimeMapping = false;
        } else {
          const mappedMediaTypeCandidates: Array<'movie' | 'tv'> =
            mappingSubtype === 'movie' ? ['movie', 'tv'] : ['tv', 'movie'];

          for (const mappedMediaType of mappedMediaTypeCandidates) {
            const mappedMediaResponse = await fetchJsonCached(
              `tmdb:${mappedMediaType}:${tmdbId}`,
              `https://api.themoviedb.org/3/${mappedMediaType}/${tmdbId}?api_key=${tmdbKey}`,
              TMDB_CACHE_TTL_MS,
              phases,
              'tmdb'
            );
            if (!mappedMediaResponse.ok) continue;
            media = mappedMediaResponse.data;
            mediaType = mappedMediaType;
            break;
          }

          if (!media || !mediaType) {
            const kitsuFallbackAsset = await fetchKitsuFallbackAsset(mediaId, imageType, phases);
            rawFallbackImageUrl = kitsuFallbackAsset?.imageUrl || null;
            rawFallbackKitsuRating = kitsuFallbackAsset?.rating || null;
            rawFallbackTitle = kitsuFallbackAsset?.title || null;
            rawFallbackLogoAspectRatio = kitsuFallbackAsset?.logoAspectRatio ?? null;
            if (!rawFallbackImageUrl) {
              throw new HttpError('Movie/Show not found on TMDB', 404);
            }
            useRawKitsuFallback = true;
            allowAnimeOnlyRatings = false;
            hasConfirmedAnimeMapping = false;
          }
        }
      } else if (
        inputAnimeMappingProvider &&
        inputAnimeMappingExternalId &&
        inputAnimeMappingProvider !== 'imdb' &&
        inputAnimeMappingProvider !== 'tmdb'
      ) {
        const mappedTmdbId = await fetchTmdbIdFromReverseMapping({
          provider: inputAnimeMappingProvider,
          externalId: inputAnimeMappingExternalId,
          season,
          phases,
        });
        if (!mappedTmdbId) {
          throw new HttpError('TMDB ID not found for anime mapping ID', 404);
        }

        const tvResponse = await fetchJsonCached(
          `tmdb:tv:${mappedTmdbId}`,
          `https://api.themoviedb.org/3/tv/${mappedTmdbId}?api_key=${tmdbKey}`,
          TMDB_CACHE_TTL_MS,
          phases,
          'tmdb'
        );
        if (tvResponse.ok) {
          media = tvResponse.data;
          mediaType = 'tv';
        } else {
          const movieResponse = await fetchJsonCached(
            `tmdb:movie:${mappedTmdbId}`,
            `https://api.themoviedb.org/3/movie/${mappedTmdbId}?api_key=${tmdbKey}`,
            TMDB_CACHE_TTL_MS,
            phases,
            'tmdb'
          );
          if (movieResponse.ok) {
            media = movieResponse.data;
            mediaType = 'movie';
          }
        }
      } else {
        // 1. Find TMDB ID from IMDb ID
        const findResponse = await fetchJsonCached(
          `tmdb:find:${mediaId}`,
          `https://api.themoviedb.org/3/find/${mediaId}?api_key=${tmdbKey}&external_source=imdb_id`,
          TMDB_CACHE_TTL_MS,
          phases,
          'tmdb'
        );
        const findData = findResponse.data || {};
        media = findData.movie_results?.[0] || findData.tv_results?.[0];
        mediaType = findData.movie_results?.[0] ? 'movie' : 'tv';
      }

      if (!media && !useRawKitsuFallback) {
        throw new HttpError('Movie/Show not found on TMDB', 404);
      }

      const mediaLooksAnimated = media ? isTmdbAnimationTitle(media) : false;
      if (!hasNativeAnimeInput) {
        allowAnimeOnlyRatings = hasConfirmedAnimeMapping && mediaLooksAnimated;
      }
      const isAnimeContent = hasNativeAnimeInput || hasConfirmedAnimeMapping || mediaLooksAnimated;

      let imgPath = '';
      let imgUrl = rawFallbackImageUrl;
      let tmdbRating = 'N/A';
      let providerRatings = new Map<RatingPreference, string>();
      const renderedRatingTtlByProvider = new Map<BadgeKey, number>();
      let outputWidth = 1280;
      let outputHeight = 720;
      let selectedLogoAspectRatio: number | null = null;
      let selectedPosterLogoPath: string | null = null;
      const requestedExternalRatings = new Set([...selectedRatings]);
      const needsAnimeOnlyRatings = [...requestedExternalRatings].some((provider) =>
        ANIME_ONLY_RATING_PROVIDER_SET.has(provider)
      );
      const shouldAttemptAnimeMapping = hasNativeAnimeInput || mediaLooksAnimated;
      const needsExternalRatings = [...requestedExternalRatings].some((provider) => provider !== 'tmdb');
      const needsImdbRating = requestedExternalRatings.has('imdb');
      const needsKitsuRating = requestedExternalRatings.has('kitsu');
      const hasMdbListApiKey = MDBLIST_API_KEYS.length > 0;
      const shouldRenderRawKitsuFallbackRating =
        useRawKitsuFallback && needsKitsuRating && typeof rawFallbackKitsuRating === 'string' && rawFallbackKitsuRating.length > 0;
      const shouldRenderRatings = shouldApplyRatings && (!useRawKitsuFallback || shouldRenderRawKitsuFallbackRating);
      const shouldRenderStreamBadges = shouldApplyStreamBadges && !isAnimeContent;
      const shouldRenderBadges = shouldRenderRatings || shouldRenderStreamBadges;
      const posterTitleText =
        imageType === 'poster' && posterTextPreference === 'clean'
          ? pickPosterTitleFromMedia(media, mediaType, rawFallbackTitle)
          : null;
      const releaseDateForCache =
        mediaType === 'movie' ? media?.release_date : mediaType === 'tv' ? media?.first_air_date : null;
      const tmdbIdForCache =
        media?.id != null
          ? String(media.id)
          : isTmdb && mediaId
            ? String(mediaId)
            : null;
      let torrentioIdForCache: string | null = isImdbId(mediaId) ? mediaId : null;
      if (!torrentioIdForCache) {
        torrentioIdForCache = media?.imdb_id || mappedImdbId || null;
      }
      if (!torrentioIdForCache && tmdbIdForCache) {
        torrentioIdForCache = `tmdb:${tmdbIdForCache}`;
      }
      const streamBadgesWindowTtlMs = shouldRenderStreamBadges
        ? mediaType && torrentioIdForCache
          ? getRatingCacheTtlMs({
            id: torrentioIdForCache,
            mediaType: mediaType as 'movie' | 'tv',
            releaseDate: releaseDateForCache,
            defaultTtlMs: TORRENTIO_CACHE_TTL_MS,
            oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
          })
          : getDeterministicTtlMs(TORRENTIO_CACHE_TTL_MS, cleanId)
        : null;
      const streamBadgesCacheWindow =
        shouldRenderStreamBadges && streamBadgesWindowTtlMs
          ? Math.floor(Date.now() / streamBadgesWindowTtlMs)
          : null;
      const streamBadgesCacheKey = shouldRenderStreamBadges
        ? `torrentio:${streamBadgesCacheWindow ?? 0}`
        : 'off';
      const finalImageCacheKey = [
        FINAL_IMAGE_RENDERER_CACHE_VERSION,
        imageType,
        outputFormat,
        cleanId,
        requestedImageLang,
        posterTextPreference,
        imageType === 'poster' ? posterRatingsLayout : '-',
        imageType === 'poster' ? String(posterRatingsMaxPerSide ?? 'auto') : '-',
        imageType === 'poster' ? qualityBadgesSide : '-',
        imageType !== 'logo' ? qualityBadgesStyle : '-',
        imageType === 'backdrop' ? backdropRatingsLayout : '-',
        ratingStyle,
        effectiveRatingPreferences.join(',') || 'none',
        streamBadgesCacheKey,
        'v1',
      ].join('|');
      const finalCacheHash = sha1Hex(finalImageCacheKey);
      const finalObjectStorageKey = buildObjectStorageImageKey(
        finalCacheHash,
        outputFormatToExtension(outputFormat)
      );
      if (shouldCacheFinalImage && objectStorageEnabled) {
        const cachedFinalImage = await getCachedImageFromObjectStorage(finalObjectStorageKey);
        if (cachedFinalImage) {
          objectStorageHit = true;
          return cachedFinalImage;
        }
      }
      const detailsBundlePromise = !useRawKitsuFallback
        ? (async () => {
          const buildDetailsUrl = (language: string) =>
            `https://api.themoviedb.org/3/${mediaType}/${media.id}?api_key=${tmdbKey}&language=${language}&append_to_response=images,external_ids&include_image_language=${encodeURIComponent(includeImageLanguage)}`;

          const [detailsResponse, fallbackDetailsResponse] = await Promise.all([
            fetchJsonCached(
              `tmdb:${mediaType}:${media.id}:details:${requestedImageLang}:bundle:${includeImageLanguage}`,
              buildDetailsUrl(requestedImageLang),
              TMDB_CACHE_TTL_MS,
              phases,
              'tmdb'
            ),
            requestedImageLang !== FALLBACK_IMAGE_LANGUAGE
              ? fetchJsonCached(
                `tmdb:${mediaType}:${media.id}:details:${FALLBACK_IMAGE_LANGUAGE}:bundle:${includeImageLanguage}`,
                buildDetailsUrl(FALLBACK_IMAGE_LANGUAGE),
                TMDB_CACHE_TTL_MS,
                phases,
                'tmdb'
              )
              : Promise.resolve({ ok: false, status: 0, data: null } as CachedJsonResponse)
          ]);

          const details = detailsResponse.data || {};
          const fallbackDetails = fallbackDetailsResponse?.data || {};

          return {
            details,
            fallbackDetails,
            bundledImages: details.images || {},
            bundledExternalIds: details.external_ids || {},
            tmdbRating: details.vote_average ? normalizeRatingValue(details.vote_average) || 'N/A' : 'N/A',
          };
        })()
        : null;
      const providerRatingsPromise =
        shouldRenderRatings &&
          !useRawKitsuFallback &&
          needsExternalRatings &&
          (mdblistKey || hasMdbListApiKey || needsKitsuRating || needsImdbRating)
          ? (async () => {
            let imdbId: string | null = null;
            let kitsuId: string | null = isKitsu ? mediaId : null;
            if (kitsuId) {
              hasConfirmedAnimeMapping = true;
              allowAnimeOnlyRatings = hasNativeAnimeInput || mediaLooksAnimated;
            }

            imdbId = media?.imdb_id || mappedImdbId;
            if (!imdbId && detailsBundlePromise) {
              const bundle = await detailsBundlePromise;
              if (bundle?.bundledExternalIds?.imdb_id) {
                imdbId = bundle.bundledExternalIds.imdb_id;
              }
            }
            if (!imdbId && mappedImdbId) {
              imdbId = mappedImdbId;
            }
            if (!imdbId && !kitsuId && !needsAnimeOnlyRatings) {
              return new Map<RatingPreference, string>();
            }

            if (needsAnimeOnlyRatings && shouldAttemptAnimeMapping && !kitsuId) {
              if (inputAnimeMappingProvider && inputAnimeMappingExternalId) {
                kitsuId = await fetchKitsuIdFromReverseMapping({
                  provider: inputAnimeMappingProvider,
                  externalId: inputAnimeMappingExternalId,
                  season,
                  phases,
                });
              }
              if (!kitsuId && imdbId) {
                kitsuId = await fetchKitsuIdFromReverseMapping({
                  provider: 'imdb',
                  externalId: imdbId,
                  season,
                  phases,
                });
              }
              if (!kitsuId && media?.id) {
                kitsuId = await fetchKitsuIdFromReverseMapping({
                  provider: 'tmdb',
                  externalId: String(media.id),
                  season,
                  phases,
                });
              }
            }
            if (kitsuId) {
              hasConfirmedAnimeMapping = true;
              allowAnimeOnlyRatings = hasNativeAnimeInput || mediaLooksAnimated;
            }

            const combinedRatings = new Map<RatingPreference, string>();
            const shortCircuitLimit =
              imageType === 'poster' ? getPosterRatingLayoutLimit(posterRatingsLayout) : null;

            if (shortCircuitLimit) {
              let mdbRatings: Map<RatingPreference, string> | null = null;
              let mdbListCacheTtlMs: number | null = null;
              let hasFetchedMdb = false;
              let hasFetchedKitsu = false;

              const ensureImdbId = async () => {
                if (imdbId) return imdbId;
                imdbId = media?.imdb_id || mappedImdbId || null;
                if (!imdbId && detailsBundlePromise) {
                  const bundle = await detailsBundlePromise;
                  if (bundle?.bundledExternalIds?.imdb_id) {
                    imdbId = bundle.bundledExternalIds.imdb_id;
                  }
                }
                if (!imdbId && mappedImdbId) {
                  imdbId = mappedImdbId;
                }
                return imdbId;
              };

              const ensureAnimeMapping = async () => {
                if (allowAnimeOnlyRatings || !needsAnimeOnlyRatings) return;
                if (!shouldAttemptAnimeMapping) return;
                if (kitsuId) {
                  hasConfirmedAnimeMapping = true;
                  allowAnimeOnlyRatings = hasNativeAnimeInput || mediaLooksAnimated;
                  return;
                }
                if (inputAnimeMappingProvider && inputAnimeMappingExternalId) {
                  kitsuId = await fetchKitsuIdFromReverseMapping({
                    provider: inputAnimeMappingProvider,
                    externalId: inputAnimeMappingExternalId,
                    season,
                    phases,
                  });
                }
                const resolvedImdbId = await ensureImdbId();
                if (!kitsuId && resolvedImdbId) {
                  kitsuId = await fetchKitsuIdFromReverseMapping({
                    provider: 'imdb',
                    externalId: resolvedImdbId,
                    season,
                    phases,
                  });
                }
                if (!kitsuId && media?.id) {
                  kitsuId = await fetchKitsuIdFromReverseMapping({
                    provider: 'tmdb',
                    externalId: String(media.id),
                    season,
                    phases,
                  });
                }
                if (kitsuId) {
                  hasConfirmedAnimeMapping = true;
                  allowAnimeOnlyRatings = hasNativeAnimeInput || mediaLooksAnimated;
                }
              };

              const ensureMdbRatings = async () => {
                if (hasFetchedMdb) return mdbRatings;
                hasFetchedMdb = true;
                const resolvedImdbId = await ensureImdbId();
                if (!resolvedImdbId || !(mdblistKey || hasMdbListApiKey)) return null;
                try {
                  mdbListCacheTtlMs = getMdbListCacheTtlMs({
                    imdbId: resolvedImdbId,
                    mediaType: mediaType as 'movie' | 'tv',
                    releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                  });
                  mdbRatings = await fetchMdbListRatings({
                    imdbId: resolvedImdbId,
                    cacheTtlMs: mdbListCacheTtlMs,
                    phases,
                    requestSource: 'addon',
                    imageType,
                    cleanId,
                    manualApiKey: mdblistKey,
                  });
                  if (mdbRatings) {
                    for (const [provider, value] of mdbRatings.entries()) {
                      combinedRatings.set(provider, value);
                      renderedRatingTtlByProvider.set(provider, mdbListCacheTtlMs);
                    }
                  }
                } catch {
                  // Ignore MDBList failures.
                }
                return mdbRatings;
              };

              const ensureImdbDatasetRating = async () => {
                if (combinedRatings.has('imdb')) return combinedRatings.get('imdb') || null;
                const resolvedImdbId = await ensureImdbId();
                if (!resolvedImdbId) return null;
                const datasetRating = getImdbRatingFromDataset(resolvedImdbId);
                if (datasetRating) {
                  const normalized = normalizeRatingValue(datasetRating.rating);
                  if (normalized) {
                    combinedRatings.set('imdb', normalized);
                    renderedRatingTtlByProvider.set('imdb', IMDB_DATASET_CACHE_TTL_MS);
                  }
                }
                return combinedRatings.get('imdb') || null;
              };

              const ensureKitsuRating = async () => {
                if (hasFetchedKitsu || combinedRatings.has('kitsu')) {
                  return combinedRatings.get('kitsu') || null;
                }
                hasFetchedKitsu = true;
                if (!kitsuId) return null;
                try {
                  const kitsuCacheTtlMs = getRatingCacheTtlMs({
                    id: kitsuId,
                    mediaType: mediaType as 'movie' | 'tv',
                    releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                    defaultTtlMs: KITSU_CACHE_TTL_MS,
                    oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
                  });
                  const kitsuRating = await fetchKitsuRating(kitsuId, phases);
                  if (kitsuRating) {
                    combinedRatings.set('kitsu', kitsuRating);
                    renderedRatingTtlByProvider.set('kitsu', kitsuCacheTtlMs);
                  }
                } catch {
                  // Ignore
                }
                return combinedRatings.get('kitsu') || null;
              };

              const resolveProvider = async (provider: RatingPreference) => {
                if (provider === 'tmdb') return tmdbRating;

                if (provider === 'imdb') {
                  const datasetRating = await ensureImdbDatasetRating();
                  if (datasetRating) return datasetRating;
                  await ensureMdbRatings();
                  return combinedRatings.get('imdb') || null;
                }

                if (provider === 'kitsu') {
                  if (combinedRatings.has('kitsu')) return combinedRatings.get('kitsu') || null;
                  if (!needsAnimeOnlyRatings) return null;
                  if (!allowAnimeOnlyRatings) {
                    await ensureAnimeMapping();
                  }
                  if (!allowAnimeOnlyRatings) return null;
                  const kitsuRating = await ensureKitsuRating();
                  if (kitsuRating) return kitsuRating;
                  await ensureMdbRatings();
                  return combinedRatings.get('kitsu') || null;
                }

                if (ANIME_ONLY_RATING_PROVIDER_SET.has(provider)) {
                  if (!needsAnimeOnlyRatings) return null;
                  if (!allowAnimeOnlyRatings) {
                    await ensureAnimeMapping();
                  }
                  if (!allowAnimeOnlyRatings) return null;
                  await ensureMdbRatings();
                  return combinedRatings.get(provider) || null;
                }

                await ensureMdbRatings();
                return combinedRatings.get(provider) || null;
              };

              let renderableCount = 0;
              for (const provider of effectiveRatingPreferences) {
                if (renderableCount >= shortCircuitLimit) break;
                const baseValue = await resolveProvider(provider);
                if (!shouldRenderRatingValue(baseValue)) continue;
                const formattedValue = formatDisplayRatingValue(provider, baseValue as string);
                if (!shouldRenderRatingValue(formattedValue)) continue;
                renderableCount += 1;
              }

              return combinedRatings;
            }

            if (imdbId && (mdblistKey || hasMdbListApiKey)) {
              try {
                const mdbListCacheTtlMs = getMdbListCacheTtlMs({
                  imdbId,
                  mediaType: mediaType as 'movie' | 'tv',
                  releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                });
                const mdbRatings = await fetchMdbListRatings({
                  imdbId,
                  cacheTtlMs: mdbListCacheTtlMs,
                  phases,
                  requestSource: 'addon',
                  imageType,
                  cleanId,
                  manualApiKey: mdblistKey
                });
                if (mdbRatings) {
                  for (const [provider, value] of mdbRatings.entries()) {
                    if (!allowAnimeOnlyRatings && ANIME_ONLY_RATING_PROVIDER_SET.has(provider)) {
                      continue;
                    }
                    combinedRatings.set(provider, value);
                    renderedRatingTtlByProvider.set(provider, mdbListCacheTtlMs);
                  }
                }
              } catch {
                // Ignore
              }
            }

            // IMDb HTML scraping removed: only dataset or MDBList can supply IMDb ratings.
            if (needsImdbRating && imdbId && !combinedRatings.has('imdb')) {
              const datasetRating = getImdbRatingFromDataset(imdbId);
              if (datasetRating) {
                const normalized = normalizeRatingValue(datasetRating.rating);
                if (normalized) {
                  combinedRatings.set('imdb', normalized);
                  renderedRatingTtlByProvider.set('imdb', IMDB_DATASET_CACHE_TTL_MS);
                }
              }
            }

            if (needsKitsuRating && allowAnimeOnlyRatings && kitsuId && !combinedRatings.has('kitsu')) {
              try {
                const kitsuCacheTtlMs = getRatingCacheTtlMs({
                  id: kitsuId,
                  mediaType: mediaType as 'movie' | 'tv',
                  releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                  defaultTtlMs: KITSU_CACHE_TTL_MS,
                  oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
                });
                const kitsuRating = await fetchKitsuRating(kitsuId, phases);
                if (kitsuRating) {
                  combinedRatings.set('kitsu', kitsuRating);
                  renderedRatingTtlByProvider.set('kitsu', kitsuCacheTtlMs);
                }
              } catch {
                // Ignore
              }
            }

              return combinedRatings;
            })()
          : null;
      const streamBadgesPromise =
        shouldRenderStreamBadges && !useRawKitsuFallback && (mediaType === 'movie' || mediaType === 'tv')
          ? (async () => {
            let imdbId: string | null = isImdbId(mediaId) ? mediaId : null;
            if (!imdbId) {
              imdbId = media?.imdb_id || mappedImdbId || null;
              if (!imdbId && detailsBundlePromise) {
                const bundle = await detailsBundlePromise;
                if (bundle?.bundledExternalIds?.imdb_id) {
                  imdbId = bundle.bundledExternalIds.imdb_id;
                }
              }
              if (!imdbId && mappedImdbId) {
                imdbId = mappedImdbId;
              }
            }

            const tmdbId =
              media?.id != null
                ? String(media.id)
                : isTmdb && mediaId
                  ? String(mediaId)
                  : null;
            const torrentioId = imdbId || (tmdbId ? `tmdb:${tmdbId}` : null);
            if (!torrentioId) {
              return { badges: [], cacheTtlMs: TORRENTIO_CACHE_TTL_MS };
            }
            const torrentioType = mediaType === 'movie' ? 'movie' : 'series';
            const torrentioCacheTtlMs = getRatingCacheTtlMs({
              id: torrentioId,
              mediaType: mediaType as 'movie' | 'tv',
              releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
              defaultTtlMs: TORRENTIO_CACHE_TTL_MS,
              oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
            });
            return fetchTorrentioBadges({ type: torrentioType, id: torrentioId, phases, cacheTtlMs: torrentioCacheTtlMs });
          })()
          : null;

      if (type === 'poster') {
        outputWidth = 500;
        outputHeight = 750;
      } else if (type === 'logo') {
        outputHeight = LOGO_BASE_HEIGHT;
        outputWidth = Math.max(
          LOGO_MIN_WIDTH,
          Math.min(
            LOGO_MAX_WIDTH,
            Math.round(LOGO_BASE_HEIGHT * (rawFallbackLogoAspectRatio || LOGO_FALLBACK_ASPECT_RATIO))
          )
        );
      }

      if (!useRawKitsuFallback && detailsBundlePromise) {
        const { details, fallbackDetails, bundledImages, tmdbRating: bundledRating } = await detailsBundlePromise;
        tmdbRating = bundledRating;

        const selectImagePath = async (input: {
          posters: any[];
          backdrops: any[];
          logos: any[];
          seasonIncludeImageLanguage?: string;
        }) => {
          let posterCollection = input.posters || [];
          const backdropCollection = input.backdrops || [];
          const logoCollection = input.logos || [];
          const selectedLogo = pickByLanguageWithFallback(
            logoCollection,
            requestedImageLang,
            FALLBACK_IMAGE_LANGUAGE
          );
          const logoPath = selectedLogo?.file_path || null;

          const localizedPosterPath =
            pickByLanguageWithFallback(posterCollection, requestedImageLang, FALLBACK_IMAGE_LANGUAGE)?.file_path || null;
          let originalPosterPath =
            localizedPosterPath ||
            details?.poster_path ||
            media?.poster_path ||
            posterCollection[0]?.file_path;
          const localizedBackdropPath =
            pickByLanguageWithFallback(backdropCollection, requestedImageLang, FALLBACK_IMAGE_LANGUAGE)?.file_path || null;
          const originalBackdropPath =
            localizedBackdropPath ||
            details?.backdrop_path ||
            media?.backdrop_path ||
            backdropCollection[0]?.file_path;

          // Kitsu IDs usually represent a specific anime season: prefer season posters over unified show posters.
          if (isKitsu && season && !episode && type === 'poster') {
            const seasonImagesQuery = input.seasonIncludeImageLanguage
              ? `&include_image_language=${input.seasonIncludeImageLanguage}`
              : '';
            const seasonImagesCacheKey = input.seasonIncludeImageLanguage
              ? `tmdb:season_images:${media.id}:${season}:${input.seasonIncludeImageLanguage}`
              : `tmdb:season_images:${media.id}:${season}:all`;

            const [seasonDetailsResponse, seasonImagesResponse] = await Promise.all([
              fetchJsonCached(
                `tmdb:season_details:${media.id}:${season}:${requestedImageLang}`,
                `https://api.themoviedb.org/3/tv/${media.id}/season/${season}?api_key=${tmdbKey}&language=${requestedImageLang}`,
                TMDB_CACHE_TTL_MS,
                phases,
                'tmdb'
              ),
              fetchJsonCached(
                seasonImagesCacheKey,
                `https://api.themoviedb.org/3/tv/${media.id}/season/${season}/images?api_key=${tmdbKey}${seasonImagesQuery}`,
                TMDB_CACHE_TTL_MS,
                phases,
                'tmdb'
              )
            ]);

            let seasonPosterPath = null;
            if (seasonDetailsResponse.ok) {
              const seasonDetails = seasonDetailsResponse.data;
              if (seasonDetails?.poster_path) {
                seasonPosterPath = seasonDetails.poster_path;
              }
            }

            if (!seasonPosterPath && requestedImageLang !== FALLBACK_IMAGE_LANGUAGE) {
              const seasonFallbackDetailsResponse = await fetchJsonCached(
                `tmdb:season_details:${media.id}:${season}:${FALLBACK_IMAGE_LANGUAGE}`,
                `https://api.themoviedb.org/3/tv/${media.id}/season/${season}?api_key=${tmdbKey}&language=${FALLBACK_IMAGE_LANGUAGE}`,
                TMDB_CACHE_TTL_MS,
                phases,
                'tmdb'
              );
              if (seasonFallbackDetailsResponse.ok) {
                const seasonFallbackDetails = seasonFallbackDetailsResponse.data;
                if (seasonFallbackDetails?.poster_path) {
                  seasonPosterPath = seasonFallbackDetails.poster_path;
                }
              }
            }

            if (seasonImagesResponse.ok) {
              const seasonImages = seasonImagesResponse.data;
              if (Array.isArray(seasonImages?.posters) && seasonImages.posters.length > 0) {
                posterCollection = seasonImages.posters;
              }
            }

            originalPosterPath =
              seasonPosterPath ||
              pickByLanguageWithFallback(posterCollection, requestedImageLang, FALLBACK_IMAGE_LANGUAGE)?.file_path ||
              originalPosterPath;
          }

          if (type === 'poster') {
            const selectedPoster = pickPosterByPreference(
              posterCollection,
              posterTextPreference,
              requestedImageLang,
              FALLBACK_IMAGE_LANGUAGE,
              originalPosterPath
            );
            return {
              imgPath: selectedPoster?.file_path || '',
              logoAspectRatio: null,
              logoPath,
            };
          }

          if (type === 'backdrop') {
            const selectedBackdrop = pickBackdropByPreference(
              backdropCollection,
              imageText as PosterTextPreference,
              requestedImageLang,
              FALLBACK_IMAGE_LANGUAGE,
              originalBackdropPath
            );
            return {
              imgPath: selectedBackdrop?.file_path || '',
              logoAspectRatio: null,
              logoPath,
            };
          }

          const logoAspectRatio =
            typeof selectedLogo?.aspect_ratio === 'number' && selectedLogo.aspect_ratio > 0
              ? selectedLogo.aspect_ratio
              : null;
          return { imgPath: logoPath || '', logoAspectRatio, logoPath };
        };

        const initialImages = bundledImages || {};
        const initialSelection = await selectImagePath({
          posters: initialImages.posters || [],
          backdrops: initialImages.backdrops || [],
          logos: initialImages.logos || [],
          seasonIncludeImageLanguage: includeImageLanguage
        });

        imgPath = initialSelection.imgPath;
        selectedLogoAspectRatio = initialSelection.logoAspectRatio;
        selectedPosterLogoPath = initialSelection.logoPath || null;
        if (imageType === 'poster' && posterTextPreference === 'clean' && !selectedPosterLogoPath) {
          const logoFallbackImagesResponse = await fetchJsonCached(
            `tmdb:${mediaType}:${media.id}:images:all`,
            `https://api.themoviedb.org/3/${mediaType}/${media.id}/images?api_key=${tmdbKey}`,
            TMDB_CACHE_TTL_MS,
            phases,
            'tmdb'
          );
          if (logoFallbackImagesResponse.ok) {
            const logoFallbackImages = logoFallbackImagesResponse.data || {};
            const logoFallback = pickByLanguageWithFallback(
              logoFallbackImages.logos || [],
              requestedImageLang,
              FALLBACK_IMAGE_LANGUAGE
            );
            if (logoFallback?.file_path) {
              selectedPosterLogoPath = logoFallback.file_path;
            }
          }
        }
        if (selectedLogoAspectRatio) {
          outputWidth = Math.max(
            LOGO_MIN_WIDTH,
            Math.min(LOGO_MAX_WIDTH, Math.round(LOGO_BASE_HEIGHT * selectedLogoAspectRatio))
          );
        }

        // If the filtered languages returned nothing, retry with all languages and pick the first available.
        if (!imgPath && !imgUrl) {
          const fallbackImagesResponse = await fetchJsonCached(
            `tmdb:${mediaType}:${media.id}:images:all`,
            `https://api.themoviedb.org/3/${mediaType}/${media.id}/images?api_key=${tmdbKey}`,
            TMDB_CACHE_TTL_MS,
            phases,
            'tmdb'
          );
          if (fallbackImagesResponse.ok) {
            const fallbackImages = fallbackImagesResponse.data || {};
            const fallbackSelection = await selectImagePath({
              posters: fallbackImages.posters || [],
              backdrops: fallbackImages.backdrops || [],
              logos: fallbackImages.logos || [],
              seasonIncludeImageLanguage: undefined
            });
            if (fallbackSelection.imgPath) {
              imgPath = fallbackSelection.imgPath;
              selectedLogoAspectRatio = fallbackSelection.logoAspectRatio;
              selectedPosterLogoPath = fallbackSelection.logoPath || selectedPosterLogoPath;
              if (selectedLogoAspectRatio) {
                outputWidth = Math.max(
                  LOGO_MIN_WIDTH,
                  Math.min(LOGO_MAX_WIDTH, Math.round(LOGO_BASE_HEIGHT * selectedLogoAspectRatio))
                );
              }
            }
          }
        }
      }

      if (!imgUrl && !imgPath) {
        throw new HttpError('Image not found', 404);
      }
      if (!imgUrl) {
        imgUrl = buildTmdbImageUrl(imageType, imgPath, outputWidth);
      }
      const posterLogoUrl =
        imageType === 'poster' && posterTextPreference === 'clean' && selectedPosterLogoPath
          ? buildTmdbImageUrl('logo', selectedPosterLogoPath, outputWidth)
          : null;
      if (!shouldRenderBadges && !posterTitleText && !posterLogoUrl) {
        return getSourceImagePayload(imgUrl);
      }
      if (providerRatingsPromise) {
        providerRatings = await providerRatingsPromise;
      }
      let streamBadges: RatingBadge[] = [];
      let streamBadgesCacheTtlMs: number | null = null;
      if (streamBadgesPromise) {
        const streamBadgeResult = await streamBadgesPromise;
        streamBadges = streamBadgeResult.badges;
        streamBadgesCacheTtlMs = streamBadgeResult.cacheTtlMs;
      }
      if (shouldRenderRawKitsuFallbackRating) {
        providerRatings.set('kitsu', rawFallbackKitsuRating as string);
        renderedRatingTtlByProvider.set('kitsu', KITSU_CACHE_TTL_MS);
      }
      const ratingBadges: RatingBadge[] = [];
      const renderableRatingPreferences = useRawKitsuFallback
        ? (shouldRenderRawKitsuFallbackRating ? (['kitsu'] as RatingPreference[]) : [])
        : effectiveRatingPreferences.filter(
          (provider) => allowAnimeOnlyRatings || !ANIME_ONLY_RATING_PROVIDER_SET.has(provider)
        );
      for (const provider of renderableRatingPreferences) {
        const meta = RATING_PROVIDER_META.get(provider);
        if (!meta) continue;

        const baseValue = provider === 'tmdb' ? tmdbRating : providerRatings.get(provider) || null;
        if (!shouldRenderRatingValue(baseValue)) continue;
        const value = formatDisplayRatingValue(provider, baseValue as string);
        if (!shouldRenderRatingValue(value)) continue;

        const iconUrl = meta.iconUrl;
        ratingBadges.push({
          key: provider,
          label: meta.label,
          value,
          iconUrl,
          accentColor: meta.accentColor,
        });
      }
      if (ratingBadges.length === 0 && streamBadges.length === 0 && !posterTitleText && !posterLogoUrl) {
        return getSourceImagePayload(imgUrl);
      }
      const usePosterBadgeLayout = type === 'poster';
      const useBackdropBadgeLayout = type === 'backdrop';
      const useLogoBadgeLayout = type === 'logo';
      const usePosterRowLayout =
        usePosterBadgeLayout &&
        (posterRatingsLayout === 'top' ||
          posterRatingsLayout === 'bottom' ||
          posterRatingsLayout === 'top-bottom');
      const usePosterRowLayoutLarge = usePosterBadgeLayout && usePosterRowLayout;
      const useBackdropRightVerticalLayout = useBackdropBadgeLayout && backdropRatingsLayout === 'right-vertical';
      const posterRatingLimit = usePosterBadgeLayout
        ? getPosterRatingLayoutMaxBadges(posterRatingsLayout, posterRatingsMaxPerSide)
        : null;
      let cappedRatingBadges = usePosterBadgeLayout
        ? (typeof posterRatingLimit === 'number' ? ratingBadges.slice(0, posterRatingLimit) : [...ratingBadges])
        : ratingBadges.slice(0, 6);
      let posterBadgeGroups = splitPosterBadgesByLayout(
        cappedRatingBadges,
        posterRatingsLayout,
        posterRatingsMaxPerSide === null ? undefined : posterRatingsMaxPerSide
      );
      let topRatingBadges = usePosterBadgeLayout
        ? posterBadgeGroups.topBadges
        : useBackdropRightVerticalLayout
          ? []
          : cappedRatingBadges.slice(0, 3);
      let bottomRatingBadges = usePosterBadgeLayout
        ? posterBadgeGroups.bottomBadges
        : useBackdropRightVerticalLayout
          ? []
          : cappedRatingBadges.slice(3, 6);
      let leftRatingBadges = usePosterBadgeLayout ? posterBadgeGroups.leftBadges : [];
      let rightRatingBadges = usePosterBadgeLayout
        ? posterBadgeGroups.rightBadges
        : useBackdropRightVerticalLayout
          ? [...cappedRatingBadges]
          : [];

      let badgeIconSize = 34;
      let badgeFontSize = 28;
      let badgePaddingY = 8;
      let badgePaddingX = 14;
      let badgeGap = 10;
      let badgeTopOffset = 16;
      let badgeBottomOffset = 16;
      let posterMinMetrics: BadgeLayoutMetrics = DEFAULT_BADGE_MIN_METRICS;
      let posterRowHorizontalInset = 12;

      if (useBackdropBadgeLayout) {
        badgeIconSize = 32;
        badgeFontSize = 24;
        badgePaddingY = 8;
        badgePaddingX = 12;
        badgeGap = 8;
        badgeTopOffset = 20;
        badgeBottomOffset = 20;
      } else if (usePosterBadgeLayout) {
        if (usePosterRowLayoutLarge) {
          badgeIconSize = 40;
          badgeFontSize = 30;
          badgePaddingY = 6;
          badgePaddingX = 10;
          badgeGap = 7;
        } else {
          badgeIconSize = 42;
          badgeFontSize = 32;
          badgePaddingY = 7;
          badgePaddingX = 11;
          badgeGap = 8;
        }
        posterRowHorizontalInset = usePosterRowLayout ? 12 : 12;
        posterMinMetrics = {
          iconSize: 24,
          fontSize: 18,
          paddingX: 8,
          paddingY: 6,
          gap: 6,
        };
        badgeTopOffset = 24;
        badgeBottomOffset = 24;
      } else if (useLogoBadgeLayout) {
        badgeIconSize = 80;
        badgeFontSize = 60;
        badgePaddingY = 20;
        badgePaddingX = 32;
        badgeGap = 18;
      }

      if (usePosterBadgeLayout && cappedRatingBadges.length > 0) {
        let fittedPosterMetrics: BadgeLayoutMetrics;
        if (posterRatingsLayout === 'left' || posterRatingsLayout === 'right' || posterRatingsLayout === 'left-right') {
          const posterColumns = [leftRatingBadges, rightRatingBadges].filter((column) => column.length > 0);
          const widthRows = posterColumns.flatMap((column) => column.map((badge) => [badge]));
          const alignPosterQualityBadges =
            (posterRatingsLayout === 'left' || posterRatingsLayout === 'right') && streamBadges.length > 0;
          const posterColumnMaxWidth =
            posterRatingsLayout === 'left-right'
              ? Math.max(160, Math.floor((outputWidth - 36) / 2))
              : alignPosterQualityBadges
                ? Math.max(220, Math.floor(outputWidth * 0.6))
                : Math.max(180, Math.floor(outputWidth * 0.46));
          fittedPosterMetrics = fitPosterBadgeMetricsToWidth(widthRows, posterColumnMaxWidth + 24, {
            iconSize: badgeIconSize,
            fontSize: badgeFontSize,
            paddingX: badgePaddingX,
            paddingY: badgePaddingY,
            gap: badgeGap,
          }, posterMinMetrics);
          fittedPosterMetrics = fitPosterBadgeMetricsToHeight(
            posterColumns,
            outputHeight,
            fittedPosterMetrics,
            badgeTopOffset,
            badgeBottomOffset,
            posterMinMetrics
          );
          const maxPerColumn = getMaxBadgeColumnCount(
            outputHeight,
            fittedPosterMetrics,
            badgeTopOffset,
            badgeBottomOffset
          );
          const effectiveMaxPerSide =
            posterRatingsMaxPerSide === null ? maxPerColumn : Math.min(maxPerColumn, posterRatingsMaxPerSide);
          posterBadgeGroups = splitPosterBadgesByLayout(cappedRatingBadges, posterRatingsLayout, effectiveMaxPerSide);
          topRatingBadges = posterBadgeGroups.topBadges;
          bottomRatingBadges = posterBadgeGroups.bottomBadges;
          leftRatingBadges = posterBadgeGroups.leftBadges;
          rightRatingBadges = posterBadgeGroups.rightBadges;
          cappedRatingBadges = [...leftRatingBadges, ...rightRatingBadges];
        } else {
          const posterRowFitWidth = usePosterRowLayout
            ? Math.max(0, outputWidth - posterRowHorizontalInset * 2)
            : outputWidth;
          fittedPosterMetrics = fitPosterBadgeMetricsToWidth(
            [topRatingBadges, bottomRatingBadges].filter((row) => row.length > 0),
            posterRowFitWidth,
            {
              iconSize: badgeIconSize,
              fontSize: badgeFontSize,
              paddingX: badgePaddingX,
              paddingY: badgePaddingY,
              gap: badgeGap,
            },
            posterMinMetrics,
            usePosterRowLayout,
            false
          );
        }
        badgeIconSize = fittedPosterMetrics.iconSize;
        badgeFontSize = fittedPosterMetrics.fontSize;
        badgePaddingX = fittedPosterMetrics.paddingX;
        badgePaddingY = fittedPosterMetrics.paddingY;
        badgeGap = fittedPosterMetrics.gap;
      } else if (useBackdropBadgeLayout && cappedRatingBadges.length > 0) {
        let fittedBackdropMetrics: BadgeLayoutMetrics;
        if (useBackdropRightVerticalLayout) {
          const backdropColumnMaxWidth = Math.max(180, Math.floor(outputWidth * 0.28));
          fittedBackdropMetrics = fitPosterBadgeMetricsToWidth(
            rightRatingBadges.map((badge) => [badge]),
            backdropColumnMaxWidth + 24,
            {
              iconSize: badgeIconSize,
              fontSize: badgeFontSize,
              paddingX: badgePaddingX,
              paddingY: badgePaddingY,
              gap: badgeGap,
            }
          );
          fittedBackdropMetrics = fitPosterBadgeMetricsToHeight(
            [rightRatingBadges],
            outputHeight,
            fittedBackdropMetrics,
            badgeTopOffset,
            badgeBottomOffset
          );
          const maxPerColumn = getMaxBadgeColumnCount(
            outputHeight,
            fittedBackdropMetrics,
            badgeTopOffset,
            badgeBottomOffset
          );
          rightRatingBadges = rightRatingBadges.slice(0, maxPerColumn);
          cappedRatingBadges = [...rightRatingBadges];
        } else {
          const backdropRegion = getBackdropBadgeRegion(outputWidth, backdropRatingsLayout);
          fittedBackdropMetrics = fitPosterBadgeMetricsToWidth(
            [topRatingBadges, bottomRatingBadges].filter((row) => row.length > 0),
            backdropRegion.width,
            {
              iconSize: badgeIconSize,
              fontSize: badgeFontSize,
              paddingX: badgePaddingX,
              paddingY: badgePaddingY,
              gap: badgeGap,
            }
          );
        }
        badgeIconSize = fittedBackdropMetrics.iconSize;
        badgeFontSize = fittedBackdropMetrics.fontSize;
        badgePaddingX = fittedBackdropMetrics.paddingX;
        badgePaddingY = fittedBackdropMetrics.paddingY;
        badgeGap = fittedBackdropMetrics.gap;
      }

      const logoBadgeRowWidth = useLogoBadgeLayout && cappedRatingBadges.length > 0
        ? measureBadgeRowWidth(cappedRatingBadges, {
          iconSize: badgeIconSize,
          fontSize: badgeFontSize,
          paddingX: badgePaddingX,
          paddingY: badgePaddingY,
          gap: badgeGap,
        })
        : 0;
      const qualityBadges = useLogoBadgeLayout ? [] : streamBadges;
      const badgesForIcons = cappedRatingBadges;
      const logoNaturalWidth = useLogoBadgeLayout ? outputWidth : 0;
      const finalOutputWidth = useLogoBadgeLayout && logoBadgeRowWidth > 0
        ? Math.min(LOGO_MAX_WIDTH, Math.max(logoNaturalWidth, logoBadgeRowWidth + 72))
        : outputWidth;
      const logoImageWidth = useLogoBadgeLayout ? logoNaturalWidth : 0;
      const logoImageHeight = useLogoBadgeLayout ? outputHeight : 0;
      const logoBadgesPerRow = useLogoBadgeLayout ? Math.max(1, cappedRatingBadges.length) : 0;
      const logoBadgeRows = useLogoBadgeLayout && cappedRatingBadges.length > 0 ? 1 : 0;
      const logoBadgeItemHeight = badgeIconSize + badgePaddingY * 2;
      const estimatedLogoWidth = logoImageWidth;
      const logoBadgeContainerMaxWidth = Math.max(0, finalOutputWidth - 24);
      const logoBadgeMaxWidth = Math.min(
        logoBadgeContainerMaxWidth,
        Math.max(
          Math.min(520, logoBadgeContainerMaxWidth),
          Math.max(Math.round(estimatedLogoWidth * 1.18), logoBadgeRowWidth + 24)
        )
      );
      const logoBadgeBandHeight = useLogoBadgeLayout && cappedRatingBadges.length > 0
        ? Math.max(170, logoBadgeRows * logoBadgeItemHeight + Math.max(0, logoBadgeRows - 1) * badgeGap + 68)
        : 0;
      const finalOutputHeight = useLogoBadgeLayout ? logoImageHeight + logoBadgeBandHeight : outputHeight;
      const renderedRatingCacheTtlCandidates = [
        ...ratingBadges.map((badge) => {
          if (badge.key === 'tmdb') {
            return TMDB_CACHE_TTL_MS;
          }
          return renderedRatingTtlByProvider.get(badge.key) || null;
        }),
        ...(streamBadges.length > 0 ? [streamBadgesCacheTtlMs ?? TORRENTIO_CACHE_TTL_MS] : []),
      ].filter((ttlMs): ttlMs is number => typeof ttlMs === 'number' && Number.isFinite(ttlMs) && ttlMs > 0);
      const finalImageCacheTtlMs =
        renderedRatingCacheTtlCandidates.length > 0
          ? Math.min(...renderedRatingCacheTtlCandidates)
          : TMDB_CACHE_TTL_MS;
      const responseCacheControl = `public, s-maxage=${Math.max(60, Math.floor(finalImageCacheTtlMs / 1000))}, stale-while-revalidate=60`;
      const renderedPayload = await renderWithSharp(
        {
          imageType,
          outputFormat,
          imgUrl,
          outputWidth: finalOutputWidth,
          outputHeight: useLogoBadgeLayout ? logoImageHeight : outputHeight,
          imageWidth: useLogoBadgeLayout ? logoImageWidth : undefined,
          imageHeight: useLogoBadgeLayout ? logoImageHeight : undefined,
          finalOutputHeight,
          logoBadgeBandHeight,
          logoBadgeMaxWidth,
          logoBadgesPerRow,
          posterRowHorizontalInset,
          posterTitleText,
          posterLogoUrl,
          badgeIconSize,
          badgeFontSize,
          badgePaddingX,
          badgePaddingY,
          badgeGap,
          badgeTopOffset,
          badgeBottomOffset,
          badges: badgesForIcons,
          qualityBadges,
          qualityBadgesSide,
          qualityBadgesStyle,
          posterRatingsLayout,
          posterRatingsMaxPerSide,
          backdropRatingsLayout,
          ratingStyle,
          topBadges: topRatingBadges,
          bottomBadges: bottomRatingBadges,
          leftBadges: leftRatingBadges,
          rightBadges: rightRatingBadges,
          cacheControl: responseCacheControl,
        },
        phases
      );
      if (shouldCacheFinalImage) {
        try {
          await putCachedImageToObjectStorage(finalObjectStorageKey, renderedPayload);
        } catch {
          // Ignore distributed cache persistence failures.
        }
      }
      return renderedPayload;
    });

    const totalMs = performance.now() - requestStartedAt;
    const cacheStatus = objectStorageHit ? 'hit' : hadSharedRender ? 'shared' : 'miss';
    return createImageHttpResponse(
      renderedImage,
      buildServerTimingHeader(phases, totalMs),
      cacheStatus
    );
  } catch (e: any) {
    if (e instanceof HttpError) {
      return respond(e.message, e.status, e.headers);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ERDB] render failed', e);
    }
    const message = typeof e?.message === 'string' ? e.message : 'Unknown error';
    const stack = process.env.NODE_ENV !== 'production' && typeof e?.stack === 'string' ? `\n${e.stack}` : '';
    return respond(`Error: ${message}${stack}`, 500);
  }
}

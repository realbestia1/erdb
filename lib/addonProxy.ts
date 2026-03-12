import { createHash } from 'node:crypto';

const ERDB_OPTIONAL_PARAMS = [
  'ratings',
  'lang',
  'posterRatingsLayout',
  'posterRatingsMaxPerSide',
  'backdropRatingsLayout',
] as const;

const ERDB_TYPE_STYLE_PARAMS = {
  poster: {
    ratingStyle: ['posterRatingStyle', 'ratingStyle'],
    imageText: ['posterImageText', 'imageText'],
  },
  backdrop: {
    ratingStyle: ['backdropRatingStyle', 'ratingStyle'],
    imageText: ['backdropImageText', 'imageText'],
  },
  logo: {
    ratingStyle: ['logoRatingStyle', 'ratingStyle'],
    imageText: [],
  },
} as const;

export const ERDB_RESERVED_PARAMS = new Set<string>([
  'url',
  'tmdbKey',
  'mdblistKey',
  'erdbBase',
  'ratingStyle',
  'imageText',
  'posterRatingStyle',
  'backdropRatingStyle',
  'logoRatingStyle',
  'posterImageText',
  'backdropImageText',
  ...ERDB_OPTIONAL_PARAMS,
]);

export type ProxyConfig = {
  url: string;
  tmdbKey: string;
  mdblistKey: string;
  ratings?: string;
  lang?: string;
  ratingStyle?: string;
  imageText?: string;
  posterRatingStyle?: string;
  backdropRatingStyle?: string;
  logoRatingStyle?: string;
  posterImageText?: string;
  backdropImageText?: string;
  posterRatingsLayout?: string;
  posterRatingsMaxPerSide?: string;
  backdropRatingsLayout?: string;
  erdbBase?: string;
};

const PROXY_OPTIONAL_KEYS: Array<keyof ProxyConfig> = [
  'ratings',
  'lang',
  'ratingStyle',
  'imageText',
  'posterRatingStyle',
  'backdropRatingStyle',
  'logoRatingStyle',
  'posterImageText',
  'backdropImageText',
  'posterRatingsLayout',
  'posterRatingsMaxPerSide',
  'backdropRatingsLayout',
  'erdbBase',
];

const SUPPORTED_PREFIXES = new Set(['tmdb', 'kitsu', 'anilist', 'myanimelist']);
const IMDB_RE = /^tt\d+$/i;

export const buildProxyId = (manifestUrl: string, configSeed?: string) => {
  const hash = createHash('sha256').update(manifestUrl);
  if (configSeed) {
    hash.update('|');
    hash.update(configSeed);
  }
  const digest = hash.digest('hex').slice(0, 12);
  return `erdb.proxy.${digest}`;
};

export const parseAddonBaseUrl = (manifestUrl: string) => {
  const url = new URL(manifestUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Unsupported manifest URL protocol.');
  }
  url.hash = '';
  url.search = '';
  if (url.pathname.endsWith('/manifest.json')) {
    url.pathname = url.pathname.slice(0, -'/manifest.json'.length);
  }
  url.pathname = url.pathname.replace(/\/$/, '');
  return url.toString();
};

export const normalizeErdbId = (rawId: string | undefined | null): string | null => {
  if (!rawId) return null;
  const trimmed = rawId.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(':');
  const head = parts[0];
  if (IMDB_RE.test(head)) return head;

  const prefix = head.toLowerCase();
  if (prefix === 'imdb' && parts.length >= 2 && IMDB_RE.test(parts[1])) {
    return parts[1];
  }

  if (SUPPORTED_PREFIXES.has(prefix) && parts.length >= 2 && parts[1]) {
    return `${prefix}:${parts[1]}`;
  }

  return null;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const decodeBase64Url = (value: string) => {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch (error) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    const padded = padding ? normalized + '='.repeat(4 - padding) : normalized;
    return Buffer.from(padded, 'base64').toString('utf8');
  }
};

export const decodeProxyConfig = (encoded: string): ProxyConfig | null => {
  try {
    const json = decodeBase64Url(encoded);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    const url = toOptionalString((parsed as ProxyConfig).url);
    const tmdbKey = toOptionalString((parsed as ProxyConfig).tmdbKey);
    const mdblistKey = toOptionalString((parsed as ProxyConfig).mdblistKey);
    if (!url || !tmdbKey || !mdblistKey) return null;

    const config: ProxyConfig = { url, tmdbKey, mdblistKey };
    for (const key of PROXY_OPTIONAL_KEYS) {
      const value = toOptionalString((parsed as ProxyConfig)[key]);
      if (value) {
        config[key] = value;
      }
    }
    return config;
  } catch (error) {
    return null;
  }
};

export const getProxyConfigFromQuery = (searchParams: URLSearchParams): ProxyConfig | null => {
  const url = searchParams.get('url');
  const tmdbKey = searchParams.get('tmdbKey');
  const mdblistKey = searchParams.get('mdblistKey');
  if (!url || !tmdbKey || !mdblistKey) return null;

  const config: ProxyConfig = { url, tmdbKey, mdblistKey };
  for (const key of PROXY_OPTIONAL_KEYS) {
    const value = searchParams.get(key);
    if (value) {
      config[key] = value;
    }
  }
  return config;
};

const getProxyParam = (reqUrl: URL, config: ProxyConfig | null, key: keyof ProxyConfig) => {
  return (config && config[key]) || reqUrl.searchParams.get(key) || null;
};

export const buildErdbImageUrl = (options: {
  reqUrl: URL;
  imageType: 'poster' | 'backdrop' | 'logo';
  erdbId: string;
  tmdbKey: string;
  mdblistKey: string;
  config?: ProxyConfig | null;
}) => {
  const { reqUrl, imageType, erdbId, tmdbKey, mdblistKey, config = null } = options;
  const baseOverride = getProxyParam(reqUrl, config, 'erdbBase');
  const base = new URL(baseOverride || reqUrl.origin);
  base.pathname = `/${imageType}/${encodeURIComponent(erdbId)}.jpg`;
  base.search = '';
  base.searchParams.set('tmdbKey', tmdbKey);
  base.searchParams.set('mdblistKey', mdblistKey);

  for (const key of ERDB_OPTIONAL_PARAMS) {
    const value = getProxyParam(reqUrl, config, key);
    if (value) base.searchParams.set(key, value);
  }

  const styleParams = ERDB_TYPE_STYLE_PARAMS[imageType];
  const ratingStyle =
    styleParams.ratingStyle.map((key) => getProxyParam(reqUrl, config, key)).find((value) => value) || null;
  if (ratingStyle) base.searchParams.set('ratingStyle', ratingStyle);

  if (styleParams.imageText.length > 0) {
    const imageText =
      styleParams.imageText.map((key) => getProxyParam(reqUrl, config, key)).find((value) => value) || null;
    if (imageText) base.searchParams.set('imageText', imageText);
  }

  return base.toString();
};

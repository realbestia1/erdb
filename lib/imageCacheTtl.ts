export const getCacheTtlMsFromCacheControl = (value: string | null | undefined, fallbackMs: number) => {
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

export const getFinalImageCacheTtlMs = (input: {
  renderedRatingProviders: string[];
  ttlByProvider: Map<string, number>;
  tmdbTtlMs: number;
  fallbackTtlMs?: number;
}) => {
  const candidates = input.renderedRatingProviders
    .map((provider) => {
      if (provider === 'tmdb') {
        return input.tmdbTtlMs;
      }
      return input.ttlByProvider.get(provider) || null;
    })
    .filter((ttlMs): ttlMs is number => typeof ttlMs === 'number' && Number.isFinite(ttlMs) && ttlMs > 0);

  if (candidates.length > 0) {
    return Math.min(...candidates);
  }

  return input.fallbackTtlMs ?? input.tmdbTtlMs;
};

export const buildPublicImageCacheControl = (ttlMs: number, staleWhileRevalidateSeconds = 60) => {
  const ttlSeconds = Math.max(60, Math.floor(ttlMs / 1000));
  // ponytail: browser max-age capped at 1 day, CDN s-maxage keeps full TTL (key includes config version).
  const browserSeconds = Math.min(ttlSeconds, 86400);
  return `public, max-age=${browserSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=${Math.max(
    0,
    Math.trunc(staleWhileRevalidateSeconds)
  )}`;
};

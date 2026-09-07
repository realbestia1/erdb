import { parseCacheTtlMs } from '@/lib/routeUtils';

export const FINAL_IMAGE_RENDERER_CACHE_VERSION = 'poster-backdrop-logo-thumbnail-v244-webp';
export const TMDB_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_TMDB_CACHE_TTL_MS,
  3 * 24 * 60 * 60 * 1000,
  10 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000
);
export const MDBLIST_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_MDBLIST_CACHE_TTL_MS,
  3 * 24 * 60 * 60 * 1000,
  10 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000
);
export const MDBLIST_OLD_MOVIE_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
  7 * 24 * 60 * 60 * 1000,
  60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000
);
export const MDBLIST_OLD_MOVIE_AGE_DAYS = (() => {
  const rawValue = Number(process.env.ERDB_MDBLIST_OLD_MOVIE_AGE_DAYS);
  if (!Number.isFinite(rawValue) || rawValue <= 0) return 365;
  return Math.min(3650, Math.max(30, Math.floor(rawValue)));
})();
export const MDBLIST_RATE_LIMIT_COOLDOWN_MS = parseCacheTtlMs(
  process.env.ERDB_MDBLIST_RATE_LIMIT_COOLDOWN_MS,
  24 * 60 * 60 * 1000,
  30 * 1000,
  7 * 24 * 60 * 60 * 1000
);
export const IMDB_DATASET_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_IMDB_DATASET_CACHE_TTL_MS,
  7 * 24 * 60 * 60 * 1000,
  60 * 60 * 1000,
  365 * 24 * 60 * 60 * 1000
);
export const KITSU_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_KITSU_CACHE_TTL_MS,
  3 * 24 * 60 * 60 * 1000,
  10 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000
);
export const SIMKL_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_SIMKL_CACHE_TTL_MS,
  3 * 24 * 60 * 60 * 1000,
  10 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000
);
export const FILMWEB_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_FILMWEB_CACHE_TTL_MS,
  3 * 24 * 60 * 60 * 1000,
  10 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000
);
export const STREAM_BADGES_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_TORRENTIO_CACHE_TTL_MS,
  6 * 60 * 60 * 1000,
  10 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000
);
export const RANKING_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const STREAM_BADGES_PROVIDER_BASE_URL = (
  process.env.ERDB_STREAM_BADGES_PROVIDER_URL || 'https://icv.stremio-italia.eu/eyJ0bWRiX2tleSI6IjU0NjJmNzg0NjlmM2Q4MGJmNTIwMTY0NTI5NGMxNmU0IiwidXNlX2NvcnNhcm9uZXJvIjp0cnVlLCJ1c2VfdWluZGV4IjpmYWxzZSwidXNlX2tuYWJlbiI6dHJ1ZSwidXNlX3RvcnJlbnRnYWxheHkiOmZhbHNlLCJ1c2VfdG9ycmVudGlvIjp0cnVlLCJ1c2VfbWVkaWFmdXNpb24iOnRydWUsInVzZV9jb21ldCI6dHJ1ZSwidXNlX3N0cmVtdGhydV90b3J6Ijp0cnVlLCJ1c2VfcmFyYmciOnRydWUsImZ1bGxfaXRhIjpmYWxzZSwiZGJfb25seSI6ZmFsc2UsInVzZV9nbG9iYWxfY2FjaGUiOmZhbHNlLCJvbmx5X2RlYnJpZF9jYWNoZSI6ZmFsc2UsImh5YnJpZF9tb2RlIjp0cnVlfQ/manifest.json'
)
  .trim()
  .replace(/\/manifest\.json$/i, '')
  .replace(/\/+$/, '');
export const PROVIDER_ICON_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_PROVIDER_ICON_CACHE_TTL_MS,
  7 * 24 * 60 * 60 * 1000,
  60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000
);
export const GENERATED_LOGO_VARIANT_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.ERDB_GENERATED_LOGO_CACHE_TTL_MS,
  30 * 24 * 60 * 60 * 1000,
  60 * 60 * 1000,
  365 * 24 * 60 * 60 * 1000
);
export const GENERATED_LOGO_VARIANT_CACHE_MAX_ENTRIES = 256;
export const TMDB_ANIMATION_GENRE_ID = 16;
export const STAR_RATING_ICON = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#ffffff" d="M32 5.6 39.7 22l17.8 2.7-12.9 12.7 3 17.9L32 46.8 16.4 55.3l3-17.9L6.5 24.7 24.3 22 32 5.6Z"/></svg>'
)}`;
export const RANKING_ICON_URL = 'https://rank.uva.es/wp-content/uploads/2019/02/cropped-rank-logo-512x512.png';

export type RankingInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export const JUSTWATCH_GRAPHQL_URL = 'https://apis.justwatch.com/graphql';

export const GET_STREAMING_CHART_INFO_QUERY = `
query GetStreamingChartInfo($countryStreamingCharts: Country, $country: Country!, $language: Language!, $filter: StreamingChartsFilter, $first: Int!, $after: String) {
  streamingCharts(
    country: $countryStreamingCharts
    filter: $filter
    first: $first
    after: $after
  ) {
    edges {
      streamingChartInfo {
        rank
      }
      node {
        ... on MovieOrShowOrSeason {
          content(country: $country, language: $language) {
            externalIds {
              imdbId
              tmdbId
            }
          }
        }
      }
    }
  }
}
`;


import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  ALL_RATING_PREFERENCES,
  RATING_PROVIDER_OPTIONS,
  normalizeRatingPreference,
  parseRatingPreferencesAllowEmpty,
  type RatingPreference,
} from '@/lib/ratingPreferences';
import {
  DEFAULT_BACKDROP_RATING_LAYOUT,
  isVerticalBackdropRatingLayout,
  normalizeBackdropRatingLayout,
  type BackdropRatingLayout,
} from '@/lib/backdropRatingLayout';
import {
  DEFAULT_THUMBNAIL_RATING_LAYOUT,
  isVerticalThumbnailRatingLayout,
  normalizeThumbnailRatingLayout,
  type ThumbnailRatingLayout,
} from '@/lib/thumbnailRatingLayout';
import {
  normalizeThumbnailSize,
  type ThumbnailSize,
} from '@/lib/thumbnailSize';
import {
  normalizeBackdropRatingsSize,
  type BackdropRatingsSize,
} from '@/lib/backdropRatingsSize';
import {
  DEFAULT_POSTER_RATINGS_MAX_PER_SIDE,
  DEFAULT_POSTER_RATING_LAYOUT,
  getPosterRatingLayoutMaxBadges,
  getPosterRatingLayoutLimit,
  isVerticalPosterRatingLayout,
  normalizePosterRatingLayout,
  normalizePosterRatingsMaxPerSide,
  type PosterRatingLayout,
} from '@/lib/posterRatingLayout';
import { normalizeLogoRatingsMax } from '@/lib/logoRatingsMax';
import { normalizeBackdropRatingsMax } from '@/lib/backdropRatingsMax';
import { DEFAULT_LOGO_MODE, normalizeLogoMode, type LogoMode } from '@/lib/logoMode';
import { DEFAULT_LOGO_FONT_VARIANT, normalizeLogoFontVariant, type LogoFontVariant } from '@/lib/logoFontVariant';
import {
  DEFAULT_LOGO_CUSTOM_PRIMARY,
  DEFAULT_LOGO_CUSTOM_OUTLINE,
  DEFAULT_LOGO_CUSTOM_SECONDARY,
  normalizeHexColor,
} from '@/lib/logoCustomColors';
import {
  DEFAULT_RATING_STYLE,
  normalizeRatingStyle,
  normalizeRatingsColorMode,
  type RatingStyle,
} from '@/lib/ratingStyle';
import {
  buildIncludeImageLanguage,
  getTmdbLanguageBase,
  normalizeTmdbLanguageCode,
} from '@/lib/tmdbLanguage';
import { findImdbEpisodeBySeriesSeasonEpisode, getImdbEpisodeFromDataset, getImdbRatingFromDataset, isImdbSeriesFromDataset } from '@/lib/imdbDataset';
import { scheduleImdbDatasetSync } from '@/lib/imdbDatasetSync';
// Removed mdblistRequestLogs import

import {
  buildObjectStorageImageKey,
  getCachedImageFromObjectStorage,
  isObjectStorageConfigured,
  putCachedImageToObjectStorage,
} from '@/lib/objectStorage';
import { buildPublicImageCacheControl } from '@/lib/imageCacheTtl';
import { getTokenConfig } from '@/lib/tokens';
import { MDBLIST_API_KEYS, buildMdbListCacheSeed, fetchFilmwebCriticsRating, fetchFilmwebIdBySearch, fetchFilmwebIdFromWikidata, fetchFilmwebRating, fetchMdbListRatings, fetchSimklRating, getMdbListCacheTtlMs, getRatingCacheTtlMs } from '@/lib/ratingProviders';
import { fetchJsonCached, fetchTextCached } from '@/lib/cachedFetch';
import { fetchStreamBadges } from '@/lib/streamBadges';
import { buildFallbackBadge, fetchRanking, getFirstTmdbGenreName, getRankingLabel, isTmdbAnimationTitle, normalizeRankingInterval } from '@/lib/tmdbMetadata';
import { buildGeneratedLogoVariantDataUrl, buildTmdbImageUrl, getSourceImagePayload } from '@/lib/imageAssetPipeline';
import { renderWithSharp } from '@/lib/imageRenderer';
import { ANIME_NATIVE_INPUT_ID_PREFIX_SET, extractAnimeSubtypeFromAnimemapping, fetchAnilistIdFromReverseMapping, fetchAnilistRating, fetchAnimemappingPayload, fetchKitsuFallbackAsset, fetchKitsuIdFromReverseMapping, fetchKitsuRating, fetchMalIdFromReverseMapping, fetchMyAnimeListRating, fetchNativeAnimeDirectFallbackAsset, fetchTmdbIdFromReverseMapping, normalizeAiometadataEpisodeProvider, parseKitsuInputParts, pickPosterTitleFromMedia, toAnimeMappingProvider } from '@/lib/animeProviders';
import { fetchFanartImages, resolveImdbEpisodeWithTvdbOrderToTmdb, resolveTmdbEpisodeByYearBucket, resolveTvdbEpisodeToTmdb } from '@/lib/externalMediaProviders';
import { buildServerTimingHeader, sha1Hex, withDedupe } from '@/lib/routeShared';
import { chunkBy, DEFAULT_BADGE_MIN_METRICS, estimateBadgeHeight, fitPosterBadgeMetricsToHeight, fitPosterBadgeMetricsToWidth, getBackdropBadgePlacement, getLogoCanvasWidth, getMaxBadgeColumnCount, measureBadgeRowWidth, normalizeVerticalBadgeContent, splitBackdropVerticalBadgesIntoColumns, splitPosterBadgesByLayout, type BadgeLayoutMetrics } from '@/lib/badgeLayoutSvg';
import { FINAL_IMAGE_RENDERER_CACHE_VERSION, TMDB_CACHE_TTL_MS, MDBLIST_CACHE_TTL_MS, MDBLIST_OLD_MOVIE_CACHE_TTL_MS, IMDB_DATASET_CACHE_TTL_MS, KITSU_CACHE_TTL_MS, SIMKL_CACHE_TTL_MS, FILMWEB_CACHE_TTL_MS, STREAM_BADGES_CACHE_TTL_MS, RANKING_CACHE_TTL_MS } from '@/lib/routeConfig';
import { HttpError, type PhaseDurations, type RenderImageType, type RenderedImagePayload } from '@/lib/routeTypes';
import { FALLBACK_IMAGE_LANGUAGE, getDeterministicTtlMs, getTmdbLanguageFallbackChain, isImdbId, isOriginalLanguageSetting, resolveOriginalAwareImageLanguage, resolveRequestedImageLanguage } from '@/lib/routeUtils';
import { normalizeRatingValue } from '@/lib/ratingProviderParsing';
import { isTextlessPosterSelection, matchesImageLanguage, pickBackdropByPreference, pickByLanguageWithFallback, pickPosterByPreference, type PosterTextPreference } from '@/lib/tmdbImageSelection';
import { ANIME_ONLY_RATING_PROVIDER_SET, LOGO_BASE_HEIGHT, RATING_PROVIDER_META, formatDisplayRatingValue, formatRatingNumber, normalizePosterGenrePosition, normalizePosterQualityBadgesPosition, normalizeQualityBadgesSide, normalizeQualityBadgesStyle, normalizeQualityBadgesColorMode, normalizeRankingPosition, normalizeStreamBadgesSetting, outputFormatToExtension, parseDisplayRatingValue, pickOutputFormat, resolvePosterQualityBadgePlacement, shouldRenderRatingValue, type BadgeKey, type RankingBadge, type RatingBadge } from '@/lib/ratingBadgeLogic';
import { buildTransparentLogoDataUrl } from '@/lib/imageSvgText';

export const runtime = 'nodejs';

const ALLOWED_IMAGE_TYPES = new Set<RenderImageType>(['poster', 'backdrop', 'logo', 'thumbnail']);
const isRenderImageType = (value: string): value is RenderImageType =>
  ALLOWED_IMAGE_TYPES.has(value as RenderImageType);

const SIMKL_CLIENT_ID =
  process.env.SIMKL_CLIENT_ID ||
  process.env.SIMKL_API_KEY ||
  process.env.ERDB_SIMKL_CLIENT_ID ||
  '';
const FANART_API_KEY = process.env.FANART_API_KEY || process.env.ERDB_FANART_API_KEY || '';
type TimedCacheEntry<T> = {
  value: T;
  expiresAt: number;
  lastAccessedAt: number;
};
const finalImageInFlight = new Map<string, Promise<RenderedImagePayload>>();
const buildSecretCacheSeed = (name: string, value?: string | null) => {
  const normalized = String(value || '').trim();
  return normalized ? `${name}:${sha1Hex(normalized).slice(0, 12)}` : `${name}:none`;
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
  const responseHeadersCacheControl = 'no-store, max-age=0';

  const respond = (body: string | Buffer | ArrayBuffer, status: number, headers?: HeadersInit) => {
    const finalHeaders = new Headers(headers);
    const totalMs = performance.now() - requestStartedAt;
    finalHeaders.set('Server-Timing', buildServerTimingHeader(phases, totalMs));
    return new Response(body as any, { status, headers: finalHeaders });
  };

  const { type, id } = await params;
  if (!isRenderImageType(type)) {
    return respond('Invalid image type', 400);
  }
  scheduleImdbDatasetSync();
  const imageType = type;
  const outputFormat = pickOutputFormat(imageType, request.headers.get('accept'));
  const cleanId = id.replace('.jpg', '');

  // Extract configuration from token or query parameters
  const token = request.nextUrl.searchParams.get('token') || request.headers.get('x-erdb-token');
  const tokenData = token ? getTokenConfig(token) : null;

  const tokenConfig = (tokenData?.config ? { ...tokenData.config } : {}) as any;
  const tokenUpdatedAt = tokenData?.updatedAt || 0;

  const posterConfiguratorPreset =
    tokenConfig.posterConfiguratorPreset || request.nextUrl.searchParams.get('posterConfiguratorPreset') || null;

  if (posterConfiguratorPreset === 'simple') {
    tokenConfig.posterRatingsMode = 'average';
    if (tokenConfig.posterSimpleRatingSource && tokenConfig.posterSimpleRatingSource !== 'average') {
      tokenConfig.posterRatingPreferences = tokenConfig.posterSimpleRatingSource;
    }
    tokenConfig.posterRatingStyle = 'plain';
    if (!tokenConfig.posterRatingsLayout && !request.nextUrl.searchParams.get('posterRatingsLayout')) {
      tokenConfig.posterRatingsLayout = 'bottom';
    }
    tokenConfig.posterQualityBadgesStyle = 'plain';
    tokenConfig.posterImageText = 'clean';
    const simpleQualityBadges = tokenConfig.posterSimpleQualityBadges || request.nextUrl.searchParams.get('posterSimpleQualityBadges');
    if (simpleQualityBadges === 'off' || simpleQualityBadges === 'on' || simpleQualityBadges === 'auto') {
      tokenConfig.posterStreamBadges = simpleQualityBadges;
    }
  }

  const rankingParam = tokenConfig.ranking || request.nextUrl.searchParams.get('ranking') || 'off';
  const rankingNoBoxParam = tokenConfig.rankingNoBox || request.nextUrl.searchParams.get('rankingNoBox') || 'off';
  const rankingNoBox = rankingNoBoxParam === 'on' || rankingNoBoxParam === 'true' || rankingNoBoxParam === true;
  const rankingCompactParam = tokenConfig.rankingCompact || request.nextUrl.searchParams.get('rankingCompact') || 'off';
  const rankingCompact = rankingCompactParam === 'on' || rankingCompactParam === 'true' || rankingCompactParam === true;
  const rankingCountry = (tokenConfig.rankingCountry || request.nextUrl.searchParams.get('rankingCountry') || 'global').trim().toUpperCase();
  const rankingPosition = normalizeRankingPosition(tokenConfig.rankingPosition || request.nextUrl.searchParams.get('rankingPosition'));

  const lang = tokenConfig.lang || request.nextUrl.searchParams.get('lang') || FALLBACK_IMAGE_LANGUAGE;
  const language = lang.split('-')[0].toLowerCase();
  const posterLang =
    tokenConfig.posterLang || request.nextUrl.searchParams.get('posterLang') || null;
  const posterAnimeLang =
    tokenConfig.posterAnimeLang || request.nextUrl.searchParams.get('posterAnimeLang') || null;
  const backdropLang =
    tokenConfig.backdropLang || request.nextUrl.searchParams.get('backdropLang') || null;
  const backdropAnimeLang =
    tokenConfig.backdropAnimeLang || request.nextUrl.searchParams.get('backdropAnimeLang') || null;
  const logoLang =
    tokenConfig.logoLang || request.nextUrl.searchParams.get('logoLang') || null;
  const logoAnimeLang =
    tokenConfig.logoAnimeLang || request.nextUrl.searchParams.get('logoAnimeLang') || null;
  const globalRatings = tokenConfig.ratings || request.nextUrl.searchParams.get('ratings');

  const getRatings = (configKey: string, queryKey: string) => {
    const fromConfig = tokenConfig[configKey];
    if (Array.isArray(fromConfig)) return fromConfig.join(',');
    if (typeof fromConfig === 'string') return fromConfig;
    return request.nextUrl.searchParams.get(queryKey);
  };

  const posterRatings = getRatings('posterRatingPreferences', 'posterRatings') ?? globalRatings;
  const posterAverageRatingsEnabledRaw = tokenConfig.posterAverageRatingsEnabled ?? request.nextUrl.searchParams.get('posterAverageRatingsEnabled');
  const posterAverageRatingsEnabled = posterAverageRatingsEnabledRaw === true || posterAverageRatingsEnabledRaw === 'true' || posterAverageRatingsEnabledRaw === 'on';
  const posterRatingsMode =
    tokenConfig.posterRatingsMode || request.nextUrl.searchParams.get('posterRatingsMode') || (posterAverageRatingsEnabled ? 'average' : null);
  const posterVignetteEnabledRaw = tokenConfig.posterVignette ?? request.nextUrl.searchParams.get('posterVignette');
  const posterVignetteEnabled = posterVignetteEnabledRaw === false || posterVignetteEnabledRaw === 'false' || posterVignetteEnabledRaw === 'off' ? false : true;
  const posterGenrePosition = normalizePosterGenrePosition(tokenConfig.posterGenrePosition || request.nextUrl.searchParams.get('posterGenrePosition'));
  // Removed duplicate posterConfiguratorPreset declaration
  const backdropRatings = getRatings('backdropRatingPreferences', 'backdropRatings') ?? globalRatings;
  const thumbnailRatings =
    getRatings('thumbnailRatingPreferences', 'thumbnailRatings') ??
    getRatings('backdropRatingPreferences', 'backdropRatings') ??
    globalRatings;
  const logoRatings = getRatings('logoRatingPreferences', 'logoRatings') ?? globalRatings;

  const imageTextParam =
    tokenConfig.posterImageText ||
    request.nextUrl.searchParams.get('imageText') ||
    request.nextUrl.searchParams.get('posterText');
  const posterAnimeImageTextParam =
    tokenConfig.posterAnimeImageText ||
    request.nextUrl.searchParams.get('posterAnimeImageText');
  const backdropAnimeImageTextParam =
    tokenConfig.backdropAnimeImageText ||
    request.nextUrl.searchParams.get('backdropAnimeImageText');
  const backdropImageTextParam =
    tokenConfig.backdropImageText ||
    request.nextUrl.searchParams.get('backdropText') ||
    request.nextUrl.searchParams.get('imageText');

  const imageText = type === 'backdrop' || type === 'thumbnail'
    ? (backdropImageTextParam || 'clean')
    : (imageTextParam || 'default');

  const posterRatingsLayout = normalizePosterRatingLayout(tokenConfig.posterRatingsLayout || request.nextUrl.searchParams.get('posterRatingsLayout'));
  const posterRatingsMaxPerSide = normalizePosterRatingsMaxPerSide(tokenConfig.posterRatingsMaxPerSide ?? request.nextUrl.searchParams.get('posterRatingsMaxPerSide'));
  const logoRatingsMax = normalizeLogoRatingsMax(tokenConfig.logoRatingsMax ?? request.nextUrl.searchParams.get('logoRatingsMax'));
  const backdropRatingsMax = normalizeBackdropRatingsMax(tokenConfig.backdropRatingsMax ?? request.nextUrl.searchParams.get('backdropRatingsMax'));
  const logoMode = normalizeLogoMode(tokenConfig.logoMode || request.nextUrl.searchParams.get('logoMode'));
  const logoFontVariant = normalizeLogoFontVariant(tokenConfig.logoFontVariant || request.nextUrl.searchParams.get('logoFontVariant'));

  const logoPrimary = normalizeHexColor(
    tokenConfig.logoCustomPrimary || request.nextUrl.searchParams.get('logoPrimary'),
    DEFAULT_LOGO_CUSTOM_PRIMARY
  );
  const logoSecondary = normalizeHexColor(
    tokenConfig.logoCustomSecondary || request.nextUrl.searchParams.get('logoSecondary'),
    DEFAULT_LOGO_CUSTOM_SECONDARY
  );
  const logoOutline = normalizeHexColor(
    tokenConfig.logoCustomOutline || request.nextUrl.searchParams.get('logoOutline'),
    DEFAULT_LOGO_CUSTOM_OUTLINE
  );

  const backdropRatingsLayout = normalizeBackdropRatingLayout(tokenConfig.backdropRatingsLayout || request.nextUrl.searchParams.get('backdropRatingsLayout'));
  const thumbnailRatingsLayout = normalizeThumbnailRatingLayout(
    tokenConfig.thumbnailRatingsLayout || request.nextUrl.searchParams.get('thumbnailRatingsLayout')
  );

  const posterVerticalBadgeContent = normalizeVerticalBadgeContent(
    tokenConfig.posterVerticalBadgeContent ||
    tokenConfig.verticalBadgeContent ||
    request.nextUrl.searchParams.get('posterVerticalBadgeContent') ||
    request.nextUrl.searchParams.get('verticalBadgeContent')
  );
  const backdropVerticalBadgeContent = normalizeVerticalBadgeContent(
    tokenConfig.backdropVerticalBadgeContent ||
    tokenConfig.verticalBadgeContent ||
    request.nextUrl.searchParams.get('backdropVerticalBadgeContent') ||
    request.nextUrl.searchParams.get('verticalBadgeContent')
  );
  const thumbnailVerticalBadgeContent = normalizeVerticalBadgeContent(
    tokenConfig.thumbnailVerticalBadgeContent ||
    tokenConfig.backdropVerticalBadgeContent ||
    tokenConfig.verticalBadgeContent ||
    request.nextUrl.searchParams.get('thumbnailVerticalBadgeContent') ||
    request.nextUrl.searchParams.get('backdropVerticalBadgeContent') ||
    request.nextUrl.searchParams.get('verticalBadgeContent')
  );

  const verticalBadgeContent =
    imageType === 'poster'
      ? isVerticalPosterRatingLayout(posterRatingsLayout)
        ? posterVerticalBadgeContent
        : 'standard'
      : imageType === 'thumbnail'
        ? isVerticalThumbnailRatingLayout(thumbnailRatingsLayout)
          ? thumbnailVerticalBadgeContent
          : 'standard'
        : imageType === 'backdrop'
          ? isVerticalBackdropRatingLayout(backdropRatingsLayout)
            ? backdropVerticalBadgeContent
            : 'standard'
          : 'standard';

  const thumbnailSize = normalizeThumbnailSize(tokenConfig.thumbnailSize || request.nextUrl.searchParams.get('thumbnailSize'));
  const backdropRatingsSize = normalizeBackdropRatingsSize(
    tokenConfig.backdropRatingsSize || request.nextUrl.searchParams.get('backdropRatingsSize')
  );

  const globalStreamBadgesSetting = normalizeStreamBadgesSetting(tokenConfig.streamBadges || request.nextUrl.searchParams.get('streamBadges'));
  const posterStreamBadgesSetting = normalizeStreamBadgesSetting(
    tokenConfig.posterStreamBadges || tokenConfig.streamBadges || request.nextUrl.searchParams.get('posterStreamBadges') || request.nextUrl.searchParams.get('streamBadges')
  );
  const backdropStreamBadgesSetting = normalizeStreamBadgesSetting(
    tokenConfig.backdropStreamBadges || tokenConfig.streamBadges || request.nextUrl.searchParams.get('backdropStreamBadges') || request.nextUrl.searchParams.get('streamBadges')
  );

  const streamBadgesSetting =
    imageType === 'poster'
      ? posterStreamBadgesSetting
      : imageType === 'backdrop'
        ? backdropStreamBadgesSetting
        : globalStreamBadgesSetting;

  const qualityBadgesSide = normalizeQualityBadgesSide(
    tokenConfig.qualityBadgesSide ||
    request.nextUrl.searchParams.get('qualityBadgesSide') ||
    request.nextUrl.searchParams.get('qualityBadgesPosition')
  );
  const posterQualityBadgesPosition = normalizePosterQualityBadgesPosition(
    tokenConfig.posterQualityBadgesPosition || request.nextUrl.searchParams.get('posterQualityBadgesPosition')
  );

  const globalQualityBadgesStyle = normalizeQualityBadgesStyle(
    tokenConfig.qualityBadgesStyle || request.nextUrl.searchParams.get('qualityBadgesStyle')
  );
  const posterQualityBadgesStyle = normalizeQualityBadgesStyle(
    tokenConfig.posterQualityBadgesStyle ||
    tokenConfig.qualityBadgesStyle ||
    request.nextUrl.searchParams.get('posterQualityBadgesStyle') ||
    request.nextUrl.searchParams.get('qualityBadgesStyle')
  );
  const backdropQualityBadgesStyle = normalizeQualityBadgesStyle(
    tokenConfig.backdropQualityBadgesStyle ||
    tokenConfig.qualityBadgesStyle ||
    request.nextUrl.searchParams.get('backdropQualityBadgesStyle') ||
    request.nextUrl.searchParams.get('qualityBadgesStyle')
  );

  const globalQualityBadgesColorMode = normalizeQualityBadgesColorMode(
    tokenConfig.qualityBadgesColorMode || request.nextUrl.searchParams.get('qualityBadgesColorMode')
  );
  const posterQualityBadgesColorMode = normalizeQualityBadgesColorMode(
    tokenConfig.posterQualityBadgesColorMode ||
    tokenConfig.qualityBadgesColorMode ||
    request.nextUrl.searchParams.get('posterQualityBadgesColorMode') ||
    request.nextUrl.searchParams.get('qualityBadgesColorMode')
  );
  const backdropQualityBadgesColorMode = normalizeQualityBadgesColorMode(
    tokenConfig.backdropQualityBadgesColorMode ||
    tokenConfig.qualityBadgesColorMode ||
    request.nextUrl.searchParams.get('backdropQualityBadgesColorMode') ||
    request.nextUrl.searchParams.get('qualityBadgesColorMode')
  );

  const qualityBadgesStyle =
    imageType === 'poster'
      ? posterQualityBadgesStyle
      : imageType === 'backdrop'
        ? backdropQualityBadgesStyle
        : globalQualityBadgesStyle;

  const qualityBadgesColorMode =
    imageType === 'poster'
      ? posterQualityBadgesColorMode
      : imageType === 'backdrop'
        ? backdropQualityBadgesColorMode
        : globalQualityBadgesColorMode;

  const globalRatingStyleParam =
    tokenConfig.ratingStyle || request.nextUrl.searchParams.get('ratingStyle') || request.nextUrl.searchParams.get('style');

  const posterRatingStyle = normalizeRatingStyle(
    tokenConfig.posterRatingStyle || globalRatingStyleParam || request.nextUrl.searchParams.get('posterRatingStyle')
  );
  const backdropRatingStyle = normalizeRatingStyle(
    tokenConfig.backdropRatingStyle || globalRatingStyleParam || request.nextUrl.searchParams.get('backdropRatingStyle')
  );
  const thumbnailRatingStyle = normalizeRatingStyle(
    tokenConfig.thumbnailRatingStyle || globalRatingStyleParam || request.nextUrl.searchParams.get('thumbnailRatingStyle')
  );
  const logoRatingStyle = normalizeRatingStyle(
    tokenConfig.logoRatingStyle || globalRatingStyleParam || request.nextUrl.searchParams.get('logoRatingStyle')
  );

  const ratingStyle =
    imageType === 'poster'
      ? posterRatingStyle
      : imageType === 'backdrop'
        ? backdropRatingStyle
        : imageType === 'thumbnail'
          ? thumbnailRatingStyle
          : imageType === 'logo'
            ? logoRatingStyle
            : normalizeRatingStyle(globalRatingStyleParam);

  const globalRatingsColorModeParam =
    tokenConfig.ratingsColorMode || request.nextUrl.searchParams.get('ratingsColorMode') || request.nextUrl.searchParams.get('ratingColorMode');

  const posterRatingsColorMode = normalizeRatingsColorMode(
    tokenConfig.posterRatingsColorMode || globalRatingsColorModeParam || request.nextUrl.searchParams.get('posterRatingsColorMode')
  );
  const backdropRatingsColorMode = normalizeRatingsColorMode(
    tokenConfig.backdropRatingsColorMode || globalRatingsColorModeParam || request.nextUrl.searchParams.get('backdropRatingsColorMode')
  );
  const thumbnailRatingsColorMode = normalizeRatingsColorMode(
    tokenConfig.thumbnailRatingsColorMode || globalRatingsColorModeParam || request.nextUrl.searchParams.get('thumbnailRatingsColorMode')
  );
  const logoRatingsColorMode = normalizeRatingsColorMode(
    tokenConfig.logoRatingsColorMode || globalRatingsColorModeParam || request.nextUrl.searchParams.get('logoRatingsColorMode')
  );

  const ratingsColorMode =
    imageType === 'poster'
      ? posterRatingsColorMode
      : imageType === 'backdrop'
        ? backdropRatingsColorMode
        : imageType === 'thumbnail'
          ? thumbnailRatingsColorMode
          : imageType === 'logo'
            ? logoRatingsColorMode
            : normalizeRatingsColorMode(globalRatingsColorModeParam);

  const mdblistKey = tokenConfig.mdblistKey || request.nextUrl.searchParams.get('mdblistKey') || request.nextUrl.searchParams.get('mdblist_key');
  const tmdbKey = tokenConfig.tmdbKey || request.nextUrl.searchParams.get('tmdbKey') || request.nextUrl.searchParams.get('tmdb_key');
  const simklClientId =
    tokenConfig.simklClientId ||
    request.nextUrl.searchParams.get('simklClientId') ||
    request.nextUrl.searchParams.get('simkl_client_id') ||
    SIMKL_CLIENT_ID;
  const fanartKey =
    tokenConfig.fanartKey ||
    request.nextUrl.searchParams.get('fanartKey') ||
    FANART_API_KEY;

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
  let isTvdb = false;
  let isRealImdb = false;
  let tvdbSeriesId: string | null = null;
  let isKitsu = false;
  let explicitTmdbMediaType: 'movie' | 'tv' | null = null;
  const hasNativeAnimeInput = ANIME_NATIVE_INPUT_ID_PREFIX_SET.has(idPrefix);
  let hasConfirmedAnimeMapping = hasNativeAnimeInput;
  let allowAnimeOnlyRatings = hasNativeAnimeInput;

  if (idPrefix === 'tmdb') {
    isTmdb = true;
    const explicitTypeCandidate = (parts[1] || '').trim().toLowerCase();
    if (explicitTypeCandidate === 'movie' || explicitTypeCandidate === 'tv' || explicitTypeCandidate === 'series') {
      explicitTmdbMediaType = explicitTypeCandidate === 'series' ? 'tv' : (explicitTypeCandidate as 'movie' | 'tv');
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
  } else if (idPrefix === 'tvdb') {
    isTvdb = true;
    mediaId = parts[1];
    tvdbSeriesId = parts[1] || null;
    season = parts.length > 2 ? parts[2] : null;
    episode = parts.length > 3 ? parts[3] : null;
  } else if (idPrefix === 'realimdb') {
    isRealImdb = true;
    mediaId = parts[1];
    season = parts.length > 2 ? parts[2] : null;
    episode = parts.length > 3 ? parts[3] : null;
  } else if (idPrefix === 'kitsu') {
    isKitsu = true;
    const parsedKitsu = parseKitsuInputParts(parts, imageType === 'thumbnail');
    mediaId = parsedKitsu.mediaId;
    season = parsedKitsu.season;
    episode = parsedKitsu.episode;
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

  const activeImageLang =
    imageType === 'poster'
      ? String(posterLang || '').trim().toLowerCase() === 'original'
        ? lang
        : posterLang || lang
      : imageType === 'backdrop'
        ? String(backdropLang || '').trim().toLowerCase() === 'original'
          ? lang
          : backdropLang || lang
        : imageType === 'logo'
          ? String(logoLang || '').trim().toLowerCase() === 'original'
            ? lang
            : logoLang || lang
          : lang;
  const requestedImageLang = normalizeTmdbLanguageCode(activeImageLang) || FALLBACK_IMAGE_LANGUAGE;
  const includeImageLanguage = buildIncludeImageLanguage(
    requestedImageLang,
    FALLBACK_IMAGE_LANGUAGE
  );
  const aiometadataEpisodeProvider = normalizeAiometadataEpisodeProvider(
    request.nextUrl.searchParams.get('aiometadataProvider')
  );
  const normalizedPosterImageText =
    imageText === 'original' ? 'default' : imageText;
  const normalizedPosterAnimeImageText =
    posterAnimeImageTextParam === 'original' ? 'default' : posterAnimeImageTextParam;
  const posterTextPreference: PosterTextPreference =
    normalizedPosterImageText === 'clean' ||
      normalizedPosterImageText === 'alternative' ||
      normalizedPosterImageText === 'default'
      ? normalizedPosterImageText
      : 'default';
  const posterAnimeTextPreference: PosterTextPreference =
    normalizedPosterAnimeImageText === 'clean' ||
      normalizedPosterAnimeImageText === 'alternative' ||
      normalizedPosterAnimeImageText === 'default'
      ? normalizedPosterAnimeImageText
      : 'clean';
  const normalizedBackdropAnimeImageText =
    backdropAnimeImageTextParam === 'original' ? 'default' : backdropAnimeImageTextParam;
  const backdropAnimeTextPreference: PosterTextPreference =
    normalizedBackdropAnimeImageText === 'clean' ||
      normalizedBackdropAnimeImageText === 'alternative' ||
      normalizedBackdropAnimeImageText === 'default'
      ? normalizedBackdropAnimeImageText
      : 'clean';
  const ratingsForType =
    imageType === 'poster'
      ? posterRatings
      : imageType === 'backdrop'
        ? backdropRatings
        : imageType === 'thumbnail'
          ? thumbnailRatings
          : logoRatings;
  const thumbnailSupportedRatings = new Set<RatingPreference>(['tmdb', 'imdb']);
  const requestedRatingPreferences =
    imageType === 'thumbnail'
      ? (ratingsForType === null || ratingsForType === undefined
        ? (['tmdb', 'imdb'] as RatingPreference[])
        : parseRatingPreferencesAllowEmpty(ratingsForType).filter((rating) =>
          thumbnailSupportedRatings.has(rating)
        ))
      : ratingsForType === null || ratingsForType === undefined
        ? [...ALL_RATING_PREFERENCES]
        : parseRatingPreferencesAllowEmpty(ratingsForType);
  const ratingPreferences =
    requestedRatingPreferences;
  const shouldApplyRatings = ratingPreferences.length > 0;
  const shouldApplyStreamBadges =
    imageType !== 'logo' &&
    imageType !== 'thumbnail' &&
    (streamBadgesSetting === 'on' || streamBadgesSetting === 'auto') &&
    !hasNativeAnimeInput;
  const streamBadgesSeedTtlMs = shouldApplyStreamBadges
    ? getDeterministicTtlMs(STREAM_BADGES_CACHE_TTL_MS, cleanId)
    : null;
  const streamBadgesSeedWindow =
    shouldApplyStreamBadges && streamBadgesSeedTtlMs
      ? Math.floor(Date.now() / streamBadgesSeedTtlMs)
      : null;
  const streamBadgesCacheKeySeed = shouldApplyStreamBadges
    ? `streambadges:${streamBadgesSeedWindow ?? 0}`
    : 'off';
  const shouldCacheFinalImage = isObjectStorageConfigured();
  const effectiveRatingPreferences = shouldApplyRatings ? Array.from(new Set<RatingPreference>(ratingPreferences)) : [];
  const selectedRatings = new Set<RatingPreference>(effectiveRatingPreferences);
  const mdblistCacheSeed = buildMdbListCacheSeed(mdblistKey);
  const simklCacheSeed = buildSecretCacheSeed('simkl', simklClientId);
  const buildCacheKey = (extra: string[]) =>
    [
      FINAL_IMAGE_RENDERER_CACHE_VERSION,
      imageType,
      outputFormat,
      cleanId,
      requestedImageLang,
      imageType === 'poster'
        ? `${posterTextPreference}:${posterAnimeTextPreference}`
        : imageType === 'backdrop'
          ? `${posterTextPreference}:${backdropAnimeTextPreference}`
          : posterTextPreference,
      imageType === 'poster' ? posterRatingsLayout : '-',
      imageType === 'poster' ? String(posterRatingsMode || '-') : '-',
      imageType === 'poster' ? posterGenrePosition : '-',
      imageType === 'poster' ? String(posterConfiguratorPreset || '-') : '-',
      imageType === 'poster' ? String(posterRatingsMaxPerSide ?? 'auto') : '-',
      imageType === 'poster' ? String(posterLang || '-') : '-',
      imageType === 'poster' ? String(posterAnimeLang || '-') : '-',
      imageType === 'backdrop' ? String(backdropLang || '-') : '-',
      imageType === 'backdrop' ? String(backdropAnimeLang || '-') : '-',
      imageType === 'logo' ? String(logoLang || '-') : '-',
      imageType === 'logo' ? String(logoAnimeLang || '-') : '-',
      imageType === 'poster' ? String(posterAnimeImageTextParam || '-') : '-',
      imageType === 'backdrop' ? String(backdropAnimeImageTextParam || '-') : '-',
      imageType === 'logo' ? String(logoRatingsMax ?? 'auto') : '-',
      imageType === 'backdrop' ? String(backdropRatingsMax ?? 'auto') : '-',
      imageType === 'logo' ? logoMode : DEFAULT_LOGO_MODE,
      imageType === 'logo' ? logoFontVariant : DEFAULT_LOGO_FONT_VARIANT,
      imageType === 'logo' ? logoPrimary : DEFAULT_LOGO_CUSTOM_PRIMARY,
      imageType === 'logo' ? logoSecondary : DEFAULT_LOGO_CUSTOM_SECONDARY,
      imageType === 'logo' ? logoOutline : DEFAULT_LOGO_CUSTOM_OUTLINE,
      imageType === 'poster' ? qualityBadgesSide : '-',
      imageType === 'poster' && (posterRatingsLayout === 'top' || posterRatingsLayout === 'bottom' || posterRatingsLayout === 'top-bottom')
        ? posterQualityBadgesPosition
        : '-',
      imageType !== 'logo' ? qualityBadgesStyle : '-',
      imageType !== 'logo' ? qualityBadgesColorMode : '-',
      imageType === 'backdrop' ? backdropRatingsLayout : imageType === 'thumbnail' ? thumbnailRatingsLayout : '-',
      imageType === 'backdrop' ? backdropRatingsSize : '-',
      imageType === 'thumbnail' ? thumbnailSize : '-',
      imageType === 'thumbnail' ? aiometadataEpisodeProvider || '-' : '-',
      verticalBadgeContent,
      ratingStyle,
      ratingsColorMode,
      effectiveRatingPreferences.join(',') || 'none',
      mdblistCacheSeed,
      simklCacheSeed,
      ...extra,
    ].join('|');
  const dedupeKey = buildCacheKey([fanartKey ? 'fanart' : 'no-fanart', tokenUpdatedAt.toString()]);
  const objectStorageEnabled = isObjectStorageConfigured();

  if (!tmdbKey) {
    return respond('TMDB API Key (tmdbKey) is required', 400);
  }

  const hadSharedRender = shouldCacheFinalImage && finalImageInFlight.has(dedupeKey);
  let objectStorageHit = false;

  try {
    let renderedImage = await withDedupe(finalImageInFlight, dedupeKey, async () => {
      let media = null;
      let mediaType: 'movie' | 'tv' | null = null;
      let useRawAnimeImageFallback = false;
      let rawFallbackImageUrl: string | null = null;
      let rawFallbackAnimeRating: string | null = null;
      let rawFallbackAnimeRatingProvider: RatingPreference | null = null;
      let rawFallbackTitle: string | null = null;
      let rawFallbackLogoAspectRatio: number | null = null;
      let mappedImdbId: string | null = null;

      const applyAnimeCdnFallback = (
        asset: {
          imageUrl: string | null;
          rating: string | null;
          title: string | null;
          logoAspectRatio: number | null;
        } | null | undefined,
        ratingProvider: RatingPreference
      ): boolean => {
        if (!asset?.imageUrl) return false;
        rawFallbackImageUrl = asset.imageUrl;
        rawFallbackAnimeRating = asset.rating ?? null;
        rawFallbackTitle = asset.title ?? null;
        rawFallbackLogoAspectRatio = asset.logoAspectRatio ?? null;
        rawFallbackAnimeRatingProvider = ratingProvider;
        useRawAnimeImageFallback = true;
        allowAnimeOnlyRatings = false;
        hasConfirmedAnimeMapping = false;
        return true;
      };

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
      } else if (isTvdb) {
        if (!mediaId) {
          throw new HttpError('TVDB series ID is required', 400);
        }

        if (season && episode) {
          const mappedEpisode = await resolveTvdbEpisodeToTmdb(mediaId, season, episode, tmdbKey, phases);
          if (!mappedEpisode?.showId) {
            throw new HttpError('TVDB aired-order episode not found on TMDB', 404);
          }
          mediaId = mappedEpisode.showId;
          season = mappedEpisode.season;
          episode = mappedEpisode.episode;
        }

        const tvFindResponse = await fetchJsonCached(
          `tmdb:find:tvdb-series:${tvdbSeriesId}`,
          `https://api.themoviedb.org/3/find/${tvdbSeriesId}?api_key=${tmdbKey}&external_source=tvdb_id`,
          TMDB_CACHE_TTL_MS,
          phases,
          'tmdb'
        );
        const tvFindData = tvFindResponse.data || {};
        const tvResult = tvFindData.tv_results?.[0] || null;
        if (tvResult) {
          media = tvResult;
          mediaType = 'tv';
        }
      } else if (isRealImdb) {
        if (!mediaId) {
          throw new HttpError('IMDb ID is required', 400);
        }

        const imdbEpisode =
          season && episode
            ? findImdbEpisodeBySeriesSeasonEpisode(mediaId, Number(season), Number(episode))
            : getImdbEpisodeFromDataset(mediaId);
        const imdbLookupId = imdbEpisode?.imdbId || mediaId;

        const findResponse = await fetchJsonCached(
          `tmdb:find:realimdb:${imdbLookupId}`,
          `https://api.themoviedb.org/3/find/${imdbLookupId}?api_key=${tmdbKey}&external_source=imdb_id`,
          TMDB_CACHE_TTL_MS,
          phases,
          'tmdb'
        );
        const findData = findResponse.data || {};
        const episodeResult = findData.tv_episode_results?.[0] || null;
        if (episodeResult?.show_id) {
          mediaId = String(episodeResult.show_id);
          season = Number.isFinite(Number(episodeResult.season_number)) ? String(episodeResult.season_number) : season;
          episode = Number.isFinite(Number(episodeResult.episode_number)) ? String(episodeResult.episode_number) : episode;
          mappedImdbId = imdbEpisode?.seriesImdbId || mediaId;

          const showResponse = await fetchJsonCached(
            `tmdb:tv:${mediaId}`,
            `https://api.themoviedb.org/3/tv/${mediaId}?api_key=${tmdbKey}`,
            TMDB_CACHE_TTL_MS,
            phases,
            'tmdb'
          );
          if (showResponse.ok) {
            media = showResponse.data;
            mediaType = 'tv';
          }
        } else {
          const tvResult = findData.tv_results?.[0] || null;
          if (tvResult) {
            media = tvResult;
            mediaType = 'tv';
            if (season && episode) {
              const yearBucketMapping = await resolveTmdbEpisodeByYearBucket(
                String(tvResult.id),
                season,
                episode,
                tmdbKey,
                phases
              );
              if (yearBucketMapping) {
                mediaId = yearBucketMapping.showId;
                season = yearBucketMapping.season;
                episode = yearBucketMapping.episode;
              }
            }
          }
        }
      } else if (isKitsu) {
        let mappingUrl = `https://animemapping.realbestia.com/kitsu/${mediaId}`;
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
            `https://animemapping.realbestia.com/kitsu/${mediaId}?ep=1`,
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
          const kitsuFallbackAsset = await fetchKitsuFallbackAsset(mediaId, imageType, logoMode, logoFontVariant, logoPrimary, logoSecondary, logoOutline, phases);
          if (!applyAnimeCdnFallback(kitsuFallbackAsset, 'kitsu')) {
            throw new HttpError('TMDB ID not found for Kitsu ID', 404);
          }
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
            const kitsuFallbackAsset = await fetchKitsuFallbackAsset(mediaId, imageType, logoMode, logoFontVariant, logoPrimary, logoSecondary, logoOutline, phases);
            if (!applyAnimeCdnFallback(kitsuFallbackAsset, 'kitsu')) {
              throw new HttpError('Movie/Show not found on TMDB', 404);
            }
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
          let usedNoTmdbFallback = false;
          const kitsuIdNoTmdb = await fetchKitsuIdFromReverseMapping({
            provider: inputAnimeMappingProvider,
            externalId: inputAnimeMappingExternalId,
            season,
            phases,
          });
          if (kitsuIdNoTmdb) {
            const kitsuFallbackAsset = await fetchKitsuFallbackAsset(
              kitsuIdNoTmdb,
              imageType,
              logoMode,
              logoFontVariant,
              logoPrimary,
              logoSecondary,
              logoOutline,
              phases
            );
            usedNoTmdbFallback = applyAnimeCdnFallback(kitsuFallbackAsset, 'kitsu');
          }
          if (!usedNoTmdbFallback) {
            const directFallback = await fetchNativeAnimeDirectFallbackAsset({
              provider: inputAnimeMappingProvider,
              externalId: inputAnimeMappingExternalId,
              imageType,
              logoMode,
              logoFontVariant,
              logoPrimary,
              logoSecondary,
              logoOutline,
              phases,
            });
            if (
              directFallback &&
              applyAnimeCdnFallback(
                {
                  imageUrl: directFallback.imageUrl,
                  rating: directFallback.rating,
                  title: directFallback.title,
                  logoAspectRatio: directFallback.logoAspectRatio,
                },
                directFallback.ratingProvider
              )
            ) {
              usedNoTmdbFallback = true;
            }
          }
          if (!usedNoTmdbFallback) {
            throw new HttpError('TMDB ID not found for anime mapping ID', 404);
          }
        } else {
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

          // Align MAL / AniList / AniDB with Kitsu: season-level native IDs should resolve to a
          // TMDB season for posters. Kitsu does this via animemapping ?ep=1 when season is absent.
          if (media && mediaType === 'tv' && !season) {
            const initialAnimeMappingPayload = await fetchAnimemappingPayload({
              provider: inputAnimeMappingProvider,
              externalId: inputAnimeMappingExternalId,
              season,
              episode,
              phases,
            });
            const mappingSubtype = extractAnimeSubtypeFromAnimemapping(initialAnimeMappingPayload);
            if (mappingSubtype !== 'movie') {
              const seasonProbePayload = await fetchAnimemappingPayload({
                provider: inputAnimeMappingProvider,
                externalId: inputAnimeMappingExternalId,
                season,
                episode: '1',
                phases,
              });
              const seasonProbeEpisode =
                seasonProbePayload?.mappings?.tmdb_episode || seasonProbePayload?.tmdb_episode;
              if (seasonProbeEpisode?.season != null && String(seasonProbeEpisode.season).length > 0) {
                season = String(seasonProbeEpisode.season);
              }
            }
          }

          if (!media) {
            let usedTmdbFailFallback = false;
            const kitsuIdAfterTmdbFail = await fetchKitsuIdFromReverseMapping({
              provider: inputAnimeMappingProvider,
              externalId: inputAnimeMappingExternalId,
              season,
              phases,
            });
            if (kitsuIdAfterTmdbFail) {
              const kitsuFallbackAsset = await fetchKitsuFallbackAsset(
                kitsuIdAfterTmdbFail,
                imageType,
                logoMode,
                logoFontVariant,
                logoPrimary,
                logoSecondary,
                logoOutline,
                phases
              );
              usedTmdbFailFallback = applyAnimeCdnFallback(kitsuFallbackAsset, 'kitsu');
            }
            if (!usedTmdbFailFallback) {
              const directFallback = await fetchNativeAnimeDirectFallbackAsset({
                provider: inputAnimeMappingProvider,
                externalId: inputAnimeMappingExternalId,
                imageType,
                logoMode,
                logoFontVariant,
                logoPrimary,
                logoSecondary,
                logoOutline,
                phases,
              });
              if (
                directFallback &&
                applyAnimeCdnFallback(
                  {
                    imageUrl: directFallback.imageUrl,
                    rating: directFallback.rating,
                    title: directFallback.title,
                    logoAspectRatio: directFallback.logoAspectRatio,
                  },
                  directFallback.ratingProvider
                )
              ) {
                usedTmdbFailFallback = true;
              }
            }
          }
        }
      } else {
        // Aiometadata can emit IMDb series IDs paired with TVDB season/episode numbering.
        // In that mode, bridge IMDb -> TMDB -> TVDB aired order before rendering thumbnails.
        if (isImdbId(mediaId)) {
          const rawImdbSeriesId = mediaId;
          const shouldResolveTvdbAiredOrder =
            imageType === 'thumbnail' &&
            aiometadataEpisodeProvider === 'tvdb' &&
            typeof season === 'string' &&
            season.length > 0 &&
            typeof episode === 'string' &&
            episode.length > 0;

          if (shouldResolveTvdbAiredOrder) {
            if (typeof season !== 'string' || typeof episode !== 'string') {
              throw new HttpError('TVDB season and episode are required for Aiometadata TVDB thumbnails', 400);
            }
            const requestedTvdbSeason = season;
            const requestedTvdbEpisode = episode;
            const mappedEpisode = await resolveImdbEpisodeWithTvdbOrderToTmdb(
              rawImdbSeriesId,
              requestedTvdbSeason,
              requestedTvdbEpisode,
              tmdbKey,
              phases
            );
            if (mappedEpisode?.showId) {
              mediaId = mappedEpisode.showId;
              season = mappedEpisode.season;
              episode = mappedEpisode.episode;
              tvdbSeriesId = mappedEpisode.tvdbSeriesId;
              mappedImdbId = rawImdbSeriesId;

              const showResponse = await fetchJsonCached(
                `tmdb:tv:${mediaId}`,
                `https://api.themoviedb.org/3/tv/${mediaId}?api_key=${tmdbKey}`,
                TMDB_CACHE_TTL_MS,
                phases,
                'tmdb'
              );
              if (showResponse.ok) {
                media = showResponse.data;
                mediaType = 'tv';
              }
            }
          }

          // 1. Dataset Check (Local)
          const prefersTvResult =
            imageType === 'thumbnail' ||
            (typeof season === 'string' && season.length > 0) ||
            (typeof episode === 'string' && episode.length > 0) ||
            isImdbSeriesFromDataset(rawImdbSeriesId);

          // 2. MDBList Resolution (Remote)
          if (!media && mdblistKey) {
            const mdbListRes = await fetchJsonCached(
              `mdblist:resolve:${rawImdbSeriesId}`,
              `https://mdblist.com/api/?apikey=${encodeURIComponent(mdblistKey)}&i=${encodeURIComponent(rawImdbSeriesId)}`,
              TMDB_CACHE_TTL_MS,
              phases,
              'tmdb'
            );
            if (mdbListRes.ok && mdbListRes.data?.tmdbid) {
              const mdbResolvedType: 'movie' | 'tv' = mdbListRes.data.type === 'movie' ? 'movie' : 'tv';
              const mdbTmdbId = String(mdbListRes.data.tmdbid);
              const mdbMediaRes = await fetchJsonCached(
                `tmdb:${mdbResolvedType}:${mdbTmdbId}`,
                `https://api.themoviedb.org/3/${mdbResolvedType}/${mdbTmdbId}?api_key=${tmdbKey}`,
                TMDB_CACHE_TTL_MS,
                phases,
                'tmdb'
              );
              if (mdbMediaRes.ok) {
                media = mdbMediaRes.data;
                mediaType = mdbResolvedType;
              }
            }
          }

          // 3. TMDB Find (Fallback with smart heuristics)
          if (!media) {
            const findResponse = await fetchJsonCached(
              `tmdb:find:${rawImdbSeriesId}`,
              `https://api.themoviedb.org/3/find/${rawImdbSeriesId}?api_key=${tmdbKey}&external_source=imdb_id`,
              TMDB_CACHE_TTL_MS,
              phases,
              'tmdb'
            );
            const findData = findResponse.data || {};
            const episodeResult = findData.tv_episode_results?.[0] || null;

            if (episodeResult?.show_id) {
              mediaId = String(episodeResult.show_id);
              season = Number.isFinite(Number(episodeResult.season_number)) ? String(episodeResult.season_number) : season;
              episode = Number.isFinite(Number(episodeResult.episode_number)) ? String(episodeResult.episode_number) : episode;

              const showResponse = await fetchJsonCached(
                `tmdb:tv:${mediaId}`,
                `https://api.themoviedb.org/3/tv/${mediaId}?api_key=${tmdbKey}`,
                TMDB_CACHE_TTL_MS,
                phases,
                'tmdb'
              );
              if (showResponse.ok) {
                media = showResponse.data;
                mediaType = 'tv';
              }
            }

            if (!media) {
              const movieCandidate = findData.movie_results?.[0] || null;
              const tvCandidate = findData.tv_results?.[0] || null;

              if (prefersTvResult) {
                media = tvCandidate || movieCandidate;
              } else {
                if (
                  movieCandidate &&
                  !movieCandidate.poster_path &&
                  !movieCandidate.backdrop_path &&
                  tvCandidate &&
                  (tvCandidate.poster_path || tvCandidate.backdrop_path)
                ) {
                  media = tvCandidate;
                } else {
                  media = movieCandidate || tvCandidate;
                }
              }

              mediaType = media
                ? tvCandidate && media === tvCandidate
                  ? 'tv'
                  : 'movie'
                : null;
            }
          }
        }
      }

      if (!media && !useRawAnimeImageFallback) {
        throw new HttpError('Movie/Show not found on TMDB', 404);
      }

      const mediaLooksAnimated = media ? isTmdbAnimationTitle(media) : false;
      if (!hasNativeAnimeInput) {
        allowAnimeOnlyRatings = hasConfirmedAnimeMapping && mediaLooksAnimated;
      }
      const isAnimeContent = hasNativeAnimeInput || hasConfirmedAnimeMapping;
      const isGenericCatalogId = isTmdb || isTvdb || isRealImdb || idPrefix === 'imdb' || idPrefix.startsWith('tt');
      const shouldApplyAnimeTextPreference = isAnimeContent && !isGenericCatalogId;

      const effectivePosterTextPreference =
        type === 'poster' && shouldApplyAnimeTextPreference ? posterAnimeTextPreference : posterTextPreference;
      const effectiveBackdropTextPreference =
        type === 'backdrop' && shouldApplyAnimeTextPreference ? backdropAnimeTextPreference : (imageText as PosterTextPreference);
      const activePosterLanguageSetting =
        imageType === 'poster'
          ? isAnimeContent && posterAnimeLang
            ? posterAnimeLang
            : posterLang
          : null;
      const activeBackdropLanguageSetting =
        imageType === 'backdrop'
          ? isAnimeContent && backdropAnimeLang
            ? backdropAnimeLang
            : backdropLang
          : null;
      const activeLogoLanguageSetting =
        imageType === 'logo'
          ? isAnimeContent && logoAnimeLang
            ? logoAnimeLang
            : logoLang
          : null;
      const isEffectiveOriginalPosterLang =
        imageType === 'poster' && isOriginalLanguageSetting(activePosterLanguageSetting);
      const isEffectiveOriginalBackdropLang =
        imageType === 'backdrop' && isOriginalLanguageSetting(activeBackdropLanguageSetting);
      const isEffectiveOriginalLogoLang =
        imageType === 'logo' && isOriginalLanguageSetting(activeLogoLanguageSetting);
      const effectivePosterRequestedImageLang = resolveRequestedImageLanguage({
        configuredLanguage: activePosterLanguageSetting,
        requestLanguage: lang,
        fallbackLanguage: FALLBACK_IMAGE_LANGUAGE,
      });
      const effectiveBackdropRequestedImageLang = resolveRequestedImageLanguage({
        configuredLanguage: activeBackdropLanguageSetting,
        requestLanguage: lang,
        fallbackLanguage: FALLBACK_IMAGE_LANGUAGE,
      });
      const effectiveLogoRequestedImageLang = resolveRequestedImageLanguage({
        configuredLanguage: activeLogoLanguageSetting,
        requestLanguage: lang,
        fallbackLanguage: FALLBACK_IMAGE_LANGUAGE,
      });
      const effectivePosterFallbackImageLang =
        normalizeTmdbLanguageCode(lang) || FALLBACK_IMAGE_LANGUAGE;
      const requestedImageLanguageFallbacks = getTmdbLanguageFallbackChain(
        requestedImageLang,
        FALLBACK_IMAGE_LANGUAGE
      );
      const mediaOriginalLanguage =
        typeof media?.original_language === 'string' && media.original_language.trim().length > 0
          ? media.original_language.trim()
          : null;
      const resolvedIncludeImageLanguage = buildIncludeImageLanguage(
        resolveOriginalAwareImageLanguage({
          configuredLanguage:
            imageType === 'poster'
              ? activePosterLanguageSetting
              : imageType === 'backdrop'
                ? activeBackdropLanguageSetting
                : imageType === 'logo'
                  ? activeLogoLanguageSetting
                  : null,
          requestLanguage: requestedImageLang,
          mediaOriginalLanguage,
          fallbackLanguage: FALLBACK_IMAGE_LANGUAGE,
        }),
        FALLBACK_IMAGE_LANGUAGE
      );

      let imgPath = '';
      let imgUrl: string | null = rawFallbackImageUrl;
      let tmdbRating = 'N/A';
      let episodeTmdbRating: string | null = null;
      let thumbnailFallbackEpisodeText: string | null = null;
      let thumbnailFallbackEpisodeCode: string | null = null;
      let usedThumbnailBackdropFallback = false;
      let resolvedTmdbEpisodeNumber: string | null = null;
      let providerRatings = new Map<RatingPreference, string>();
      const renderedRatingTtlByProvider = new Map<BadgeKey, number>();
      let outputWidth = 1280;
      let outputHeight = 720;
      let selectedLogoAspectRatio: number | null = null;
      let selectedPosterLogoPath: string | null = null;
      let selectedPosterIsTextless = false;
      const shouldUsePosterOriginalLanguageForLogo =
        imageType === 'poster' &&
        isEffectiveOriginalPosterLang &&
        effectivePosterTextPreference === 'clean';
      const requestedExternalRatings = new Set([...selectedRatings]);
      const needsAnimeOnlyRatings = [...requestedExternalRatings].some((provider) =>
        ANIME_ONLY_RATING_PROVIDER_SET.has(provider)
      );
      const shouldAttemptAnimeMapping = hasNativeAnimeInput || mediaLooksAnimated;
      const needsExternalRatings = [...requestedExternalRatings].some((provider) => provider !== 'tmdb');
      const needsImdbRating = requestedExternalRatings.has('imdb');
      const needsFilmwebRating = requestedExternalRatings.has('filmweb');
      const needsFilmwebCriticsRating = requestedExternalRatings.has('filmwebcritics');
      const needsKitsuRating = requestedExternalRatings.has('kitsu');
      const hasMdbListApiKey = MDBLIST_API_KEYS.length > 0;
      // applyAnimeCdnFallback assigns these; CFA does not see nested-function writes.
      const rawAnimeRatingForBadges = rawFallbackAnimeRating as string | null;
      const rawAnimeProviderForBadges = rawFallbackAnimeRatingProvider as RatingPreference | null;
      const shouldRenderRawAnimeFallbackRating =
        useRawAnimeImageFallback &&
        typeof rawAnimeRatingForBadges === 'string' &&
        rawAnimeRatingForBadges.length > 0 &&
        rawAnimeProviderForBadges != null &&
        requestedExternalRatings.has(rawAnimeProviderForBadges);
      const shouldRenderRatings = shouldApplyRatings && (!useRawAnimeImageFallback || shouldRenderRawAnimeFallbackRating);
      const shouldRenderStreamBadges = shouldApplyStreamBadges && !isAnimeContent;
      const shouldRenderPosterGenre = imageType === 'poster' && posterGenrePosition !== 'off';
      const shouldRenderBadges = shouldRenderRatings || shouldRenderStreamBadges || shouldRenderPosterGenre;
      const rawFallbackImageUrlForThumb = rawFallbackImageUrl as string | null;
      const hasRawAnimeThumbnailImage =
        useRawAnimeImageFallback &&
        typeof rawFallbackImageUrlForThumb === 'string' &&
        rawFallbackImageUrlForThumb.length > 0;
      if (
        imageType === 'thumbnail' &&
        (mediaType !== 'tv' || !season || !episode) &&
        !hasRawAnimeThumbnailImage
      ) {
        throw new HttpError('Thumbnails are only available for TV episodes', 404);
      }
      const releaseDateForCache =
        mediaType === 'movie' ? media?.release_date : mediaType === 'tv' ? media?.first_air_date : null;
      const tmdbIdForCache =
        media?.id != null
          ? String(media.id)
          : isTmdb && mediaId
            ? String(mediaId)
            : null;
      let streamBadgesIdForCache: string | null = isImdbId(mediaId) ? mediaId : null;
      if (!streamBadgesIdForCache) {
        streamBadgesIdForCache = media?.imdb_id || mappedImdbId || null;
      }
      if (!streamBadgesIdForCache && tmdbIdForCache) {
        streamBadgesIdForCache = `tmdb:${tmdbIdForCache}`;
      }
      if (mediaType === 'tv' && streamBadgesIdForCache) {
        const streamSeason = season || '1';
        const streamEpisode = episode || '1';
        streamBadgesIdForCache = `${streamBadgesIdForCache}:${streamSeason}:${streamEpisode}`;
      }
      const seasonDetailsPromise =
        !useRawAnimeImageFallback && imageType === 'thumbnail' && mediaType === 'tv' && season && episode
          ? (async () => {
            const seasonCacheKeyBase = `tmdb:tv:${media.id}:season:${season}`;
            const primaryResponse = await fetchJsonCached(
              `${seasonCacheKeyBase}:${requestedImageLang}`,
              `https://api.themoviedb.org/3/tv/${media.id}/season/${season}?api_key=${tmdbKey}&language=${requestedImageLang}`,
              TMDB_CACHE_TTL_MS,
              phases,
              'tmdb'
            );
            if (primaryResponse.ok && primaryResponse.data) {
              return primaryResponse.data;
            }
            if (requestedImageLang !== FALLBACK_IMAGE_LANGUAGE) {
              const fallbackResponse = await fetchJsonCached(
                `${seasonCacheKeyBase}:${FALLBACK_IMAGE_LANGUAGE}`,
                `https://api.themoviedb.org/3/tv/${media.id}/season/${season}?api_key=${tmdbKey}&language=${FALLBACK_IMAGE_LANGUAGE}`,
                TMDB_CACHE_TTL_MS,
                phases,
                'tmdb'
              );
              if (fallbackResponse.ok && fallbackResponse.data) {
                return fallbackResponse.data;
              }
            }
            return null;
          })()
          : null;
      if (seasonDetailsPromise) {
        const seasonDetails = await seasonDetailsPromise;
        const requestedEpisodeIndex = Number(episode);
        const seasonEpisodes = Array.isArray(seasonDetails?.episodes) ? seasonDetails.episodes : [];
        if (Number.isFinite(requestedEpisodeIndex) && requestedEpisodeIndex > 0) {
          const seasonEpisode = seasonEpisodes[requestedEpisodeIndex - 1];
          const mappedEpisodeNumber =
            typeof seasonEpisode?.episode_number === 'number' || typeof seasonEpisode?.episode_number === 'string'
              ? String(seasonEpisode.episode_number).trim()
              : '';
          if (mappedEpisodeNumber) {
            resolvedTmdbEpisodeNumber = mappedEpisodeNumber;
          }
        }
      }
      const streamBadgesWindowTtlMs = shouldRenderStreamBadges
        ? mediaType && streamBadgesIdForCache
          ? getRatingCacheTtlMs({
            id: streamBadgesIdForCache,
            mediaType: mediaType as 'movie' | 'tv',
            releaseDate: releaseDateForCache,
            defaultTtlMs: STREAM_BADGES_CACHE_TTL_MS,
            oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
          })
          : getDeterministicTtlMs(STREAM_BADGES_CACHE_TTL_MS, cleanId)
        : null;
      const streamBadgesCacheWindow =
        shouldRenderStreamBadges && streamBadgesWindowTtlMs
          ? Math.floor(Date.now() / streamBadgesWindowTtlMs)
          : null;
      const streamBadgesCacheKey = shouldRenderStreamBadges
        ? `streambadges:${streamBadgesCacheWindow ?? 0}`
        : 'off';
      const finalImageCacheKey = buildCacheKey([
        streamBadgesCacheKey,
        rankingParam,
        rankingCountry,
        rankingNoBox ? 'nobox' : 'box',
        rankingCompact ? 'compact' : 'full',
        rankingPosition,
        posterVignetteEnabled ? 'vignette' : 'no-vignette',
        fanartKey ? 'fanart' : 'no-fanart',
        'v1',
      ]);
      const finalCacheHash = sha1Hex(finalImageCacheKey);
      const finalObjectStorageKey = buildObjectStorageImageKey(
        imageType,
        finalCacheHash,
        outputFormatToExtension(outputFormat)
      );
      if (shouldCacheFinalImage && objectStorageEnabled) {
        const cachedFinalImage = await getCachedImageFromObjectStorage(finalObjectStorageKey);
        if (cachedFinalImage) {
          objectStorageHit = true;
          return {
            body: cachedFinalImage.body,
            contentType: cachedFinalImage.contentType,
            cacheControl: cachedFinalImage.cacheControl,
          };

        }
      }
      const detailsBundlePromise = !useRawAnimeImageFallback
        ? (async () => {
          const buildDetailsUrl = (language: string) => {
            const url = new URL(`https://api.themoviedb.org/3/${mediaType}/${media.id}`);
            url.searchParams.set('api_key', tmdbKey);
            url.searchParams.set('language', language);
            url.searchParams.set('append_to_response', 'images,external_ids,translations');
            if (resolvedIncludeImageLanguage) {
              url.searchParams.set('include_image_language', resolvedIncludeImageLanguage);
            }
            return url.toString();
          };
          const [primaryLanguage, ...fallbackLanguages] = requestedImageLanguageFallbacks;
          const primaryResponse = await fetchJsonCached(
            `tmdb:${mediaType}:${media.id}:details:${primaryLanguage}:bundle:${resolvedIncludeImageLanguage}`,
            buildDetailsUrl(primaryLanguage),
            TMDB_CACHE_TTL_MS,
            phases,
            'tmdb'
          );
          const fallbackResponses = await Promise.all(
            fallbackLanguages.map((language) =>
              fetchJsonCached(
                `tmdb:${mediaType}:${media.id}:details:${language}:bundle:${resolvedIncludeImageLanguage}`,
                buildDetailsUrl(language),
                TMDB_CACHE_TTL_MS,
                phases,
                'tmdb'
              )
            )
          );

          const details = primaryResponse.data || {};
          const fallbackDetails =
            fallbackResponses.find((response) => response.ok && response.data)?.data || {};

          return {
            details,
            fallbackDetails,
            bundledImages: details.images || {},
            bundledExternalIds: details.external_ids || {},
            tmdbRating: details.vote_average ? normalizeRatingValue(details.vote_average) || 'N/A' : 'N/A',
          };
        })()
        : null;
      const episodeDetailsPromise =
        !useRawAnimeImageFallback && imageType === 'thumbnail' && mediaType === 'tv' && season && episode
          ? (async () => {
            const tmdbEpisodeLookupNumber = resolvedTmdbEpisodeNumber || episode;
            const episodeCacheKeyBase = `tmdb:tv:${media.id}:season:${season}:episode:${tmdbEpisodeLookupNumber}`;
            const primaryResponse = await fetchJsonCached(
              `${episodeCacheKeyBase}:${requestedImageLang}`,
              `https://api.themoviedb.org/3/tv/${media.id}/season/${season}/episode/${tmdbEpisodeLookupNumber}?api_key=${tmdbKey}&language=${requestedImageLang}`,
              TMDB_CACHE_TTL_MS,
              phases,
              'tmdb'
            );
            if (primaryResponse.ok && primaryResponse.data) {
              return primaryResponse.data;
            }
            if (requestedImageLang !== FALLBACK_IMAGE_LANGUAGE) {
              const fallbackResponse = await fetchJsonCached(
                `${episodeCacheKeyBase}:${FALLBACK_IMAGE_LANGUAGE}`,
                `https://api.themoviedb.org/3/tv/${media.id}/season/${season}/episode/${tmdbEpisodeLookupNumber}?api_key=${tmdbKey}&language=${FALLBACK_IMAGE_LANGUAGE}`,
                TMDB_CACHE_TTL_MS,
                phases,
                'tmdb'
              );
              if (fallbackResponse.ok && fallbackResponse.data) {
                return fallbackResponse.data;
              }
            }
            return null;
          })()
          : null;
      const episodeExternalIdsPromise =
        !useRawAnimeImageFallback && imageType === 'thumbnail' && mediaType === 'tv' && season && episode
          ? (async () => {
            const tmdbEpisodeLookupNumber = resolvedTmdbEpisodeNumber || episode;
            const response = await fetchJsonCached(
              `tmdb:tv:${media.id}:season:${season}:episode:${tmdbEpisodeLookupNumber}:external_ids`,
              `https://api.themoviedb.org/3/tv/${media.id}/season/${season}/episode/${tmdbEpisodeLookupNumber}/external_ids?api_key=${tmdbKey}`,
              TMDB_CACHE_TTL_MS,
              phases,
              'tmdb'
            );
            return response.ok && response.data ? response.data : null;
          })()
          : null;
      const rankingPromise = (async () => {
        const interval = normalizeRankingInterval(rankingParam);
        if (!interval || !media?.id) return null;

        let imdbIdForRanking = mappedImdbId || (media as any)?.imdb_id;
        if (!imdbIdForRanking && detailsBundlePromise) {
          const bundle = await detailsBundlePromise;
          imdbIdForRanking = bundle?.bundledExternalIds?.imdb_id;
        }

        return fetchRanking(
          media?.id ? String(media.id) : null,
          imdbIdForRanking,
          mediaType as 'movie' | 'tv',
          interval,
          rankingCountry,
          language,
          phases
        );
      })();

      const needsAnilistRating = requestedExternalRatings.has('anilist');
      const needsMalRating = requestedExternalRatings.has('myanimelist');
      const providerRatingsPromise =
        shouldRenderRatings &&
          !useRawAnimeImageFallback &&
          needsExternalRatings &&
          (mdblistKey ||
            hasMdbListApiKey ||
            needsFilmwebRating ||
            needsFilmwebCriticsRating ||
            needsKitsuRating ||
            needsImdbRating ||
            needsAnimeOnlyRatings)
          ? (async () => {
            let imdbId: string | null = null;
            let episodeImdbId: string | null = null;
            let filmwebId: string | null = null;
            let kitsuId: string | null = isKitsu ? mediaId : null;
            let anilistId: string | null = idPrefix === 'anilist' ? mediaId : null;
            let malId: string | null = idPrefix === 'mal' ? mediaId : null;
            if (kitsuId) {
              hasConfirmedAnimeMapping = true;
              allowAnimeOnlyRatings = hasNativeAnimeInput || mediaLooksAnimated;
            }

            if (episodeExternalIdsPromise) {
              const episodeExternalIds = await episodeExternalIdsPromise;
              if (typeof episodeExternalIds?.imdb_id === 'string' && isImdbId(episodeExternalIds.imdb_id)) {
                episodeImdbId = episodeExternalIds.imdb_id;
              }
            }
            imdbId = episodeImdbId || media?.imdb_id || mappedImdbId;
            if (!imdbId && detailsBundlePromise) {
              const bundle = await detailsBundlePromise;
              if (bundle?.bundledExternalIds?.imdb_id) {
                imdbId = bundle.bundledExternalIds.imdb_id;
              }
            }
            if (!imdbId && mappedImdbId) {
              imdbId = mappedImdbId;
            }
            if (!imdbId && !kitsuId && !needsAnimeOnlyRatings && !anilistId && !malId) {
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

            if (needsAnimeOnlyRatings && shouldAttemptAnimeMapping) {
              if (needsAnilistRating && !anilistId) {
                if (inputAnimeMappingProvider && inputAnimeMappingExternalId) {
                  anilistId = await fetchAnilistIdFromReverseMapping({
                    provider: inputAnimeMappingProvider,
                    externalId: inputAnimeMappingExternalId,
                    season,
                    phases,
                  });
                }
                if (!anilistId && imdbId) {
                  anilistId = await fetchAnilistIdFromReverseMapping({
                    provider: 'imdb',
                    externalId: imdbId,
                    season,
                    phases,
                  });
                }
                if (!anilistId && media?.id) {
                  anilistId = await fetchAnilistIdFromReverseMapping({
                    provider: 'tmdb',
                    externalId: String(media.id),
                    season,
                    phases,
                  });
                }
              }
              if (needsMalRating && !malId) {
                if (inputAnimeMappingProvider && inputAnimeMappingExternalId) {
                  malId = await fetchMalIdFromReverseMapping({
                    provider: inputAnimeMappingProvider,
                    externalId: inputAnimeMappingExternalId,
                    season,
                    phases,
                  });
                }
                if (!malId && imdbId) {
                  malId = await fetchMalIdFromReverseMapping({
                    provider: 'imdb',
                    externalId: imdbId,
                    season,
                    phases,
                  });
                }
                if (!malId && media?.id) {
                  malId = await fetchMalIdFromReverseMapping({
                    provider: 'tmdb',
                    externalId: String(media.id),
                    season,
                    phases,
                  });
                }
              }
            }
            if (anilistId || malId) {
              hasConfirmedAnimeMapping = true;
              if (!hasNativeAnimeInput) {
                allowAnimeOnlyRatings = hasConfirmedAnimeMapping && mediaLooksAnimated;
              }
            }

            const combinedRatings = new Map<RatingPreference, string>();
            const shortCircuitLimit =
              imageType === 'poster' && posterRatingsMode !== 'average'
                ? getPosterRatingLayoutLimit(posterRatingsLayout)
                : null;

            if (shortCircuitLimit) {
              let mdbRatings: Map<RatingPreference, string> | null = null;
              let mdbListCacheTtlMs: number | null = null;
              let hasFetchedMdb = false;
              let hasFetchedKitsu = false;
              let hasFetchedAnilist = false;
              let hasFetchedMal = false;
              let hasFetchedSimkl = false;
              let hasFetchedFilmweb = false;
              let hasFetchedFilmwebCritics = false;

              const ensureImdbId = async () => {
                if (imdbId) return imdbId;
                if (episodeExternalIdsPromise) {
                  const episodeExternalIds = await episodeExternalIdsPromise;
                  if (typeof episodeExternalIds?.imdb_id === 'string' && isImdbId(episodeExternalIds.imdb_id)) {
                    imdbId = episodeExternalIds.imdb_id;
                    return imdbId;
                  }
                }
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

              const ensureFilmwebRating = async () => {
                if (hasFetchedFilmweb || combinedRatings.has('filmweb')) {
                  return combinedRatings.get('filmweb') || null;
                }
                hasFetchedFilmweb = true;
                const resolvedImdbId = await ensureImdbId();
                const tmdbId =
                  media?.id != null
                    ? String(media.id)
                    : isTmdb && mediaId
                      ? String(mediaId)
                      : null;

                if (!filmwebId) {
                  try {
                    filmwebId = await fetchFilmwebIdFromWikidata({
                      imdbId: resolvedImdbId,
                      tmdbId,
                      mediaType: mediaType as 'movie' | 'tv',
                      phases,
                    });
                  } catch {
                    filmwebId = null;
                  }
                }

                if (!filmwebId) {
                  try {
                    const title =
                      mediaType === 'movie'
                        ? media?.title || media?.name || null
                        : media?.name || media?.title || null;
                    const originalTitle =
                      mediaType === 'movie'
                        ? media?.original_title || media?.original_name || null
                        : media?.original_name || media?.original_title || null;
                    const releaseDate =
                      mediaType === 'movie' ? media?.release_date : media?.first_air_date;
                    const releaseYear =
                      typeof releaseDate === 'string' && releaseDate.trim().length >= 4
                        ? releaseDate.trim().slice(0, 4)
                        : null;

                    filmwebId = await fetchFilmwebIdBySearch({
                      title,
                      originalTitle,
                      year: releaseYear,
                      mediaType: mediaType as 'movie' | 'tv',
                      phases,
                    });
                  } catch {
                    filmwebId = null;
                  }
                }

                if (!filmwebId) return null;

                try {
                  const filmwebCacheTtlMs = getRatingCacheTtlMs({
                    id: `filmweb:${filmwebId}`,
                    mediaType: mediaType as 'movie' | 'tv',
                    releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                    defaultTtlMs: FILMWEB_CACHE_TTL_MS,
                    oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
                  });
                  const filmwebRating = await fetchFilmwebRating({
                    filmwebId,
                    cacheTtlMs: filmwebCacheTtlMs,
                    phases,
                  });
                  if (filmwebRating) {
                    combinedRatings.set('filmweb', filmwebRating);
                    renderedRatingTtlByProvider.set('filmweb', filmwebCacheTtlMs);
                  }
                } catch {
                  // Ignore
                }

                return combinedRatings.get('filmweb') || null;
              };

              const ensureFilmwebCriticsRating = async () => {
                if (hasFetchedFilmwebCritics || combinedRatings.has('filmwebcritics')) {
                  return combinedRatings.get('filmwebcritics') || null;
                }
                hasFetchedFilmwebCritics = true;

                if (!filmwebId) {
                  await ensureFilmwebRating();
                }

                if (!filmwebId) return null;

                try {
                  const filmwebCriticsCacheTtlMs = getRatingCacheTtlMs({
                    id: `filmwebcritics:${filmwebId}`,
                    mediaType: mediaType as 'movie' | 'tv',
                    releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                    defaultTtlMs: FILMWEB_CACHE_TTL_MS,
                    oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
                  });
                  const filmwebCriticsRating = await fetchFilmwebCriticsRating({
                    filmwebId,
                    cacheTtlMs: filmwebCriticsCacheTtlMs,
                    phases,
                  });
                  if (filmwebCriticsRating) {
                    combinedRatings.set('filmwebcritics', filmwebCriticsRating);
                    renderedRatingTtlByProvider.set('filmwebcritics', filmwebCriticsCacheTtlMs);
                  }
                } catch {
                  // Ignore
                }

                return combinedRatings.get('filmwebcritics') || null;
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

              const ensureAnilistRating = async () => {
                if (hasFetchedAnilist || combinedRatings.has('anilist')) {
                  return combinedRatings.get('anilist') || null;
                }
                hasFetchedAnilist = true;
                if (!anilistId) return null;
                try {
                  const anilistCacheTtlMs = getRatingCacheTtlMs({
                    id: anilistId,
                    mediaType: mediaType as 'movie' | 'tv',
                    releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                    defaultTtlMs: KITSU_CACHE_TTL_MS,
                    oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
                  });
                  const anilistRating = await fetchAnilistRating(anilistId, phases);
                  if (anilistRating) {
                    combinedRatings.set('anilist', anilistRating);
                    renderedRatingTtlByProvider.set('anilist', anilistCacheTtlMs);
                  }
                } catch {
                  // Ignore
                }
                return combinedRatings.get('anilist') || null;
              };

              const ensureMalRating = async () => {
                if (hasFetchedMal || combinedRatings.has('myanimelist')) {
                  return combinedRatings.get('myanimelist') || null;
                }
                hasFetchedMal = true;
                if (!malId) return null;
                try {
                  const malCacheTtlMs = getRatingCacheTtlMs({
                    id: malId,
                    mediaType: mediaType as 'movie' | 'tv',
                    releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                    defaultTtlMs: KITSU_CACHE_TTL_MS,
                    oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
                  });
                  const malRating = await fetchMyAnimeListRating(malId, phases);
                  if (malRating) {
                    combinedRatings.set('myanimelist', malRating);
                    renderedRatingTtlByProvider.set('myanimelist', malCacheTtlMs);
                  }
                } catch {
                  // Ignore
                }
                return combinedRatings.get('myanimelist') || null;
              };

              const ensureSimklRating = async () => {
                if (hasFetchedSimkl || combinedRatings.has('simkl')) {
                  return combinedRatings.get('simkl') || null;
                }
                hasFetchedSimkl = true;
                if (!simklClientId) return null;
                const resolvedImdbId = await ensureImdbId();
                const tmdbId =
                  media?.id != null
                    ? String(media.id)
                    : isTmdb && mediaId
                      ? String(mediaId)
                      : null;
                try {
                  const simklCacheTtlMs = getRatingCacheTtlMs({
                    id:
                      resolvedImdbId ||
                      tmdbId ||
                      anilistId ||
                      malId ||
                      kitsuId ||
                      cleanId,
                    mediaType: mediaType as 'movie' | 'tv',
                    releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                    defaultTtlMs: SIMKL_CACHE_TTL_MS,
                    oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
                  });
                  const simklRating = await fetchSimklRating({
                    clientId: simklClientId,
                    imdbId: resolvedImdbId,
                    tmdbId,
                    mediaType: mediaType as 'movie' | 'tv',
                    anilistId,
                    malId,
                    kitsuId,
                    cacheTtlMs: simklCacheTtlMs,
                    phases,
                  });
                  if (simklRating) {
                    combinedRatings.set('simkl', simklRating);
                    renderedRatingTtlByProvider.set('simkl', simklCacheTtlMs);
                  }
                } catch {
                  // Ignore
                }
                return combinedRatings.get('simkl') || null;
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

                if (provider === 'anilist') {
                  if (!needsAnimeOnlyRatings) return null;
                  if (!allowAnimeOnlyRatings) {
                    await ensureAnimeMapping();
                  }
                  if (!allowAnimeOnlyRatings) return null;
                  if (combinedRatings.has('anilist')) return combinedRatings.get('anilist') || null;
                  const anilistRating = await ensureAnilistRating();
                  if (anilistRating) return anilistRating;
                  await ensureMdbRatings();
                  return combinedRatings.get('anilist') || null;
                }

                if (provider === 'myanimelist') {
                  if (!needsAnimeOnlyRatings) return null;
                  if (!allowAnimeOnlyRatings) {
                    await ensureAnimeMapping();
                  }
                  if (!allowAnimeOnlyRatings) return null;
                  if (combinedRatings.has('myanimelist')) return combinedRatings.get('myanimelist') || null;
                  const malRating = await ensureMalRating();
                  if (malRating) return malRating;
                  await ensureMdbRatings();
                  return combinedRatings.get('myanimelist') || null;
                }

                if (provider === 'simkl') {
                  return ensureSimklRating();
                }

                if (provider === 'filmweb') {
                  return ensureFilmwebRating();
                }

                if (provider === 'filmwebcritics') {
                  return ensureFilmwebCriticsRating();
                }

                await ensureMdbRatings();
                return combinedRatings.get(provider) || null;
              };

              let renderableCount = 0;
              for (const provider of effectiveRatingPreferences) {
                if (renderableCount >= shortCircuitLimit) break;
                const baseValue = await resolveProvider(provider);
                if (!shouldRenderRatingValue(baseValue)) continue;
                const formattedValue = formatDisplayRatingValue(provider, baseValue as string, imageType);
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

            if (needsAnilistRating && allowAnimeOnlyRatings && anilistId && !combinedRatings.has('anilist')) {
              try {
                const anilistCacheTtlMs = getRatingCacheTtlMs({
                  id: anilistId,
                  mediaType: mediaType as 'movie' | 'tv',
                  releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                  defaultTtlMs: KITSU_CACHE_TTL_MS,
                  oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
                });
                const anilistRating = await fetchAnilistRating(anilistId, phases);
                if (anilistRating) {
                  combinedRatings.set('anilist', anilistRating);
                  renderedRatingTtlByProvider.set('anilist', anilistCacheTtlMs);
                }
              } catch {
                // Ignore
              }
            }

            if (needsMalRating && allowAnimeOnlyRatings && malId && !combinedRatings.has('myanimelist')) {
              try {
                const malCacheTtlMs = getRatingCacheTtlMs({
                  id: malId,
                  mediaType: mediaType as 'movie' | 'tv',
                  releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                  defaultTtlMs: KITSU_CACHE_TTL_MS,
                  oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
                });
                const malRating = await fetchMyAnimeListRating(malId, phases);
                if (malRating) {
                  combinedRatings.set('myanimelist', malRating);
                  renderedRatingTtlByProvider.set('myanimelist', malCacheTtlMs);
                }
              } catch {
                // Ignore
              }
            }

            if (requestedExternalRatings.has('simkl') && !combinedRatings.has('simkl') && simklClientId) {
              try {
                const tmdbId =
                  media?.id != null
                    ? String(media.id)
                    : isTmdb && mediaId
                      ? String(mediaId)
                      : null;
                const simklCacheTtlMs = getRatingCacheTtlMs({
                  id: imdbId || tmdbId || anilistId || malId || kitsuId || cleanId,
                  mediaType: mediaType as 'movie' | 'tv',
                  releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                  defaultTtlMs: SIMKL_CACHE_TTL_MS,
                  oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
                });
                const simklRating = await fetchSimklRating({
                  clientId: simklClientId,
                  imdbId,
                  tmdbId,
                  mediaType: mediaType as 'movie' | 'tv',
                  anilistId,
                  malId,
                  kitsuId,
                  cacheTtlMs: simklCacheTtlMs,
                  phases,
                });
                if (simklRating) {
                  combinedRatings.set('simkl', simklRating);
                  renderedRatingTtlByProvider.set('simkl', simklCacheTtlMs);
                }
              } catch {
                // Ignore
              }
            }

            if ((needsFilmwebRating || needsFilmwebCriticsRating) && !filmwebId) {
              try {
                const tmdbId =
                  media?.id != null
                    ? String(media.id)
                    : isTmdb && mediaId
                      ? String(mediaId)
                      : null;
                filmwebId = await fetchFilmwebIdFromWikidata({
                  imdbId,
                  tmdbId,
                  mediaType: mediaType as 'movie' | 'tv',
                  phases,
                });
              } catch {
                filmwebId = null;
              }

              if (!filmwebId) {
                try {
                  const title =
                    mediaType === 'movie'
                      ? media?.title || media?.name || null
                      : media?.name || media?.title || null;
                  const originalTitle =
                    mediaType === 'movie'
                      ? media?.original_title || media?.original_name || null
                      : media?.original_name || media?.original_title || null;
                  const releaseDate =
                    mediaType === 'movie' ? media?.release_date : media?.first_air_date;
                  const releaseYear =
                    typeof releaseDate === 'string' && releaseDate.trim().length >= 4
                      ? releaseDate.trim().slice(0, 4)
                      : null;

                  filmwebId = await fetchFilmwebIdBySearch({
                    title,
                    originalTitle,
                    year: releaseYear,
                    mediaType: mediaType as 'movie' | 'tv',
                    phases,
                  });
                } catch {
                  filmwebId = null;
                }
              }
            }

            if (needsFilmwebRating && !combinedRatings.has('filmweb') && filmwebId) {
              try {
                const filmwebCacheTtlMs = getRatingCacheTtlMs({
                  id: `filmweb:${filmwebId}`,
                  mediaType: mediaType as 'movie' | 'tv',
                  releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                  defaultTtlMs: FILMWEB_CACHE_TTL_MS,
                  oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
                });
                const filmwebRating = await fetchFilmwebRating({
                  filmwebId,
                  cacheTtlMs: filmwebCacheTtlMs,
                  phases,
                });
                if (filmwebRating) {
                  combinedRatings.set('filmweb', filmwebRating);
                  renderedRatingTtlByProvider.set('filmweb', filmwebCacheTtlMs);
                }
              } catch {
                // Ignore
              }
            }

            if (needsFilmwebCriticsRating && !combinedRatings.has('filmwebcritics') && filmwebId) {
              try {
                const filmwebCriticsCacheTtlMs = getRatingCacheTtlMs({
                  id: `filmwebcritics:${filmwebId}`,
                  mediaType: mediaType as 'movie' | 'tv',
                  releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
                  defaultTtlMs: FILMWEB_CACHE_TTL_MS,
                  oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
                });
                const filmwebCriticsRating = await fetchFilmwebCriticsRating({
                  filmwebId,
                  cacheTtlMs: filmwebCriticsCacheTtlMs,
                  phases,
                });
                if (filmwebCriticsRating) {
                  combinedRatings.set('filmwebcritics', filmwebCriticsRating);
                  renderedRatingTtlByProvider.set('filmwebcritics', filmwebCriticsCacheTtlMs);
                }
              } catch {
                // Ignore
              }
            }

            return combinedRatings;
          })()
          : null;
      const streamBadgesPromise =
        shouldRenderStreamBadges && !useRawAnimeImageFallback && (mediaType === 'movie' || mediaType === 'tv')
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
            let streamBadgesId = imdbId || (tmdbId ? `tmdb:${tmdbId}` : null);
            if (!streamBadgesId) {
              return { badges: [], cacheTtlMs: STREAM_BADGES_CACHE_TTL_MS };
            }
            if (mediaType === 'tv') {
              const streamSeason = season || '1';
              const streamEpisode = episode || '1';
              streamBadgesId = `${streamBadgesId}:${streamSeason}:${streamEpisode}`;
            }
            const torrentioType = mediaType === 'movie' ? 'movie' : 'series';
            const torrentioCacheTtlMs = getRatingCacheTtlMs({
              id: streamBadgesId,
              mediaType: mediaType as 'movie' | 'tv',
              releaseDate: mediaType === 'movie' ? media?.release_date : media?.first_air_date,
              defaultTtlMs: STREAM_BADGES_CACHE_TTL_MS,
              oldTtlMs: MDBLIST_OLD_MOVIE_CACHE_TTL_MS,
            });
            return fetchStreamBadges({ type: torrentioType, id: streamBadgesId, phases, cacheTtlMs: torrentioCacheTtlMs });
          })()
          : null;

      if (type === 'poster') {
        outputWidth = 500;
        outputHeight = 750;
      } else if (type === 'logo') {
        outputHeight = LOGO_BASE_HEIGHT;
        outputWidth = getLogoCanvasWidth(rawFallbackLogoAspectRatio);
      }

      let localizedMediaDetails: any = null;
      let fallbackMediaDetails: any = null;
      if (!useRawAnimeImageFallback && detailsBundlePromise) {
        const { details, fallbackDetails, bundledImages, tmdbRating: bundledRating } = await detailsBundlePromise;
        localizedMediaDetails = details;
        fallbackMediaDetails = fallbackDetails;
        tmdbRating = bundledRating;
        if (episodeDetailsPromise) {
          const episodeDetails = await episodeDetailsPromise;
          const normalizedEpisodeRating = normalizeRatingValue(episodeDetails?.vote_average);
          if (normalizedEpisodeRating) {
            tmdbRating = normalizedEpisodeRating;
          }
        }

        const selectImagePath = async (input: {
          posters: any[];
          backdrops: any[];
          logos: any[];
          seasonIncludeImageLanguage?: string;
        }) => {
          let posterCollection = input.posters || [];
          const backdropCollection = input.backdrops || [];
          const logoCollection = input.logos || [];
          const mediaOriginalLanguage =
            typeof media?.original_language === 'string' && media.original_language.trim().length > 0
              ? media.original_language.trim()
              : null;
          const resolvedPosterRequestedImageLang =
            isEffectiveOriginalPosterLang && mediaOriginalLanguage
              ? normalizeTmdbLanguageCode(mediaOriginalLanguage) || effectivePosterRequestedImageLang
              : effectivePosterRequestedImageLang;
          const resolvedBackdropRequestedImageLang =
            isEffectiveOriginalBackdropLang && mediaOriginalLanguage
              ? normalizeTmdbLanguageCode(mediaOriginalLanguage) || effectiveBackdropRequestedImageLang
              : effectiveBackdropRequestedImageLang;
          const preferredPosterPath = isEffectiveOriginalPosterLang
            ? null
            : media?.poster_path || details?.poster_path || null;
          const preferredLogoLanguage =
            shouldUsePosterOriginalLanguageForLogo && mediaOriginalLanguage
              ? mediaOriginalLanguage
              : imageType === 'poster'
                ? resolvedPosterRequestedImageLang
                : imageType === 'logo' && isEffectiveOriginalLogoLang && mediaOriginalLanguage
                  ? mediaOriginalLanguage
                  : imageType === 'logo'
                    ? effectiveLogoRequestedImageLang
                    : requestedImageLang;
          const preferredBackdropPath = details?.backdrop_path || media?.backdrop_path || null;
          const selectedLogo = pickByLanguageWithFallback(
            logoCollection,
            preferredLogoLanguage,
            FALLBACK_IMAGE_LANGUAGE
          );
          const logoPath = selectedLogo?.file_path || null;
          const logoLanguageMatch =
            imageType === 'poster'
              ? matchesImageLanguage(selectedLogo, preferredLogoLanguage)
              : false;

          const localizedPosterPath = isEffectiveOriginalPosterLang
            ? null
            : (
              pickByLanguageWithFallback(
                posterCollection,
                resolvedPosterRequestedImageLang,
                effectivePosterFallbackImageLang
              )?.file_path || preferredPosterPath
            );
          let originalPosterPath =
            (isEffectiveOriginalPosterLang
              ? pickByLanguageWithFallback(
                posterCollection,
                mediaOriginalLanguage,
                ''
              )?.file_path ||
              posterCollection.find((poster: any) => !poster?.iso_639_1)?.file_path
              : media?.poster_path) ||
            localizedPosterPath ||
            posterCollection[0]?.file_path;
          const localizedBackdropPath =
            pickByLanguageWithFallback(
              backdropCollection,
              resolvedBackdropRequestedImageLang,
              FALLBACK_IMAGE_LANGUAGE,
              preferredBackdropPath
            )?.file_path || preferredBackdropPath;
          const originalBackdropPath =
            (isEffectiveOriginalBackdropLang
              ? pickByLanguageWithFallback(
                backdropCollection,
                mediaOriginalLanguage,
                ''
              )?.file_path
              : localizedBackdropPath) ||
            preferredBackdropPath ||
            backdropCollection[0]?.file_path;

          // Native anime IDs (Kitsu, MAL, AniList, AniDB) usually refer to one cour/season: prefer TMDB
          // season posters over the unified show poster when we have a resolved season and no episode.
          if (hasNativeAnimeInput && season && !episode && type === 'poster') {
            const seasonImagesQuery = input.seasonIncludeImageLanguage
              ? `&include_image_language=${input.seasonIncludeImageLanguage}`
              : '';
            const seasonImagesCacheKey = input.seasonIncludeImageLanguage
              ? `tmdb:season_images:${media.id}:${season}:${input.seasonIncludeImageLanguage}`
              : `tmdb:season_images:${media.id}:${season}:all`;

            const [seasonDetailsResponse, seasonImagesResponse] = await Promise.all([
              fetchJsonCached(
                `tmdb:season_details:${media.id}:${season}:${resolvedPosterRequestedImageLang}`,
                `https://api.themoviedb.org/3/tv/${media.id}/season/${season}?api_key=${tmdbKey}&language=${resolvedPosterRequestedImageLang}`,
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

            if (!seasonPosterPath && resolvedPosterRequestedImageLang !== FALLBACK_IMAGE_LANGUAGE) {
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
              (isEffectiveOriginalPosterLang
                ? pickByLanguageWithFallback(
                  posterCollection,
                  mediaOriginalLanguage,
                  ''
                )?.file_path || seasonPosterPath
                : seasonPosterPath ||
                pickByLanguageWithFallback(
                  posterCollection,
                  resolvedPosterRequestedImageLang,
                  effectivePosterFallbackImageLang
                )?.file_path) ||
              originalPosterPath;
          }

          if (type === 'poster') {
            const selectedPoster = pickPosterByPreference(
              posterCollection,
              effectivePosterTextPreference,
              resolvedPosterRequestedImageLang,
              effectivePosterFallbackImageLang,
              originalPosterPath
            );
            const selectedPosterIsTextless = isTextlessPosterSelection(posterCollection, selectedPoster);
            return {
              imgPath: selectedPoster?.file_path || '',
              logoAspectRatio: null,
              logoPath,
              logoLanguageMatch,
              posterIsTextless: selectedPosterIsTextless,
            };
          }

          if (type === 'backdrop') {
            const selectedBackdrop = pickBackdropByPreference(
              backdropCollection,
              effectiveBackdropTextPreference,
              resolvedBackdropRequestedImageLang,
              FALLBACK_IMAGE_LANGUAGE,
              originalBackdropPath
            );
            usedThumbnailBackdropFallback = Boolean(selectedBackdrop?.file_path);
            return {
              imgPath: selectedBackdrop?.file_path || '',
              logoAspectRatio: null,
              logoPath,
              logoLanguageMatch,
              posterIsTextless: false,
            };
          }

          if (type === 'thumbnail') {
            let stillPath: string | null = null;
            if (episodeDetailsPromise) {
              const episodeDetails = await episodeDetailsPromise;
              stillPath = typeof episodeDetails?.still_path === 'string' ? episodeDetails.still_path : null;
              thumbnailFallbackEpisodeText =
                typeof episodeDetails?.name === 'string' && episodeDetails.name.trim().length > 0
                  ? episodeDetails.name.trim()
                  : null;
              thumbnailFallbackEpisodeCode =
                season && episode
                  ? `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
                  : null;
              const normalizedEpisodeRating = normalizeRatingValue(episodeDetails?.vote_average);
              if (normalizedEpisodeRating) {
                episodeTmdbRating = normalizedEpisodeRating;
              }
            }

            if (stillPath) {
              return {
                imgPath: stillPath,
                logoAspectRatio: null,
                logoPath,
                logoLanguageMatch,
                posterIsTextless: false,
              };
            }

            const selectedBackdrop = pickBackdropByPreference(
              backdropCollection,
              effectiveBackdropTextPreference,
              resolvedBackdropRequestedImageLang,
              FALLBACK_IMAGE_LANGUAGE,
              originalBackdropPath
            );
            return {
              imgPath: selectedBackdrop?.file_path || '',
              logoAspectRatio: null,
              logoPath,
              logoLanguageMatch,
              posterIsTextless: false,
            };
          }

          const logoAspectRatio =
            typeof selectedLogo?.aspect_ratio === 'number' && selectedLogo.aspect_ratio > 0
              ? selectedLogo.aspect_ratio
              : null;
          return {
            imgPath: logoPath || '',
            logoAspectRatio,
            logoPath,
            logoLanguageMatch,
            posterIsTextless: false,
          };
        };

        const initialImages = bundledImages || {};
        const initialSelection = await selectImagePath({
          posters: initialImages.posters || [],
          backdrops: initialImages.backdrops || [],
          logos: initialImages.logos || [],
          seasonIncludeImageLanguage: includeImageLanguage || undefined
        });

        imgPath = initialSelection.imgPath;
        if (imageType === 'thumbnail' && episodeTmdbRating) {
          tmdbRating = episodeTmdbRating;
        }
        selectedLogoAspectRatio = initialSelection.logoAspectRatio;
        selectedPosterLogoPath = initialSelection.logoPath || null;
        selectedPosterIsTextless = initialSelection.posterIsTextless;
        const selectedPosterLogoLanguageMatch = Boolean(initialSelection.logoLanguageMatch);
        if (
          imageType === 'poster' &&
          effectivePosterTextPreference === 'clean' &&
          selectedPosterIsTextless &&
          (!selectedPosterLogoPath || !selectedPosterLogoLanguageMatch)
        ) {
          const logoFallbackImagesUrl = new URL(`https://api.themoviedb.org/3/${mediaType}/${media.id}/images`);
          logoFallbackImagesUrl.searchParams.set('api_key', tmdbKey);
          logoFallbackImagesUrl.searchParams.set('include_image_language', resolvedIncludeImageLanguage);
          const logoFallbackImagesResponse = await fetchJsonCached(
            `tmdb:${mediaType}:${media.id}:images:${resolvedIncludeImageLanguage || 'all'}`,
            logoFallbackImagesUrl.toString(),
            TMDB_CACHE_TTL_MS,
            phases,
            'tmdb'
          );
          if (logoFallbackImagesResponse.ok) {
            const logoFallbackImages = logoFallbackImagesResponse.data || {};
            const posterLogoOriginalLanguage =
              typeof media?.original_language === 'string' && media.original_language.trim().length > 0
                ? media.original_language.trim()
                : null;
            const resolvedPosterLogoLanguage =
              isEffectiveOriginalPosterLang && posterLogoOriginalLanguage
                ? normalizeTmdbLanguageCode(posterLogoOriginalLanguage) || effectivePosterRequestedImageLang
                : effectivePosterRequestedImageLang;
            const logoFallback = pickByLanguageWithFallback(
              logoFallbackImages.logos || [],
              shouldUsePosterOriginalLanguageForLogo && posterLogoOriginalLanguage
                ? posterLogoOriginalLanguage
                : resolvedPosterLogoLanguage,
              FALLBACK_IMAGE_LANGUAGE
            );
            if (logoFallback?.file_path) {
              selectedPosterLogoPath = logoFallback.file_path;
            }
          }
        }
        if (selectedLogoAspectRatio) {
          outputWidth = getLogoCanvasWidth(selectedLogoAspectRatio);
        }

        // If the filtered languages returned nothing, retry with all languages and pick the first available.
        if (!imgPath && !imgUrl) {
          const fallbackImagesUrl = new URL(`https://api.themoviedb.org/3/${mediaType}/${media.id}/images`);
          fallbackImagesUrl.searchParams.set('api_key', tmdbKey);
          fallbackImagesUrl.searchParams.set('include_image_language', resolvedIncludeImageLanguage);
          const fallbackImagesResponse = await fetchJsonCached(
            `tmdb:${mediaType}:${media.id}:images:${resolvedIncludeImageLanguage || 'all'}`,
            fallbackImagesUrl.toString(),
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
              selectedPosterIsTextless = fallbackSelection.posterIsTextless;
              if (selectedLogoAspectRatio) {
                outputWidth = getLogoCanvasWidth(selectedLogoAspectRatio);
              }
            }
          }
        }

        // Fanart.tv fallback: if TMDB has no textless image and preference is 'clean'/'alternative', try Fanart.tv
        if (fanartKey && !useRawAnimeImageFallback && !imgUrl && imgPath && mediaType) {
          const needsPosterFallback =
            imageType === 'poster' &&
            (effectivePosterTextPreference === 'clean' || effectivePosterTextPreference === 'alternative') &&
            !selectedPosterIsTextless;
          const needsBackdropFallback =
            imageType === 'backdrop' &&
            (effectiveBackdropTextPreference === 'clean' || effectiveBackdropTextPreference === 'alternative');

          if (needsPosterFallback || needsBackdropFallback) {
            const tvdbId = mediaType === 'tv'
              ? (() => {
                const rawTvdbId =
                  localizedMediaDetails?.external_ids?.tvdb_id ??
                  fallbackMediaDetails?.external_ids?.tvdb_id ??
                  null;
                if (typeof rawTvdbId === 'number' && Number.isFinite(rawTvdbId)) return String(rawTvdbId);
                if (typeof rawTvdbId === 'string' && rawTvdbId.trim().length > 0) return rawTvdbId.trim();
                return null;
              })()
              : null;

            const fanartImages = await fetchFanartImages(
              String(media.id),
              tvdbId,
              mediaType as 'movie' | 'tv',
              fanartKey,
              phases
            );

            if (needsPosterFallback && fanartImages.posters.length > 0) {
              imgUrl = fanartImages.posters[0];
            } else if (needsBackdropFallback && fanartImages.backdrops.length > 0) {
              imgUrl = fanartImages.backdrops[0];
            }
          }
        }
      }

      if (imageType === 'logo') {
        const generatedLogoTitle = pickPosterTitleFromMedia(
          localizedMediaDetails || media,
          mediaType,
          rawFallbackTitle,
          requestedImageLang,
          FALLBACK_IMAGE_LANGUAGE,
          fallbackMediaDetails
        );
        if (logoMode === 'ratings-only') {
          imgUrl = buildTransparentLogoDataUrl();
          outputWidth = 1100;
          outputHeight = 1;
        } else if (logoMode === 'custom-logo' && generatedLogoTitle) {
          const generatedLogo = await buildGeneratedLogoVariantDataUrl(
            generatedLogoTitle,
            logoFontVariant,
            logoPrimary,
            logoSecondary,
            logoOutline
          );
          imgUrl = generatedLogo.dataUrl;
          outputHeight = LOGO_BASE_HEIGHT;
          outputWidth = Math.max(760, Math.round(outputHeight * generatedLogo.aspectRatio));
        }
      }

      if (!imgUrl && !imgPath) {
        if (imageType === 'logo') {
          let fallbackImdbId = mappedImdbId || (media as any)?.imdb_id || null;
          if (!fallbackImdbId && detailsBundlePromise) {
            const bundle = await detailsBundlePromise;
            fallbackImdbId = bundle?.bundledExternalIds?.imdb_id || null;
          }
          if (fallbackImdbId && isImdbId(fallbackImdbId)) {
            imgUrl = `https://live.metahub.space/logo/large/${fallbackImdbId}/img`;
          }
        }
        if (!imgUrl) {
          throw new HttpError('Image not found', 404);
        }
      }
      if (!imgUrl) {
        imgUrl = buildTmdbImageUrl(imageType, imgPath, outputWidth);
      }
      const shouldApplyPosterCleanOverlay =
        imageType === 'poster' && effectivePosterTextPreference === 'clean' && selectedPosterIsTextless;
      const posterTitleText = shouldApplyPosterCleanOverlay
        ? pickPosterTitleFromMedia(
          localizedMediaDetails || media,
          mediaType,
          rawFallbackTitle,
          isEffectiveOriginalPosterLang &&
            typeof media?.original_language === 'string' &&
            media.original_language.trim().length > 0
            ? normalizeTmdbLanguageCode(media.original_language.trim()) || effectivePosterRequestedImageLang
            : effectivePosterRequestedImageLang,
          FALLBACK_IMAGE_LANGUAGE,
          fallbackMediaDetails
        )
        : null;
      let posterLogoUrl =
        shouldApplyPosterCleanOverlay && selectedPosterLogoPath
          ? buildTmdbImageUrl('logo', selectedPosterLogoPath, outputWidth)
          : null;

      if (shouldApplyPosterCleanOverlay && !posterLogoUrl) {
        let fallbackImdbId = mappedImdbId || (media as any)?.imdb_id || null;
        if (!fallbackImdbId && detailsBundlePromise) {
          const bundle = await detailsBundlePromise;
          fallbackImdbId = bundle?.bundledExternalIds?.imdb_id || null;
        }
        if (fallbackImdbId && isImdbId(fallbackImdbId)) {
          posterLogoUrl = `https://live.metahub.space/logo/large/${fallbackImdbId}/img`;
        }
      }
      const shouldRenderThumbnailFallbackOverlay =
        imageType === 'thumbnail' &&
        usedThumbnailBackdropFallback &&
        Boolean(thumbnailFallbackEpisodeCode || thumbnailFallbackEpisodeText);
      const isGeneratedLogo = imageType === 'logo' && String(imgUrl || '').startsWith('data:image/svg+xml');

      if (
        !shouldRenderBadges &&
        !posterTitleText &&
        !posterLogoUrl &&
        !shouldRenderThumbnailFallbackOverlay &&
        !isGeneratedLogo
      ) {
        const payload = await getSourceImagePayload(imgUrl);
        if (shouldCacheFinalImage) {
          try {
            await putCachedImageToObjectStorage(finalObjectStorageKey, {
              ...payload,
              cacheVersion: FINAL_IMAGE_RENDERER_CACHE_VERSION,
            });
          } catch {
            // Ignore cache persistence failures
          }
        }
        return {
          body: payload.body,
          contentType: payload.contentType,
          cacheControl: payload.cacheControl,
        };
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
      if (shouldRenderRawAnimeFallbackRating && rawFallbackAnimeRatingProvider && rawFallbackAnimeRating) {
        providerRatings.set(rawFallbackAnimeRatingProvider, rawFallbackAnimeRating);
        renderedRatingTtlByProvider.set(rawFallbackAnimeRatingProvider, KITSU_CACHE_TTL_MS);
      }
      const ratingBadges: RatingBadge[] = [];
      const renderableRatingPreferences = useRawAnimeImageFallback
        ? shouldRenderRawAnimeFallbackRating && rawFallbackAnimeRatingProvider
          ? [rawFallbackAnimeRatingProvider]
          : []
        : effectiveRatingPreferences.filter(
          (provider) => allowAnimeOnlyRatings || !ANIME_ONLY_RATING_PROVIDER_SET.has(provider)
        );
      for (const provider of renderableRatingPreferences) {
        const meta = RATING_PROVIDER_META.get(provider);
        if (!meta) continue;

        const baseValue = provider === 'tmdb' ? tmdbRating : providerRatings.get(provider) || null;
        if (!shouldRenderRatingValue(baseValue)) continue;
        const value = formatDisplayRatingValue(provider, baseValue as string, imageType);
        if (!shouldRenderRatingValue(value)) continue;

        const iconUrl = meta.iconUrl;
        ratingBadges.push({
          key: provider,
          label: meta.label,
          value,
          iconUrl,
          accentColor: meta.accentColor,
          iconCornerRadius: 'iconCornerRadius' in meta ? meta.iconCornerRadius : undefined,
          iconScale: 'iconScale' in meta ? meta.iconScale : undefined,
        });
      }
      let resolvedPosterGenreName: string | null | undefined;
      const resolvePosterGenreName = async () => {
        if (resolvedPosterGenreName !== undefined) {
          return resolvedPosterGenreName;
        }
        resolvedPosterGenreName = await getFirstTmdbGenreName(
          localizedMediaDetails || fallbackMediaDetails || media,
          mediaType as 'movie' | 'tv' | null,
          tmdbKey || '',
          requestedImageLang,
          phases
        );
        return resolvedPosterGenreName;
      };
      if (imageType === 'poster' && posterRatingsMode === 'average' && ratingBadges.length > 0) {
        const values = ratingBadges
          .map((badge) => parseDisplayRatingValue(badge.value))
          .filter((value): value is number => value !== null);
        if (values.length > 0) {
          const average = values.reduce((sum, value) => sum + value, 0) / values.length;
          const firstGenreName = await resolvePosterGenreName();
          const showGenreInAverage = posterGenrePosition !== 'off';
          const averageValue = `${(firstGenreName && showGenreInAverage) ? `${firstGenreName} ` : ''}★ ${formatRatingNumber(average)}`;
          ratingBadges.splice(0, ratingBadges.length, {
            key: 'average',
            label: requestedImageLang.startsWith('it') ? 'MEDIA' : 'AVG',
            value: averageValue,
            iconUrl: '',
            accentColor: '#f59e0b',
          });
          renderedRatingTtlByProvider.set('average', MDBLIST_CACHE_TTL_MS);
        }
      }
      const posterGenreBadge: RatingBadge | null =
        imageType === 'poster' && posterGenrePosition !== 'off' && posterRatingsMode !== 'average'
          ? await resolvePosterGenreName().then((genreName) =>
            genreName
              ? {
                key: 'genre',
                label: requestedImageLang.startsWith('it') ? 'GENERE' : 'GENRE',
                value: genreName,
                iconUrl: '',
                accentColor: '#f59e0b',
              }
              : null
          )
          : null;

      const rankingValue = await rankingPromise;
      let rankingBadge: RankingBadge | null = null;
      if (rankingValue != null) {
        const interval = normalizeRankingInterval(rankingParam);
        const intervalLabel = interval ? getRankingLabel(interval, requestedImageLang) : 'Rank';
        rankingBadge = {
          label: intervalLabel,
          value: `#${rankingValue}`,
          noBox: rankingNoBox,
          compact: rankingCompact,
        };
      } else if (rankingParam !== 'off') {
        const detailsBundle = detailsBundlePromise ? await detailsBundlePromise : null;
        const voteAverage = detailsBundle?.details?.vote_average ?? null;
        const fallbackBadge = await buildFallbackBadge({
          tmdbKey: tmdbKey || null,
          tmdbId: media?.id ? String(media.id) : null,
          imdbId: mappedImdbId || (detailsBundle?.details as any)?.imdb_id || null,
          mediaType: mediaType as 'movie' | 'tv',
          voteAverage: voteAverage != null ? Number(voteAverage) : null,
          language: requestedImageLang,
          phases,
        });
        if (fallbackBadge) {
          rankingBadge = {
            label: fallbackBadge.label,
            value: fallbackBadge.value,
            noBox: rankingNoBox,
            compact: fallbackBadge.compact ?? rankingCompact,
          };
        }
      }
      if (
        ratingBadges.length === 0 &&
        streamBadges.length === 0 &&
        !posterGenreBadge &&
        !posterTitleText &&
        !posterLogoUrl &&
        !shouldRenderThumbnailFallbackOverlay &&
        !isGeneratedLogo
      ) {
        const payload = await getSourceImagePayload(imgUrl);
        if (shouldCacheFinalImage) {
          try {
            await putCachedImageToObjectStorage(finalObjectStorageKey, {
              ...payload,
              cacheVersion: FINAL_IMAGE_RENDERER_CACHE_VERSION,
            });
          } catch {
            // Ignore cache persistence failures
          }
        }
        return {
          body: payload.body,
          contentType: payload.contentType,
          cacheControl: payload.cacheControl,
        };
      }
      const usePosterBadgeLayout = imageType === 'poster';
      const useBackdropBadgeLayout = imageType === 'backdrop' || imageType === 'thumbnail';
      const useLogoBadgeLayout = imageType === 'logo';
      const logoBadgeScale = 1;
      const usePosterRowLayout =
        usePosterBadgeLayout &&
        (posterRatingsLayout === 'top' ||
          posterRatingsLayout === 'bottom' ||
          posterRatingsLayout === 'top-bottom');
      const usePosterRowLayoutLarge = usePosterBadgeLayout && usePosterRowLayout;
      const backdropLikeImageType: 'backdrop' | 'thumbnail' =
        imageType === 'thumbnail' ? 'thumbnail' : 'backdrop';
      const activeBackdropLikeLayout = imageType === 'thumbnail' ? thumbnailRatingsLayout : backdropRatingsLayout;
      const useBackdropVerticalLayout =
        useBackdropBadgeLayout &&
        (imageType === 'thumbnail'
          ? isVerticalThumbnailRatingLayout(activeBackdropLikeLayout as ThumbnailRatingLayout)
          : activeBackdropLikeLayout === 'right-vertical');
      const posterRatingLimit = usePosterBadgeLayout
        ? getPosterRatingLayoutMaxBadges(posterRatingsLayout, posterRatingsMaxPerSide)
        : null;
      const logoRatingLimit = useLogoBadgeLayout ? logoRatingsMax : null;
      const backdropRatingLimit = useBackdropBadgeLayout ? backdropRatingsMax : null;
      let cappedRatingBadges = usePosterBadgeLayout
        ? (typeof posterRatingLimit === 'number' ? ratingBadges.slice(0, posterRatingLimit) : [...ratingBadges])
        : useBackdropBadgeLayout
          ? (typeof backdropRatingLimit === 'number' ? ratingBadges.slice(0, backdropRatingLimit) : [...ratingBadges])
          : useLogoBadgeLayout
            ? (typeof logoRatingLimit === 'number' ? ratingBadges.slice(0, logoRatingLimit) : [...ratingBadges])
            : [...ratingBadges];
      const backdropRows =
        useBackdropBadgeLayout && !useBackdropVerticalLayout ? chunkBy(cappedRatingBadges, 3) : [];
      let backdropColumns: RatingBadge[][] | undefined = undefined;
      let posterBadgeGroups = splitPosterBadgesByLayout(
        cappedRatingBadges,
        posterRatingsLayout,
        posterRatingsMaxPerSide === null ? undefined : posterRatingsMaxPerSide
      );
      let topRatingBadges = usePosterBadgeLayout
        ? posterBadgeGroups.topBadges
        : useBackdropVerticalLayout
          ? []
          : (backdropRows[0] || []);
      let bottomRatingBadges = usePosterBadgeLayout
        ? posterBadgeGroups.bottomBadges
        : useBackdropVerticalLayout
          ? []
          : (backdropRows[1] || []);
      let leftRatingBadges = usePosterBadgeLayout ? posterBadgeGroups.leftBadges : [];
      let rightRatingBadges = usePosterBadgeLayout
        ? posterBadgeGroups.rightBadges
        : useBackdropVerticalLayout
          ? [...cappedRatingBadges]
          : [];

      let badgeIconSize = 34;
      let badgeFontSize = 28;
      let badgePaddingY = 8;
      let badgePaddingX = 14;
      let badgeGap = 10;
      let baseBadgeIconSize = badgeIconSize;
      let baseBadgeFontSize = badgeFontSize;
      let baseBadgePaddingX = badgePaddingX;
      let baseBadgePaddingY = badgePaddingY;
      let baseBadgeGap = badgeGap;
      let badgeTopOffset = 16;
      let badgeBottomOffset = 16;
      let posterMinMetrics: BadgeLayoutMetrics = DEFAULT_BADGE_MIN_METRICS;
      let backdropMinMetrics: BadgeLayoutMetrics = DEFAULT_BADGE_MIN_METRICS;
      let posterRowHorizontalInset = 12;
      let posterReferenceBadgeHeight: number | undefined = undefined;
      let posterReferenceVerticalBadgeHeight: number | undefined = undefined;
      let posterReferenceBadgeGap: number | undefined = undefined;

      if (useBackdropBadgeLayout) {
        badgeIconSize = 32;
        badgeFontSize = 24;
        badgePaddingY = 8;
        badgePaddingX = 12;
        badgeGap = 8;
        badgeTopOffset = 20;
        badgeBottomOffset = 20;
        backdropMinMetrics = {
          iconSize: 22,
          fontSize: 16,
          paddingX: 8,
          paddingY: 5,
          gap: 5,
        };
        if (imageType === 'thumbnail') {
          if (thumbnailSize === 'small') {
            badgeIconSize = 46;
            badgeFontSize = 34;
            badgePaddingY = 10;
            badgePaddingX = 16;
            badgeGap = 10;
            backdropMinMetrics = {
              iconSize: 27,
              fontSize: 19,
              paddingX: 10,
              paddingY: 5,
              gap: 5,
            };
          } else if (thumbnailSize === 'large') {
            badgeIconSize = 64;
            badgeFontSize = 46;
            badgePaddingY = 14;
            badgePaddingX = 22;
            badgeGap = 14;
            backdropMinMetrics = {
              iconSize: 34,
              fontSize: 24,
              paddingX: 12,
              paddingY: 7,
              gap: 7,
            };
          } else {
            badgeIconSize = 54;
            badgeFontSize = 39;
            badgePaddingY = 12;
            badgePaddingX = 19;
            badgeGap = 12;
            backdropMinMetrics = {
              iconSize: 30,
              fontSize: 22,
              paddingX: 11,
              paddingY: 6,
              gap: 6,
            };
          }
        } else if (backdropRatingsSize === 'large') {
          badgeIconSize = 44;
          badgeFontSize = 32;
          badgePaddingY = 10;
          badgePaddingX = 16;
          badgeGap = 10;
          backdropMinMetrics = {
            iconSize: 25,
            fontSize: 18,
            paddingX: 9,
            paddingY: 6,
            gap: 6,
          };
        }
      } else if (usePosterBadgeLayout) {
        const posterScale = posterConfiguratorPreset === 'advanced' ? 1.25 : 1.15;
        badgeIconSize = Math.round(46 * posterScale);
        badgeFontSize = Math.round(35 * posterScale);
        badgePaddingY = Math.round(8 * posterScale);
        badgePaddingX = Math.round(13 * posterScale);
        badgeGap = Math.round(9 * posterScale);
        baseBadgeIconSize = badgeIconSize;
        baseBadgeFontSize = badgeFontSize;
        baseBadgePaddingX = badgePaddingX;
        baseBadgePaddingY = badgePaddingY;
        baseBadgeGap = badgeGap;
        posterRowHorizontalInset = usePosterRowLayout ? 12 : 12;
        posterMinMetrics = {
          iconSize: 26,
          fontSize: 20,
          paddingX: 9,
          paddingY: 7,
          gap: 7,
        };
        badgeTopOffset = Math.round(24 * posterScale);
        badgeBottomOffset = Math.round(24 * posterScale);
        posterReferenceBadgeHeight = estimateBadgeHeight(
          badgeFontSize,
          badgePaddingX,
          badgePaddingY,
          badgeIconSize,
          'standard'
        );
        posterReferenceVerticalBadgeHeight = estimateBadgeHeight(
          badgeFontSize,
          badgePaddingX,
          badgePaddingY,
          badgeIconSize,
          verticalBadgeContent
        );
        posterReferenceBadgeGap = badgeGap;
        if ((posterRatingsLayout === 'left' || posterRatingsLayout === 'right' || posterRatingsLayout === 'left-right') && verticalBadgeContent === 'stacked') {
          badgeGap = Math.max(badgeGap, 12);
        }
      } else if (useLogoBadgeLayout) {
        badgeIconSize = 92;
        badgeFontSize = 68;
        badgePaddingY = 10;
        badgePaddingX = 34;
        badgeGap = 22;
      }

      if (usePosterBadgeLayout && cappedRatingBadges.length > 0) {
        let fittedPosterMetrics: BadgeLayoutMetrics;
        if (posterRatingsLayout === 'left' || posterRatingsLayout === 'right' || posterRatingsLayout === 'left-right') {
          const isSingleSideVerticalPoster =
            posterRatingsLayout === 'left' || posterRatingsLayout === 'right';
          const useThreeBadgeTopRow =
            posterRatingsLayout === 'left-right' &&
            topRatingBadges.length === 1 &&
            leftRatingBadges.length > 0 &&
            rightRatingBadges.length > 0;
          const fittedLeftColumn = useThreeBadgeTopRow ? leftRatingBadges.slice(1) : leftRatingBadges;
          const fittedRightColumn = useThreeBadgeTopRow ? rightRatingBadges.slice(1) : rightRatingBadges;
          const posterColumns = [fittedLeftColumn, fittedRightColumn].filter((column) => column.length > 0);
          const widthRows = posterColumns.flatMap((column) => column.map((badge) => [badge]));
          const alignPosterQualityBadges =
            (posterRatingsLayout === 'left' || posterRatingsLayout === 'right') && streamBadges.length > 0;
          const reservedTopRows =
            posterRatingsLayout === 'left-right' && topRatingBadges.length > 0 ? 1 : 0;
          const baseBadgeHeight = estimateBadgeHeight(
            badgeFontSize,
            badgePaddingX,
            badgePaddingY,
            badgeIconSize,
            'standard'
          );
          const posterOverlayPresent = Boolean(posterTitleText || posterLogoUrl);
          const posterOverlayGap = posterOverlayPresent ? Math.max(8, Math.round(badgeGap * 0.9)) : 0;
          const posterQualityPlacement = resolvePosterQualityBadgePlacement(
            posterRatingsLayout,
            qualityBadgesSide,
            posterQualityBadgesPosition
          );
          const bottomQualityReservedHeight =
            posterQualityPlacement === 'bottom' && streamBadges.length > 0
              ? Math.max(36, Math.round(baseBadgeHeight * 1.05)) + badgeGap
              : 0;
          const posterOverlayBodyReservedHeight =
            posterOverlayPresent
              ? Math.max(
                posterLogoUrl ? Math.round(outputHeight * 0.20) : 96,
                Math.round(outputHeight * 0.18)
              )
              : 0;
          const posterOverlayReservedHeight =
            posterOverlayPresent
              ? posterOverlayGap +
              posterOverlayBodyReservedHeight +
              (bottomQualityReservedHeight > 0 ? bottomQualityReservedHeight : baseBadgeHeight)
              : 0;
          const overlayReservedHeight = posterOverlayPresent
            ? posterOverlayReservedHeight
            : bottomQualityReservedHeight;
          const posterBaseMetrics: BadgeLayoutMetrics = {
            iconSize: badgeIconSize,
            fontSize: badgeFontSize,
            paddingX: badgePaddingX,
            paddingY: badgePaddingY,
            gap: badgeGap,
          };
          const posterColumnMaxWidth =
            posterRatingsLayout === 'left-right'
              ? Math.max(160, Math.floor((outputWidth - 36) / 2))
              : alignPosterQualityBadges
                ? Math.max(220, Math.floor(outputWidth * 0.6))
                : Math.max(180, Math.floor(outputWidth * 0.46));
          fittedPosterMetrics = fitPosterBadgeMetricsToWidth(
            widthRows,
            posterColumnMaxWidth + 24,
            posterBaseMetrics,
            posterMinMetrics,
            false,
            false,
            verticalBadgeContent
          );
          const shouldPreservePosterBadgeSizeForOverlay = overlayReservedHeight > 0;
          if (!isSingleSideVerticalPoster && !shouldPreservePosterBadgeSizeForOverlay) {
            fittedPosterMetrics = fitPosterBadgeMetricsToHeight(
              posterColumns,
              outputHeight,
              fittedPosterMetrics,
              badgeTopOffset,
              badgeBottomOffset + overlayReservedHeight,
              posterMinMetrics,
              reservedTopRows,
              verticalBadgeContent
            );
          }
          const posterColumnCountMetrics =
            isSingleSideVerticalPoster || shouldPreservePosterBadgeSizeForOverlay
              ? posterBaseMetrics
              : fittedPosterMetrics;
          const maxPerColumn = getMaxBadgeColumnCount(
            outputHeight,
            posterColumnCountMetrics,
            badgeTopOffset,
            badgeBottomOffset + overlayReservedHeight,
            reservedTopRows,
            verticalBadgeContent
          );
          const effectiveMaxPerSide =
            posterRatingsMaxPerSide === null
              ? maxPerColumn + (useThreeBadgeTopRow ? 1 : 0)
              : Math.min(maxPerColumn + (useThreeBadgeTopRow ? 1 : 0), posterRatingsMaxPerSide);
          posterBadgeGroups = splitPosterBadgesByLayout(cappedRatingBadges, posterRatingsLayout, effectiveMaxPerSide);
          topRatingBadges = posterBadgeGroups.topBadges;
          bottomRatingBadges = posterBadgeGroups.bottomBadges;
          leftRatingBadges = posterBadgeGroups.leftBadges;
          rightRatingBadges = posterBadgeGroups.rightBadges;
          cappedRatingBadges = [...topRatingBadges, ...leftRatingBadges, ...rightRatingBadges];
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
        if (imageType === 'thumbnail') {
          const thumbnailScale =
            thumbnailSize === 'small' ? 1 : thumbnailSize === 'large' ? 1.75 : 1.4;
          badgeIconSize = Math.max(backdropMinMetrics.iconSize, Math.round(badgeIconSize * thumbnailScale));
          badgeFontSize = Math.max(backdropMinMetrics.fontSize, Math.round(badgeFontSize * thumbnailScale));
          badgePaddingX = Math.max(backdropMinMetrics.paddingX, Math.round(badgePaddingX * thumbnailScale));
          badgePaddingY = Math.max(backdropMinMetrics.paddingY, Math.round(badgePaddingY * thumbnailScale));
          badgeGap = Math.max(backdropMinMetrics.gap, Math.round(badgeGap * thumbnailScale));
          if (!useBackdropVerticalLayout) {
            const backdropRegion = getBackdropBadgePlacement(outputWidth, activeBackdropLikeLayout, imageType);
            const thumbnailRows = [topRatingBadges, bottomRatingBadges].filter((row) => row.length > 0);
            if (thumbnailRows.length > 0) {
              const currentMetrics: BadgeLayoutMetrics = {
                iconSize: badgeIconSize,
                fontSize: badgeFontSize,
                paddingX: badgePaddingX,
                paddingY: badgePaddingY,
                gap: badgeGap,
              };
              const maxRowWidth = Math.max(
                ...thumbnailRows.map((row) => measureBadgeRowWidth(row, currentMetrics)),
                0
              );
              const availableRowWidth = Math.max(0, backdropRegion.width - 24);
              if (availableRowWidth > 0 && maxRowWidth > availableRowWidth) {
                const fitScale = Math.max(0.55, availableRowWidth / maxRowWidth);
                badgeIconSize = Math.max(
                  backdropMinMetrics.iconSize,
                  Math.round(badgeIconSize * fitScale)
                );
                badgeFontSize = Math.max(
                  backdropMinMetrics.fontSize,
                  Math.round(badgeFontSize * fitScale)
                );
                badgePaddingX = Math.max(
                  backdropMinMetrics.paddingX,
                  Math.round(badgePaddingX * fitScale)
                );
                badgePaddingY = Math.max(
                  backdropMinMetrics.paddingY,
                  Math.round(badgePaddingY * fitScale)
                );
                badgeGap = Math.max(
                  backdropMinMetrics.gap,
                  Math.round(badgeGap * fitScale)
                );
              }
            }
          }
        } else {
          let fittedBackdropMetrics: BadgeLayoutMetrics;
          if (useBackdropVerticalLayout) {
            const backdropPlacement = getBackdropBadgePlacement(
              outputWidth,
              activeBackdropLikeLayout,
              backdropLikeImageType
            );
            fittedBackdropMetrics = {
              iconSize: badgeIconSize,
              fontSize: badgeFontSize,
              paddingX: badgePaddingX,
              paddingY: badgePaddingY,
              gap: badgeGap,
            };
            const verticalOutputHeightLimit =
              imageType === 'backdrop'
                ? Math.floor(outputHeight / 2) + badgeBottomOffset
                : outputHeight;
            const maxPerColumn = getMaxBadgeColumnCount(
              verticalOutputHeightLimit,
              fittedBackdropMetrics,
              badgeTopOffset,
              badgeBottomOffset,
              0,
              verticalBadgeContent
            );
            backdropColumns = splitBackdropVerticalBadgesIntoColumns(
              rightRatingBadges,
              backdropPlacement,
              fittedBackdropMetrics,
              maxPerColumn,
              verticalBadgeContent,
              imageType === 'backdrop'
                ? verticalBadgeContent === 'stacked'
                  ? 4
                  : 3
                : 2
            );
            if (backdropColumns.length > 0) {
              leftRatingBadges = backdropColumns[0] || [];
              rightRatingBadges =
                backdropColumns.length > 1
                  ? backdropColumns[backdropColumns.length - 1] || []
                  : backdropColumns[0] || [];
              cappedRatingBadges = backdropColumns.flat();
            } else {
              leftRatingBadges = [];
              rightRatingBadges = rightRatingBadges.slice(0, maxPerColumn);
              cappedRatingBadges = [...rightRatingBadges];
            }
          } else {
            const backdropRegion = getBackdropBadgePlacement(
              outputWidth,
              activeBackdropLikeLayout,
              backdropLikeImageType
            );
            const baseBackdropBadgeHeight = estimateBadgeHeight(
              badgeFontSize,
              badgePaddingX,
              badgePaddingY,
              badgeIconSize,
              'standard'
            );
            const backdropQualityHeight = Math.max(44, Math.round(baseBackdropBadgeHeight * 1.25));
            const backdropQualityBadgeWidth = Math.min(
              Math.max(72, Math.round(backdropQualityHeight * 1.75)),
              Math.max(72, outputWidth - 24)
            );
            const backdropQualityColumnGap = Math.max(8, Math.round(badgeGap * 0.8));
            const backdropQualityColumnCount =
              imageType === 'backdrop' && backdropRegion.align === 'right'
                ? streamBadges.length > 2
                  ? 2
                  : streamBadges.length > 0
                    ? 1
                    : 0
                : 0;
            const reservedQualityWidth =
              backdropQualityColumnCount > 0
                ? backdropQualityColumnCount * backdropQualityBadgeWidth +
                Math.max(0, backdropQualityColumnCount - 1) * backdropQualityColumnGap +
                backdropQualityColumnGap
                : 0;
            const availableBackdropRowWidth = Math.max(
              0,
              backdropRegion.width - reservedQualityWidth
            );
            fittedBackdropMetrics = fitPosterBadgeMetricsToWidth(
              [topRatingBadges, bottomRatingBadges].filter((row) => row.length > 0),
              availableBackdropRowWidth > 0 ? availableBackdropRowWidth : backdropRegion.width,
              {
                iconSize: badgeIconSize,
                fontSize: badgeFontSize,
                paddingX: badgePaddingX,
                paddingY: badgePaddingY,
                gap: badgeGap,
              },
              backdropMinMetrics
            );
          }
          badgeIconSize = fittedBackdropMetrics.iconSize;
          badgeFontSize = fittedBackdropMetrics.fontSize;
          badgePaddingX = fittedBackdropMetrics.paddingX;
          badgePaddingY = fittedBackdropMetrics.paddingY;
          badgeGap = fittedBackdropMetrics.gap;
        }
      }

      const logoBadgeRowWidth = useLogoBadgeLayout && cappedRatingBadges.length > 0
        ? measureBadgeRowWidth(cappedRatingBadges, {
          iconSize: badgeIconSize,
          fontSize: badgeFontSize,
          paddingX: badgePaddingX,
          paddingY: badgePaddingY,
          gap: badgeGap,
        }, false, verticalBadgeContent)
        : 0;
      const qualityBadges = streamBadges;
      const badgesForIcons = cappedRatingBadges;
      const logoNaturalWidth = useLogoBadgeLayout ? outputWidth : 0;
      const logoBadgeContainerTargetWidth = useLogoBadgeLayout
        ? Math.max(0, logoNaturalWidth - 24)
        : 0;
      const logoBadgeMetrics = {
        iconSize: badgeIconSize,
        fontSize: badgeFontSize,
        paddingX: badgePaddingX,
        paddingY: badgePaddingY,
        gap: badgeGap,
      };
      let logoBadgesPerRow = 0;
      if (useLogoBadgeLayout && cappedRatingBadges.length > 0) {
        logoBadgesPerRow = Math.max(1, cappedRatingBadges.length);
        if (logoMode === 'ratings-only') {
          for (let badgesPerRow = cappedRatingBadges.length; badgesPerRow >= 1; badgesPerRow -= 1) {
            const candidateRows = chunkBy(cappedRatingBadges, badgesPerRow);
            const widestCandidateRow = candidateRows.reduce(
              (maxWidth, row) =>
                Math.max(
                  maxWidth,
                  measureBadgeRowWidth(row, logoBadgeMetrics, false, verticalBadgeContent)
                ),
              0
            );
            logoBadgesPerRow = badgesPerRow;
            if (widestCandidateRow <= logoBadgeContainerTargetWidth) {
              break;
            }
          }
        }
      }
      const logoBadgeRowsData =
        useLogoBadgeLayout && cappedRatingBadges.length > 0 && logoBadgesPerRow > 0
          ? chunkBy(cappedRatingBadges, logoBadgesPerRow)
          : [];
      const widestLogoBadgeRowWidth = logoBadgeRowsData.reduce(
        (maxWidth, row) =>
          Math.max(
            maxWidth,
            measureBadgeRowWidth(row, logoBadgeMetrics, false, verticalBadgeContent)
          ),
        0
      );
      const finalOutputWidth = useLogoBadgeLayout && logoBadgeRowWidth > 0
        ? Math.max(logoNaturalWidth, widestLogoBadgeRowWidth + 24)
        : outputWidth;
      const logoImageWidth = useLogoBadgeLayout
        ? logoNaturalWidth
        : 0;
      const logoImageHeight = useLogoBadgeLayout
        ? logoMode === 'ratings-only'
          ? 0
          : outputHeight
        : 0;
      const logoBadgeRows = logoBadgeRowsData.length;
      const logoBadgeItemHeight = estimateBadgeHeight(
        badgeFontSize,
        badgePaddingX,
        badgePaddingY,
        badgeIconSize,
        verticalBadgeContent
      );
      const estimatedLogoWidth = logoImageWidth;
      const logoBadgeContainerMaxWidth = Math.max(0, finalOutputWidth - 24);
      const logoBadgeMaxWidth = logoBadgeContainerMaxWidth;
      const logoBadgeTopGap = useLogoBadgeLayout && (cappedRatingBadges.length > 0 || streamBadges.length > 0)
        ? logoMode === 'ratings-only'
          ? 0
          : Math.max(20, Math.round(badgeGap * 1.15))
        : 0;
      const logoBadgeBandHeight = useLogoBadgeLayout && cappedRatingBadges.length > 0
        ? logoBadgeRows * logoBadgeItemHeight + Math.max(0, logoBadgeRows - 1) * badgeGap
        : 0;
      const finalOutputHeight = useLogoBadgeLayout ? logoImageHeight + logoBadgeTopGap + logoBadgeBandHeight : outputHeight;
      const renderedRatingCacheTtlCandidates = [
        ...ratingBadges.map((badge) => {
          if (badge.key === 'tmdb') {
            return TMDB_CACHE_TTL_MS;
          }
          return renderedRatingTtlByProvider.get(badge.key) || null;
        }),
        ...(streamBadges.length > 0 ? [streamBadgesCacheTtlMs ?? STREAM_BADGES_CACHE_TTL_MS] : []),
        ...(posterGenreBadge ? [TMDB_CACHE_TTL_MS] : []),
        ...(rankingBadge ? [RANKING_CACHE_TTL_MS] : []),
      ].filter((ttlMs): ttlMs is number => typeof ttlMs === 'number' && Number.isFinite(ttlMs) && ttlMs > 0);
      const finalImageCacheTtlMs =
        renderedRatingCacheTtlCandidates.length > 0
          ? Math.min(...renderedRatingCacheTtlCandidates)
          : 7 * 24 * 60 * 60 * 1000;
      const storageCacheControl = buildPublicImageCacheControl(finalImageCacheTtlMs);
      const renderedPayload = await renderWithSharp(
        {
          imageType,
          outputFormat,
          imgUrl,
          outputWidth: finalOutputWidth,
          outputHeight: useLogoBadgeLayout ? Math.max(1, logoImageHeight) : outputHeight,
          imageWidth: useLogoBadgeLayout ? logoImageWidth : undefined,
          imageHeight: useLogoBadgeLayout ? Math.max(1, logoImageHeight) : undefined,
          finalOutputHeight,
          logoBadgeTopGap,
          logoBadgeBandHeight,
          logoBadgeMaxWidth,
          logoBadgesPerRow,
          posterRowHorizontalInset,
          posterCleanOverlayEnabled: imageType === 'poster' && effectivePosterTextPreference === 'clean',
          posterTitleText,
          posterLogoUrl,
          posterReferenceBadgeHeight,
          posterReferenceVerticalBadgeHeight,
          posterReferenceBadgeGap,
          thumbnailFallbackEpisodeText: usedThumbnailBackdropFallback ? thumbnailFallbackEpisodeText : null,
          thumbnailFallbackEpisodeCode: usedThumbnailBackdropFallback ? thumbnailFallbackEpisodeCode : null,
          badgeIconSize,
          badgeFontSize,
          badgePaddingX,
          badgePaddingY,
          badgeGap,
          qualityBadgeIconSize: baseBadgeIconSize,
          qualityBadgeFontSize: baseBadgeFontSize,
          qualityBadgePaddingX: baseBadgePaddingX,
          qualityBadgePaddingY: baseBadgePaddingY,
          qualityBadgeGap: baseBadgeGap,
          badgeTopOffset,
          badgeBottomOffset,
          badges: badgesForIcons,
          qualityBadges,
          qualityBadgesSide,
          posterQualityBadgesPosition,
          qualityBadgesStyle,
          qualityBadgesColorMode,
          posterRatingsLayout,
          posterRatingsMaxPerSide,
          backdropRatingsLayout: activeBackdropLikeLayout,
          backdropRatingsSize,
          thumbnailRatingsLayout,
          thumbnailSize,
          verticalBadgeContent,
          ratingStyle,
          ratingsColorMode,
          topBadges: topRatingBadges,
          bottomBadges: bottomRatingBadges,
          leftBadges: leftRatingBadges,
          rightBadges: rightRatingBadges,
          backdropColumns,
          backdropRows,
          posterGenreBadge,
          posterGenrePosition,
          rankingBadge,
          rankingPosition,
          posterConfiguratorPreset,
          posterVignetteEnabled,
          cacheControl: storageCacheControl,
        },
        phases
      );

      if (shouldCacheFinalImage) {
        try {
          await putCachedImageToObjectStorage(finalObjectStorageKey, {
            body: renderedPayload.body,
            contentType: renderedPayload.contentType,
            cacheControl: storageCacheControl,
            cacheVersion: FINAL_IMAGE_RENDERER_CACHE_VERSION,
          });
        } catch {
          // Ignore distributed cache persistence failures.
        }
      }
      return renderedPayload;
    });

    const finalPayload = renderedImage as RenderedImagePayload;
    return respond(finalPayload.body, 200, {
      'Content-Type': finalPayload.contentType,
      'Cache-Control': finalPayload.cacheControl,
      'Vary': 'Accept',
    });
  } catch (e: any) {
    if (e instanceof HttpError) {
      return respond(e.message, e.status, e.headers);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ERDB] render failed', e);
    }
    const message = typeof e?.message === 'string' ? e.message : 'Unknown error';
    const stack = process.env.NODE_ENV !== 'production' && typeof e?.stack === 'string' ? `\n${e.stack}` : '';
    return respond(`Error: ${message}${stack}`, 500, { 'Cache-Control': responseHeadersCacheControl });
  }
}































export const POSTER_RATING_LAYOUT_OPTIONS = [
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'left', label: 'Left Vertical' },
  { id: 'right', label: 'Right Vertical' },
  { id: 'top-bottom', label: 'Top & Bottom' },
  { id: 'left-right', label: 'Left & Right Vertical' },
  { id: 'below', label: 'Below Poster' },
] as const;

export type PosterRatingLayout = (typeof POSTER_RATING_LAYOUT_OPTIONS)[number]['id'];

export const DEFAULT_POSTER_RATING_LAYOUT: PosterRatingLayout = 'top-bottom';
export const POSTER_RATINGS_MAX_PER_SIDE_MIN = 1;
export const POSTER_RATINGS_MAX_PER_SIDE_MAX = 20;
export const DEFAULT_POSTER_RATINGS_MAX_PER_SIDE: number | null = null;

const POSTER_RATING_LAYOUT_SET = new Set<PosterRatingLayout>(
  POSTER_RATING_LAYOUT_OPTIONS.map((option) => option.id)
);
const SINGLE_POSTER_RATING_LAYOUTS = new Set<PosterRatingLayout>(['top', 'bottom', 'left', 'right', 'below']);
const VERTICAL_POSTER_RATING_LAYOUTS = new Set<PosterRatingLayout>(['left', 'right', 'left-right']);
const BELOW_POSTER_RATING_LAYOUT = new Set<PosterRatingLayout>(['below']);

export const normalizePosterRatingLayout = (value?: string | null): PosterRatingLayout => {
  const normalized = (value || '').trim().toLowerCase();
  return POSTER_RATING_LAYOUT_SET.has(normalized as PosterRatingLayout)
    ? (normalized as PosterRatingLayout)
    : DEFAULT_POSTER_RATING_LAYOUT;
};

export const normalizePosterRatingsMaxPerSide = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return DEFAULT_POSTER_RATINGS_MAX_PER_SIDE;
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(numericValue)) return DEFAULT_POSTER_RATINGS_MAX_PER_SIDE;
  const normalized = Math.trunc(numericValue);
  if (normalized < POSTER_RATINGS_MAX_PER_SIDE_MIN) return DEFAULT_POSTER_RATINGS_MAX_PER_SIDE;
  return Math.min(POSTER_RATINGS_MAX_PER_SIDE_MAX, normalized);
};

export const isSinglePosterRatingLayout = (layout: PosterRatingLayout) =>
  SINGLE_POSTER_RATING_LAYOUTS.has(layout);

export const isVerticalPosterRatingLayout = (layout: PosterRatingLayout) =>
  VERTICAL_POSTER_RATING_LAYOUTS.has(layout);

export const isBelowPosterRatingLayout = (layout: PosterRatingLayout) =>
  BELOW_POSTER_RATING_LAYOUT.has(layout);

export const getPosterRatingLayoutLimit = (layout: PosterRatingLayout): number | null => {
  if (layout === 'top' || layout === 'bottom') return 3;
  if (layout === 'top-bottom') return 6;
  if (layout === 'below') return null;
  return null;
};

export const getPosterRatingLayoutMaxBadges = (
  layout: PosterRatingLayout,
  maxPerSide?: number | null
): number | null => {
  const limit = getPosterRatingLayoutLimit(layout);
  if (limit !== null) return limit;

  const parsedMaxPerSide = typeof maxPerSide === 'number' ? maxPerSide : Number.NaN;
  if (!Number.isFinite(parsedMaxPerSide)) return null;
  const normalizedMaxPerSide = Math.max(1, Math.trunc(parsedMaxPerSide));
  return layout === 'left-right' ? normalizedMaxPerSide * 2 : normalizedMaxPerSide;
};

export const describePosterRatingLayoutLimit = (
  layout: PosterRatingLayout,
  maxPerSide?: number | null
) => {
  const limit = getPosterRatingLayoutLimit(layout);
  if (limit !== null) return `up to ${limit}`;

  const normalizedMaxPerSide = normalizePosterRatingsMaxPerSide(maxPerSide);
  if (normalizedMaxPerSide === null) return layout === 'below' ? 'all that fit below the poster' : 'all that fit inside the poster';
  if (layout === 'left-right') return `up to ${normalizedMaxPerSide} per side`;
  return `up to ${normalizedMaxPerSide} on the selected side`;
};

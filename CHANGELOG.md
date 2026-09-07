# Changelog

All notable changes to this project are documented in this file.

## [0.4.99](https://github.com/realbestia1/erdb/compare/v0.4.98...v0.4.99) - 2026-09-07

- Always use WebP output; bump cache version ([39cb13f](https://github.com/realbestia1/erdb/commit/39cb13ff756bc7189c3ade7a771991d49f4dd0d0))
  pickOutputFormat now returns WebP for non-logo images (dropping Accept header negotiation) to produce smaller images and standardize output. Logos still render as PNG. FINAL_IMAGE_RENDERER_CACHE_VERSION was bumped to 'poster-backdrop-logo-thumbnail-v244-webp' to invalidate caches after the format change.

## [0.4.98](https://github.com/realbestia1/erdb/compare/v0.4.97...v0.4.98) - 2026-08-22

- Use native select for language picker ([2b3f75e](https://github.com/realbestia1/erdb/commit/2b3f75ea45fc919233ce566d0076d2b5522c98ff))
  Replaced the custom language dropdown in the workspace nav with a native select to simplify the UI and avoid previous dropdown styling issues. This also updates the package version to 0.4.98.

## [0.4.97](https://github.com/realbestia1/erdb/compare/v0.4.96...v0.4.97) - 2026-08-20

- Remove startup image cache warmup ([b16018c](https://github.com/realbestia1/erdb/commit/b16018c55b08a52ee159bab8569724fcf2afe70f))
  Bump version to 0.4.97. This removes the startup hook that eagerly required the image cache cleanup route during server boot. That warmup was fragile and could warn/fail during initialization without blocking startup, so the server now starts directly without it.

## [0.4.96](https://github.com/realbestia1/erdb/compare/v0.4.95...v0.4.96) - 2026-08-20

- Add final image cache versioning and TTL ([ded892a](https://github.com/realbestia1/erdb/commit/ded892a017679628982d6506c40aafd6d0f86326))
  Introduce FINAL_IMAGE_RENDERER_CACHE_VERSION and persist cacheVersion with final image metadata; invalidate/prune final image files when metadata version mismatches. Add RANKING_CACHE_TTL_MS and use it for ranking fetches. Ensure distributed cache writes include cacheVersion. Improve objectStorage pruning and error logging, and make deleteCachedObject robust against ENOENT. Add warmImageCachePruner in startup script to initialize image-cache cleanup on server start. Bump package version. (Updated tsbuildinfo only reflects build metadata.)

## [0.4.95](https://github.com/realbestia1/erdb/compare/v0.4.94...v0.4.95) - 2026-07-18

- Support Kitsu thumbnail input parsing ([57df2c9](https://github.com/realbestia1/erdb/commit/57df2c9f69daf151ee593a0d10d6a5b092ab8e8d))
  Update Kitsu input parsing to handle legacy proxy thumbnail URLs. parseKitsuInputParts now accepts an optional isThumbnail flag and returns season=null with episode pulled from the shorter parts array when appropriate. app/[type]/[id]/route.ts passes imageType==='thumbnail' to the parser. Also bump package version to 0.4.95 and include updated tsconfig.tsbuildinfo.

## [0.4.94](https://github.com/realbestia1/erdb/compare/v0.4.93...v0.4.94) - 2026-06-20

- Update package.json ([52805c7](https://github.com/realbestia1/erdb/commit/52805c761a766b9ca8eb3dcbb832cdfe611e3d38))
- Update use-home-page-controller.ts ([75f0312](https://github.com/realbestia1/erdb/commit/75f03127d0185db463d5cc23c80910a2cc080a78))
- Add 'custom' poster configurator preset ([e6dcd8d](https://github.com/realbestia1/erdb/commit/e6dcd8d0710ce0d24e5fbe8757d986b85e6daef9))
  Introduce a new 'custom' PosterConfiguratorPreset and wire it through types, controller logic, and the workspace UI. Updated type definitions in home-page-view.tsx, home-page-utils.ts, and workspace/types.ts to include 'custom'. use-home-page-controller now recognizes and sets the 'custom' preset from payloads. workspace-controls-panel.tsx: add the 'Custom' dropdown option and numerous conditional UI blocks when preset === 'custom' (ratings layout, vertical badge style & max per side, genre/quality badge positions, average ratings toggle, stream badge mode, ranking position), adjust layout for custom mode, and fix the anime image-text dropdown to pick poster vs backdrop values. These changes enable a manually configurable poster mode while keeping existing presets intact.
- Add multiple poster presets and new defaults ([6bde897](https://github.com/realbestia1/erdb/commit/6bde8971bac5a9fabcd2dde0a8e7ce6f0a938ee9))
  Introduce seven poster presets (preset1..preset7) replacing the old simple/advanced mode and wire them throughout the app. Update types to include the new presets, change defaults (language to it-IT, poster average ratings on, poster rating/quality style to plain, stream badges default on, ranking country to IT), and implement preset-specific configuration logic in useHomePageController (query generation, config object, UI state setters and derived values). Revamp workspace controls UI to expose the new preset dropdown, hide/adjust poster language & layout controls for presets, add vignette toggle and preset-specific layout fields (e.g. Max Badges per Side for preset7), and add an Info icon import. Also fix route handling for rankingParam by guarding the else branch (only run when rankingParam !== 'off'). These changes centralize multiple default layouts via presets and ensure URL/config serialization respects them.

## [0.4.93](https://github.com/realbestia1/erdb/compare/v0.4.92...v0.4.93) - 2026-06-19

- Refactor quality badge tint logic; bump version ([b7a6049](https://github.com/realbestia1/erdb/commit/b7a604909456c3b006ebd58e43e71c39c8f69a1d))
  Rework tintColor computation in lib/imageRenderer.ts to simplify nested ternaries and change behavior: known quality keys (remux, bluray, webdl, webrip, dolbyvision, hdr10plus, hdr10, hdr, imaxenhanced, imax, sdr) now always return 'colored', while other quality badges use badge.accentColor only when input.qualityBadgesColorMode is 'colored' (otherwise default to #ffffff). Also increment package version to 0.4.93.

## [0.4.92](https://github.com/realbestia1/erdb/compare/v0.4.91...v0.4.92) - 2026-06-19

- Add 240-576p badges, update icons, bump cache ([f30b4c7](https://github.com/realbestia1/erdb/commit/f30b4c7620054789634a461b573ed71e565956a8))
  Add lower-resolution stream badges (576p, 480p, 360p, 240p) and include them in STREAM_BADGE_META, STREAM_BADGE_ORDER, STREAM_BADGE_PATTERNS, and STREAM_BADGE_CATEGORY in lib/ratingBadgeLogic.ts. Replace icon URLs for 4k/1080p/720p with CDN-hosted SVGs and adjust iconWidthRatio values. Update cache namespace from v10 to v11 in lib/streamBadges.ts to invalidate prior cached results. Bump package version to 0.4.92 in package.json.
- Update route.ts ([8a9d787](https://github.com/realbestia1/erdb/commit/8a9d7870058f2ed842a604200f5c9a5db02b0bf1))

## [0.4.91](https://github.com/realbestia1/erdb/compare/v0.4.90...v0.4.91) - 2026-06-19

- Update cache versions and bump package ([87a2175](https://github.com/realbestia1/erdb/commit/87a217563d8e90e7b044a3edf8226f28495d2f6f))
  Increment FINAL_IMAGE_RENDERER_CACHE_VERSION to 'poster-backdrop-logo-thumbnail-v243' to force image cache invalidation, and update stream badges cache namespace from v9 to v10 to rotate that cache. Also bump package.json version to 0.4.91. tsconfig.tsbuildinfo was regenerated as part of the build metadata update.

## [0.4.90](https://github.com/realbestia1/erdb/compare/v0.4.89...v0.4.90) - 2026-06-19

- Refine HDR badge regex & scoring; bump versions ([b02ae5d](https://github.com/realbestia1/erdb/commit/b02ae5d1328e4d78539eae90ea3adf8f5d121503))
  Tighten HDR badge regexes to avoid false positives/word-embedded matches and adjust scoring logic to ignore badges in the 'quality' and 'audio' categories when computing score. Also bump FINAL_IMAGE_RENDERER_CACHE_VERSION (v240 -> v242) and package version (0.4.89 -> 0.4.90). tsconfig build info updated as a build artifact.

## [0.4.89](https://github.com/realbestia1/erdb/compare/v0.4.88...v0.4.89) - 2026-06-19

- Simplify badge regexes; bump versions ([f9eba16](https://github.com/realbestia1/erdb/commit/f9eba166154ccfb1d089b9f78e43d8d3e73e30fd))
  Refactor stream badge regexes in lib/ratingBadgeLogic.ts to use word-boundaries and targeted negative lookaheads for hdr/hdr10/hdr10plus and IMAX, improving matching accuracy and simplifying complex lookahead logic. Update FINAL_IMAGE_RENDERER_CACHE_VERSION in lib/routeConfig.ts (v237 → v240) and bump package version to 0.4.89. tsbuildinfo was updated as part of the build output.

## [0.4.88](https://github.com/realbestia1/erdb/compare/v0.4.87...v0.4.88) - 2026-06-19

- Increase badge fonts and bump versions ([f2be7fa](https://github.com/realbestia1/erdb/commit/f2be7faad0643b0c006d374964481b5d3e8f91e9))
  Improve ranking badge appearance by increasing rank, label, and compact font sizes and making badge corners rounder (rx 10 -> 20). Bump FINAL_IMAGE_RENDERER_CACHE_VERSION to poster-backdrop-logo-thumbnail-v237 to invalidate image caches and increment package version to 0.4.88. Updated TypeScript build metadata.
- Default poster and ranking positions to top ([daf8d61](https://github.com/realbestia1/erdb/commit/daf8d619f8f9e894f9334ffa64ec89820293c755))
  Change defaults so posterQualityBadgesPosition and rankingPosition initialize to 'top' instead of 'auto'. Also add explicit setPosterQualityBadgesPosition('top') and setRankingPosition('top') in the preset/settings block to ensure these values are applied when switching presets.

## [0.4.87](https://github.com/realbestia1/erdb/compare/v0.4.86...v0.4.87) - 2026-06-19

- Add fallback ranking badge and adjust rendering ([45e4b2b](https://github.com/realbestia1/erdb/commit/45e4b2bb01bd0ec97ee5c130906461dcab153257))
  Introduce fallback ranking badges when external ratings are unavailable: add buildFallbackBadge with Cinemeta award parsing and top-rated logic (tmdbMetadata.ts), and call it in the route to populate rankingBadge when appropriate. Improve badge SVG layout to better handle compact/text badges (font size/style/weight and width estimation) in badgeLayoutSvg.ts. Constrain and reposition rendered ranking badge sizes in imageRenderer.ts so badges fit reference heights and align correctly. Bump image renderer cache/version and package version to reflect these changes.
- Add quality badges and bump image cache version ([af2ae8f](https://github.com/realbestia1/erdb/commit/af2ae8fc476031ded0bfa48c56ad91b16ca863a3))
  Treat additional stream badge keys (dolbyvision, hdr10plus, hdr10, hdr, imaxenhanced, imax, sdr) as colored badges in imageRenderer so they receive the colored tint when qualityBadgesColorMode is 'colored'. Also increment FINAL_IMAGE_RENDERER_CACHE_VERSION to 'poster-backdrop-logo-thumbnail-v222' to force cache invalidation for the updated rendering behavior.
- Update routeConfig.ts ([e5732e4](https://github.com/realbestia1/erdb/commit/e5732e41da7aae4778e51acdb4ea8feb044b6613))
- Update imageRenderer.ts ([1f9670a](https://github.com/realbestia1/erdb/commit/1f9670a798a296b01c27fdcbfdc12b6059995750))

## [0.4.86](https://github.com/realbestia1/erdb/compare/v0.4.85...v0.4.86) - 2026-06-19

- Improve badge rendering, assets and cache versions ([a788141](https://github.com/realbestia1/erdb/commit/a788141c79e6fd1e2926e8a489ce2f7033a9c1b9))
  Multiple fixes and enhancements to badge rendering, asset sources, and cache versions:

  - UI: default poster ratings layout changed from 'top' to 'bottom' and payload handling updated to ignore posterRatingsLayout when posterConfiguratorPreset is 'simple'.
  - SVG: add special-case SVG generation for badges with an icon but no label to render icon + rank properly (with glow layers and optional box).
  - Image pipeline: bump provider icon cache version (v17 -> v19).
  - Image renderer: several layout and collision-avoidance improvements — clamped quality badge height, row alignment options (left/center/right), track/align quality, ranking and genre positions so they can share rows when safe, adjust gaps/overlays, and move genre composition to avoid clipping.
  - Rating metadata: replace multiple stream badge icon URLs and adjust icon width ratios to new asset repository; exclude 'quality' and 'audio' categories when building stream badges from flags to avoid duplicates.
  - Routing/cache: bump final image renderer cache version to v220.
  - TMDB: simplify ranking label logic to default to 'Today' and return empty for WEEKLY/MONTHLY in some cases.
  - Misc: add /scripts to .gitignore and bump package version to 0.4.86.

  These changes address visual clipping, badge collisions, asset consistency, and cache invalidation for updated assets.
- Update imageRenderer.ts ([ce296c3](https://github.com/realbestia1/erdb/commit/ce296c339d062d9871e2779bae991c5299188b76))
- Use cachedFetch for TMDB and fix dedupe timer ([3d5194c](https://github.com/realbestia1/erdb/commit/3d5194c805f7538e1628b52847c0e3c1ca4dfb27))
  Replace manual in-memory TMDB/text fetch caches with fetchJsonCached/fetchTextCached (using TMDB_CACHE_TTL_MS) in proxyMetaTransform.ts, add PhaseDurations import and an emptyPhases helper, and simplify fetchTmdbJson/fetchText to use the cached fetch responses. Also fix a potential timeout handle leak in routeShared.ts by tracking the dedupe timeout timer and clearing it in finally. (tsbuildinfo updated by the build.)
- Silently catch fetchPromise in withDedupe ([c686fd1](https://github.com/realbestia1/erdb/commit/c686fd17cf1d1ad094fbc83f1dff192f142f7b84))
  Store the result of factory() in fetchPromise and use it in Promise.race to avoid invoking factory twice. Attach a silent .catch handler to fetchPromise to prevent unhandled rejection warnings in Node.js if the promise rejects after the race has already settled due to a timeout. Adds a brief explanatory comment.

## [0.4.85](https://github.com/realbestia1/erdb/compare/v0.4.84...v0.4.85) - 2026-06-09

- Refactor cache/dedupe, add metadata pruning, Kitsu ([ac6c6bb](https://github.com/realbestia1/erdb/commit/ac6c6bb2b59916e356177971fe20910d52b84f28))
  Consolidate final image cache key construction into buildCacheKey and use a dedupeKey for shared in-flight renders; remove local fs debug logging. Add a dedupe timeout to withDedupe to prevent hung promises. Add a background metadata prune timer (ensureMetadataPruneStarted) and call it from get/set/prune helpers to keep metadata cache trimmed. Improve parseKitsuInputParts to handle older proxy URL formats with or without season/episode. Bump package version to 0.4.85.

## [0.4.84](https://github.com/realbestia1/erdb/compare/v0.4.83...v0.4.84) - 2026-06-07

- Remove legacy source image cache and cleanup ([38eaaa4](https://github.com/realbestia1/erdb/commit/38eaaa4e678e7eaedc8304c6657f98b6bb0f22ad))
  Simplify source image pipeline by removing legacy shared/local caching logic: imageAssetPipeline now always fetches source images inside the in-flight dedupe wrapper (no more read/write of `source/*` entries in object storage). Add startup cleanup in objectStorage to remove the old CACHE_DIR/source directory to reclaim disk space. Bump package version to 0.4.84. (tsbuildinfo updated as part of the build artifacts.)

## [0.4.83](https://github.com/realbestia1/erdb/compare/v0.4.82...v0.4.83) - 2026-06-07

- Switch default stream badges provider URL ([83d6505](https://github.com/realbestia1/erdb/commit/83d6505c29e625bf8f89e07c2ace2c5dbf1bf25c))
  Update STREAM_BADGES_PROVIDER_BASE_URL default from corsaro.stremio.dpdns.org to icv.stremio-italia.eu in lib/ratingBadgeLogic.ts and lib/routeConfig.ts. Also bump package version from 0.4.82 to 0.4.83. This redirects the app to the new stream badges provider endpoint; no other logic changes.

## [0.4.82](https://github.com/realbestia1/erdb/compare/v0.4.81...v0.4.82) - 2026-06-03

- Adjust dropdown sizing and add truncation ([75252a5](https://github.com/realbestia1/erdb/commit/75252a5622196dd12305ffaaf997ab3ad1974dc4))
  Make the dropdown width content-driven and prevent overflow on small viewports. Set width to 'max-content', reduce minWidth from 180 to 160, and add a maxWidth based on the viewport (Math.min(320, window.innerWidth - rect.left - 16)). Also replace whitespace-nowrap with a 'truncate' utility on option buttons to avoid wrapped labels for long option text.
- Add ratings color mode and thumbnailRatingStyle keys ([572e2e6](https://github.com/realbestia1/erdb/commit/572e2e69753b39259ca994fb087f1346ade7a893))
  Allow ratings color mode options to flow through the proxy and home-page controller. Added posterRatingsColorMode, backdropRatingsColorMode, thumbnailRatingsColorMode, logoRatingsColorMode and ratingsColorMode to PROXY_OPTIONAL_STRING_KEYS (and added thumbnailRatingStyle). Also updated useHomePageController to accept the new rating color mode props where needed so these settings are propagated from proxy config into the controller.
- Add ratingsColorMode for badge rendering ([f97dcdb](https://github.com/realbestia1/erdb/commit/f97dcdbb5607abc018babf2c2f7f837ac77c8ce7))
  Introduce a ratingsColorMode option ("colored" | "transparent") across the stack to control glass-style badge coloring and opacities. Changes include: new normalizeRatingsColorMode helper; propagate ratingsColorMode through route params, proxy token config, ERDB proxy mapping, and aiometadata pattern builder; add UI state, actions and controls in home/workspace components to pick per-image-type color mode; pass mode into image renderer and badge SVG generators which adjust fill/border colors and opacities for the glass style; update types and tests accordingly. Also bumps package version.

## [0.4.81](https://github.com/realbestia1/erdb/compare/v0.4.80...v0.4.81) - 2026-06-02

- Support colored/white quality badge color modes ([ccc1728](https://github.com/realbestia1/erdb/commit/ccc17286125551f7cf46812024577e978719d01f))
  Introduce a qualityBadgesColorMode setting ("colored" or "white") and wire it through the stack. Added normalizeQualityBadgesColorMode and new fast/route/proxy/type mappings to accept poster/backdrop/thumbnail color mode params; route handler now reads and resolves color mode per image type. UI: expose a dropdown for badge color mode and thread state through home-page controller and workspace types/actions. Rendering: badge SVG generation and image renderer respect color mode for text, rect and accent colors; provider icon pipeline updated to produce tinted or white variants and cache version bumped. Also bumped final image renderer cache version and added debug logging for badge tint selection.
- Add premium glow, padding, and icon outline fixes ([e99a190](https://github.com/realbestia1/erdb/commit/e99a1903a086ecbe2959c1c7092a7ecfad21647f))
  Add SVG text-shadow and premium-glow filters and switch badge text rendering to use layered glows and padded SVG wrappers to avoid clipping. Mark badge specs with isPadded and adjust imageRenderer overlays to offset padded SVGs. Improve provider icon pipeline: shrink+extend input to prevent shadow clipping, generate solid white/black layers, blurred shadow and multi-offset outline, then composite onto a larger canvas for crisp outlines and soft glow. Bump provider icon and final image renderer cache versions, set rating badge accentColor to white, and add /scratch to .gitignore.

## [0.4.80](https://github.com/realbestia1/erdb/compare/v0.4.79...v0.4.80) - 2026-06-01

- Cap quality badge height and bump cache version ([6362a21](https://github.com/realbestia1/erdb/commit/6362a214ea1a226a02cb8e8d8d44ed4120b5f479))
  Limit quality badge height by replacing Math.max(32, ...) with Math.min(40, ...) in lib/imageRenderer.ts so badges are capped at 40px instead of forcing a 32px minimum. Bump FINAL_IMAGE_RENDERER_CACHE_VERSION to 'poster-backdrop-logo-thumbnail-v183' in lib/routeConfig.ts to invalidate caches after the rendering change.
- Add glass style gradients & clip paths ([b78e014](https://github.com/realbestia1/erdb/commit/b78e014213a681837e019a5e1ed2aab1e04bff00))
  Implement a new "glass" rendering style for badge SVGs: buildRect now handles 'plain' and 'glass' styles by emitting defs (clipPath, linearGradients, shadow filter) and glass-filled/bordered rects with unique IDs. Wrap text/content in clip-path groups for glass badges across multiple badge generators and add capsule-level defs/clipPath in buildBadgeSvg with a generated clipPathId. Also simplify chrome handling by removing strokeOpacity passthrough. Finally, bump FINAL_IMAGE_RENDERER_CACHE_VERSION to 'poster-backdrop-logo-thumbnail-v171'. These changes enable Apple-style glass appearance with proper clipping, borders, and shadowing.
- Support stream badge icons, parsing & caching ([9d52ddc](https://github.com/realbestia1/erdb/commit/9d52ddcad5c9ada63b8aeb8a1a056e4379a3eb52))
  Add broad support for stream/quality badges including icons, improved filename parsing, and stronger caching.

  - ratingBadgeLogic: expanded StreamBadgeKey list, added STREAM_BADGE_META entries (labels, colors, icon URLs, iconWidthRatio), defined STREAM_BADGE_ORDER, categories and regex-based STREAM_BADGE_PATTERNS; replaced legacy flag handling with pattern-based parsing and scoring to choose best stream flags; avoid duplicate category badges.
  - badgeLayoutSvg: render badges from provided icon data URIs, adjust default fills to white, and refine SVG generation for various badges.
  - imageAssetPipeline: introduce PROVIDER_ICON_CACHE_VERSION and include size/tint/version in storage keys; support generating/resizing provider icons to requested output dimensions, corner radius based on actual size, optional tinting, and updated read/write to object storage.
  - imageRenderer: fetch provider icons for quality badges (tinted when appropriate), compute variable badge widths from metadata, adapt layout to variable widths with iterative fitting, and pass icon data into SVG builder.
  - workspace-controls-panel: remove the Quality Badge Style dropdown in certain simple poster preset cases.
  - streamBadges & routeConfig: bump cache keys/versions for stream badges and final image renderer to force cache invalidation.
  - package.json: bump package version to 0.4.80.

  These changes enable icon-based quality badges with proper resizing/tinting, more accurate stream detection from filenames, and safer caching/versioning.

## [0.4.79](https://github.com/realbestia1/erdb/compare/v0.4.78...v0.4.79) - 2026-05-17

- Remove 'solid-light' quality badge style ([783b30f](https://github.com/realbestia1/erdb/commit/783b30f77faefe04e79fafd658f6602083f38a3a))
  Drop special-case handling for the deprecated 'solid-light' badge style across the codebase. badgeLayoutSvg.ts: remove gradient, shadow/filter, and many conditional branches that customized radius, strokeWidth, text rendering and per-badge layouts for 'solid-light'; simplify wrapSvg and normalize sizing for several badges (4K, HDR, Dolby Vision/Atmos, Remux). ratingBadgeLogic.ts: stop accepting 'solid-light' in normalizeQualityBadgesStyle. ratingStyle.ts: remove the 'solid-light' option from QUALITY_BADGE_STYLE_OPTIONS. Behavior: any uses of 'solid-light' will now fall back to the default style (or be treated as plain/glass/square if set), so update configurations accordingly.
- Prefer 4k badge when trimming badge column ([16609f0](https://github.com/realbestia1/erdb/commit/16609f0eabff9cd5e483259e9a07b177619b7c94))
  Clone the quality badges into a local columnBadges array and, when reducing the badge column size, prefer to keep 4k badges by removing the last non-4k badge (or popping when none found). Use columnBadges for height calculations and when composing the badge column so the layout reflects the trimmed set. This prevents unintentionally dropping 4k badges while preserving spacing math and placement.
- Refactor poster quality badge placement ([82a23be](https://github.com/realbestia1/erdb/commit/82a23be4b1dd538c63fbdf79a341b160a437a120))
  Move and consolidate poster quality-badge placement logic later in renderWithSharp. Change qualityPlacement from const to let so 'auto' bottom placement can flip to 'top' when needed. Add top-placement flow that computes a quality layout, finds a safe Y via findPosterQualityRowY, composes the row at that Y and records top/bottom bounds (with a warning if collisions cannot be avoided). Keep the bottom-placement path but move it into an else-if. Also remove the preserveBadgeSize and contentLayoutOverride options from the poster row render call and perform minor related cleanup.
- Add new poster badge positions ([a5874d9](https://github.com/realbestia1/erdb/commit/a5874d957f2f2495e1f6d0c9bd8c7f21292ce072))
  Introduce new poster quality badge positions (top, bottom, above-logo) across types, UI options and workspace constants. Pass posterCleanOverlayEnabled through the route input and bump renderer cache version. Substantial renderer updates: flexible sizing for top badges, collision-avoidance placement for poster quality/column badges and ranking/genre badges, improved overlay composition and blocking-rect management, and handling for above-logo quality placement. Minor UI/preview tweaks and package version bump.

## [0.4.78](https://github.com/realbestia1/erdb/compare/v0.4.77...v0.4.78) - 2026-05-16

- . ([968491a](https://github.com/realbestia1/erdb/commit/968491ab618fb116ab4c6f0b5cbc85cbe136a2af))

## [0.4.77](https://github.com/realbestia1/erdb/compare/v0.4.76...v0.4.77) - 2026-05-16

- Simplify bottom quality badge layout ([bcb1e37](https://github.com/realbestia1/erdb/commit/bcb1e37a75a76bfc4fc7610ebc634a59d2a9d98c))
  Remove complex overlay- and spacing-specific logic for bottom-quality badge placement in lib/imageRenderer.ts and compute a single bottomRowY using posterReferenceBadgeHeight. Call composeQualityBadgeRow with the reference height and update lastPosterQualityTopY/BottomY accordingly to simplify layout behavior. Also bump package version to 0.4.77 in package.json.

## [0.4.76](https://github.com/realbestia1/erdb/compare/v0.4.75...v0.4.76) - 2026-05-16

- . ([808cb4a](https://github.com/realbestia1/erdb/commit/808cb4a4d292f6ff9f7480105c787684be22e893))

## [0.4.75](https://github.com/realbestia1/erdb/compare/v0.4.74...v0.4.75) - 2026-05-16

- Add compact ranking and above-logo genre ([d0c5dfa](https://github.com/realbestia1/erdb/commit/d0c5dfa8bb805b97e5bdb0b89aff7d338c1ef663))
  Introduce a new 'rankingCompact' option and support a new poster genre position 'above-logo'. Propagate rankingCompact through route handling, proxy/token config, controller state, types, and UI (checkbox in workspace controls). Update ranking badge SVG to render compact (number-only) badges and adjust layout/collision logic for genre and ranking placements. Other improvements: render dropdown menus into document.body with createPortal, tweak preview panel sizing, and refine many badge sizing/spacing/inset calculations. Also bump package version to 0.4.75.

## [0.4.74](https://github.com/realbestia1/erdb/compare/v0.4.73...v0.4.74) - 2026-05-16

- Change poster genre position and badge layout ([2d0ea2a](https://github.com/realbestia1/erdb/commit/2d0ea2a3baffd887e9d81f8cccd17458df94f38b))
  Set default poster genre position to 'bottom' and adjust the too-many-ratings message to account for poster image text when calculating allowed badges. Simplify genre badge placement in the image renderer by removing the collision-resolved flag/warning and always rendering the genre overlay and registering its blocking rect (loop break logic preserved). Bump package version to 0.4.74.

## [0.4.73](https://github.com/realbestia1/erdb/compare/v0.4.72...v0.4.73) - 2026-05-16

- Fix preview notice overlay and rating counts ([ef3de31](https://github.com/realbestia1/erdb/commit/ef3de31639891dd0c343161281a43ce8119c784a))
  Improve preview rendering and rating badge capacity:

  - Poster rating logic: when posterRatingsMaxPerSide is unset, account for posterImageText (adds extra badge slots when image text is not 'clean') while preserving left-right vs single-column and stacked vs non-stacked rules.
  - Workspace preview: avoid PreviewImage remounts by using a stable wrapper key and render previewNotice as a separate absolutely-positioned overlay with increased z-index.
  - Bump package version to 0.4.73.

## [0.4.72](https://github.com/realbestia1/erdb/compare/v0.4.71...v0.4.72) - 2026-05-16

- Improve poster badge placement & preview handling ([a68b6cc](https://github.com/realbestia1/erdb/commit/a68b6ccdb01bf2491f6f2d7fa84634df2836d90a))
  Stop rendering poster genre/ranking overlays when collision resolution fails to avoid misplaced badges; only add blocking rects for successfully placed badges. Update poster rating overflow logic for vertical layouts (and remove the now-unused getPosterRatingLayoutMaxBadges import), and provide a clearer user message recommending a lower Max/Side based on stacked vs. regular vertical badge content. Change workspace preview to always render the preview image when available and overlay any preview notice on top of it instead of hiding the image. Bump package version to 0.4.72.

## [0.4.71](https://github.com/realbestia1/erdb/compare/v0.4.70...v0.4.71) - 2026-05-15

- Add Stremio install link and fix badge collisions ([caa58bb](https://github.com/realbestia1/erdb/commit/caa58bb421d850615726ffe7b690af493ee25df2))
  Generate a stremio:// install URL from proxyUrl and expose it through the home/workspace derived props; update the WorkspaceProxyPanel to use that URL and change the CTA to “Install in Stremio”.

  Add rating overflow detection (counts enabled providers and compares against layout/max limits) and show a preview notice when too many ratings are enabled to avoid overlap; import getPosterRatingLayoutMaxBadges to compute poster limits.

  Improve image renderer badge placement: adjust genre width calculation, loosen compact text, add guarded collision-resolution loops for genre and ranking badges, clamp positions properly and emit console warnings if a badge can’t avoid collisions.

  Bump image renderer cache version and package version (v136->v137, 0.4.70->0.4.71) to reflect rendering changes.

## [0.4.70](https://github.com/realbestia1/erdb/compare/v0.4.69...v0.4.70) - 2026-05-14

- Add Addon Proxy blurb and bump version ([3bf5dcb](https://github.com/realbestia1/erdb/commit/3bf5dcb3d83f768ad5771bf6902248f50371974a))
  Add an informational blurb to the Workspace Proxy panel detailing the Addon Proxy features (rating badges, metadata translation, catalog customization, JustWatch rankings). Remove the previous Cinemeta-specific note. Bump package version to 0.4.70.

## [0.4.69](https://github.com/realbestia1/erdb/compare/v0.4.68...v0.4.69) - 2026-05-14

- update version ([28c7a5d](https://github.com/realbestia1/erdb/commit/28c7a5d2e0107136644782ee3fa652b24f595af1))
- Adjust workspace UI spacing and preview portal ([5faf910](https://github.com/realbestia1/erdb/commit/5faf9105abb169be0b731b8d2dbc226366d05d28))
  Refine layout and sizing across workspace components and mount the expanded preview to the document body.

  - Dropdown: tweak classes to stabilize width/height behavior and ensure consistent control sizing.
  - WorkspaceNav: adjust compact input font size, segment padding, and button heights; standardize language dropdown and mobile control heights to improve alignment and visual consistency.
  - WorkspacePreviewPanel: import createPortal and render the expanded preview overlay into document.body to avoid clipping; update the fixed viewport boundary to use left/right insets for better spacing on small screens.

  These changes unify control sizing and fix modal/preview clipping issues on small viewports.
- Add Dropdown and update workspace UI ([7539b22](https://github.com/realbestia1/erdb/commit/7539b220919375f07b0046fb5512fbf2ae626b7b))
  Introduce a reusable Dropdown component and replace native select controls in the workspace (language and other selects) with the new dropdown. Update HomePageView to use fixed header/footer and adjust main padding to account for the fixed bars. Tweak WorkspaceControlsPanel and WorkspaceNav layouts (flex-wrap, spacing, input/button sizes) and remove a duplicated login/logout block. Simplify WorkspacePreviewPanel image handling by replacing motion.img with a standard img and removing its layout/animation props. Miscellaneous UI refinements in proxy panel labels and checkbox sizing.
- Refactor controls UI and responsive nav ([5732552](https://github.com/realbestia1/erdb/commit/5732552476ba6e09ff4015bc790b545cdc883a4f))
  Introduce a reusable Section component and consolidate many control groups into compact dropdowns/selects in WorkspaceControlsPanel — replacing numerous button groups with select elements and a renderDropdown helper to simplify the UI and reduce duplication. Rework Poster/Backdrop/Logo/Thumbnail panels: combine language controls, streamline rating/layout/badge options, unify color/font controls, and simplify provider/ranking/genre blocks. Adjust small copy: change preview text label to "Text on ..." in use-home-page-controller. Revamp WorkspaceNav for responsiveness: make nav sticky, reorganize desktop vs mobile layouts, add scroll detection to hide/show compact action buttons, tighten MediaIdSearch input sizing, and rearrange action buttons (save/copy/rotate/logout) for desktop and mobile. Update tsconfig build info.
- Warn when TMDB/MDBList keys are missing in preview ([ddf795f](https://github.com/realbestia1/erdb/commit/ddf795f5b9390a658dbad05acf89102b36f6d370))
  Add validation messages for missing TMDB and MDBList API keys in the home page controller and surface them as a mobile floating notice in the workspace preview panel. The preview will not render on mobile when a key-warning is present; existing thumbnail/movie and episode ID validation is preserved. Also remove a now-redundant help text from the expanded preview.

## [0.4.68](https://github.com/realbestia1/erdb/compare/v0.4.67...v0.4.68) - 2026-05-13

- Add draggable mobile preview and reorder panels ([2cbc5e2](https://github.com/realbestia1/erdb/commit/2cbc5e2a65b8663d6170ed47b0eb476909514450))
  Introduce a floating, draggable mobile preview with an expand-to-overlay interaction (isExpanded + viewportRef) and a dedicated desktop preview layout. Adjust container classes and add xl ordering (xl:order-1/2/3) to Controls, Preview and Proxy panels so panel order/layout is correct on large screens. Add useRef import and tweak preview animations/constraints. Bump package version to 0.4.68 (package.json/package-lock updated; tsconfig build info regenerated).

## [0.4.67](https://github.com/realbestia1/erdb/compare/v0.4.66...v0.4.67) - 2026-05-13

- Normalize posterVignette handling and bump version ([58eb904](https://github.com/realbestia1/erdb/commit/58eb904bce879b7f5102f723cf3984c431b06834))
  Handle payload.posterVignette explicitly for 'on' and 'off' (set posterVignetteEnabled true for 'on'), and always emit posterVignette as either 'on' or 'off' instead of omitting it. Also bump package version from 0.4.66 to 0.4.67 in package.json and package-lock.json.
- Update .gitignore ([37ea7f8](https://github.com/realbestia1/erdb/commit/37ea7f81a5fded82506813710bcca6b73ec4e7fb))

## [0.4.66](https://github.com/realbestia1/erdb/compare/v0.4.65...v0.4.66) - 2026-05-13

- Add poster vignette toggle and handling ([b2439ee](https://github.com/realbestia1/erdb/commit/b2439eec37a99e969b00caad49fed08116b48b2d))
  Introduce a poster vignette option across the app: add UI toggle and state (home page, workspace types, controls panel), propagate setting through the home page controller (query/config encoding, cache keys), parse and include posterVignette in proxy/token config and addon proxy optional params, and honor the flag in image rendering (skip vignette when disabled). Also include route type update for fast render input and bump package version.

## [0.4.65](https://github.com/realbestia1/erdb/compare/v0.4.64...v0.4.65) - 2026-05-13

- Add poster genre badge and UI control ([c140553](https://github.com/realbestia1/erdb/commit/c1405530aff7f92ef35a0de3cdbed8bead5fb0cb))
  Introduce poster genre badges: add PosterGenrePosition type (off/top/bottom) and normalization, wire posterGenrePosition through token/proxy config and aiometadata params, and persist it in controllers and URL/query generation. Route logic now resolves the first TMDB genre name, includes genre in average rating display when enabled, and builds a posterGenreBadge for rendering; posterGenrePosition is included in cache keys/TTLs. Image renderer composes the genre badge (top/bottom), avoids collisions using poster blocking rects, and registers blocking rects for other badges; badge height estimation was slightly improved to avoid clipping. UI: expose genre position controls in workspace/home panels and toggle for including genre with average rating. Bump package version to 0.4.65.

## [0.4.64](https://github.com/realbestia1/erdb/compare/v0.4.63...v0.4.64) - 2026-05-13

- Unify and extend layout controls UI ([99eae0c](https://github.com/realbestia1/erdb/commit/99eae0c62ee4dcb40d4dd0b90732abb59516ada8))
  Consolidate and refactor layout-related controls into the main Styles & Texts panel and add new layout options for multiple preview types. Adds Poster Layout controls (ratings layout, max per side, vertical badge style) and a short note about Poster Text anime support; introduces Backdrop and Thumbnail layout settings (layout, size, max badges, vertical badge style) and improves Logo mode UI including custom logo font, color presets and max badges. Also adds separators and minor UI tweaks for spacing and headings. Bumps package version to 0.4.64.

## [0.4.63](https://github.com/realbestia1/erdb/compare/v0.4.62...v0.4.63) - 2026-05-13

- Use shared button style constants ([e86399f](https://github.com/realbestia1/erdb/commit/e86399ff93e32e6610b0112bfa862add35f8f860))
  Add reusable button style constants (BUTTON_GROUP_CONTAINER_CLASS, BUTTON_BASE_CLASS, BUTTON_ACTIVE_CLASS, BUTTON_INACTIVE_CLASS) and refactor WorkspaceControlsPanel to replace many duplicated inline button/group classes with those constants. The change centralizes and normalizes button/group styling across poster/backdrop/thumbnail/logo/quality/ranking controls and updates a few 'Auto' and preset buttons to use the new base/inactive classes. No functional logic changes—only CSS class consolidation and minor class tweaks for consistency.

## [0.4.62](https://github.com/realbestia1/erdb/compare/v0.4.61...v0.4.62) - 2026-05-13

- Add rankingPosition option and badge positioning ([3756b18](https://github.com/realbestia1/erdb/commit/3756b186313e52413b175ec6b0815238967b0335))
  Introduce a new RankingPosition option (auto/top/bottom/above-logo) and thread it through the app: types, normalization, token/config mapping, UI controls, aiometadata patterns, and runtime route handling. The image renderer was enhanced to honor rankingPosition when placing the ranking badge: new collision-avoidance logic (posterBlockingRects, rectsOverlap) and dedicated top calculation paths for top/above-logo/bottom/auto ensure badges don't overlap other overlays or quality badges. Also add UI options for selecting position and include rankingPosition in preview/config URLs and proxy token handling. Bump package version in package.json.

## [0.4.61](https://github.com/realbestia1/erdb/compare/v0.4.58...v0.4.61) - 2026-05-13

- Balance badges for left-right layout ([cd7a24f](https://github.com/realbestia1/erdb/commit/cd7a24fa1cfaeb2021126d78786b96d0817b48ed))
  Replace naive slicing with a distribution loop for the 'left-right' poster layout so badges are assigned to left/right columns more evenly while respecting the column limit. Also bump package version to 0.4.61.
- Extract route logic into lib modules ([4f51982](https://github.com/realbestia1/erdb/commit/4f51982bf97675f7336cfd3556f7ef730d97b68c))
  Refactor: pull large, self-contained logic out of app/[type]/[id]/route.ts into dedicated lib modules and reorganize related components. Added many new lib files (cachedFetch, ratingProviders, ratingProviderParsing, ratingBadgeLogic, imageAssetPipeline, imageRenderer, imageSvgText, animeProviders, externalMediaProviders, routeShared, routeConfig, routeTypes, routeUtils, streamBadges, tmdbMetadata, proxyTokenConfig, proxyMetaTransform, etc.) and new home-page utilities/hooks and workspace types. Updated route imports to use these libs, adjusted workspace and home-page components, and added related utilities for streaming badges, TMDB/rating handling, image generation and caching. Also includes package.json/package-lock updates. This improves modularity, testability and reuse by separating concerns (rating providers, image pipeline, caching and metadata) into independent modules.
- Update Dockerfile ([a9e97b4](https://github.com/realbestia1/erdb/commit/a9e97b44314ce7602f12ecca85d050123078008e))

## [0.4.6](https://github.com/realbestia1/erdb/compare/v0.4.58...v0.4.6) - 2026-05-13

- Extract route logic into lib modules ([4f51982](https://github.com/realbestia1/erdb/commit/4f51982bf97675f7336cfd3556f7ef730d97b68c))
  Refactor: pull large, self-contained logic out of app/[type]/[id]/route.ts into dedicated lib modules and reorganize related components. Added many new lib files (cachedFetch, ratingProviders, ratingProviderParsing, ratingBadgeLogic, imageAssetPipeline, imageRenderer, imageSvgText, animeProviders, externalMediaProviders, routeShared, routeConfig, routeTypes, routeUtils, streamBadges, tmdbMetadata, proxyTokenConfig, proxyMetaTransform, etc.) and new home-page utilities/hooks and workspace types. Updated route imports to use these libs, adjusted workspace and home-page components, and added related utilities for streaming badges, TMDB/rating handling, image generation and caching. Also includes package.json/package-lock updates. This improves modularity, testability and reuse by separating concerns (rating providers, image pipeline, caching and metadata) into independent modules.
- Update Dockerfile ([a9e97b4](https://github.com/realbestia1/erdb/commit/a9e97b44314ce7602f12ecca85d050123078008e))

## [0.4.58](https://github.com/realbestia1/erdb/compare/v0.4.57...v0.4.58) - 2026-05-12

- Bump to v0.4.58; update image cache & defaults ([ddcf2aa](https://github.com/realbestia1/erdb/commit/ddcf2aaa157af84dc46ed2d861f944460c1dfed7))
  Release bump to 0.4.58 (package.json + package-lock.json + tsbuildinfo). Update FINAL_IMAGE_RENDERER_CACHE_VERSION to 'poster-backdrop-logo-thumbnail-v136' and remove preserveBadgeSize from badge composition in the image renderer. Change HomePage defaults: ranking now defaults to 'daily' (including the simple preset) and currentVersion updated to 0.4.58. These changes align cache/versioning and adjust default UX for rankings.

## [0.4.57](https://github.com/realbestia1/erdb/compare/v0.4.56...v0.4.57) - 2026-05-12

- Adjust badge layout, use next/image, bump version ([4330009](https://github.com/realbestia1/erdb/commit/433000992f3b7b58592eefbbdfba580e33589135))
  Update image renderer cache version and refine logo/quality badge placement math to better compute available space and anchor Y positioning. Replace plain <img> with Next.js Image component for provider icons and import Image. Add ranking state and bump UI currentVersion to 0.4.57. Convert applyImportedConfig to a useCallback and update effect dependencies to avoid stale closures. Also update package.json version accordingly.

## [0.4.56](https://github.com/realbestia1/erdb/compare/v0.4.55...v0.4.56) - 2026-05-12

- Add 'solid-light' badge style & poster average ratings ([51b4ca7](https://github.com/realbestia1/erdb/commit/51b4ca74200265811d26956eea9c9cdf7f7324bb))
  Introduce a new quality badge style 'solid-light' and update SVG rendering to support it (shape, gradients, shadows, font sizing). Add optional qualityBadge size/spacing overrides (qualityBadgeIconSize/FontSize/PaddingX/PaddingY/Gap) and preserveBadgeSize handling so poster badges can retain custom sizing. Refine poster badge placement and layout heuristics (including top/bottom placement, spacing, overlay interactions) and adjust various badge/label sizing and ranking badge scaling. Add posterAverageRatingsEnabled config and proxy mapping, plus posterSimpleRatingSource and rankingNoBox passthroughs. Bump image renderer cache version and package version to 0.4.56 and wire UI changes to expose the new options in workspace and home components.

## [0.4.55](https://github.com/realbestia1/erdb/compare/v0.4.54...v0.4.55) - 2026-05-12

- Enable poster-only ranking UI and proxy keys ([de6a4d8](https://github.com/realbestia1/erdb/commit/de6a4d853b38e36525850d6c89edb21f1e02a042))
  Restrict JustWatch ranking to poster previews: ranking params are now only applied for imageType === 'poster' and the Ranking panel in the workspace is shown only when previewType is 'poster'. Add ranking keys to the proxy/ERDB config (ranking, rankingCountry, rankingNoBox) so the addon proxy supports the new options. Change default ranking state to 'on' and initialize new profiles with ranking enabled. Also bump package version to 0.4.55 (package.json + package-lock.json) and include minor JSX/formatting cleanups in the workspace controls panel.

## [0.4.54](https://github.com/realbestia1/erdb/compare/v0.4.53...v0.4.54) - 2026-05-12

- Bump app version and update image vignette ([0f7977a](https://github.com/realbestia1/erdb/commit/0f7977a3ed84f5a8a2f14820af90a7a3542880b0))
  Bump app version to 0.4.54 (package.json) and update UI currentVersion to match. Increment FINAL_IMAGE_RENDERER_CACHE_VERSION to v113 to force image cache invalidation. Simplify poster vignette SVG in the image renderer: replace multiple linear gradient edges and rects (and the edgeSize calculation) with a single radial gradient overlay for a cleaner vignette effect.

## [0.4.53](https://github.com/realbestia1/erdb/compare/v0.4.52...v0.4.53) - 2026-05-12

- Bump release to 0.4.53; add poster vignette ([7e501af](https://github.com/realbestia1/erdb/commit/7e501afc9c46223d680b39cecea6eb227b7a75d2))
  Bump project version to 0.4.53 (package.json, package-lock.json, and HomePage display). Increment FINAL_IMAGE_RENDERER_CACHE_VERSION to 'poster-backdrop-logo-thumbnail-v112' to force cache invalidation for image renderer changes. Add a subtle SVG vignette overlay for poster images in renderWithSharp to darken edges. Also include small SVG glow generation/formatting cleanups and minor whitespace/formatting adjustments in route.ts.
- Update route.ts ([bb83a86](https://github.com/realbestia1/erdb/commit/bb83a865c13e62c2e707437a6fc9aedbf3392eee))

## [0.4.52](https://github.com/realbestia1/erdb/compare/v0.4.51...v0.4.52) - 2026-05-12

- Exclude generic catalog IDs from anime text prefs ([2c4bd07](https://github.com/realbestia1/erdb/commit/2c4bd078a28b43e09cfb6347a4ad6b710d8ffbf0))
  Don't apply anime-specific poster/backdrop text preferences for generic catalog IDs (tmdb, tvdb, realimdb, imdb or tt-prefixed IDs). Introduce isGenericCatalogId and shouldApplyAnimeTextPreference, and use that when computing effective poster/backdrop text preferences. Also bump package version to 0.4.52 and update the displayed currentVersion in the home page component.

## [0.4.51](https://github.com/realbestia1/erdb/compare/v0.4.43...v0.4.51) - 2026-05-12

- Fix poster quality badge placement, bump version ([8629a77](https://github.com/realbestia1/erdb/commit/8629a77a5f80ce7e4d563921d601e66a3aae8785))
  Adjust poster quality badge placement and rendering logic to respect the qualityBadgesSide setting and avoid overlaps: use qualityBadgesSide for 'top-bottom' layouts, make composeQualityBadgeRow return its height and update badgeTopOffset when placing top quality badges, auto-switch placement if bottom ratings exist, pass explicit left/right to composeQualityBadgeColumn, and nudge ranking overlays to not overlap the last overlay. Also bump package and app version to 0.4.51 and update the homepage currentVersion.
- Add glow text generator for badge SVGs ([09ab2dd](https://github.com/realbestia1/erdb/commit/09ab2ddcf0e641939e15dbbcd2922654b30355a8))
  Introduce generateGlowText helper to replace the previous filter-based text shadow (plainDefs/filterAttr) with a layered stroke-based glow for plain reference mode. Remove redundant <defs> usage and consistently apply universalStroke for colored text. Update multiple quality badge variants (4K, HDR, Dolby Vision/ATMOS, REMUX, etc.) to use the new generator or universal stroke, simplifying SVG output and improving visual consistency.
- Replace SVG text-shadow filter with stroked glow ([c2c2471](https://github.com/realbestia1/erdb/commit/c2c2471d83d658aa3897f834d113d97b9a0e936a))
  Remove the SVG feGaussianBlur-based text-shadow/filter and replace it with multi-layer stroked text "glow" for plain badges. Simplifies text/icon rendering by dropping itemFilter/valueFilter usage, introduces textInnerContent and commonAttrs to centralize value text construction, and builds glow layers for both value and ranking badges (rankGlowLayers/labelGlowLayers). Also adds a blurDef placeholder and integrates glow layers into the generated SVG output. These changes reduce reliance on filter primitives and standardize the visual glow effect.
- Add JustWatch ranking badges and controls ([844e056](https://github.com/realbestia1/erdb/commit/844e056dc246b1731b8e3e5a53dcb4e0f46724ad))
  Introduce JustWatch-based ranking support and UI controls across the app. This adds a GraphQL query and fetchRanking logic (with caching and country/language normalization), builds a ranking SVG badge (with optional icon/box), and composes it into the existing image rendering pipeline. Exposes ranking settings through the proxy/token, workspace/home UI (new controls, options, and country mappings), and aiometadata pattern generation. Also includes layout and badge placement tweaks, a renderer cache version bump, small SVG/string fixes, a debug log append for GET requests, and a minor front-end version bump.

## [0.4.5](https://github.com/realbestia1/erdb/compare/v0.4.43...v0.4.5) - 2026-05-12

- Add glow text generator for badge SVGs ([09ab2dd](https://github.com/realbestia1/erdb/commit/09ab2ddcf0e641939e15dbbcd2922654b30355a8))
  Introduce generateGlowText helper to replace the previous filter-based text shadow (plainDefs/filterAttr) with a layered stroke-based glow for plain reference mode. Remove redundant <defs> usage and consistently apply universalStroke for colored text. Update multiple quality badge variants (4K, HDR, Dolby Vision/ATMOS, REMUX, etc.) to use the new generator or universal stroke, simplifying SVG output and improving visual consistency.
- Replace SVG text-shadow filter with stroked glow ([c2c2471](https://github.com/realbestia1/erdb/commit/c2c2471d83d658aa3897f834d113d97b9a0e936a))
  Remove the SVG feGaussianBlur-based text-shadow/filter and replace it with multi-layer stroked text "glow" for plain badges. Simplifies text/icon rendering by dropping itemFilter/valueFilter usage, introduces textInnerContent and commonAttrs to centralize value text construction, and builds glow layers for both value and ranking badges (rankGlowLayers/labelGlowLayers). Also adds a blurDef placeholder and integrates glow layers into the generated SVG output. These changes reduce reliance on filter primitives and standardize the visual glow effect.
- Add JustWatch ranking badges and controls ([844e056](https://github.com/realbestia1/erdb/commit/844e056dc246b1731b8e3e5a53dcb4e0f46724ad))
  Introduce JustWatch-based ranking support and UI controls across the app. This adds a GraphQL query and fetchRanking logic (with caching and country/language normalization), builds a ranking SVG badge (with optional icon/box), and composes it into the existing image rendering pipeline. Exposes ranking settings through the proxy/token, workspace/home UI (new controls, options, and country mappings), and aiometadata pattern generation. Also includes layout and badge placement tweaks, a renderer cache version bump, small SVG/string fixes, a debug log append for GET requests, and a minor front-end version bump.

## [0.4.43](https://github.com/realbestia1/erdb/compare/v0.4.42...v0.4.43) - 2026-05-11

- Fetch TMDB genres dynamically and update lookup ([d9942f1](https://github.com/realbestia1/erdb/commit/d9942f1a8695a39bb13b3655c5e42010bdf85f3f))
  Remove hardcoded TMDB genre maps and unused cache size constants; add fetchTmdbGenres to fetch and cache genre lists from TMDB. Make getFirstTmdbGenreName async and extend its signature (tmdbKey, language, phases) so it can fetch localized genre names when media.genre_ids are present. Add input guards and use the fetched genre map for id->name resolution; update the call site to await the new async function. This enables up-to-date, localized genre names and removes reliance on static mappings.

## [0.4.42](https://github.com/realbestia1/erdb/compare/v0.4.41...v0.4.42) - 2026-05-11

- . ([ba4ad84](https://github.com/realbestia1/erdb/commit/ba4ad8421d06231b24e8b3e62d1c924235891ece))
- Update route.ts ([97ea3a4](https://github.com/realbestia1/erdb/commit/97ea3a46e927a50384321f9ba92badf7f02d14b0))
- Update route.ts ([7a1bdfe](https://github.com/realbestia1/erdb/commit/7a1bdfe7931b01e1b86c23e7a8caba2efa721bf7))

## [0.4.41](https://github.com/realbestia1/erdb/compare/v0.4.4...v0.4.41) - 2026-05-11

- Improve SVG shadow rendering and bump version ([fa12b39](https://github.com/realbestia1/erdb/commit/fa12b39e143bbf4258a5849d778780af4a6b7114))
  Replace multiple feDropShadow usages with explicit SVG filter chains (feGaussianBlur, feFlood, feComposite, feOffset, feMerge) to produce more consistent shadows and better control. Add universal stroke and filter attributes to text elements, expand SVG viewBox bounds to avoid clipping, and update FINAL_IMAGE_RENDERER_CACHE_VERSION. Also bump package version to 0.4.41 (package.json + package-lock.json). Changes target app/[type]/[id]/route.ts and package metadata.

## [0.4.4](https://github.com/realbestia1/erdb/compare/v0.4.3...v0.4.4) - 2026-05-11

- fix ([90ac99a](https://github.com/realbestia1/erdb/commit/90ac99a94e4b3173ad1114d12a50d8257f12e728))

## [0.4.3](https://github.com/realbestia1/erdb/compare/v0.4.2...v0.4.3) - 2026-05-11

- fix token ([9031c9d](https://github.com/realbestia1/erdb/commit/9031c9d26ae1a418d8a56b433517c8dcfa444995))

## [0.4.2](https://github.com/realbestia1/erdb/compare/v0.4.1...v0.4.2) - 2026-05-11

- Handle poster preset/ratings and bump version ([92cb5b8](https://github.com/realbestia1/erdb/commit/92cb5b8d688b3103c1fc9ddb134290d49486774e))
  Parse posterConfiguratorPreset and posterRatingsMode from the payload and update component state accordingly: setPosterConfiguratorPreset for 'simple' or 'advanced', and setPosterAverageRatingsEnabled when posterRatingsMode is 'average' (false for 'separate'). Also bump package version to 0.4.2.

## [0.4.1](https://github.com/realbestia1/erdb/compare/v0.4.0...v0.4.1) - 2026-05-11

- Refactor poster rating config and bump version ([52ea033](https://github.com/realbestia1/erdb/commit/52ea03325ff609bf6ae59f53e13bc768d1e90a9c))
  Consolidate poster rating configuration in HomePage: add explicit handling for the 'simple' posterConfiguratorPreset (sets posterConfiguratorPreset, posterRatingsMode, posterRatings, posterRatingStyle, and posterRatingsLayout) and simplify conditional assignments for non-simple presets. Add handling for vertical poster rating layouts to set posterRatingsMaxPerSide when applicable, and keep backdrop/thumbnail/logo rating style assignments conditional. Also bump package version to 0.4.1 in package.json.

## [0.4.0](https://github.com/realbestia1/erdb/compare/v0.3.31...v0.4.0) - 2026-05-11

- Support poster average rating & simple preset ([6e2003f](https://github.com/realbestia1/erdb/commit/6e2003fce64598b2fe177aefbbe3ed90d8d302ed))
  Introduce a 'simple' poster configurator preset and support an 'average' synthetic rating badge. Updates include: add TMDB genre name maps and a star SVG icon, parse/format rating values, compute average poster rating and inject an 'average' badge, and wire new posterRatingsMode/posterConfiguratorPreset query params. Improve badge measurement and SVG rendering (plain style, star/genre stacking, icon handling), add poster top/bottom blur overlays for title/logo layouts, and bump final image renderer cache version. Also wire UI state and props in home-page and home-page-view to expose the new preset and average rating controls.

## [0.3.31](https://github.com/realbestia1/erdb/compare/v0.3.30...v0.3.31) - 2026-05-08

- Bump package version to 0.3.31 ([0d46e38](https://github.com/realbestia1/erdb/commit/0d46e383dd8d4116ac8be94bdab0b009390f626f))
  Update package.json and package-lock.json to version 0.3.31 for a patch release. No functional code changes; the lockfile was updated to reflect the new package version.
- Limit dataset sync to first worker; add monitoring ([2d3c93c](https://github.com/realbestia1/erdb/commit/2d3c93caf75d89a8ea474f619c5eb1d46ec63f6a))
  Prevent redundant dataset syncs by importing cluster in lib/imdbDatasetSync.ts and skipping sync in workers except the first (worker id 1), avoiding duplicate work and memory spikes. In scripts/start-server.js, introduce a workers map and spawnWorker helper to track forks and respawn workers on exit, and add a memory monitor that requests per-worker memory via IPC (logs primary and worker memory every 5 minutes, with an initial log after 30s). Also add a worker-side IPC handler to respond with process.memoryUsage() when requested.

## [0.3.30](https://github.com/realbestia1/erdb/compare/v0.3.29...v0.3.30) - 2026-04-16

- Require token password and validate manifest URLs ([34bf868](https://github.com/realbestia1/erdb/commit/34bf8683772e4f9bac673a0378d585b4cece2385))
  Security and API updates: require a password for GET /api/token and verify it against stored password_hash (uses accountsDb and verifyPassword) before returning token config; add isSafeUrl checks in proxy manifest parsing to block localhost, private IP ranges, and cloud metadata addresses to mitigate SSRF; update docs page to reflect the new GET /api/token?password requirement; bump package version to 0.3.30.

## [0.3.29](https://github.com/realbestia1/erdb/compare/v0.3.28...v0.3.29) - 2026-04-15

- Prefer local IMDB dataset; add MDList fallback ([a1d65fc](https://github.com/realbestia1/erdb/commit/a1d65fc86820370f2a850ac72ac2d5312584f856))
  Prioritize local IMDB dataset when resolving series/episodes and add a MDList remote resolution step before falling back to TMDB. Introduces isImdbSeriesFromDataset in lib/imdbDataset to detect series with episodes in the local DB. Reworks app/[type]/[id]/route.ts to: 1) prefer dataset-derived TV detection, 2) resolve via mdblist.com when available, and 3) use TMDB find as a fallback with improved heuristics for choosing movie vs TV and handling episode/show IDs. Also update aiometadata id patterns in components/home-page.tsx to use 'tmdb:{type}:{tmdb_id}' and bump package.json version to 0.3.29.

## [0.3.28](https://github.com/realbestia1/erdb/compare/v0.3.27...v0.3.28) - 2026-04-14

- Use Filmweb API for ID lookup ([701fe21](https://github.com/realbestia1/erdb/commit/701fe21e028a95a3a5f20cb4addfcac37bbf05f2))
  Replace DuckDuckGo HTML scraping with Filmweb's live search API to find film/serial IDs. Use fetchJsonCached and a new cache key namespace (filmweb:search:v1), filter searchHits by type, and fetch per-title info (/api/v1/title/:id/info) to verify year and title/originalTitle before returning an ID. Remove the regex-based extractFilmwebIdFromText helper and adjust request headers and variable names. Also bump package version to 0.3.28.

## [0.3.27](https://github.com/realbestia1/erdb/compare/v0.3.26...v0.3.27) - 2026-04-14

- Refactor preview image, adjust counters & props, bump v0.3.27 ([600fcbf](https://github.com/realbestia1/erdb/commit/600fcbf5d90c4df371d65dba80ce7b652f721e7f))
  Extract preview image UI into a PreviewImage component in workspace-preview-panel (manages its own loading state and shimmer/animation), remove unused useEffect import, and simplify preview rendering. Tweak AnimatedCounter to avoid setting state when target is 0 and render 0 directly. Expand HomePage props and hooks to include anime/backdrop/logo language variants and additional rating/thumbnail options; adjust several useMemo dependency arrays and include fanartKey in dependencies. Bump package version to 0.3.27.

## [0.3.26](https://github.com/realbestia1/erdb/compare/v0.3.25...v0.3.26) - 2026-04-14

- Install dev deps and add prod-deps pruning stage ([52bdbd8](https://github.com/realbestia1/erdb/commit/52bdbd8204d4bb4aff01b18df08240fe7e16ab50))
  Set NODE_ENV=development and install devDependencies in the deps stage (npm ci --include=dev). Add a prod-deps stage that copies package*.json and node_modules from deps and runs npm prune --omit=dev to strip devDependencies for the runtime image. Update the runner to copy node_modules from prod-deps so builds have dev deps but the final image is smaller and production-only.

## [0.3.25](https://github.com/realbestia1/erdb/compare/v0.3.24...v0.3.25) - 2026-04-14

- Add workspace configurator password protection ([06ff2b0](https://github.com/realbestia1/erdb/commit/06ff2b05080b8cc57537d76c7d65ec918a355a2c))
  Introduce a global configurator password and cookie-based access gating.

  - Add lib/workspaceAccess.ts to manage a signed, time-limited workspace access cookie and helper functions (enable check, verify, grant, clear).
  - Require workspace access in API routes (token and workspace-config endpoints) and add access checks to workspace-auth route (gate-status, verify-access actions, and clear access on logout).
  - Update configurator and auth UI to prompt for and verify the global password before allowing token operations, login/register, or guest access. Adds form fields and client flows to unlock the configurator.
  - Update .env.example with environment variables for WORKSPACE_SESSION_SECRET, WORKSPACE_SESSION_SECURE, and ERDB_CONFIGURATOR_PASSWORD and guidance.
  - Bump app version to 0.3.25 in package.json (and lockfile).

  This change protects workspace configuration and token management behind an optional global password while preserving guest mode when unlocked.

## [0.3.24](https://github.com/realbestia1/erdb/compare/v0.3.23...v0.3.24) - 2026-04-13

- Add TMDB title search and active-user stats ([6e5395f](https://github.com/realbestia1/erdb/commit/6e5395f4ff5b691d791b393338be79457de88e21))
  Add server endpoints and UI for TMDB title search and site stats. Introduces /api/search-title to query TMDB (returns TMDB/IMDB ids, poster, year, type) and /api/stats to return active user count from accountsDb. Adds a MediaIdSearch component in the workspace nav with debounce, dropdown results, and TMDB-key driven search; integrates icons and loading state. Home page now fetches /api/stats, exposes userCount to the view, and renders an AnimatedCounter badge showing active users. Also bumps package version to 0.3.24 and updates build info.

## [0.3.23](https://github.com/realbestia1/erdb/compare/v0.3.22...v0.3.23) - 2026-04-11

- Bump v0.3.23; add backdrop & fanart configs ([9c26f2b](https://github.com/realbestia1/erdb/commit/9c26f2b1a0e46d1bc67bef96a2e92d3e9317346f))
  Bump project version to 0.3.23 and update HomePage to reflect the new version. Add backdropRatingsMax to the ratings state usage and include fanartKey in the effect dependency list to enable backdrop rating limits and fanart API key support.

## [0.3.22](https://github.com/realbestia1/erdb/compare/v0.3.21...v0.3.22) - 2026-04-10

- Add Fanart.tv fallback for textless images ([2a703d3](https://github.com/realbestia1/erdb/commit/2a703d33621f69ca1b008e245d181301c66c58a8))
  Integrate optional Fanart.tv support as a fallback when TMDB lacks textless posters/backdrops. Adds FANART_API_KEY env var and a fanartKey token/config param, a fetchFanartImages helper (12h cache, sorts images by likes), and uses Fanart results for 'clean'/'alternative' poster/backdrop fallbacks. Wires fanartKey through the UI (home/workspace controls), localStorage persistence, proxy token mapping, and cache keys so behavior can be toggled per-token. Also bumps package version.
- Add backdropRatingsMax support ([c1b16b1](https://github.com/realbestia1/erdb/commit/c1b16b1ab36a824f41e96039a3c2373915d19a6f))
  Introduce a new backdropRatingsMax setting to limit the number of rating badges on backdrops. Added lib/backdropRatingsMax.ts with normalization, min/max (1–20) and default (null). Wired the value through token parsing and query generation in app/[type]/[id]/route.ts, updated proxy manifest and config handling in app/proxy/[...path]/route.ts and lib/addonProxy.ts, and added UI/state bindings and controls in HomePage, Workspace page/view and workspace controls so users can set/reset the value. Also applied the cap when building badge arrays so backdrop badges respect the configured maximum.

## [0.3.21](https://github.com/realbestia1/erdb/compare/v0.3.20...v0.3.21) - 2026-04-07

- Bump to v0.3.21; add image language props ([a90ebce](https://github.com/realbestia1/erdb/commit/a90ebce949406357b3b9f0795bdb2f1975d56f55))
  Update project version to 0.3.21 (package.json and package-lock.json) and sync UI state in HomePage (currentVersion -> 0.3.21). Also expose additional image-language props in HomePage parameter destructuring: backdropLang, backdropAnimeLang, logoLang, logoAnimeLang, and backdropAnimeImageText to support more localized image/text options.

## [0.3.20](https://github.com/realbestia1/erdb/compare/v0.3.19...v0.3.20) - 2026-04-05

- Refactor workspace UI and tweak defaults ([2c53dae](https://github.com/realbestia1/erdb/commit/2c53daed660befd4bd7037ca8dfbfa5e6c303be4))
  Extract workspace UI into new components (workspace-nav, workspace-controls-panel, workspace-preview-panel, workspace-proxy-panel, workspace-modals, constants) and export several types. Replace inline nav/controls/modal code in WorkspacePageView with Workspace* components. Adjust HomePage defaults and behaviors: change default lang to en-US, update various image/text/rating/badge defaults (including posterAnimeImageText, backdropStreamBadges, posterQualityBadgesStyle, several rating layouts/styles, thumbnailSize, logoRatingsMax), bump currentVersion to 0.3.20, and add isHydrated/isPreviewHydrated guards to prevent premature localStorage writes. Also update package.json (and lockfile) accordingly.

## [0.3.19](https://github.com/realbestia1/erdb/compare/v0.3.18...v0.3.19) - 2026-04-04

- Reorder anime fallback logic & bump version ([f3edb4b](https://github.com/realbestia1/erdb/commit/f3edb4b1734e2bd8c18a0f4f3484ac33be62e158))
  Rework fallback flow in app/[type]/[id]/route.ts to try Kitsu-based fallback first (via fetchKitsuIdFromReverseMapping + fetchKitsuFallbackAsset) before falling back to the native direct asset. Adds flags (usedNoTmdbFallback / usedTmdbFailFallback) to track whether a fallback was applied and only throw a 404 if no fallback succeeded. Also updates related parameter usage for the fallback calls and simplifies the control flow. Bump app version to 0.3.19 and update HomePage currentVersion to match.

## [0.3.18](https://github.com/realbestia1/erdb/compare/v0.3.17...v0.3.18) - 2026-04-04

- Add MAL/Anilist anime fallbacks; bump version ([b5c809a](https://github.com/realbestia1/erdb/commit/b5c809a60654ee47374a69c46e9a5f5342ec8b5a))
  Introduce direct fallback support for MyAnimeList (via Jikan) and Anilist: new fetchers, pickers, and asset builders (poster/backdrop/logo/thumbnail) and a native direct-fallback flow for anime mapping providers. Replace several Kitsu-only fallback paths with a unified applyAnimeCdnFallback helper and adjust rating/provider handling to surface provider-specific ratings when using direct fallbacks. Also handle thumbnail imageType earlier and update MAL rating lookup to reuse the Jikan helper. Bump package and UI currentVersion to 0.3.18; tsbuildinfo updated.

## [0.3.17](https://github.com/realbestia1/erdb/compare/v0.3.16...v0.3.17) - 2026-04-04

- fix(poster): infer TMDB season for MAL/AniList/AniDB and use season artwork like Kitsu ([2935b3d](https://github.com/realbestia1/erdb/commit/2935b3d243ac491cd7d7ef0d0ac7ec26fa39cf87))
  - After reverse-mapping native anime IDs (mal/anilist/anidb) to TMDB TV, probe
  animemapping with ep=1 when season is unset and subtype is not movie, mirroring
  the Kitsu path so season maps to the correct TMDB season_number.
  - Prefer TMDB season posters for all native anime inputs (hasNativeAnimeInput) when
  season is known and episode is absent, not only kitsu:*.
- Update README.md ([211156a](https://github.com/realbestia1/erdb/commit/211156a0168fb5b989e3a23506d9573c08415a2d))
- Update README.md ([b4b32b4](https://github.com/realbestia1/erdb/commit/b4b32b4f31ab0e6d1686a4b6c8ea5a8881189b95))
- Update README.md ([8e3e6e7](https://github.com/realbestia1/erdb/commit/8e3e6e719ca9b7d71c8d5b48413b7b40feb2ddd1))
- Update README.md ([5bdb4ca](https://github.com/realbestia1/erdb/commit/5bdb4ca4a64ce9a35740bcad3bf62205f07f7dd3))
- Update README.md ([95333e9](https://github.com/realbestia1/erdb/commit/95333e991493c5fd41ad18f7898c20db80bc2a7c))
- . ([7b2dd8f](https://github.com/realbestia1/erdb/commit/7b2dd8fb3f1d79e29b400b03882c61672199d7c5))
- Update README.md ([17a33c2](https://github.com/realbestia1/erdb/commit/17a33c2c749e6978f9209a8fbd40cc9acbcfa4fd))
- Delete Dockerfile.hf ([ed09d95](https://github.com/realbestia1/erdb/commit/ed09d9555de4fe5afcb6dfc1efb8af1a07dc48e3))
- Update README.md ([0d4acaf](https://github.com/realbestia1/erdb/commit/0d4acaff4b69c790d6415719deeaeb444f424507))

## [0.3.16](https://github.com/realbestia1/erdb/compare/v0.3.15...v0.3.16) - 2026-04-04

- docs(ai): allow configurable ERDB base URL with default easyratingsdb.com ([3936069](https://github.com/realbestia1/erdb/commit/39360691ccaf48169329c781623c1295fce1db22))
  - add optional `erdbBaseUrl` guidance to the AI integration prompt
  - keep `https://easyratingsdb.com` as the default base URL
  - document automatic trailing-slash normalization
  - clarify self-hosted ERDB override behavior in the public docs
  - bump app/package version to `0.3.16`

## [0.3.15](https://github.com/realbestia1/erdb/compare/v0.3.14...v0.3.15) - 2026-04-04

- Add Filmweb user and critics rating providers with automatic IMDb/TMDB mapping fallback
  - add `filmweb` and `filmwebcritics` to the rating provider catalog and configurator/docs lists
  - resolve Filmweb IDs from IMDb/TMDB via Wikidata first, then fall back to cached title/year search
  - fetch Filmweb user ratings from `/api/v1/film/{id}/rating` and critics ratings from `/api/v1/film/{id}/critics/rating`
  - cache Filmweb mapping, search, and rating responses in metadata cache with dedicated TTL handling
  - wire Filmweb providers into poster, backdrop, and logo rendering flows

## [0.3.14](https://github.com/realbestia1/erdb/compare/v0.3.13...v0.3.14) - 2026-04-04

- fix(backdrop): prefer native-language backdrop over clean fallback for original language mode ([2420d44](https://github.com/realbestia1/erdb/commit/2420d44c58baa1406856f4a69bc62de16c2c5807))
  - fix backdrop selection when `Backdrop Language=original` and `Backdrop Text=default`
  - resolve the effective backdrop language from the media `original_language` before backdrop selection
  - prefer the resolved native-language backdrop path before generic language fallback ordering
  - prevent language-neutral (`null`) clean backdrops from winning over a valid native-language backdrop in default mode
  - bump final image renderer cache version from `v62` to `v63` to invalidate stale cached backdrop renders
  - bump package/app version from `0.3.13` to `0.3.14`

## [0.3.13](https://github.com/realbestia1/erdb/compare/v0.3.12...v0.3.13) - 2026-04-04

- fix(poster): resolve IMDb poster fallback and original-language image selection ([c801899](https://github.com/realbestia1/erdb/commit/c80189956f38f9a798a858c567b9c68ec893ab63))
  - fix IMDb poster resolution for titles that expose a valid TMDB match but return an empty `images.posters` collection for the requested language
  - fallback to TMDB `poster_path` / `backdrop_path` when the localized image collection is empty instead of returning `404 Image not found`
  - fix `posterLang=original` so `include_image_language` is resolved from the media's real `original_language` after TMDB lookup, rather than incorrectly reusing the request language
  - unify original-language handling across poster/backdrop/logo image language resolution with shared helpers
  - improve TMDB ID resolution so IMDb IDs can also map through `tv_episode_results` when TMDB classifies the external ID as an episode
  - bump package/app version from `0.3.12` to `0.3.13`

## [0.3.12](https://github.com/realbestia1/erdb/compare/v0.3.11...v0.3.12) - 2026-04-03

- feat(images): add anime-specific backdrop and logo language controls and fix localized artwork selection ([933f724](https://github.com/realbestia1/erdb/commit/933f724b524081d5fde77216eb51e08c20200c07))
  - add `Backdrop Language` and `Backdrop Language Anime` controls across UI, config import/export, proxy config, token config, and server-side rendering
  - add `Logo Language` and `Logo Language Anime` controls across UI, config import/export, proxy config, token config, and server-side rendering
  - add `Backdrop Text Anime` and wire it through preview, saved config, proxy forwarding, and server-side backdrop selection
  - rename poster text mode `original` to `default` while preserving backward compatibility for legacy `original` query/config values
  - make poster and backdrop `default` resolve to the default artwork for the selected language
  - make poster and backdrop `alternative` exclude the current default artwork and prefer a different artwork in the same selected language
  - fix the case where `Backdrop Text` `default` and `clean` could resolve to the same image
  - fix build and type issues introduced during the language/text-mode expansion
  - rename the dynamic image route handler from `route.tsx` to `route.ts` to restore a clean Next.js production build
  - bump project version from `0.3.11` to `0.3.12`

## [0.3.11](https://github.com/realbestia1/erdb/compare/v0.3.10...v0.3.11) - 2026-04-03

- build error fix ([e56d637](https://github.com/realbestia1/erdb/commit/e56d6373eb0de46eb389c864aa1db41523b76cec))

## [0.3.10](https://github.com/realbestia1/erdb/compare/v0.3.9...v0.3.10) - 2026-04-03

- fix(poster): rename original to default and fix localized alternative poster selection txt ([ba39b41](https://github.com/realbestia1/erdb/commit/ba39b414dade7fb628128d9f84dc9e371c1c8fad))
  - rename poster text mode `original` to `default` across UI and server-side poster selection
  - preserve backward compatibility by normalizing legacy `original` query/config values to `default`
  - make `default` resolve to the default poster for the selected poster language
  - make `alternative` exclude the current default poster and prefer a different poster in the same selected language
  - update configurator labels and inline docs from `original` to `default`
  - bump project version from `0.3.9` to `0.3.10`

## [0.3.9](https://github.com/realbestia1/erdb/compare/v0.3.8...v0.3.9) - 2026-04-03

- fix(poster): resolve clean poster logo/title fallback for regional locales ([50321e2](https://github.com/realbestia1/erdb/commit/50321e2cc8b418322174d5f16520bca232079537))
  - fix TMDB translation fallback so regional locales resolve through a base-language chain like `it-IT -> it -> en`
  - add a reusable fallback-chain helper for localized TMDB detail requests
  - always include `include_image_language` for poster image/logo fetches
  - improve clean poster logo selection so the chosen logo must actually match the requested language or its base language
  - continue fallback lookup when the initially selected logo is present but not language-compatible
  - update poster image fallback requests to use the same image-language constraints
  - bump final image renderer cache version to `v62` to invalidate stale cached poster outputs
  - bump project version from `0.3.8` to `0.3.9`

## [0.3.8](https://github.com/realbestia1/erdb/compare/v0.3.7...v0.3.8) - 2026-04-03

- fix(poster): handle regional locale fallback for clean title overlay ([bd90a19](https://github.com/realbestia1/erdb/commit/bd90a196e4dd1becfd4ac21a96c6cfa7064a96da))
  - fix TMDB translation fallback in `app/[type]/[id]/route.tsx`
  - derive the base language from the normalized locale before evaluating translation fallbacks
  - allow regional locales like `it-IT` to correctly resolve base-language translations like `it`
  - bump project version from `0.3.7` to `0.3.8`
  - bump final image renderer cache version from `v58` to `v59` to invalidate stale cached poster outputs
  - add changelog entry for `0.3.8`

## [0.3.7](https://github.com/realbestia1/erdb/compare/v0.3.6...v0.3.7) - 2026-04-03

- Improve SQLite WAL management in v0.3.7 ([8c1ca2c](https://github.com/realbestia1/erdb/commit/8c1ca2c82b474622248d605a2c7f358b406b7369))
  - improve SQLite WAL handling for erdb.db by enabling synchronous NORMAL, wal_autocheckpoint, and journal_size_limit
  - run wal_checkpoint(TRUNCATE) after IMDb import jobs to prevent erdb.db-wal from growing indefinitely after large write operations
  - reduce the risk of oversized WAL files during heavy cache writes and dataset imports

## [0.3.6](https://github.com/realbestia1/erdb/compare/v0.3.5...v0.3.6) - 2026-04-03

- Improve poster language handling and bump to v0.3.6 ([bdef6dd](https://github.com/realbestia1/erdb/commit/bdef6ddcc0fb025532783d8a98fd50d3dbc1991a))
  - add a separate Poster Language Anime option in the same poster language box
  - wire posterAnimeLang through preview, config import/export, token config, proxy forwarding, and server-side rendering
  - fix poster original/native language selection so it no longer falls back to localized poster_path when global language is set
  - improve anime poster handling so Poster Text Anime and Poster Language Anime are resolved independently from the standard poster settings
  - rename the poster language Original label to Native Language in the configurator UI
  - fix token persistence for Thumbnail Ratings Style
  - change MDBList badge accent/border color from orange to white
  - bump package/app version to 0.3.6

## [0.3.5](https://github.com/realbestia1/erdb/compare/v0.3.4...v0.3.5) - 2026-04-03

- Add backdrop ratings size support and bump to v0.3.5 ([f8eb982](https://github.com/realbestia1/erdb/commit/f8eb9824915fdb235cef15f41a7ef2935da1f26b))
  - add a new backdropRatingsSize option with Standard and Large modes
  - expose the new control in the workspace/configurator UI for backdrop previews
  - persist backdropRatingsSize through config export/import and token-backed config flows
  - forward backdropRatingsSize through the proxy and token-aware image generation pipeline
  - apply the new size option in the backdrop renderer without affecting thumbnail sizing behavior
  - fix final image cache key generation so changing backdropRatingsSize invalidates cached renders correctly
  - bump package/app version to 0.3.5

## [0.3.4](https://github.com/realbestia1/erdb/compare/v0.3.3...v0.3.4) - 2026-04-03

- Bump version to 0.3.4; fix thumbnail badge ([fe2e2a4](https://github.com/realbestia1/erdb/commit/fe2e2a448223a26f3345a273706a7d5178c8e049))
  Update project version to 0.3.4 (package.json and UI reference) and adjust route image badge logic: only use thumbnailVerticalBadgeContent when the thumbnail rating layout is vertical, otherwise fall back to 'standard'. Also updated build metadata (tsconfig.tsbuildinfo).

## [0.3.3](https://github.com/realbestia1/erdb/compare/v0.3.2...v0.3.3) - 2026-04-03

- Bump package to 0.3.3; fix backdrop badge layout ([2502917](https://github.com/realbestia1/erdb/commit/25029174080311ef786450d173321c955d386222))
  Import and use isVerticalBackdropRatingLayout in app/[type]/[id]/route.tsx so backdrop badge content uses the vertical variant only when backdropRatingsLayout is vertical (falls back to 'standard' otherwise). Update components/home-page.tsx to reflect currentVersion 0.3.3 and bump package version in package.json/package-lock.json. tsconfig.tsbuildinfo updated by the build. This fixes incorrect badge selection for backdrop images and publishes a patch version bump.

## [0.3.2](https://github.com/realbestia1/erdb/compare/v0.3.1...v0.3.2) - 2026-04-03

- Fix poster token badge layout so stacked is ignored for non-vertical poster layouts ([13e1967](https://github.com/realbestia1/erdb/commit/13e196797ff88c86ba3ae91f9f78718080905612))
  Updated the poster render pipeline to apply verticalBadgeContent=stacked only when posterRatingsLayout is vertical (left, right, or left-right).

  This prevents tokens using Poster Layout=top from incorrectly rendering poster badges in stacked mode when a lingering verticalBadgeContent=stacked value is present in the token or imported config.

## [0.3.1](https://github.com/realbestia1/erdb/compare/v0.3.0...v0.3.1) - 2026-04-03

- Add token-based accounts and workspace APIs ([9244088](https://github.com/realbestia1/erdb/commit/924408803cf9ba549268bd540fd8ff0ee93e5b04))
  Introduce a token-based account system and workspace flow. Adds new API endpoints (/api/token, /api/workspace-auth, /api/workspace-config) and libraries to manage tokens, accounts, and workspace sessions, plus an accounts DB. Make renderer and proxy token-aware: image routes accept/respect token configs, proxy can build config from a token, and cache/version seeding uses token update timestamps. Update configurator and docs/UI to support login/registration, persistent active token, token-driven preview/proxy patterns, and workspace session handling. Minor docs and .env.example updates (ERDB_DATA_DIR) to reflect the new workspace/token features.
- rollback ([18c5a8e](https://github.com/realbestia1/erdb/commit/18c5a8ee9f753dcaf690c34a3c33743c18897f1a))

## [0.3.0](https://github.com/realbestia1/erdb/compare/v0.2.12...v0.3.0) - 2026-04-03

- Add token-based accounts, API & workspace UI ([9abcadb](https://github.com/realbestia1/erdb/commit/9abcadb4a5b60d414fdb7ff6731488f76416e877))
  Introduce a token-based account system and workspace flow. Adds new API endpoints (/api/token, /api/workspace-auth, /api/workspace-config) and libraries to manage tokens, accounts, and workspace sessions. The image renderer and proxy were updated to resolve per-token configuration server-side (token-aware routes and proxy config builders), and cache/versioning now uses token update timestamps. The configurator and home UI were updated to support login/registration, persistent active token, token-driven preview/proxy patterns, and workspace session handling. Minor docs and .env.example updates included (ERDB_DATA_DIR).

## [0.2.12](https://github.com/realbestia1/erdb/compare/v0.2.11...v0.2.12) - 2026-04-02

- Bump version to 0.2.12 and normalize path split ([65e7701](https://github.com/realbestia1/erdb/commit/65e77012f9ea256c6bdc5b1d51c77c1c831f8479))
  Update package.json version to 0.2.12 and update the HomePage currentVersion string accordingly. Improve getFilePath by splitting keys on both forward and backslashes (/ and \) before sanitizing segments to handle Windows and mixed-path separators correctly.

## [0.2.11](https://github.com/realbestia1/erdb/compare/v0.2.10...v0.2.11) - 2026-04-02

- Add thumbnail rating style and bump version ([8581d4f](https://github.com/realbestia1/erdb/commit/8581d4f2613cb0518cc0c88a82895372d8c4aba8))
  Introduce thumbnailRatingStyle handling in HomePage: include it in the preview-type rating selection logic, add it to the exported state list, and persist it to the config. Also update the in-component currentVersion and bump the package version to 0.2.11.

## [0.2.10](https://github.com/realbestia1/erdb/compare/v0.2.9...v0.2.10) - 2026-04-02

- Add thumbnailRatingStyle support ([42c6ae4](https://github.com/realbestia1/erdb/commit/42c6ae4a811b5caf4b60bd16f8e903f48ab31f1f))
  Introduce per-type thumbnail rating style handling so thumbnails can use an independent ratingStyle. Changes include:

  - app/[type]/[id]/route.tsx: parse a global rating style param and per-type overrides (poster, backdrop, thumbnail, logo) and choose the appropriate style based on imageType.
  - components/home-page.tsx: add thumbnailRatingStyle state, wire it into aiometadata pattern building, config serialization, payload handling, preview selection, and UI handlers; update currentVersion to 0.2.10.
  - lib/aiIntegrationPrompt.ts: document new poster/backdrop/thumbnail/logo ratingStyle params and update URL build logic to consider thumbnailRatingStyle.
  - package.json: bump package version to 0.2.10.

  These changes allow explicit control over thumbnail rating visuals without affecting backdrop or poster styles.

## [0.2.9](https://github.com/realbestia1/erdb/compare/v0.2.8...v0.2.9) - 2026-04-02

- Improve proxy error handling and fetch retry ([6e0b190](https://github.com/realbestia1/erdb/commit/6e0b190bcec7bd3626eee27ec6796fd89105f487))
  Wrap proxy GET handler in a try/catch and return a 500 on unexpected errors. Read upstream responses as arrayBuffer and decode with TextDecoder before JSON.parse to avoid re-reading streamed bodies, and reuse the decoded buffer for passthrough/error responses while preserving CORS headers. Increase default fetchWithRetry timeout to 15000ms and expand recognized timeout/network error codes to improve resilience. Bump package version to 0.2.9 and update displayed currentVersion in the UI.

## [0.2.8](https://github.com/realbestia1/erdb/compare/v0.2.7...v0.2.8) - 2026-04-02

- Improve Docker font handling and image response types ([3f2033f](https://github.com/realbestia1/erdb/commit/3f2033f99d1cb7a922747d337360f439ec8031b0))
  Update Dockerfiles to skip automatic font install by default (ERDB_SKIP_FONT_INSTALL) and add bash/curl to Alpine deps; copy and execute scripts/install-fonts-linux.sh (with chmod) in build/runtime images so fonts are installed reliably. Refactor server image rendering flow in app/[type]/[id]/route.tsx: change in-flight maps to carry RenderedImagePayload, return payload objects from internal branches, and centralize the final respond(...) call to ensure consistent response construction. Also bump app version to 0.2.8 (package.json) and update displayed currentVersion in the home page component.

## [0.2.7](https://github.com/realbestia1/erdb/compare/v0.2.6...v0.2.7) - 2026-04-02

- Add custom logo variants and caching ([88ce2c3](https://github.com/realbestia1/erdb/commit/88ce2c3c01295d72d29043f4da204bc002a8de88))
  Introduce custom logo generation and variant support with SVG output, selectable font variants, and custom primary/secondary/outline colors. Adds in-memory + object-storage caching for generated logo variants, new cache keys/TTL, and storage read/write helpers; integrates custom-logo and ratings-only modes into the rendering pipeline and query params (logoMode, logoFontVariant, logoPrimary/Secondary/Outline). Improve title localization by picking translated titles from TMDB translations, bump final image renderer cache version, and standardize response/cache headers. Also add a docs AI integration prompt and copy button component, expose new logo options in the docs and home view types, and include various small refactors to image rendering, cache keys, and object storage behavior.

## [0.2.6](https://github.com/realbestia1/erdb/compare/v0.2.5...v0.2.6) - 2026-04-02

- fix: prevent preview image clipping on zoom ([425f863](https://github.com/realbestia1/erdb/commit/425f863d25c1c194ee2e8a2c8cf5858ec5ba6020))
  - Changed `object-cover` to `object-contain` for the live preview image in `workspace-page-view.tsx`.
  - Bumped package version to 0.2.6.
  This resolves a UI rendering issue where badges placed on the exact edges of the generated image would get cropped or skewed when the user zooms in/out of the page. By containing the image fully within the wrapper regardless of fractional aspect ratio differences, all image boundaries and components always remain completely visible.

## [0.2.5](https://github.com/realbestia1/erdb/compare/v0.2.4...v0.2.5) - 2026-04-02

- fix(renderer): standardize logo rating height to 100px and remove auto-scaling ([7265a12](https://github.com/realbestia1/erdb/commit/7265a12c1e05c6eea474cb3d25d6c37dfc733d4c))
  - Removed the automatic boosting system for rating badges in the 'logo' image type.
  - Disabled dynamic scale calculation based on the original logo aspect ratio.
  - Implemented fixed badge metrics (iconSize: 84px, paddingY: 8px) to guarantee a consistent 100px height.
  - Optimized fontSize (62px), paddingX (32px), and gap (20px) for better aesthetics at a fixed size.
  - Ensured badge size remains constant (preserveBadgeSize: true) even when multiple ratings are displayed.

## [0.2.4](https://github.com/realbestia1/erdb/compare/v0.2.3...v0.2.4) - 2026-04-01

- preserve better readability on very wide logos ([c6603cf](https://github.com/realbestia1/erdb/commit/c6603cfd3e9edf15f485b0e29501c0431dfc353c))

## [0.2.3](https://github.com/realbestia1/erdb/compare/v0.2.2...v0.2.3) - 2026-04-01

- bump to v0.2.3, keep logo ratings on one row, and restore standalone CSS in local start txt ([46e8890](https://github.com/realbestia1/erdb/commit/46e8890ae511090dc5012b4488e57a52214fb818))
  - bump package version from 0.2.2 to 0.2.3
  - keep logo ratings on a single row and extend the canvas width instead of wrapping to multiple lines
  - improve logo badge spacing and preserve better readability on very wide logos
  - fix local production startup so the standalone server also sees `.next/static` and `public`, restoring CSS/assets when using `npm run build` + `npm run start`
  - align the frontend version fallback with v0.2.3

## [0.2.2](https://github.com/realbestia1/erdb/compare/v0.2.1...v0.2.2) - 2026-04-01

- bump to v0.2.2 and remove mobile configurator nested scrolling ([0e54627](https://github.com/realbestia1/erdb/commit/0e546273a3b85e382817c59c7645bb9bbb145b05))
  - bump package version from 0.2.1 to 0.2.2
  - remove the extra internal mobile scroll from the configurator shell
  - let the rating provider list expand naturally on mobile instead of using its own vertical scroll
  - make generated config string and proxy manifest boxes wrap on mobile while keeping desktop scrolling behavior
  - align changelog and frontend version fallback with v0.2.2

## [0.2.1](https://github.com/realbestia1/erdb/compare/v0.2.0...v0.2.1) - 2026-04-01

- implement robust fetch with retries for TMDB metadata ([76caef7](https://github.com/realbestia1/erdb/commit/76caef7a97c37bf983b48a0081becfd54f360c9a))
  Added lib/request.ts: Introduced a fetchWithRetry utility to handle transient network failures.
  Improved Resilience: Implemented automatic 3-attempt retries with exponential backoff for ConnectTimeoutError and other networking issues.
  Optimized Timeouts: Set an 8-second timeout per request attempt to ensure faster recovery and better responsiveness.
  Route Integration: Updated the main metadata route (app/[type]/[id]/route.tsx) and the proxy layer to use the new robust fetching mechanism.
  Bug Fix: Resolved frequent TypeError: fetch failed caused by TMDB connection timeouts.

## [0.2.0](https://github.com/realbestia1/erdb/compare/v0.1.27...v0.2.0) - 2026-04-01

- rework web panel UI for a more modern, minimal workspace feel ([f8e861d](https://github.com/realbestia1/erdb/commit/f8e861d2aae67d7360ebe8e4298e5a2828791f26))

## [0.1.27](https://github.com/realbestia1/erdb/compare/v0.1.26...v0.1.27) - 2026-04-01

- finalize dedicated API docs flow and bump package version to 0.1.27
  Kept the new standalone `/docs` page as the single place for API documentation, linked the homepage to it, removed the old duplicated API docs content from the main page UI, and clarified `realimdb:` usage for addons that actually source series or episode metadata from IMDb IDs.

## [0.1.26](https://github.com/realbestia1/erdb/compare/v0.1.25...v0.1.26) - 2026-04-01

- add dedicated API docs page and bump package version to 0.1.26
  Added a standalone `/docs` page for the ERDB public API surface, linked it from the homepage, documented renderer/proxy/helper endpoints with real query behavior, and clarified that `realimdb:` should be used for addons that actually source series or episode metadata from IMDb IDs.

## [0.1.25](https://github.com/realbestia1/erdb/compare/v0.1.24...v0.1.25) - 2026-03-31

- align anime rating provider logos and bump package version to 0.1.25 ([92dbe86](https://github.com/realbestia1/erdb/commit/92dbe8698914b612ac1ee8dfaea4e33528e16ea6))
  Updated the anime rating provider badges to use cleaner and more accurate provider assets, with special fixes for MyAnimeList, AniList, and Kitsu rendering. This includes centering and scaling adjustments for MAL, switching AniList to its official icon asset, and replacing the Kitsu badge with the exact favicon asset used by the official Kitsu web app. Also bumped the package version from 0.1.24 to 0.1.25.
- update ([671b47e](https://github.com/realbestia1/erdb/commit/671b47ef0a437bedfb1f57377361cfca09f57e48))

## [0.1.24](https://github.com/realbestia1/erdb/compare/v0.1.23...v0.1.24) - 2026-03-31

- Bump to v0.1.24 and add configurable logo rating limits ([02885e0](https://github.com/realbestia1/erdb/commit/02885e0e093ff053ec086fe8e1f5255df965ca86))
  - bump package version to 0.1.24
  - add logoRatingsMax so logo renders can cap the maximum number of rating badges
  - expose logoRatingsMax across the renderer, UI, config string, proxy config, and AiOMetadata patterns
  - preserve empty rating params so disabling all providers correctly bypasses image rendering instead of falling back to all ratings
  - update .github README and AI integration prompt to document the new logoRatingsMax behavior

## [0.1.23](https://github.com/realbestia1/erdb/compare/v0.1.22...v0.1.23) - 2026-03-31

- Bump to v0.1.23 and refine logo badge rendering ([0b41bf0](https://github.com/realbestia1/erdb/commit/0b41bf0e243d44db83574b18e1c60014c49a3a6f))
- Update release-from-package.yml ([7926f81](https://github.com/realbestia1/erdb/commit/7926f81823d4f31e39ccafaa063aa94dc00941ff))

## [0.1.22](https://github.com/realbestia1/erdb/compare/v0.1.21...v0.1.22) - 2026-03-31

- refine logo rating rendering ([28c1c2c](https://github.com/realbestia1/erdb/commit/28c1c2c18705d8d72c7c5fbd6f8e4255afcdf921))

## [0.1.21](https://github.com/realbestia1/erdb/compare/v0.1.20...v0.1.21) - 2026-03-31

- switch AiOMetadata non-thumbnail patterns to IMDb IDs ([7a4436b](https://github.com/realbestia1/erdb/commit/7a4436b07684697751a7ed947cdb5260e4751e47))

## [0.1.20](https://github.com/realbestia1/erdb/compare/v0.1.19...v0.1.20) - 2026-03-31

- Bump to v0.1.20 and improve TMDB logo/image rendering ([60dfda6](https://github.com/realbestia1/erdb/commit/60dfda61399d77ef87863fdb80a2c153f79f2ca5))
- Update docker-image.yml ([831909f](https://github.com/realbestia1/erdb/commit/831909ffaabf9a00b6df3bf2b031a315b1055f0b))

## [0.1.19](https://github.com/realbestia1/erdb/compare/v0.1.18...v0.1.19) - 2026-03-31

- Fix npm run build failure caused by AiOMetadata TVDB thumbnail type check ([5a65003](https://github.com/realbestia1/erdb/commit/5a65003fe8112d5ce0c16492944c28d7ee51f4e4))

## [0.1.18](https://github.com/realbestia1/erdb/compare/v0.1.17...v0.1.18) - 2026-03-31

- Add TVDB-aware AiOMetadata thumbnail mapping and expose TVDB in proxy UI ([c1013b8](https://github.com/realbestia1/erdb/commit/c1013b80c9cc76a9689720e30705ede392173a1f))

## [0.1.17](https://github.com/realbestia1/erdb/compare/v0.1.16...v0.1.17) - 2026-03-31

- rename proxy metadata selector label and bump to v0.1.17 ([3901517](https://github.com/realbestia1/erdb/commit/3901517d02c537ea1fe862bbc65f12a6b247d3aa))
- . ([adf1263](https://github.com/realbestia1/erdb/commit/adf1263976c179c137e9a111af61d918b79481f6))
- Update docker-image.yml ([01b2113](https://github.com/realbestia1/erdb/commit/01b2113b6530130b121ce74a846837222017e300))

## [0.1.16](https://github.com/realbestia1/erdb/compare/v0.1.15...v0.1.16) - 2026-03-31

- simplify proxy metadata selector copy and bump to v0.1.16 ([1505a3e](https://github.com/realbestia1/erdb/commit/1505a3e6ce1d9c345b3927329fec2741b3fd10c7))

## [0.1.15](https://github.com/realbestia1/erdb/compare/v0.1.14...v0.1.15) - 2026-03-31

- Update README.md ([e502d73](https://github.com/realbestia1/erdb/commit/e502d73a7dd6e01310001c867def6594e57909ab))
- Update README.md ([e7fa349](https://github.com/realbestia1/erdb/commit/e7fa34903fd92f44d7d0a95bf5a77bf6941aab55))
- Update README.md ([818b22e](https://github.com/realbestia1/erdb/commit/818b22e85015ac86e8dc80ca7ea7b85e2c9521da))
- Update README.md ([55f2074](https://github.com/realbestia1/erdb/commit/55f20748b851df504dcc2ffbc626b45ee6b74ff1))
- . ([bd32aaa](https://github.com/realbestia1/erdb/commit/bd32aaaef5c391ae0cbcd5b342b94aca8e6069e6))
- Update README.md ([5de6f55](https://github.com/realbestia1/erdb/commit/5de6f55ee95ccc6dbc8e514ab6f514955312ac02))

## [0.1.14](https://github.com/realbestia1/erdb/compare/v0.1.13...v0.1.14) - 2026-03-31

- Prepare automated package-based releases for v0.1.14 ([5d04734](https://github.com/realbestia1/erdb/commit/5d047343fd62de396b308a90faeb177bd5a59ad7))

## [0.1.13](https://github.com/realbestia1/erdb/releases/tag/v0.1.13) - 2026-03-31

- Fix preview image caching so ratings refresh correctly when MDBList or SIMKL keys are added after TMDB ([bbea5f5](https://github.com/realbestia1/erdb/commit/bbea5f5205862b1974909c44eb12663b62dc4a13))
- Improve language dropdown labels for regional variants ([120e3b0](https://github.com/realbestia1/erdb/commit/120e3b031946d50cddf79fde86a569ed302da020))
- Fix logo vertical badge bleed and persist thumbnail badge settings ([377cd60](https://github.com/realbestia1/erdb/commit/377cd60ea320433cee32fbe54bab65a9cbd6eaf1))
- Fix logo badge layout inheriting backdrop vertical setting ([49365b2](https://github.com/realbestia1/erdb/commit/49365b2e56d204ec9b207e71a4fff3ee5cafbf6b))
- Fix Kitsu thumbnail episode IDs in addon proxy ([d427d02](https://github.com/realbestia1/erdb/commit/d427d026d59abbb078b15ba675531b0d98306310))
- update animemapping url ([d0e4d45](https://github.com/realbestia1/erdb/commit/d0e4d451bb6b209f61ab26ca8a6ff4394b263c72))
- feat(api): decouple thumbnail and backdrop vertical badge content configurations ([577e6eb](https://github.com/realbestia1/erdb/commit/577e6eb2f728e395479b9bba9268b6b5b6282a11))
- Add per-layout vertical badge styling, improve poster/backdrop badge rendering, simplify backdrop layout options, and preserve compatibility with legacy backdrop configs. ([a5ed6ca](https://github.com/realbestia1/erdb/commit/a5ed6ca4168e6d2504cc011570cab3448960def6))
- Add colored default borders to glass rating pills and quality badges, and align quality badge border thickness with the main rating style. ([b79eaa7](https://github.com/realbestia1/erdb/commit/b79eaa7dc4f76027001f9a732046aab95753d2b2))
- Align proxy episode synopsis translations with the same TMDb episode resolution used for thumbnails, including Cinemeta and AiOMetadata when IMDb is selected. ([ddcc2c9](https://github.com/realbestia1/erdb/commit/ddcc2c93ddb5ac8ef0b15fc0a30a2844acce48ed))
- Improve navbar responsiveness by fixing the mobile layout and centering the version/GitHub badges on desktop. ([1787ad0](https://github.com/realbestia1/erdb/commit/1787ad0f66b3fb432c9be2bcd3c284a704a0812e))
- Fix mobile navbar layout and make rating providers single-column on mobile. ([c1fb24b](https://github.com/realbestia1/erdb/commit/c1fb24ba638a8f359dbcbb1124e6b76d93221c5a))
- Simplify AIOMetadata proxy provider selection and improve version visibility in the panel. ([0880384](https://github.com/realbestia1/erdb/commit/0880384d6cb37b766fa2eeb718394c6362808b6d))
- Add current and latest version status to the panel using local and GitHub package.json values. ([b7f5854](https://github.com/realbestia1/erdb/commit/b7f5854c178a138228734d5573211fd5206662e6))
- Add tvdb and realimdb support, improve automatic IMDb episode dataset sync, and refine AiOMetadata/Cinemeta proxy handling for more reliable episode thumbnails. ([4d066d8](https://github.com/realbestia1/erdb/commit/4d066d8f1669a7f6da6787e037cc4fd6a0d4ff37))
- Add tvdb and realimdb episode support, improve IMDb dataset auto-sync, and refine AiOMetadata/Cinemeta proxy handling for correct thumbnail mapping. ([f0f0721](https://github.com/realbestia1/erdb/commit/f0f0721215186fb2da5d25557d1e67386e7e1c90))
- tvdb support ([071987d](https://github.com/realbestia1/erdb/commit/071987d9763da2eafd6ac13333a6c253daaa4d56))
- Persist homepage preview settings in localStorage ([06e88de](https://github.com/realbestia1/erdb/commit/06e88de868d1d34278582fb919df82d60a7e333e))
- update preview ([24bf1fa](https://github.com/realbestia1/erdb/commit/24bf1fa307f2495687ec1f55bc18f13ef0f4f456))
- Fix TMDB episode thumbnail resolution for IMDb TV inputs ([9d5a60b](https://github.com/realbestia1/erdb/commit/9d5a60bf6e9366ad000edff1769e611f1f016ab5))
- Use TMDB-first aiometadata patterns ([dc839dc](https://github.com/realbestia1/erdb/commit/dc839dc0ed85768ae6bf66c5790ae8bdd614f3e3))
- Fix thumbnail and backdrop rating preferences being unintentionally synced ([b9eeb58](https://github.com/realbestia1/erdb/commit/b9eeb585daeb5c98a6a7e79bf472a47e94dab1f5))
- Create LICENSE ([c009ab4](https://github.com/realbestia1/erdb/commit/c009ab4f86a99cea5ac5b692c8393ccaa766f2db))
- Delete LICENSE ([ed46587](https://github.com/realbestia1/erdb/commit/ed4658786d56142338a4b249512087ec4117ce7d))
- Update route.tsx ([de2a9e9](https://github.com/realbestia1/erdb/commit/de2a9e93d268e8b496f14c7b49caf5451e288615))
- Fix Quality Badges for Series ([466dfbf](https://github.com/realbestia1/erdb/commit/466dfbff6551cdfb5f5c92df706f54668e63e1fc))
- . ([65be710](https://github.com/realbestia1/erdb/commit/65be710093dd67face74e4fb538a9d76aaa8f2c0))
- Update route.tsx ([fea665c](https://github.com/realbestia1/erdb/commit/fea665c122b1a642d15ebbc1aae3e175851bb05f))
- . ([ba63c1e](https://github.com/realbestia1/erdb/commit/ba63c1e77aec14ba038a5368719011074d473f19))
- . ([a8c81cc](https://github.com/realbestia1/erdb/commit/a8c81cc9f50967e66f493396e39d73709ed17f17))
- + thumbnails ([16fedc0](https://github.com/realbestia1/erdb/commit/16fedc0765adc3301ac79e3817d1aedab7501bc9))
- Update ratingPreferences.ts ([5885cac](https://github.com/realbestia1/erdb/commit/5885caca7ed844fc3ad2e064c4a1849a7c345ba3))
- Update route.tsx ([04695ab](https://github.com/realbestia1/erdb/commit/04695ab6193b3a97f8729e10aed566f8469db185))
- Update ratingPreferences.ts ([dcea449](https://github.com/realbestia1/erdb/commit/dcea449f8e41703f893cf6c9e87f688d65e97c0e))
- Rename README.md to .github/README.md ([03f25ae](https://github.com/realbestia1/erdb/commit/03f25aec9b6ffeb6ae0eb80f3db27c0e3fa781ee))
- Update docker-image.yml ([93c6440](https://github.com/realbestia1/erdb/commit/93c6440fc526effdaf85c05706a9c522e90a61c5))
- . ([c93d636](https://github.com/realbestia1/erdb/commit/c93d636d775264d10f95ddcf71774d901f45949b))
- Update start-server.js ([72f1b66](https://github.com/realbestia1/erdb/commit/72f1b663169f75e4159c103ee882d35594b1d924))
- Update docker-image.yml ([136a31d](https://github.com/realbestia1/erdb/commit/136a31dbf46049f63dd3a53f395730a57a9b4de5))
- Update home-page-view.tsx ([27407ff](https://github.com/realbestia1/erdb/commit/27407ff1ee1d17667bb769dc1f5cbdc427201fc2))
- . ([db087b4](https://github.com/realbestia1/erdb/commit/db087b4b608d98288407aab76226be13b05c32e0))
- Update docker-image.yml ([7a284ee](https://github.com/realbestia1/erdb/commit/7a284ee5dbe42ff39359d1ab62e0f08ffa23649b))
- Update route.ts ([092d513](https://github.com/realbestia1/erdb/commit/092d51314ac1552dc7fcad710b7d7c26c417727f))
- Update route.ts ([148fd4f](https://github.com/realbestia1/erdb/commit/148fd4fd264d209ca843a11018d3e44b6be24cb3))
- Update route.ts ([0623f53](https://github.com/realbestia1/erdb/commit/0623f534a76573c2d990934bc1d69383b2e7062e))
- Update route.ts ([c7e7b0e](https://github.com/realbestia1/erdb/commit/c7e7b0e1fa0216e9a55a777e2ca44dcf1bba9fbb))
- add smart multi-id resolver and aiometadata URL pattern generator ([61d1916](https://github.com/realbestia1/erdb/commit/61d1916218fcf5e7a28db1a1facbfa17b59ea439))
- Delete Caddyfile ([aa813c2](https://github.com/realbestia1/erdb/commit/aa813c254f4376e6602ce8934496e7ea2e290db8))
- . ([713d30a](https://github.com/realbestia1/erdb/commit/713d30a1343130b88a44df6975dc229e2a1ee211))
- Update docker-compose.yml ([33b44ec](https://github.com/realbestia1/erdb/commit/33b44eca1fc21424b49d9bcb0761c9c4b97de6e6))
- Update README.md ([88aa7ae](https://github.com/realbestia1/erdb/commit/88aa7ae93205aba7cd8126f3ff3581b90355b476))
- enable multi-process runtime and simplify Docker deployment ([64f22d9](https://github.com/realbestia1/erdb/commit/64f22d9000eeec95e490f4498b8e08dd379ca114))
- Update rating-provider-sortable-list.tsx ([ffecd04](https://github.com/realbestia1/erdb/commit/ffecd04fb2757250275026159f530887b242923f))
- Update objectStorage.ts ([fd6d107](https://github.com/realbestia1/erdb/commit/fd6d1079d13f18c7d31b3cef47dc7ce72e4b0606))
- new provider (Simkl) ([ff7cf28](https://github.com/realbestia1/erdb/commit/ff7cf2890715f46944ef1a34de63f5ec3754fb37))
- update Metacritics icon ([db89b1b](https://github.com/realbestia1/erdb/commit/db89b1bfb4db0fc37de0800795bc70445b94a2e1))
- Update route.ts ([43d716b](https://github.com/realbestia1/erdb/commit/43d716b5cddf9a72c3e2955f9a4f711174a25561))
- Update route.ts ([6b533ea](https://github.com/realbestia1/erdb/commit/6b533ea95b8947df52328403cc69747bb67158af))
- Update route.ts ([e878b5d](https://github.com/realbestia1/erdb/commit/e878b5d71ff3bca309bc2c8829e496215a55e21e))
- Update route.ts ([ca060b6](https://github.com/realbestia1/erdb/commit/ca060b6f64eb407d9e1ce4b2b0ea7e3d17129ffb))
- . ([48d27ef](https://github.com/realbestia1/erdb/commit/48d27ef6598603d4b85f2e113e97d132fbe141e4))
- Providers reorder ([7068fb1](https://github.com/realbestia1/erdb/commit/7068fb1d7229853fd0914a562895cb39a8d843b1))
- fix anilist ([307f6e8](https://github.com/realbestia1/erdb/commit/307f6e8cf24e8fc87a7019d7c309cad9a85e7c4a))
- . ([b41a4ec](https://github.com/realbestia1/erdb/commit/b41a4ec79cd0ed053a70524e7b48dc85769563a1))
- Update addonProxy.ts ([f983673](https://github.com/realbestia1/erdb/commit/f98367371d10274d700405e8941c96fa27e66327))
- Update README.md ([8bd6187](https://github.com/realbestia1/erdb/commit/8bd6187c01a32a2ad54ec3a68ad65a201786aa15))
- Delete .github/workflows directory ([fcd8068](https://github.com/realbestia1/erdb/commit/fcd806816ebf72b3e424628d9b5cb6adc56f8ecc))
- Update docker-build.yml ([0134e41](https://github.com/realbestia1/erdb/commit/0134e41a13ec59b8754bf7f85ef9fc284a5a5ebd))
- Delete release.yml ([fe384a7](https://github.com/realbestia1/erdb/commit/fe384a7b8a4e0f98f6a94fc675de5109a81bf6dc))
- Update release.yml ([606ac04](https://github.com/realbestia1/erdb/commit/606ac044214e891cb9b86269fca4e58c93f4c6b1))
- . ([4c6d80e](https://github.com/realbestia1/erdb/commit/4c6d80eb82922c2f556705dfec9a94877ae755a1))
- Update route.tsx ([26c01e9](https://github.com/realbestia1/erdb/commit/26c01e9646aaa2ef3bdabd258b8a665401a0783a))
- Normalize ratings to a 0-10 scale and improve anime/backdrop badge behavior ([533961a](https://github.com/realbestia1/erdb/commit/533961ab5db7e0cef78452d8d60f2a3c4980ab62))
- Update route.tsx ([6646464](https://github.com/realbestia1/erdb/commit/664646419d093e9d1a3f24d1afb9e2111d357e63))
- . ([a44e2a9](https://github.com/realbestia1/erdb/commit/a44e2a980044a3ecdb00f48a2c87b81e8a26b131))
- . ([49350b0](https://github.com/realbestia1/erdb/commit/49350b08ddb607e246914b179cc861325e0e1dcd))
- Update page.tsx ([0ccbbfb](https://github.com/realbestia1/erdb/commit/0ccbbfbc7496008f02a8df3130ff4029c1b38c25))
- . ([85e90ef](https://github.com/realbestia1/erdb/commit/85e90ef2c2f7f4808ba2cda72c39c7cc07ab1961))
- Update page.tsx ([657f8d6](https://github.com/realbestia1/erdb/commit/657f8d60cdf2a264adde86508ebc0da0675757fb))
- Add show/hide toggles for config and proxy ([b3027f3](https://github.com/realbestia1/erdb/commit/b3027f336a7ec7025a31e55a31c5e989f0df40b9))
- Add posterQualityBadgesPosition option ([40683e1](https://github.com/realbestia1/erdb/commit/40683e13581c7919a7f92222edc4ca092aadcbd7))
- Add posterQualityBadgesPosition support ([7fcc55b](https://github.com/realbestia1/erdb/commit/7fcc55bf9b5c373a8af53544c85d9bed0d04b6f9))
- Handle 3-badge top row in left-right layout ([a13ce21](https://github.com/realbestia1/erdb/commit/a13ce21fd82ecac9f583f318f153026910b3719d))
- Redesign homepage UI; add fonts & smooth scroll ([e7d96c6](https://github.com/realbestia1/erdb/commit/e7d96c61907c37e82b7d466eb1b665bedf4155a7))
- Update page.tsx ([1099058](https://github.com/realbestia1/erdb/commit/10990586e8086e940db8afe4ae1c35c8c7f34fc0))
- Translate catalog metas concurrently ([be2c397](https://github.com/realbestia1/erdb/commit/be2c397ba845259314c10ac4dfb808fb0d781ae5))
- Add translateMeta option and TMDB translation ([2097296](https://github.com/realbestia1/erdb/commit/2097296239a6cf1708265a6bea98bdb6b3c5a3a1))
- Add config export/import and refactor proxy UI ([4d1c9bb](https://github.com/realbestia1/erdb/commit/4d1c9bbb78c6a62cc60adf2f2cf2139a61dc10a7))
- Create LICENSE ([5727613](https://github.com/realbestia1/erdb/commit/5727613824f8446a5b8195b86dae19c27bcf31e9))
- Bump renderer cache; set ratings to bottom ([890b968](https://github.com/realbestia1/erdb/commit/890b9683f7842c3620ebdc0288b9a9612be770dd))
- Update route.tsx ([f8f8264](https://github.com/realbestia1/erdb/commit/f8f826439b29f7d9f17ed7da05c169b2f602bc44))
- Update route.tsx ([4245714](https://github.com/realbestia1/erdb/commit/42457146e8c30060ea5d49ccfa18775488848472))
- Update page.tsx ([2789c1c](https://github.com/realbestia1/erdb/commit/2789c1cd5506ea686ac210d076a5e08998834032))
- Update route.tsx ([3340655](https://github.com/realbestia1/erdb/commit/3340655040803c393610bdda2d1fc63a35975dea))
- Update route.tsx ([ea5d5fb](https://github.com/realbestia1/erdb/commit/ea5d5fbd8ec7492e688ee41bf00faf546c3d2145))
- Render poster title/logo overlays & bump cache ([051677f](https://github.com/realbestia1/erdb/commit/051677f1f7eda893ad33d27d614be6f4c6f618e8))
- Handle square style stroke width in badge ([8839ed6](https://github.com/realbestia1/erdb/commit/8839ed6f7c316ccaa7bd26a0d2cf80ac749ebda2))
- Add Torrentio stream quality badges & rendering ([154693b](https://github.com/realbestia1/erdb/commit/154693ba6cbd673efac1aa9ec34eaffb95d9f963))
- Update README.md ([b1f2c45](https://github.com/realbestia1/erdb/commit/b1f2c45c66f3beb2a175fdbb3f9bf4127e1e2181))
- Update README to remove Dockerfile.hf note ([ade27ed](https://github.com/realbestia1/erdb/commit/ade27ed8732a12f061bc3a7448951a8a6c6a4d14))
- Fix typo in HuggingFace Guide section ([d69d2ab](https://github.com/realbestia1/erdb/commit/d69d2ab70d848faea7612fca8d60319a64873f68))
- Update README.md ([c47148b](https://github.com/realbestia1/erdb/commit/c47148bb550905ae1c2f548b0183ca0fcc71409d))
- Update README.md ([b239b2b](https://github.com/realbestia1/erdb/commit/b239b2bdfc7788041d46ff14c754fb86a33344f7))
- Update Dockerfile ([f76b650](https://github.com/realbestia1/erdb/commit/f76b650c55de420ebeca6eb84c90115d9da477a2))
- Update Dockerfile.hf ([ed61221](https://github.com/realbestia1/erdb/commit/ed612212c1c63ab729e48d6b8cd5a480ef5dfdd4))
- Update Dockerfile.hf ([f3e3100](https://github.com/realbestia1/erdb/commit/f3e31001ab6fcb8457f51c4809ebee6ce103a224))
- Update route.tsx ([9d5ea22](https://github.com/realbestia1/erdb/commit/9d5ea2249bca728ceab807f2b7d947dd6687e268))
- . ([c79fcd9](https://github.com/realbestia1/erdb/commit/c79fcd9739d551ec28e9ec2285e8d415049c3862))
- Update route.tsx ([43e80c3](https://github.com/realbestia1/erdb/commit/43e80c3502349efed1553fc5b503e6faca5338e2))
- Update route.tsx ([51c0a40](https://github.com/realbestia1/erdb/commit/51c0a40fa1c7fd1b709a3280d687cbc0794e07ca))
- Update route.tsx ([68d2c5d](https://github.com/realbestia1/erdb/commit/68d2c5dd18cfdce0de229bede0004505fdac1717))
- . ([03af745](https://github.com/realbestia1/erdb/commit/03af7450d10d750e35c8f9b11ce647ac5197f3f5))
- . ([e33e863](https://github.com/realbestia1/erdb/commit/e33e8630323c1d190eb8d04e55951cabc03eb9e0))
- Update route.ts ([9c7acfd](https://github.com/realbestia1/erdb/commit/9c7acfd567ac0b6d682834eb04eac5b86524e12d))
- Update page.tsx ([e4262e8](https://github.com/realbestia1/erdb/commit/e4262e804542cb740c8ea47789327b2c8f81768e))
- Update README.md ([cb51c67](https://github.com/realbestia1/erdb/commit/cb51c67bfb569e79ad2beaf38b12418beb6f9ded))
- Delete for unsupported addons.mp4 ([291974e](https://github.com/realbestia1/erdb/commit/291974e17a2b6bb65a086a43f2d924c0124dd252))
- Delete for supported addons.mp4 ([bbf9565](https://github.com/realbestia1/erdb/commit/bbf9565764e3e525cc2b3617083593d2c68ff2d1))
- Add files via upload ([93885fd](https://github.com/realbestia1/erdb/commit/93885fdfb98efa216c7d51621f5b7a966b0536a6))
- Update Dockerfile ([a7aead2](https://github.com/realbestia1/erdb/commit/a7aead2767d9fa415b0c5d9f0d790fc915b37818))
- . ([a4ba38c](https://github.com/realbestia1/erdb/commit/a4ba38c599f50c2dec82148479a582cce510ef2c))
- . ([1d1b1e8](https://github.com/realbestia1/erdb/commit/1d1b1e877ff045f68a1ae3121871ba9001d1ca55))
- Update addonProxy.ts ([fa63fe6](https://github.com/realbestia1/erdb/commit/fa63fe62209d35caaecd7f7bca1a90e8624defe5))
- Update page.tsx ([c52628a](https://github.com/realbestia1/erdb/commit/c52628aba19181583aa4086b6ad84d2ec7168428))
- . ([ae84d80](https://github.com/realbestia1/erdb/commit/ae84d80f5b22a2d836dc5084a042a1e19c52a20b))
- HuggingFace Dockerfile ([85d938c](https://github.com/realbestia1/erdb/commit/85d938ca6e10a7482d42c50b0fe0e24e706255d4))
- Update Dockerfile ([63bd0f5](https://github.com/realbestia1/erdb/commit/63bd0f5ee4b6fb5b8b37ef69d6a70b39750de854))
- . ([84008ea](https://github.com/realbestia1/erdb/commit/84008ea91c6afac24439f61d6250cceee32cc041))
- . ([e3d4306](https://github.com/realbestia1/erdb/commit/e3d43066ef6aa353c574b366d825e4fdea116267))
- Update README.md ([724a1e9](https://github.com/realbestia1/erdb/commit/724a1e966a04bfe1bca25e854e5536f059614e5d))
- proxy any addon ([fa680c4](https://github.com/realbestia1/erdb/commit/fa680c48afef531fc02b826c95a2393bf1694bca))
- Update page.tsx ([dd52a5e](https://github.com/realbestia1/erdb/commit/dd52a5ee643219aa3b66b2387d64282d4126f537))
- Update README.md ([90bb391](https://github.com/realbestia1/erdb/commit/90bb391fd9509333d57e6d4a73a51b5897910ede))
- Update page.tsx ([abb37a4](https://github.com/realbestia1/erdb/commit/abb37a45a933dbab05696f65d0a051201fb15d09))
- Update route.tsx ([3ae181c](https://github.com/realbestia1/erdb/commit/3ae181cdc32310165c707f775991566f2efc5dba))
- Update route.tsx ([6a98ab1](https://github.com/realbestia1/erdb/commit/6a98ab1f57dc3e9d0a1583638827cc50ff853697))
- . ([1c4ca74](https://github.com/realbestia1/erdb/commit/1c4ca7437ed10f1bbe33ba866fa0844c22c21ae0))
- Update route.tsx ([fe832a5](https://github.com/realbestia1/erdb/commit/fe832a5211657f7fa18815ab0fde3593e52257af))
- Update route.tsx ([34741e7](https://github.com/realbestia1/erdb/commit/34741e76ba12ef4415a0b74642771823bbaa84a6))
- Update route.tsx ([3632ac7](https://github.com/realbestia1/erdb/commit/3632ac79d36d92cfaf4f05058d98363acd052c1c))
- Update README.md ([b36b4cd](https://github.com/realbestia1/erdb/commit/b36b4cdbaacc2c1dc928aca8dfe57526f1a38ba4))
- Update route.tsx ([80617d3](https://github.com/realbestia1/erdb/commit/80617d33525d97c991b11c3e58f9ff1438d2f42a))
- Update route.tsx ([e84fddb](https://github.com/realbestia1/erdb/commit/e84fddb40e0f84e9d5ba39aa7431b8a3bb093c16))
- Update docker-compose.yml ([bc93059](https://github.com/realbestia1/erdb/commit/bc93059a37235f39e683bf740bac9cbdcf64f359))
- Update README.md ([98b6605](https://github.com/realbestia1/erdb/commit/98b660588e9995276c9175e985ac784fd4996e09))
- . ([9a8098d](https://github.com/realbestia1/erdb/commit/9a8098d23c08103a261ee98559fb7167e8b54d1d))
- Update README.md ([e5bc6f9](https://github.com/realbestia1/erdb/commit/e5bc6f968f2675546d273fa2fa0c4032b8410505))
- Update README.md ([d49d4cf](https://github.com/realbestia1/erdb/commit/d49d4cfbd245d38b797273048649746490cb331e))
- Update README.md ([3bce9ee](https://github.com/realbestia1/erdb/commit/3bce9eea3ce2a818b1f7c88868a82d5e6f34a28a))
- Update README.md ([53c6609](https://github.com/realbestia1/erdb/commit/53c660919c9bd633e188134c075bb11d85d4bbe2))
- Initial commit ([c690a44](https://github.com/realbestia1/erdb/commit/c690a44ac2258228b3c4d8a1dc7f2b053cd2d8be))

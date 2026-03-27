# Easy Ratings Database (ERDB) - Stateless Edition

ERDB generates poster/backdrop/logo images with dynamic ratings on-the-fly.

## Quick Start

## Install From GitHub

```bash
git clone https://github.com/realbestia1/erdb
cd erdb
```

1. Install dependencies: `sudo npm install`
2. Build: `npm run build`
3. Start the app: `npm run start`
4. App available at `http://localhost:3000`

By default, `npm run start` now launches the standalone server in multi-process mode and uses all available CPU cores on the machine. You can override it with `ERDB_WORKERS=<n> npm run start`, or force single-process mode with `npm run start:single`.

## Docker

## Recommended Requirements

For high performance (on-the-fly image rendering), a server with a strong CPU and plenty of RAM is recommended.

Minimum recommended:
- CPU: 4 vCPU
- RAM: 4 GB

Basic start:
```bash
docker compose up -d --build
```

Docker now runs a single `app` container in multi-process mode. By default it uses `ERDB_WORKERS=auto`, so the container starts one worker per available CPU core. You can pin a fixed number with `ERDB_WORKERS=4 docker compose up -d --build`.

Run the published image directly:
```bash
docker pull ghcr.io/realbestia1/erdb:latest
docker run -d \
  --name erdb \
  -p 3000:3000 \
  -v ./data:/app/data \
  ghcr.io/realbestia1/erdb:latest
```

Update the published image:
```bash
docker pull ghcr.io/realbestia1/erdb:latest
docker stop erdb
docker rm erdb
docker run -d \
  --name erdb \
  -p 3000:3000 \
  -v ./data:/app/data \
  ghcr.io/realbestia1/erdb:latest
```

The public port is `ERDB_HTTP_PORT` (default `3000`) exposed directly by the `app` container. Set it in the `.env` file.
Data (SQLite database and image cache) is persisted in `./data`.

Custom port:
```bash
ERDB_HTTP_PORT=4000 docker compose up -d --build
```

## CI Docker Image

The repository includes a GitHub Actions workflow at [`.github/workflows/docker-image.yml`](/c:/Users/Bestia/Desktop/erdb/.github/workflows/docker-image.yml).

- On pull requests, it verifies that the Docker image builds successfully.
- On pushes to `main`, it builds and publishes the image to `ghcr.io/<owner>/<repo>`.
- On tags like `v1.0.0`, it also publishes a versioned image tag.
## HuggingFace Guide (NOT RECOMMENDED)

(to avoid bans on HuggingFace)
1. Go to the ERDB GitHub repo: https://github.com/realbestia1/erdb
2. Click the "Fork" button in the top-right corner
3. Choose any name for the fork (do not use "erdb")

### HuggingFace Steps

1. Create a new Space
2. Choose any name
3. Select Docker
4. Select Blank
5. Set it as a Public space
6. Click Create Space

Now click "Create the Dockerfile" (near the bottom of the page).

Copy and paste the content of `Dockerfile.hf` into the editor that opens,
replacing "realbestia1" with your GitHub username.

Line to change:

```text
RUN git clone https://github.com/realbestia1/erdb.git .
```

After the edit, click "Commit new file to main".

### ERDB URL

To get your personal link:

1. Click the three dots in the top-right corner
2. Go to "Embed this Space"
3. Copy the Direct URL

Done! Your ERDB is ready to use on HuggingFace.

Note: to update ERDB quickly, go to the Space settings and click
"Factory Rebuild" only after syncing your fork on GitHub.

## API Usage

Main endpoint:
`GET /{type}/{id}.jpg?ratings={providers}&lang={lang}&ratingStyle={style}...`

### Examples
- **Poster with IMDb and TMDB**: `/poster/tt0133093.jpg?ratings=imdb,tmdb&lang=it`
- **Minimal backdrop**: `/backdrop/tmdb:603.jpg?ratings=mdblist&style=plain`

### Supported Query Parameters

| Parameter | Description | Supported Values | Default |
|-----------|-------------|------------------|---------|
| `type` | Image type (Path) | `poster`, `backdrop`, `logo` | - |
| `id` | Media ID (Path) | IMDb (tt...), TMDB (tmdb:..., tmdb:movie:..., tmdb:tv:..., tmdb:series:...), Kitsu (kitsu:...) | - |
| `lang` | Image language | Any TMDB ISO 639-1 code (e.g. `it`, `en`, `es`, `fr`, `de`, `ru`, `ja`) | `en` |
| `streamBadges` | Quality badges via Torrentio (global fallback) | `auto`, `on`, `off` | `auto` |
| `posterStreamBadges` | Poster quality badges | `auto`, `on`, `off` | `auto` |
| `backdropStreamBadges` | Backdrop quality badges | `auto`, `on`, `off` | `auto` |
| `qualityBadgesSide` | Quality badges side (`top-bottom` poster layout) | `left`, `right` | `left` |
| `posterQualityBadgesPosition` | Quality badges position (`top`/`bottom` poster layouts) | `auto`, `left`, `right` | `auto` |
| `qualityBadgesStyle` | Quality badges style (global fallback) | `glass`, `square`, `plain` | `glass` |
| `posterQualityBadgesStyle` | Poster quality badges style | `glass`, `square`, `plain` | `glass` |
| `backdropQualityBadgesStyle` | Backdrop quality badges style | `glass`, `square`, `plain` | `glass` |
| `ratings` | Rating providers (global fallback) | `tmdb, mdblist, imdb, tomatoes, tomatoesaudience, letterboxd, metacritic, metacriticuser, trakt, simkl, rogerebert, myanimelist, anilist, kitsu` | `all` |
| `posterRatings` | Poster rating providers | `tmdb, mdblist, imdb, tomatoes, tomatoesaudience, letterboxd, metacritic, metacriticuser, trakt, simkl, rogerebert, myanimelist, anilist, kitsu` | `all` |
| `backdropRatings` | Backdrop rating providers | `tmdb, mdblist, imdb, tomatoes, tomatoesaudience, letterboxd, metacritic, metacriticuser, trakt, simkl, rogerebert, myanimelist, anilist, kitsu` | `all` |
| `logoRatings` | Logo rating providers | `tmdb, mdblist, imdb, tomatoes, tomatoesaudience, letterboxd, metacritic, metacriticuser, trakt, simkl, rogerebert, myanimelist, anilist, kitsu` | `all` |
| `ratingStyle` (or `style`) | Badge style | `glass` (Pill), `square` (Dark), `plain` (No BG) | `glass` (poster/backdrop), `plain` (logo) |
| `tmdbKey` | TMDB v3 API Key (Stateless) | String (e.g. `your_key`) | **Required** |
| `mdblistKey` | MDBList API Key (Stateless) | String (e.g. `your_key`) | **Required** |
| `simklClientId` | SIMKL `client_id` for direct SIMKL ratings | String (e.g. `your_client_id`) | Optional |
| `imageText` | Image text (poster/backdrop only) | `original`, `clean`, `alternative` | `original` (poster), `clean` (backdrop) |
| `posterRatingsLayout` | Poster layout | `top`, `bottom`, `left`, `right`, `top-bottom`, `left-right` | `top-bottom` |
| `posterRatingsMaxPerSide` | Max badges per side | Number (1-20) | `auto` |
| `backdropRatingsLayout` | Backdrop layout | `center`, `right`, `right-vertical` | `center` |

All rendered ratings are normalized to a `0-10` display scale for `poster`, `backdrop`, and `logo` outputs. Providers that already use `/10` are shown without the suffix, percentage sources are converted to decimal (`69%` -> `6.9`), `/5` sources are doubled (`4.2/5` -> `8.4`), and `/4` sources are multiplied by `2.5`.

### Supported ID Formats

ERDB supports multiple formats to identify media:

- **IMDb**: `tt0133093` (standard `tt` + numbers)
- **TMDB**: `tmdb:603`, `tmdb:movie:603`, `tmdb:tv:1399`, `tmdb:series:1399` (`series` is treated as `tv`)
- **Kitsu**: `kitsu:1` (prefix `kitsu:` followed by the ID)
- **Anime Mappings**: `provider:id` (e.g. `anilist:123`, `myanimelist:456`)

## Addon Developer Guide

To integrate ERDB into your addon:

1. **Config String**: use a single `erdbConfig` string (base64url) generated by the ERDB configurator. It contains base URL, TMDB key, MDBList key, optional SIMKL client_id, and all parameters (ratings with per-type overrides, lang, quality badges with per-type overrides, side, style, per-type style, per-type text, layouts).
2. **Addon UI**: show ONLY the toggles to enable/disable `poster`, `backdrop`, `logo`. No modal and no extra settings panels.
3. **Fallback**: if a type is disabled, keep the original artwork (do not call ERDB for that type).
4. **Decode**: decode `erdbConfig` (base64url -> JSON) once and reuse it.
5. **URL build**: `{baseUrl}/{type}/{id}.jpg?tmdbKey=...&mdblistKey=...&simklClientId=...&ratings=...&posterRatings=...&backdropRatings=...&logoRatings=...&lang=...&streamBadges=...&posterStreamBadges=...&backdropStreamBadges=...&qualityBadgesSide=...&posterQualityBadgesPosition=...&qualityBadgesStyle=...&posterQualityBadgesStyle=...&backdropQualityBadgesStyle=...&ratingStyle=...&imageText=...` using the per-type config fields:
   - `poster`: `posterRatingStyle`, `posterImageText`
   - `backdrop`: `backdropRatingStyle`, `backdropImageText`
   - `logo`: `logoRatingStyle` (omit `imageText`)

### AI Integration Prompt

If you are using an AI agent (Claude, ChatGPT, etc.) to build your addon, copy this prompt:

```text
Act as an expert addon developer. I want to implement the ERDB Stateless API into my media center addon.

--- CONFIG INPUT ---
Add a single text field called "erdbConfig" (base64url). The user will paste it from the ERDB site after configuring there.
Do NOT hardcode API keys or base URL. Always use cfg.baseUrl from erdbConfig.

--- DECODE ---
Node/JS: const cfg = JSON.parse(Buffer.from(erdbConfig, 'base64url').toString('utf8'));

--- FULL API REFERENCE ---
Endpoint: GET /{type}/{id}.jpg?...queryParams

Parameter               | Values                                                              | Default
type (path)             | poster, backdrop, logo                                               | -
id (path)               | IMDb (tt...), TMDB (tmdb:id / tmdb:movie:id / tmdb:tv:id), Kitsu (kitsu:id), AniList, MAL          | -
ratings                 | tmdb, mdblist, imdb, tomatoes, tomatoesaudience, letterboxd,         | all
                        | metacritic, metacriticuser, trakt, simkl, rogerebert,               |
                        | myanimelist, anilist, kitsu (global fallback)                       |
posterRatings           | tmdb, mdblist, imdb, tomatoes, tomatoesaudience, letterboxd,         | all
                        | metacritic, metacriticuser, trakt, simkl, rogerebert,               |
                        | myanimelist, anilist, kitsu (poster only)                           |
backdropRatings         | tmdb, mdblist, imdb, tomatoes, tomatoesaudience, letterboxd,         | all
                        | metacritic, metacriticuser, trakt, simkl, rogerebert,               |
                        | myanimelist, anilist, kitsu (backdrop only)                         |
logoRatings             | tmdb, mdblist, imdb, tomatoes, tomatoesaudience, letterboxd,         | all
                        | metacritic, metacriticuser, trakt, simkl, rogerebert,               |
                        | myanimelist, anilist, kitsu (logo only)                             |
lang                    | Any TMDB ISO 639-1 code (en, it, fr, es, de, ja, ko, etc.)            | en
streamBadges            | auto, on, off (global fallback)                                      | auto
posterStreamBadges      | auto, on, off (poster only)                                          | auto
backdropStreamBadges    | auto, on, off (backdrop only)                                        | auto
qualityBadgesSide       | left, right (poster top-bottom only)                                 | left
posterQualityBadgesPosition | auto, left, right (poster top/bottom only)                       | auto
qualityBadgesStyle      | glass, square, plain (global fallback)                               | glass
posterQualityBadgesStyle| glass, square, plain (poster only)                                   | glass
backdropQualityBadgesStyle| glass, square, plain (backdrop only)                               | glass
ratingStyle             | glass, square, plain                                                 | glass
imageText               | original, clean, alternative                                         | original
posterRatingsLayout     | top, bottom, left, right, top-bottom, left-right                     | top-bottom
posterRatingsMaxPerSide | Number (1-20)                                                        | auto
backdropRatingsLayout   | center, right, right-vertical                                        | center
tmdbKey (REQUIRED)      | Your TMDB v3 API Key                                                 | -
mdblistKey (REQUIRED)   | Your MDBList.com API Key                                             | -
simklClientId (OPTIONAL)| Your SIMKL client_id for direct SIMKL ratings                        | -

--- INTEGRATION REQUIREMENTS ---
1. Use ONLY the "erdbConfig" field (no modal and no extra settings panels).
2. Add toggles to enable/disable: poster, backdrop, logo.
3. If a type is disabled, keep the original artwork (do not call ERDB for that type).
4. Build ERDB URLs using the decoded config and inject them into both catalog and meta responses.

--- PER-TYPE SETTINGS ---
poster   -> ratingStyle = cfg.posterRatingStyle, imageText = cfg.posterImageText
backdrop -> ratingStyle = cfg.backdropRatingStyle, imageText = cfg.backdropImageText
logo     -> ratingStyle = cfg.logoRatingStyle (omit imageText)
Ratings providers can be set per-type via cfg.posterRatings / cfg.backdropRatings / cfg.logoRatings (fallback to cfg.ratings).
Quality badges can be set per-type via cfg.posterStreamBadges / cfg.backdropStreamBadges (fallback to cfg.streamBadges).
Quality badges style can be set per-type via cfg.posterQualityBadgesStyle / cfg.backdropQualityBadgesStyle (fallback to cfg.qualityBadgesStyle).

--- URL BUILD ---
const typeRatingStyle = type === 'poster' ? cfg.posterRatingStyle : type === 'backdrop' ? cfg.backdropRatingStyle : cfg.logoRatingStyle;
const typeImageText = type === 'backdrop' ? cfg.backdropImageText : cfg.posterImageText;
${cfg.baseUrl}/${type}/${id}.jpg?tmdbKey=${cfg.tmdbKey}&mdblistKey=${cfg.mdblistKey}&simklClientId=${cfg.simklClientId}&ratings=${cfg.ratings}&posterRatings=${cfg.posterRatings}&backdropRatings=${cfg.backdropRatings}&logoRatings=${cfg.logoRatings}&lang=${cfg.lang}&streamBadges=${cfg.streamBadges}&posterStreamBadges=${cfg.posterStreamBadges}&backdropStreamBadges=${cfg.backdropStreamBadges}&qualityBadgesSide=${cfg.qualityBadgesSide}&posterQualityBadgesPosition=${cfg.posterQualityBadgesPosition}&qualityBadgesStyle=${cfg.qualityBadgesStyle}&posterQualityBadgesStyle=${cfg.posterQualityBadgesStyle}&backdropQualityBadgesStyle=${cfg.backdropQualityBadgesStyle}&ratingStyle=${typeRatingStyle}&imageText=${typeImageText}&posterRatingsLayout=${cfg.posterRatingsLayout}&posterRatingsMaxPerSide=${cfg.posterRatingsMaxPerSide}&backdropRatingsLayout=${cfg.backdropRatingsLayout}

Omit imageText when type=logo.

Skip any params that are undefined. Keep empty ratings/posterRatings/backdropRatings/logoRatings to disable providers.
```

---

## Addon Proxy (Stremio)

ERDB can act as a proxy for any Stremio addon and always replace images
(poster, background, logo) with the ones generated by ERDB.

### Manifest Proxy (Stremio)

Stremio does not use query params here. **You must generate the link from the ERDB site** using the "Addon Proxy" section:

```text
https://YOUR_ERDB_HOST/proxy/{config}/manifest.json
```

`{config}` is created automatically by the site based on the inserted parameters.

### Notes
- The proxy rewrites enabled `meta.poster`, `meta.background`, `meta.logo` (types can be toggled in the Addon Proxy UI).
- The `url` field must point to the original addon's `manifest.json`.
- `tmdbKey` and `mdblistKey` are required.

https://github.com/user-attachments/assets/5e1e2496-509a-4b85-ab45-d1f406576af4

https://github.com/user-attachments/assets/2385d7a1-c5da-4240-b016-d2880c6d1184

© 2026 ERDB Project


'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, Star, Settings2, Globe2, Layers, Cpu, Code2, Terminal, ExternalLink, Zap, ChevronRight, Hash, Sparkles, MonitorPlay, Bot, Clipboard, Check } from 'lucide-react';
import {
  RATING_PROVIDER_OPTIONS,
  stringifyRatingPreferencesAllowEmpty,
  type RatingPreference,
} from '@/lib/ratingPreferences';
import {
  BACKDROP_RATING_LAYOUT_OPTIONS,
  DEFAULT_BACKDROP_RATING_LAYOUT,
  type BackdropRatingLayout,
} from '@/lib/backdropRatingLayout';
import {
  DEFAULT_POSTER_RATINGS_MAX_PER_SIDE,
  DEFAULT_POSTER_RATING_LAYOUT,
  POSTER_RATING_LAYOUT_OPTIONS,
  type PosterRatingLayout,
} from '@/lib/posterRatingLayout';
import {
  DEFAULT_RATING_STYLE,
  RATING_STYLE_OPTIONS,
  type RatingStyle,
} from '@/lib/ratingStyle';

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
];
const VISIBLE_RATING_PROVIDER_OPTIONS = RATING_PROVIDER_OPTIONS.filter(
  (provider) => provider.id !== 'thetvdb'
);

export default function Home() {
  const [previewType, setPreviewType] = useState<'poster' | 'backdrop' | 'logo'>('poster');
  const [mediaId, setMediaId] = useState('tt0133093');
  const [lang, setLang] = useState('en');
  const [posterText, setPosterText] = useState<'original' | 'clean' | 'alternative'>('original');
  const [ratingPreferences, setRatingPreferences] = useState<RatingPreference[]>(['imdb', 'tmdb', 'mdblist']);
  const [posterRatingsLayout, setPosterRatingsLayout] = useState<PosterRatingLayout>(DEFAULT_POSTER_RATING_LAYOUT);
  const [backdropRatingsLayout, setBackdropRatingsLayout] = useState<BackdropRatingLayout>(DEFAULT_BACKDROP_RATING_LAYOUT);
  const [ratingStyle, setRatingStyle] = useState<RatingStyle>(DEFAULT_RATING_STYLE);
  const [posterRatingsMaxPerSide, setPosterRatingsMaxPerSide] = useState<number | null>(DEFAULT_POSTER_RATINGS_MAX_PER_SIDE);
  const [supportedLanguages, setSupportedLanguages] = useState(SUPPORTED_LANGUAGES);
  const [previewUrl, setPreviewUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [mdblistKey, setMdblistKey] = useState('');
  const [tmdbKey, setTmdbKey] = useState('');
  const [proxyManifestUrl, setProxyManifestUrl] = useState('');
  const [proxyBaseUrl, setProxyBaseUrl] = useState('');
  const [proxyTmdbKey, setProxyTmdbKey] = useState('');
  const [proxyMdblistKey, setProxyMdblistKey] = useState('');
  const [proxyRatingPreferences, setProxyRatingPreferences] = useState<RatingPreference[]>(['imdb', 'tmdb', 'mdblist']);
  const [proxyLang, setProxyLang] = useState('en');
  const [proxyConfigType, setProxyConfigType] = useState<'poster' | 'backdrop' | 'logo'>('poster');
  const [proxyPosterRatingStyle, setProxyPosterRatingStyle] = useState<RatingStyle>(DEFAULT_RATING_STYLE);
  const [proxyBackdropRatingStyle, setProxyBackdropRatingStyle] = useState<RatingStyle>(DEFAULT_RATING_STYLE);
  const [proxyLogoRatingStyle, setProxyLogoRatingStyle] = useState<RatingStyle>('plain');
  const [proxyPosterImageText, setProxyPosterImageText] = useState<'original' | 'clean' | 'alternative'>('original');
  const [proxyBackdropImageText, setProxyBackdropImageText] = useState<'original' | 'clean' | 'alternative'>('clean');
  const [proxyPosterRatingsLayout, setProxyPosterRatingsLayout] = useState<PosterRatingLayout>(DEFAULT_POSTER_RATING_LAYOUT);
  const [proxyPosterRatingsMaxPerSide, setProxyPosterRatingsMaxPerSide] = useState<number | null>(DEFAULT_POSTER_RATINGS_MAX_PER_SIDE);
  const [proxyBackdropRatingsLayout, setProxyBackdropRatingsLayout] = useState<BackdropRatingLayout>(DEFAULT_BACKDROP_RATING_LAYOUT);
  const [proxyUrl, setProxyUrl] = useState('');
  const [proxyCopied, setProxyCopied] = useState(false);

  const [copied, setCopied] = useState(false);
  const [promptBaseUrl, setPromptBaseUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setBaseUrl(origin);
      setPromptBaseUrl(origin);
    }
  }, []);

  useEffect(() => {
    if (!proxyBaseUrl && baseUrl) {
      setProxyBaseUrl(baseUrl);
    }
  }, [baseUrl, proxyBaseUrl]);

  useEffect(() => {
    if (!proxyTmdbKey && tmdbKey) {
      setProxyTmdbKey(tmdbKey);
    }
  }, [tmdbKey, proxyTmdbKey]);

  useEffect(() => {
    if (!proxyMdblistKey && mdblistKey) {
      setProxyMdblistKey(mdblistKey);
    }
  }, [mdblistKey, proxyMdblistKey]);

  useEffect(() => {
    if (tmdbKey && tmdbKey.length > 10) {
      fetch(`https://api.themoviedb.org/3/configuration/languages?api_key=${tmdbKey}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const formatted = data.map((l: any) => ({
              code: l.iso_639_1,
              label: l.english_name || l.name,
              flag: '🌐'
            })).sort((a, b) => a.label.localeCompare(b.label));
            setSupportedLanguages(formatted);
          }
        })
        .catch(() => { });
    }
  }, [tmdbKey]);

  const handleCopyPrompt = useCallback(() => {
    const prompt = `Act as an expert addon developer. I want to implement the ERDB Stateless API into my media center addon (e.g., Stremio, Kodi).

API Base URL: ${promptBaseUrl || '(YOUR_API_BASE_URL)'}
Base URL must be entered during configuration and must remain editable (do not hardcode or lock it).

--- FULL API REFERENCE ---

Endpoint: GET /{type}/{id}.jpg?...queryParams

| Parameter               | Values                                                                                                                                               | Default       |
|-------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|---------------|
| type (path)             | poster, backdrop, logo                                                                                                                               | —             |
| id (path)               | IMDb (tt0133093), TMDB (tmdb:603), Kitsu (kitsu:1), AniList (anilist:id), MAL (myanimelist:id)                                                      | —             |
| ratings                 | tmdb, mdblist, imdb, tomatoes, tomatoesaudience, letterboxd, metacritic, metacriticuser, trakt, rogerebert, myanimelist, anilist, kitsu             | all           |
| lang                    | Any TMDB ISO 639-1 code (en, it, fr, es, de, ja, ko, zh, pt, ru, ar, hi, etc.)                                                                     | en            |
| ratingStyle             | glass, square, plain                                                                                                                                 | glass         |
| imageText               | original, clean, alternative                                                                                                                         | original      |
| posterRatingsLayout     | top, bottom, left, right, top-bottom, left-right, below                                                                                              | top-bottom    |
| posterRatingsMaxPerSide | Number (1-20)                                                                                                                                        | auto          |
| backdropRatingsLayout   | center, right, right-vertical                                                                                                                        | center        |
| tmdbKey (REQUIRED)      | Your TMDB v3 API Key                                                                                                                                 | —             |
| mdblistKey (REQUIRED)   | Your MDBList.com API Key                                                                                                                             | —             |

--- TYPE-SPECIFIC CONFIGS ---
poster:
- imageText: original, clean, alternative
- ratingStyle: glass, square, plain (per-type override)
- posterRatingsLayout: top, bottom, left, right, top-bottom, left-right, below
- posterRatingsMaxPerSide: 1-20 (auto if omitted)
backdrop:
- imageText: original, clean, alternative
- ratingStyle: glass, square, plain (per-type override)
- backdropRatingsLayout: center, right, right-vertical
logo:
- ratingStyle: glass, square, plain (per-type override)
- no extra layout config (base params only)

--- ID FORMATS ---
| Source          | Format          | Example              |
|-----------------|-----------------|----------------------|
| IMDb            | tt + numbers    | tt0133093            |
| TMDB            | tmdb:id         | tmdb:603             |
| Kitsu           | kitsu:id        | kitsu:1              |
| AniList         | anilist:id      | anilist:123          |
| MyAnimeList     | myanimelist:id  | myanimelist:456      |

--- INTEGRATION REQUIREMENTS ---
1. Create a configuration settings panel for users to customize the imagery.
2. Add a "Setup" button that opens a modal containing the full configuration UI (keep the main page clean).
3. Options to include in the settings UI:
   - Ratings (Multi-select): All providers from the table above.
   - Languages: Support all TMDB ISO 639-1 language codes.
   - Style: glass, square, plain.
   - Per-type Rating Style Overrides: Allow different ratingStyle for poster, backdrop, logo.
   - Enable/Disable Types: Toggles for poster, backdrop, logo. If disabled, do not call ERDB for that type (keep original artwork).
   - Image Text (per-type): original, clean, alternative (config separata tra poster e backdrop).
   - Layouts: posterRatingsLayout, backdropRatingsLayout (with all values from API Reference).
   - Poster Max Ratings Per Side: Number input (1-20) with Auto default.
   - TMDB API Key (Required): Users MUST provide their own v3 key.
   - MDBList API Key (Required): Users MUST provide their own key.
4. **Live Preview (Crucial)**: The settings panel MUST include a live image preview that updates instantly as the user changes parameters.
5. Dynamic URL Construction:
   Structure: ${baseUrl}/\${type}/\${id}.jpg?tmdbKey=\${tmdbKey}&mdblistKey=\${mdblistKey}&ratings=\${ratings}&lang=\${lang}&ratingStyle=\${style}&imageText=\${imageText}&posterRatingsLayout=\${layout}&posterRatingsMaxPerSide=\${max}&backdropRatingsLayout=\${bLayout}

Goal: Generate the logic/code to manage these preferences and inject the generated URLs into the meta responses of the addon.`;

    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [promptBaseUrl]);

  useEffect(() => {
    const ratingsQuery = stringifyRatingPreferencesAllowEmpty(ratingPreferences);
    const query = new URLSearchParams({
      ratings: ratingsQuery,
      ratingStyle,
      lang,
    });

    if (mdblistKey) {
      query.set('mdblistKey', mdblistKey);
    }
    if (tmdbKey) {
      query.set('tmdbKey', tmdbKey);
    }

    if (previewType === 'poster' || previewType === 'backdrop') {
      query.set('posterText', posterText);
    }
    if (previewType === 'poster') {
      query.set('posterRatingsLayout', posterRatingsLayout);
      if (posterRatingsMaxPerSide !== null) {
        query.set('posterRatingsMaxPerSide', String(posterRatingsMaxPerSide));
      }
    } else if (previewType === 'backdrop') {
      query.set('backdropRatingsLayout', backdropRatingsLayout);
    }

    const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    setPreviewUrl(`${origin}/${previewType}/${mediaId}.jpg?${query.toString()}`);
  }, [previewType, mediaId, lang, posterText, ratingPreferences, posterRatingsLayout, posterRatingsMaxPerSide, backdropRatingsLayout, ratingStyle, baseUrl, mdblistKey, tmdbKey]);

  useEffect(() => {
    const rawOrigin = proxyBaseUrl || baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const origin = rawOrigin.trim().replace(/\/+$/, '');
    if (!origin) {
      setProxyUrl('');
      return;
    }

    const manifestUrl = proxyManifestUrl.trim();
    const tmdb = proxyTmdbKey.trim();
    const mdb = proxyMdblistKey.trim();
    if (!manifestUrl || !tmdb || !mdb) {
      setProxyUrl('');
      return;
    }

    const config: Record<string, string> = {
      url: manifestUrl,
      tmdbKey: tmdb,
      mdblistKey: mdb,
    };

    const proxyRatingsQuery = stringifyRatingPreferencesAllowEmpty(proxyRatingPreferences);
    if (proxyRatingsQuery) {
      config.ratings = proxyRatingsQuery;
    }
    if (proxyLang) {
      config.lang = proxyLang;
    }

    config.posterRatingStyle = proxyPosterRatingStyle;
    config.backdropRatingStyle = proxyBackdropRatingStyle;
    config.logoRatingStyle = proxyLogoRatingStyle;
    config.posterImageText = proxyPosterImageText;
    config.backdropImageText = proxyBackdropImageText;

    if (proxyPosterRatingsLayout) {
      config.posterRatingsLayout = proxyPosterRatingsLayout;
    }
    if (proxyPosterRatingsMaxPerSide !== null) {
      config.posterRatingsMaxPerSide = String(proxyPosterRatingsMaxPerSide);
    }
    if (proxyBackdropRatingsLayout) {
      config.backdropRatingsLayout = proxyBackdropRatingsLayout;
    }

    if (origin) {
      config.erdbBase = origin;
    }

    const json = JSON.stringify(config);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    setProxyUrl(`${origin}/proxy/${encoded}/manifest.json`);
  }, [
    proxyManifestUrl,
    proxyTmdbKey,
    proxyMdblistKey,
    proxyRatingPreferences,
    proxyLang,
    proxyPosterRatingStyle,
    proxyBackdropRatingStyle,
    proxyLogoRatingStyle,
    proxyPosterImageText,
    proxyBackdropImageText,
    proxyPosterRatingsLayout,
    proxyPosterRatingsMaxPerSide,
    proxyBackdropRatingsLayout,
    proxyBaseUrl,
    baseUrl,
  ]);

  const toggleRatingPreference = (rating: RatingPreference) => {
    setRatingPreferences((current) =>
      current.includes(rating)
        ? current.filter((item) => item !== rating)
        : [...current, rating]
    );
  };

  const toggleProxyRatingPreference = (rating: RatingPreference) => {
    setProxyRatingPreferences((current) =>
      current.includes(rating)
        ? current.filter((item) => item !== rating)
        : [...current, rating]
    );
  };

  const handleCopyProxy = useCallback(() => {
    if (!proxyUrl) return;
    navigator.clipboard.writeText(proxyUrl);
    setProxyCopied(true);
    setTimeout(() => setProxyCopied(false), 2000);
  }, [proxyUrl]);

  const canGenerateProxy = Boolean(proxyManifestUrl.trim() && proxyTmdbKey.trim() && proxyMdblistKey.trim());

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 selection:bg-orange-500/30">
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-white tracking-tight text-lg">ERDB <span className="text-orange-500 text-sm font-medium ml-1">Stateless</span></span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <a href="#preview" className="hover:text-white transition-colors">Previewer</a>
            <a href="#proxy" className="hover:text-white transition-colors">Addon Proxy</a>
            <a href="#docs" className="hover:text-white transition-colors">API Docs</a>
            <a href="https://github.com/realbestia1/erdb" className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 hover:bg-zinc-800 transition-colors">GitHub</a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20 space-y-24">
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-4xl mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent blur-3xl rounded-full -z-10 h-64 pointer-events-none" />
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">
            Stunning Ratings.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-orange-600">
              Stateless API.
            </span>
          </h1>
          <p className="mt-4 text-lg text-zinc-400 leading-relaxed">
            Generate dynamic posters and backdrops for your Addons. <br className="hidden md:block" />
            No accounts, no tokens, just beautiful imagery via query parameters.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#preview" className="px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-colors">
              Try the Previewer
            </a>
            <a href="#docs" className="px-8 py-4 rounded-full bg-zinc-900 text-white font-semibold border border-white/10 hover:bg-zinc-800 transition-colors">
              Read API Docs
            </a>
          </div>
        </section>

        {/* Live Previewer */}
        <section id="preview" className="scroll-mt-24">
          <div className="grid xl:grid-cols-[1fr_1fr] gap-8 items-start">
            {/* Controls */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Configuration</h2>
                <p className="text-sm text-zinc-400">Adjust parameters to see the preview update in real-time.</p>
              </div>

              {/* API Keys - compact row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">TMDB</label>
                  <input type="password" value={tmdbKey} onChange={(e) => setTmdbKey(e.target.value)} placeholder="v3 Key" className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:border-orange-500/50 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">MDBList</label>
                  <input type="password" value={mdblistKey} onChange={(e) => setMdblistKey(e.target.value)} placeholder="Key" className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:border-orange-500/50 outline-none" />
                </div>
              </div>

              {/* Main row: Type + Media ID + Lang */}
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Type</span>
                  <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-white/10">
                    {(['poster', 'backdrop', 'logo'] as const).map(type => (
                      <button key={type} onClick={() => setPreviewType(type)} className={`px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${previewType === type ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>
                        {type === 'poster' && <ImageIcon className="w-3.5 h-3.5" />}
                        {type === 'backdrop' && <MonitorPlay className="w-3.5 h-3.5" />}
                        {type === 'logo' && <Layers className="w-3.5 h-3.5" />}
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Media ID</span>
                  <input type="text" value={mediaId} onChange={(e) => setMediaId(e.target.value)} placeholder="tt0133093" className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:border-orange-500/50 outline-none" />
                </div>
                {tmdbKey ? (
                  <div className="w-32">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 flex items-center gap-1 mb-1"><Globe2 className="w-3 h-3" /> Lang</span>
                    <div className="relative">
                      <select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white appearance-none outline-none focus:border-orange-500/50">
                        {supportedLanguages.map(l => <option key={l.code} value={l.code} className="bg-zinc-900">{l.flag} {l.code}</option>)}
                      </select>
                      <ChevronRight className="w-3 h-3 text-zinc-500 absolute right-2 top-2.5 pointer-events-none stroke-2 rotate-90" />
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-black border border-white/10 text-[10px] text-zinc-500 flex items-center gap-1.5">
                    <Globe2 className="w-3 h-3 shrink-0" /> Add TMDB key for lang
                  </div>
                )}
              </div>

              {/* Style + Image Text row */}
              <div className="flex flex-wrap gap-4 items-center">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Style</span>
                  <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-white/10">
                    {RATING_STYLE_OPTIONS.map(opt => (
                      <button key={opt.id} onClick={() => setRatingStyle(opt.id as RatingStyle)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${ratingStyle === opt.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                {previewType !== 'logo' && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Text</span>
                    <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-white/10">
                      {(['original', 'clean', 'alternative'] as const).map(option => (
                        <button key={option} onClick={() => setPosterText(option)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${posterText === option ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>{option.charAt(0).toUpperCase() + option.slice(1)}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {previewType === 'poster' && (
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Poster Layout</span>
                    <div className="flex flex-wrap gap-1">
                      {POSTER_RATING_LAYOUT_OPTIONS.map(opt => (
                        <button key={opt.id} onClick={() => setPosterRatingsLayout(opt.id as PosterRatingLayout)} className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${posterRatingsLayout === opt.id ? 'border-orange-500/60 bg-zinc-800 text-white' : 'border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'}`}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Max/side</span>
                    <input type="number" value={posterRatingsMaxPerSide ?? ''} onChange={(e) => setPosterRatingsMaxPerSide(e.target.value === '' ? null : parseInt(e.target.value))} placeholder="Auto" className="w-16 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-orange-500/50 outline-none" />
                    <button onClick={() => setPosterRatingsMaxPerSide(null)} className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800">Auto</button>
                  </div>
                </div>
              )}

              {previewType === 'backdrop' && (
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Backdrop Layout</span>
                  <div className="flex flex-wrap gap-1">
                    {BACKDROP_RATING_LAYOUT_OPTIONS.map(opt => (
                      <button key={opt.id} onClick={() => setBackdropRatingsLayout(opt.id as BackdropRatingLayout)} className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${backdropRatingsLayout === opt.id ? 'border-orange-500/60 bg-zinc-800 text-white' : 'border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'}`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1.5">Providers</span>
                <div className="flex flex-wrap gap-1.5">
                  {VISIBLE_RATING_PROVIDER_OPTIONS.map(provider => (
                    <label key={provider.id} className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] cursor-pointer select-none transition-colors ${ratingPreferences.includes(provider.id as RatingPreference) ? 'border-orange-500/60 bg-zinc-800 text-white' : 'border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'}`}>
                      <input type="checkbox" checked={ratingPreferences.includes(provider.id as RatingPreference)} onChange={() => toggleRatingPreference(provider.id as RatingPreference)} className="h-3 w-3 accent-orange-500" />
                      <span>{provider.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6">
                <h3 className="text-xl font-semibold text-white">Preview Output</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Stateless dynamic layout generated via query parameters.
                </p>
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/70 p-4 min-h-[320px] flex items-center justify-center flex-col">

                  {previewUrl ? (
                    <div className="z-10 w-full flex flex-col items-center gap-8">
                      <div className={`relative shadow-2xl shadow-black ring-1 ring-white/10 rounded-2xl overflow-hidden ${previewType === 'poster'
                        ? 'aspect-[2/3] w-72'
                        : previewType === 'logo'
                          ? 'h-48 w-full max-w-xl'
                          : 'aspect-video w-full max-w-2xl'
                        }`}>
                        <Image
                          key={previewUrl}
                          src={previewUrl}
                          alt="Preview"
                          unoptimized
                          fill
                          className={previewType === 'logo' ? 'object-contain' : 'object-cover'}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500">No preview available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Addon Proxy */}
        <section id="proxy" className="scroll-mt-24">
          <div className="grid xl:grid-cols-[1fr_1fr] gap-8 items-start">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Addon Proxy</h2>
                <p className="text-sm text-zinc-400">Paste a Stremio addon manifest to generate a new manifest that always uses ERDB images.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Manifest URL</label>
                  <input
                    type="url"
                    value={proxyManifestUrl}
                    onChange={(e) => setProxyManifestUrl(e.target.value)}
                    placeholder="https://addon.example.com/manifest.json"
                    className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:border-orange-500/50 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">TMDB</label>
                    <input
                      type="password"
                      value={proxyTmdbKey}
                      onChange={(e) => setProxyTmdbKey(e.target.value)}
                      placeholder="v3 Key"
                      className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:border-orange-500/50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">MDBList</label>
                    <input
                      type="password"
                      value={proxyMdblistKey}
                      onChange={(e) => setProxyMdblistKey(e.target.value)}
                      placeholder="Key"
                      className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:border-orange-500/50 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">ERDB Base URL</label>
                  <input
                    type="text"
                    value={proxyBaseUrl}
                    onChange={(e) => setProxyBaseUrl(e.target.value)}
                    placeholder={baseUrl || 'https://erdb.example.com'}
                    className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:border-orange-500/50 outline-none"
                  />
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
                  <div className="text-[11px] font-semibold text-zinc-400">ERDB parameters</div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1.5">Providers</span>
                      <div className="flex flex-wrap gap-1.5">
                        {VISIBLE_RATING_PROVIDER_OPTIONS.map(provider => (
                          <label key={`proxy-${provider.id}`} className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] cursor-pointer select-none transition-colors ${proxyRatingPreferences.includes(provider.id as RatingPreference) ? 'border-orange-500/60 bg-zinc-800 text-white' : 'border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'}`}>
                            <input type="checkbox" checked={proxyRatingPreferences.includes(provider.id as RatingPreference)} onChange={() => toggleProxyRatingPreference(provider.id as RatingPreference)} className="h-3 w-3 accent-orange-500" />
                            <span>{provider.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 items-end">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Type</span>
                        <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-white/10">
                          {(['poster', 'backdrop', 'logo'] as const).map(type => (
                            <button key={`proxy-type-${type}`} onClick={() => setProxyConfigType(type)} className={`px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${proxyConfigType === type ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>
                              {type === 'poster' && <ImageIcon className="w-3.5 h-3.5" />}
                              {type === 'backdrop' && <MonitorPlay className="w-3.5 h-3.5" />}
                              {type === 'logo' && <Layers className="w-3.5 h-3.5" />}
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {proxyTmdbKey ? (
                        <div className="w-32">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 flex items-center gap-1 mb-1"><Globe2 className="w-3 h-3" /> Lang</span>
                          <div className="relative">
                            <select value={proxyLang} onChange={(e) => setProxyLang(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white appearance-none outline-none focus:border-orange-500/50">
                              {supportedLanguages.map(l => <option key={`proxy-lang-${l.code}`} value={l.code} className="bg-zinc-900">{l.flag} {l.code}</option>)}
                            </select>
                            <ChevronRight className="w-3 h-3 text-zinc-500 absolute right-2 top-2.5 pointer-events-none stroke-2 rotate-90" />
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-black border border-white/10 text-[10px] text-zinc-500 flex items-center gap-1.5">
                          <Globe2 className="w-3 h-3 shrink-0" /> Add TMDB key for lang
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-3">
                      {proxyConfigType === 'poster' && (
                        <div className="flex flex-wrap gap-4 items-center">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Poster Style</span>
                            <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-white/10">
                              {RATING_STYLE_OPTIONS.map(opt => (
                                <button key={`proxy-poster-style-${opt.id}`} onClick={() => setProxyPosterRatingStyle(opt.id as RatingStyle)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${proxyPosterRatingStyle === opt.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>{opt.label}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Poster Text</span>
                            <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-white/10">
                              {(['original', 'clean', 'alternative'] as const).map(option => (
                                <button key={`proxy-poster-text-${option}`} onClick={() => setProxyPosterImageText(option)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${proxyPosterImageText === option ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>{option.charAt(0).toUpperCase() + option.slice(1)}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {proxyConfigType === 'backdrop' && (
                        <div className="flex flex-wrap gap-4 items-center">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Backdrop Style</span>
                            <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-white/10">
                              {RATING_STYLE_OPTIONS.map(opt => (
                                <button key={`proxy-backdrop-style-${opt.id}`} onClick={() => setProxyBackdropRatingStyle(opt.id as RatingStyle)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${proxyBackdropRatingStyle === opt.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>{opt.label}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Backdrop Text</span>
                            <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-white/10">
                              {(['original', 'clean', 'alternative'] as const).map(option => (
                                <button key={`proxy-backdrop-text-${option}`} onClick={() => setProxyBackdropImageText(option)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${proxyBackdropImageText === option ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>{option.charAt(0).toUpperCase() + option.slice(1)}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {proxyConfigType === 'logo' && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Logo Style</span>
                          <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg border border-white/10">
                            {RATING_STYLE_OPTIONS.map(opt => (
                              <button key={`proxy-logo-style-${opt.id}`} onClick={() => setProxyLogoRatingStyle(opt.id as RatingStyle)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${proxyLogoRatingStyle === opt.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}>{opt.label}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 items-end">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Poster Layout</span>
                        <div className="flex flex-wrap gap-1">
                          {POSTER_RATING_LAYOUT_OPTIONS.map(opt => (
                            <button key={`proxy-poster-layout-${opt.id}`} onClick={() => setProxyPosterRatingsLayout(opt.id as PosterRatingLayout)} className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${proxyPosterRatingsLayout === opt.id ? 'border-orange-500/60 bg-zinc-800 text-white' : 'border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'}`}>{opt.label}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Max/side</span>
                        <input type="number" value={proxyPosterRatingsMaxPerSide ?? ''} onChange={(e) => setProxyPosterRatingsMaxPerSide(e.target.value === '' ? null : parseInt(e.target.value))} placeholder="Auto" className="w-16 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-orange-500/50 outline-none" />
                        <button onClick={() => setProxyPosterRatingsMaxPerSide(null)} className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800">Auto</button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 block mb-1">Backdrop Layout</span>
                      <div className="flex flex-wrap gap-1">
                        {BACKDROP_RATING_LAYOUT_OPTIONS.map(opt => (
                          <button key={`proxy-backdrop-layout-${opt.id}`} onClick={() => setProxyBackdropRatingsLayout(opt.id as BackdropRatingLayout)} className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${proxyBackdropRatingsLayout === opt.id ? 'border-orange-500/60 bg-zinc-800 text-white' : 'border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'}`}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6">
                <h3 className="text-xl font-semibold text-white">Generated Manifest</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  Use this URL in Stremio. It ends with manifest.json and has no query params.
                </p>
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/70 p-4">
                  <div className="font-mono text-xs text-zinc-300 break-all">
                    {proxyUrl || `${proxyBaseUrl || baseUrl || 'https://erdb.example.com'}/proxy/{config}/manifest.json`}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCopyProxy}
                    disabled={!canGenerateProxy}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${canGenerateProxy ? (proxyCopied ? 'bg-green-500 text-white' : 'bg-orange-500 text-black hover:bg-orange-400') : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                  >
                    {proxyCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>COPY LINK</span>
                      </>
                    )}
                  </button>
                  <a
                    href={canGenerateProxy ? proxyUrl : undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={`px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors ${canGenerateProxy ? 'border border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800' : 'border border-white/5 bg-zinc-950 text-zinc-600 pointer-events-none'}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open
                  </a>
                </div>
                {!canGenerateProxy && (
                  <p className="mt-3 text-[11px] text-zinc-500">
                    Add manifest URL, TMDB key and MDBList key to generate a valid link.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-zinc-500">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Zap className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-zinc-200 font-semibold">Always replace images</div>
                    <div>Proxy rewrites `meta.poster`, `meta.background`, `meta.logo` for both `catalog` and `meta` responses.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Documentation Section */}
        <section id="docs" className="scroll-mt-24 pb-20">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">Developers</h2>
              <p className="text-zinc-500">Stateless rendering for any media ID.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-2xl space-y-3 hover:border-orange-500/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-orange-500" />
                </div>
                <h4 className="text-lg font-bold text-white">Dynamic Rendering</h4>
                <p className="text-sm text-zinc-400">No tokens needed. Pass parameters in the query string and let ERDB handle metadata and rendering.</p>
              </div>
              <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-2xl space-y-3 hover:border-blue-500/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-blue-500" />
                </div>
                <h4 className="text-lg font-bold text-white">Addon Friendly</h4>
                <p className="text-sm text-zinc-400">Perfect for Stremio, Kodi or any media center addon. Use simple URL patterns for easy integration in your code.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/10 bg-zinc-900/60">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-orange-500" /> API Reference
                  </h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[560px] text-sm">
                    <thead>
                      <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                        <th className="px-5 py-2.5">Parameter</th>
                        <th className="px-5 py-2.5">Values</th>
                        <th className="px-5 py-2.5">Default</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">type <span className="text-zinc-500">(path)</span></td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">poster, backdrop, logo</td>
                        <td className="px-5 py-2 text-zinc-500 text-xs">—</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">id <span className="text-zinc-500">(path)</span></td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">IMDb, TMDB, Kitsu, etc.</td>
                        <td className="px-5 py-2 text-zinc-500 text-xs">—</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">ratings</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">tmdb, mdblist, imdb, tomatoes, letterboxd, metacritic, trakt, myanimelist, anilist, kitsu</td>
                        <td className="px-5 py-2 text-zinc-500 text-xs">all</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">lang</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">{SUPPORTED_LANGUAGES.map(l => l.code).join(', ')}</td>
                        <td className="px-5 py-2 text-zinc-500 text-xs">en</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">ratingStyle</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">glass, square, plain</td>
                        <td className="px-5 py-2 text-zinc-500 text-xs">glass (poster/backdrop), plain (logo)</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">imageText</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">original, clean, alternative</td>
                        <td className="px-5 py-2 text-zinc-500 text-xs">original (poster), clean (backdrop)</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">posterRatingsLayout</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">top, bottom, left, right, top-bottom, left-right</td>
                        <td className="px-5 py-2 text-zinc-500 text-xs">top-bottom</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">posterRatingsMaxPerSide</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">1-20</td>
                        <td className="px-5 py-2 text-zinc-500 text-xs">auto</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">backdropRatingsLayout</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">center, right, right-vertical</td>
                        <td className="px-5 py-2 text-zinc-500 text-xs">center</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">tmdbKey <span className="font-bold">(req)</span></td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">TMDB v3 API Key</td>
                        <td className="px-5 py-2 text-zinc-500 text-xs">—</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">mdblistKey <span className="font-bold">(req)</span></td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">MDBList.com API Key</td>
                        <td className="px-5 py-2 text-zinc-500 text-xs">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/10 bg-zinc-900/60">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-orange-500" /> Type Configs
                  </h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[680px] text-sm">
                    <thead>
                      <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                        <th className="px-5 py-2.5">Type</th>
                        <th className="px-5 py-2.5">Config</th>
                        <th className="px-5 py-2.5">Layouts / Values</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">poster</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">
                          <div className="space-y-1">
                            <div>imageText</div>
                            <div>posterRatingsLayout</div>
                            <div>posterRatingsMaxPerSide</div>
                          </div>
                        </td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">
                          <div className="space-y-1">
                            <div>original, clean, alternative</div>
                            <div>top, bottom, left, right, top-bottom, left-right</div>
                            <div>1-20 (auto if omitted)</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">backdrop</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">
                          <div className="space-y-1">
                            <div>imageText</div>
                            <div>backdropRatingsLayout</div>
                          </div>
                        </td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">
                          <div className="space-y-1">
                            <div>original, clean, alternative</div>
                            <div>center, right, right-vertical</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-mono text-orange-400 text-xs">logo</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">none (base params only)</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="px-5 pb-5 pt-3 text-[11px] text-zinc-500">
                  Base params for all types: ratings, lang, ratingStyle, tmdbKey, mdblistKey.
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/10 bg-zinc-900/60">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Hash className="w-5 h-5 text-orange-500" /> ID Formats
                  </h3>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-white/5 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                        <th className="px-5 py-2.5">Source</th>
                        <th className="px-5 py-2.5">Format</th>
                        <th className="px-5 py-2.5">Example</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="px-5 py-2 font-bold text-zinc-300 text-xs">IMDb</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">tt + numbers</td>
                        <td className="px-5 py-2 font-mono text-orange-200/50 text-xs">tt0133093</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-bold text-zinc-300 text-xs">TMDB</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">tmdb:id</td>
                        <td className="px-5 py-2 font-mono text-orange-200/50 text-xs">tmdb:603</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-bold text-zinc-300 text-xs">Kitsu</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">kitsu:id</td>
                        <td className="px-5 py-2 font-mono text-orange-200/50 text-xs">kitsu:1</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2 font-bold text-zinc-300 text-xs">Anime</td>
                        <td className="px-5 py-2 text-zinc-400 text-xs">provider:id</td>
                        <td className="px-5 py-2 font-mono text-orange-200/50 text-xs">anilist:123, mal:456</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 bg-black border border-white/10 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/20 blur-[80px] pointer-events-none" />

                <div className="mb-6">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Base Structure</h4>
                  <div className="p-4 bg-zinc-900/60 border border-white/5 rounded-xl font-mono text-xs overflow-x-auto whitespace-nowrap pb-2">
                    <span className="text-zinc-500">{baseUrl || 'http://localhost:3000'}</span>
                    <span className="text-white">/</span>
                    <span className="text-orange-500 font-bold">{'{type}'}</span>
                    <span className="text-white">/</span>
                    <span className="text-orange-500 font-bold">{'{id}'}</span>
                    <span className="text-white">.jpg?</span>
                    <span className="text-orange-400 font-bold">ratings</span>=<span className="text-zinc-400 font-bold">{'{ratings}'}</span>
                    <span className="text-white">&</span>
                    <span className="text-orange-400 font-bold">lang</span>=<span className="text-zinc-400 font-bold">{'{lang}'}</span>
                    <span className="text-white">&</span>
                    <span className="text-orange-400 font-bold">ratingStyle</span>=<span className="text-zinc-400 font-bold">{'{style}'}</span>
                    <span className="text-white">&</span>
                    <span className="text-orange-400 font-bold">imageText</span>=<span className="text-zinc-400 font-bold">{'{text}'}</span>
                    <span className="text-white">&</span>
                    <span className="text-orange-400 font-bold">posterRatingsLayout</span>=<span className="text-zinc-400 font-bold">{'{layout}'}</span>
                    <span className="text-white">&</span>
                    <span className="text-orange-400 font-bold">posterRatingsMaxPerSide</span>=<span className="text-zinc-400 font-bold">{'{max}'}</span>
                    <span className="text-white">&</span>
                    <span className="text-orange-400 font-bold">backdropRatingsLayout</span>=<span className="text-zinc-400 font-bold">{'{bLayout}'}</span>
                    <span className="text-white">&</span>
                    <span className="text-orange-400 font-bold">tmdbKey</span>=<span className="text-zinc-400 font-bold">{'{tmdbKey}'}</span>
                    <span className="text-white">&</span>
                    <span className="text-orange-400 font-bold">mdblistKey</span>=<span className="text-zinc-400 font-bold">{'{mdbKey}'}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                    <div className="flex gap-2">
                      <span className="text-orange-500 font-bold shrink-0">lang (optional):</span>
                      <span className="text-zinc-400">All TMDB ISO 639-1 codes are supported (en, it, fr, es, de, etc.). Default: en.</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-orange-500 font-bold shrink-0">id (required):</span>
                      <span className="text-zinc-400">IMDb ID (tt...), TMDB ID (tmdb:...), or Kitsu ID (kitsu:...).</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-orange-500 font-bold shrink-0">tmdbKey (required):</span>
                      <span className="text-zinc-400">Your TMDB v3 API Key.</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-orange-500 font-bold shrink-0">mdblistKey (required):</span>
                      <span className="text-zinc-400">Your MDBList API Key.</span>
                    </div>
                  </div>
                </div>

                <div className="mb-10 bg-orange-500/5 border border-orange-500/10 rounded-2xl md:rounded-3xl p-5 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-500/20 rounded-2xl">
                        <Bot className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white">AI Developer Prompt</h4>
                        <p className="text-xs text-zinc-500">Copy this prompt to help an AI agent implement this API in your addon.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1 tracking-wider">Your API URL</label>
                        <input
                          type="text"
                          value={promptBaseUrl}
                          onChange={(e) => setPromptBaseUrl(e.target.value)}
                          placeholder="https://erdb.example.com"
                          className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-zinc-300 w-full md:w-64 focus:border-orange-500/50 outline-none transition-colors"
                        />
                      </div>
                      <button
                        onClick={handleCopyPrompt}
                        className={`mt-4 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${copied ? 'bg-green-500 text-white' : 'bg-orange-500 text-black hover:bg-orange-400'}`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>COPIED!</span>
                          </>
                        ) : (
                          <>
                            <Clipboard className="w-4 h-4" />
                            <span>COPY PROMPT</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-[11px] text-zinc-400 leading-relaxed overflow-auto relative max-h-[340px]">
                    <div className="whitespace-pre-wrap">{`Act as an expert addon developer. I want to implement the ERDB Stateless API into my media center addon.

API Base URL: ${promptBaseUrl || '(YOUR_API_BASE_URL)'}
Base URL must be entered during configuration and must remain editable (do not hardcode or lock it).

--- FULL API REFERENCE ---
Endpoint: GET /{type}/{id}.jpg?...queryParams

Parameter               | Values                                                              | Default
type (path)             | poster, backdrop, logo                                    | —
id (path)               | IMDb (tt...), TMDB (tmdb:id), Kitsu (kitsu:id), AniList, MAL         | —
ratings                 | tmdb, mdblist, imdb, tomatoes, tomatoesaudience, letterboxd,         | all
                        | metacritic, metacriticuser, trakt, rogerebert, myanimelist,          |
                        | anilist, kitsu                                              |
lang                    | Any TMDB ISO 639-1 code (en, it, fr, es, de, ja, ko, etc.)          | en
ratingStyle             | glass, square, plain                                                 | glass (poster/backdrop), plain (logo)
imageText               | original, clean, alternative                                         | original (poster), clean (backdrop)
posterRatingsLayout     | top, bottom, left, right, top-bottom, left-right                     | top-bottom
posterRatingsMaxPerSide | Number (1-20)                                                        | auto
backdropRatingsLayout   | center, right, right-vertical                                        | center
tmdbKey (REQUIRED)      | Your TMDB v3 API Key                                                 | —
mdblistKey (REQUIRED)   | Your MDBList.com API Key                                             | —

--- TYPE-SPECIFIC CONFIGS ---
poster:
- imageText: original, clean, alternative
- ratingStyle: glass, square, plain (per-type override)
- posterRatingsLayout: top, bottom, left, right, top-bottom, left-right, below
- posterRatingsMaxPerSide: 1-20 (auto if omitted)
backdrop:
- imageText: original, clean, alternative
- ratingStyle: glass, square, plain (per-type override)
- backdropRatingsLayout: center, right, right-vertical
logo:
- ratingStyle: glass, square, plain (per-type override)
- no extra layout config (base params only)

--- INTEGRATION REQUIREMENTS ---
1. Settings panel with all parameters above.
2. Add a "Setup" button that opens a modal containing the full configuration UI (keep the main page clean).
3. Settings MUST be per-type (poster/backdrop/logo). Do NOT use global settings for ratings, lang, style, imageText, or layouts.
   When a user selects a type, show ONLY that type’s settings.
4. Image Text MUST be configured separately for poster and backdrop.
5. Global required fields: ERDB API Base URL, TMDB API Key, MDBList API Key.
6. Language MUST be a selectable list (dropdown) of TMDB ISO 639-1 codes, not a free text input.
7. Live Preview that updates instantly.
8. Dynamic URL: /{type}/{id}.jpg?tmdbKey=...&mdblistKey=...&ratings=...&lang=...&ratingStyle=...&imageText=...`}</div>
                </div>

                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Live Examples</h4>
                <pre className="text-xs font-mono text-zinc-400 leading-6 space-y-1.5">
                  <div className="text-zinc-600 font-bold">// Movie Poster (IMDb)</div>
                  <div className="text-orange-200/70 truncate bg-white/5 p-3 rounded-lg border border-white/5">{`${baseUrl || 'http://localhost:3000'}/poster/tt0133093.jpg?ratings=imdb,tmdb&ratingStyle=plain`}</div>

                  <div className="text-zinc-600 font-bold mt-4">// Backdrop (TMDB)</div>
                  <div className="text-orange-200/70 truncate bg-white/5 p-3 rounded-lg border border-white/5">{`${baseUrl || 'http://localhost:3000'}/backdrop/tmdb:603.jpg?ratings=mdblist&backdropRatingsLayout=right-vertical`}</div>

                </pre>
              </div>
            </div>
          </div>
        </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8 bg-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <Star className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-tight text-white">ERDB Stateless Engine</span>
          </div>
          <p className="text-sm text-zinc-500">
            © 2026 ERDB Project. Modern imagery for modern addons.
          </p>
        </div>
      </footer>
    </div>
  );
}






















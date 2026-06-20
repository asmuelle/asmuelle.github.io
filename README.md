# asmuelle.github.io

My personal landing page — selected work plus a live grid of recent projects,
served at **https://asmuelle.github.io/** in 10 languages.

📊 **[Repository status board → STATUS.md](./STATUS.md)** — live CI/check, commit,
and open-issue badges for every public repository.

## Generated, not hand-edited

The HTML pages are **built** from a single translation source, so do not edit
`index.html` (or the `de/`, `fr/`, … pages) by hand — your changes will be
overwritten on the next build.

- `scripts/i18n.mjs` — **single source of truth** for all copy, in 10 languages
  (English, German, French, Spanish, Portuguese, Norwegian, Swedish, Danish,
  Russian, Simplified Chinese). The build fails loudly if any language is missing
  a key.
- `scripts/build-site.mjs` — generator. Emits one fully-translated, statically
  rendered page per language (`index.html` = English at the root, `de/index.html`,
  `fr/index.html`, …) plus `sitemap.xml`, `robots.txt`, `llms.txt` and `.nojekyll`.

Build:

```bash
node scripts/build-site.mjs
```

Why statically rendered per language: search engines index one language per URL,
and most AI/answer-engine crawlers (GPTBot, PerplexityBot, ClaudeBot …) don't run
JavaScript — so the localized content has to be in the served HTML, not swapped in
by JS. Each page carries `hreflang` alternates, a self-referencing canonical,
localized `<title>`/meta/OpenGraph, and structured data.

## SEO / GEO

- **`hreflang`** — every page links all 10 locales + `x-default` (English root).
- **`sitemap.xml`** — all 10 URLs with reciprocal `hreflang` alternates.
- **`robots.txt`** — explicitly allows AI/answer-engine crawlers (being cited is
  the goal) and points to the sitemap.
- **`llms.txt`** — plain-markdown profile/projects summary for AI engines.
- **JSON-LD** — `ProfilePage` + `Person` (with `knowsLanguage`, `sameAs`,
  `email`) + `SoftwareApplication`/`SoftwareSourceCode` per flagship project +
  `FAQPage`.
- **`sitemap-index.xml`** — a root-domain **sitemap index** that aggregates this
  site's own `sitemap.xml` with every project Pages site's sitemap
  (`asmuelle.github.io/<slug>/sitemap.xml`). `robots.txt` points crawlers here, so
  one entry discovers the whole portfolio. A sitemap index served from the host
  root may reference URLs anywhere on the host, which is what makes per-repo
  project sitemaps discoverable from a single place.
- **Language selector** — a styled `<select>` that navigates to the localized URL
  (real navigation, not client-side text swapping), with a `<noscript>` link list.

## Other files

- `repos.json` — curated data for the *Also on GitHub* grid. Generated, not
  hand-edited (see below).
- `og.png` / `og.svg` — 1200×630 social-share card referenced by the OpenGraph
  and Twitter `summary_large_image` meta tags. Edit `og.svg`, then re-render
  (`inkscape og.svg --export-type=png --export-filename=og.png -w 1200 -h 630`).
- `scripts/build-repos.sh` + `scripts/repos-filter.jq` — regenerate `repos.json`
  from the GitHub API (non-forks, with a description, not already featured,
  newest 6 by push date).
- `pages-projects.json` — source of truth for the sitemap index: the project Pages
  sites whose `sitemap.xml` should be aggregated. Generated, not hand-edited.
- `scripts/build-sitemap-index.mjs` — renders `sitemap-index.xml` from
  `pages-projects.json` (offline/deterministic; also called by `build-site.mjs`).
- `STATUS.md` — central repository status board (live CI/check, commit-freshness,
  and open-issue badges for every public repo, with live links for Pages sites).
  Generated, not hand-edited.
- `scripts/build-status.mjs` — regenerates `STATUS.md` from the GitHub API
  (badges are dynamic, so only the repo list needs rebuilding). Requires `gh`
  authenticated.
- `scripts/build-pages-projects.sh` — refreshes `pages-projects.json` from the
  GitHub API: every owner repo with Pages enabled whose site actually **serves a
  `sitemap.xml`** (probed live, so the index never points at a 404). Additive — a
  listed project is kept even if a probe fails mid-rollout. Requires `gh`
  authenticated.
- `.github/workflows/refresh-repos.yml` — runs the repos build **and** the
  pages-projects/sitemap-index refresh daily (and on demand) with the
  authenticated `GITHUB_TOKEN`, committing `repos.json`, `pages-projects.json`, and
  `sitemap-index.xml` when they change. This keeps the grid static (no
  unauthenticated rate limits) and the sitemap index current as projects ship.

## Grid data flow

The *Also on GitHub* grid loads at runtime in three tiers, degrading gracefully
(and localized via strings injected into each page at build time):

1. **`repos.json`** — fast, static, Action-generated. Preferred.
2. **Live GitHub API** — fallback if `repos.json` is missing/empty.
3. **A plain "browse on GitHub" link** — fallback if the API fails.

## Changing content

- **Copy / translations** → edit `scripts/i18n.mjs`, then `node scripts/build-site.mjs`.
- **Featured projects, services, FAQ structure** → edit the data arrays near the
  top of `scripts/build-site.mjs`, then rebuild. Keep featured repo names in the
  `FEATURED` arrays (in `build-site.mjs` and `scripts/build-repos.sh`) so they
  stay out of the live grid.
- **Grid data** → `bash scripts/build-repos.sh` (requires `gh` authenticated).

# asmuelle.github.io

My personal landing page — selected work plus a live grid of recent projects,
served at **https://asmuelle.github.io/**.

## Files

- `index.html` — self-contained (no build step, no runtime dependencies).
  Hand-picked *Selected work* cards plus an *Also on GitHub* grid.
- `repos.json` — the curated data for the *Also on GitHub* grid. Generated, not
  hand-edited (see below).
- `og.png` / `og.svg` — 1200×630 social-share card referenced by the OpenGraph
  and Twitter `summary_large_image` meta tags. Edit `og.svg`, then re-render
  (`inkscape og.svg --export-type=png --export-filename=og.png -w 1200 -h 630`).
- `scripts/build-repos.sh` + `scripts/repos-filter.jq` — regenerate `repos.json`
  from the GitHub API (non-forks, with a description, not already featured,
  newest 6 by push date).
- `.github/workflows/refresh-repos.yml` — runs the build script daily (and on
  demand) with the authenticated `GITHUB_TOKEN`, committing `repos.json` when it
  changes. This keeps the grid static so visitors never hit the unauthenticated
  GitHub API rate limit.

## Grid data flow

`index.html` loads the grid in three tiers, degrading gracefully:

1. **`repos.json`** — fast, static, Action-generated. Preferred.
2. **Live GitHub API** — fallback if `repos.json` is missing/empty.
3. **A plain "browse on GitHub" link** — fallback if the API fails.

## Changing what's featured

Edit the *Selected work* section in `index.html` and the `FEATURED` array (both
in the inline script and in `scripts/build-repos.sh`) so featured repos stay out
of the live grid.

## Regenerate the grid locally

```bash
bash scripts/build-repos.sh   # requires gh authenticated
```

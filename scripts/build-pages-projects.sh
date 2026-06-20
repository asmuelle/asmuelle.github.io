#!/usr/bin/env bash
# Regenerate pages-projects.json — the project list that drives sitemap-index.xml
# (root-domain sitemap aggregation). A project qualifies when its GitHub Pages site
# actually serves a sitemap.xml (probed live), so the index never points at a 404.
#
# Additive by design: any slug already listed is kept even if a probe fails this
# run, so a sitemap that is committed-but-not-yet-deployed never drops out during a
# rollout. Remove a project by hand-editing pages-projects.json.
#
# Portable to bash 3.2 (macOS) — no mapfile / associative arrays. Run locally with
# `gh` authenticated, or in CI where GH_TOKEN is provided.
set -euo pipefail
cd "$(dirname "$0")/.."

base="https://asmuelle.github.io"
today="$(date -u +%F)"

# Candidate slugs: owner repos with Pages enabled (paginated), minus the root site.
candidates="$(
  gh api --paginate "users/asmuelle/repos?per_page=100&type=owner" \
    --jq '.[] | select(.has_pages==true and .archived==false and .disabled==false and .private==false) | .name' \
    | grep -vx "asmuelle.github.io" | sort -u
)"

# Already-listed slugs are retained (additive — survive a flaky/in-flight probe).
existing="$(jq -r '.[] | if type=="string" then . else .slug end' pages-projects.json 2>/dev/null || true)"

# keep = existing ∪ { candidate : its Pages site serves a 200 sitemap.xml }
keep="$existing"
while IFS= read -r s; do
  [ -z "$s" ] && continue
  code="$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$base/$s/sitemap.xml" || echo 000)"
  [ "$code" = "200" ] && keep="$keep
$s"
done <<EOF
$candidates
EOF

# Emit { slug, lastmod } records; lastmod = repo pushed_at date, fallback today.
slugs="$(printf '%s\n' "$keep" | grep -v '^$' | sort -u)"
{
  echo "["
  first=1
  while IFS= read -r s; do
    [ -z "$s" ] && continue
    lm="$(gh api "repos/asmuelle/$s" --jq '.pushed_at' 2>/dev/null | cut -dT -f1 || true)"
    [ -z "$lm" ] && lm="$today"
    if [ "$first" -eq 1 ]; then first=0; else printf ',\n'; fi
    printf '  { "slug": "%s", "lastmod": "%s" }' "$s" "$lm"
  done <<EOF
$slugs
EOF
  printf '\n]\n'
} > pages-projects.json

echo "pages-projects.json: $(jq length pages-projects.json) projects"

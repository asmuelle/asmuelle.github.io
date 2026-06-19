#!/usr/bin/env bash
# Regenerate repos.json — the curated "Also on GitHub" list rendered by index.html.
# Filtering/sorting/capping lives in scripts/repos-filter.jq (single source of truth,
# shared by this script and the GitHub Action). Run locally with `gh` authenticated,
# or in CI where GH_TOKEN is provided by Actions.
set -euo pipefail
cd "$(dirname "$0")/.."

# Repos already hand-curated in the Featured section — kept out of the live grid.
FEATURED='["agent-postgres","agent-ssh","ssh-commander-core","r-shell","cargo-impact","cargo-impact-action","diff-risk","spec-drift","cargo-context","ai-tools-core","cargo-vibecode","asmuelle.github.io"]'

raw="$(mktemp)"
trap 'rm -f "$raw"' EXIT

gh api "users/asmuelle/repos?per_page=100&type=owner" > "$raw"
jq --argjson featured "$FEATURED" -f scripts/repos-filter.jq "$raw" > repos.json

echo "repos.json: $(jq length repos.json) entries"

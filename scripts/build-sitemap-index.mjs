#!/usr/bin/env node
// Root-domain sitemap aggregation.
//
// Emits sitemap-index.xml — a <sitemapindex> that points crawlers and answer
// engines at the root portfolio's own sitemap PLUS every project Pages site's
// sitemap (https://asmuelle.github.io/<slug>/sitemap.xml). A sitemap index served
// from the host root may reference URLs anywhere on the same host, so this is the
// canonical way to aggregate per-repo Pages sitemaps under one discoverable entry.
//
//   node scripts/build-sitemap-index.mjs
//
// Source of truth for the project list is pages-projects.json. Refresh that list
// with scripts/build-pages-projects.sh (auto-discovers Pages sites that serve a
// sitemap); this script only renders, so it stays offline and deterministic and
// can be imported by build-site.mjs for full-site builds.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://asmuelle.github.io";
const TODAY = new Date().toISOString().slice(0, 10);

// Read pages-projects.json and normalize to { slug, lastmod } records.
// Accepts both ["slug", …] and [{ slug, lastmod }, …]. The root user site is
// never treated as a project — its sitemap is added explicitly below.
export function loadProjects() {
  const raw = JSON.parse(readFileSync(resolve(ROOT, "pages-projects.json"), "utf8"));
  return raw
    .map((p) => (typeof p === "string" ? { slug: p, lastmod: TODAY } : { slug: p.slug, lastmod: p.lastmod || TODAY }))
    .filter((p) => p.slug && p.slug !== "asmuelle.github.io")
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function renderSitemapIndex(projects, today = TODAY) {
  const sitemaps = [
    { loc: `${BASE}/sitemap.xml`, lastmod: today }, // root portfolio (its own pages + hreflang)
    ...projects.map((p) => ({ loc: `${BASE}/${p.slug}/sitemap.xml`, lastmod: p.lastmod || today })),
  ];
  const body = sitemaps
    .map((s) => `  <sitemap>\n    <loc>${s.loc}</loc>\n    <lastmod>${s.lastmod}</lastmod>\n  </sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>
`;
}

// CLI entry: render and write sitemap-index.xml.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const projects = loadProjects();
  writeFileSync(resolve(ROOT, "sitemap-index.xml"), renderSitemapIndex(projects));
  console.log(`sitemap-index.xml: ${projects.length + 1} sitemaps (root + ${projects.length} projects)`);
}

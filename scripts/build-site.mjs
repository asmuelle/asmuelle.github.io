#!/usr/bin/env node
// Static multilingual site generator.
//
// Emits one fully-translated, statically-rendered page per language so search
// engines and JS-less AI crawlers (GPTBot, PerplexityBot, ClaudeBot …) see real
// localized content — root = English, /de/, /fr/, … for the rest. Also emits
// robots.txt, sitemap.xml (with hreflang alternates), llms.txt and .nojekyll.
//
//   node scripts/build-site.mjs
//
// Copy lives in scripts/i18n.mjs (single source of truth). The "Also on GitHub"
// grid stays dynamic at runtime (repos.json), so it is not part of this build.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { LANGS, T, KNOWS_LANGUAGE } from "./i18n.mjs";
import { loadProjects, renderSitemapIndex } from "./build-sitemap-index.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://asmuelle.github.io";
const AVATAR = "https://avatars.githubusercontent.com/u/309559?v=4";
const OG_IMAGE = `${BASE}/og.png`;
const EMAIL = "herban.mueller@gmail.com";
const MAILTO = `mailto:${EMAIL}?subject=Consulting%20enquiry`;
const LINKEDIN = "https://www.linkedin.com/in/andreas-m%C3%BCller-1692989";
const BUILD_DATE = new Date().toISOString().slice(0, 10);

// ---- escaping ---------------------------------------------------------------
const escText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => escText(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// ---- validation: every language must define every key -----------------------
const KEYS = Object.keys(T.en);
for (const { code } of LANGS) {
  if (!T[code]) throw new Error(`i18n: missing language block "${code}"`);
  const have = new Set(Object.keys(T[code]));
  const missing = KEYS.filter((k) => !have.has(k));
  const extra = Object.keys(T[code]).filter((k) => !KEYS.includes(k));
  if (missing.length || extra.length) {
    throw new Error(`i18n: "${code}" missing [${missing}] extra [${extra}]`);
  }
}

const urlFor = (lang) => `${BASE}/${lang.path ? lang.path + "/" : ""}`;
const langByCode = Object.fromEntries(LANGS.map((l) => [l.code, l]));

// ---- content model ----------------------------------------------------------
const PROJECTS = [
  { name: "pgAgent", pin: true, key: "proj.pgagent",
    chips: ["SwiftUI + AppKit", "Rust core", "UniFFI"],
    acts: [{ key: "acts.live", href: "https://asmuelle.github.io/agent-postgres/" },
           { key: "acts.code", href: "https://github.com/asmuelle/agent-postgres" }] },
  { name: "agent-ssh", key: "proj.agentssh",
    chips: ["SwiftUI", "SwiftTerm", "Rust"],
    acts: [{ key: "acts.live", href: "https://asmuelle.github.io/agent-ssh/" },
           { key: "acts.code", href: "https://github.com/asmuelle/agent-ssh" }] },
  { name: "ssh-commander-core", key: "proj.core",
    chips: ["Rust", "async", "crates.io"],
    acts: [{ key: "acts.code", href: "https://github.com/asmuelle/ssh-commander-core" }] },
  { name: "r-shell", key: "proj.rshell",
    chips: ["Rust", "Tauri 2", "cross-platform"],
    acts: [{ key: "acts.code", href: "https://github.com/asmuelle/r-shell" }] },
  { name: "cargo-impact", key: "proj.impact",
    chips: ["Rust", "GitHub Action", "SARIF"],
    acts: [{ key: "acts.code", href: "https://github.com/asmuelle/cargo-impact" },
           { key: "acts.action", href: "https://github.com/asmuelle/cargo-impact-action" }] },
  { name: "cargo · CI tooling", key: "proj.cargo",
    chipLinks: [
      { t: "diff-risk", href: "https://github.com/asmuelle/diff-risk" },
      { t: "spec-drift", href: "https://github.com/asmuelle/spec-drift" },
      { t: "cargo-context", href: "https://github.com/asmuelle/cargo-context" },
      { t: "ai-tools-core", href: "https://github.com/asmuelle/ai-tools-core" } ],
    acts: [{ key: "acts.allcargo", href: "https://github.com/asmuelle?tab=repositories&q=cargo&type=source" }] }
];

const SERVICES = [{ t: "svc.rust.t", d: "svc.rust.d" }, { t: "svc.db.t", d: "svc.db.d" }, { t: "svc.ci.t", d: "svc.ci.d" }];
const FAQ = [["faq.q1", "faq.a1"], ["faq.q2", "faq.a2"], ["faq.q3", "faq.a3"], ["faq.q4", "faq.a4"]];

// Software entities for structured data (entity association, not visual).
const SOFTWARE = [
  { name: "pgAgent", repo: "https://github.com/asmuelle/agent-postgres", lang: ["Swift", "Rust"], type: "SoftwareApplication", cat: "DeveloperApplication", os: "macOS, iPadOS", key: "proj.pgagent" },
  { name: "agent-ssh", repo: "https://github.com/asmuelle/agent-ssh", lang: ["Swift", "Rust"], type: "SoftwareApplication", cat: "DeveloperApplication", os: "macOS, iPadOS", key: "proj.agentssh" },
  { name: "ssh-commander-core", repo: "https://github.com/asmuelle/ssh-commander-core", lang: ["Rust"], type: "SoftwareSourceCode", key: "proj.core" },
  { name: "r-shell", repo: "https://github.com/asmuelle/r-shell", lang: ["Rust"], type: "SoftwareApplication", cat: "DeveloperApplication", os: "macOS, Windows, Linux", key: "proj.rshell" },
  { name: "cargo-impact", repo: "https://github.com/asmuelle/cargo-impact", lang: ["Rust"], type: "SoftwareSourceCode", key: "proj.impact" }
];

// ---- structured data --------------------------------------------------------
function jsonLd(lang, t) {
  const url = urlFor(lang);
  const person = {
    "@type": "Person",
    "@id": `${BASE}/#andreas`,
    name: "Andreas Müller",
    url: `${BASE}/`,
    image: AVATAR,
    jobTitle: "Rust / Java / JavaScript Developer",
    description: t("meta.ogdesc"),
    email: `mailto:${EMAIL}`,
    knowsAbout: ["Rust", "Swift", "TypeScript", "Java", "PostgreSQL", "macOS app development", "iPadOS app development", "Developer tooling", "SSH tooling"],
    knowsLanguage: KNOWS_LANGUAGE,
    worksFor: { "@type": "Organization", name: "kWIQly", url: "https://kwiqly.com" },
    address: { "@type": "PostalAddress", addressRegion: "Lake Constance", addressCountry: "DE" },
    sameAs: ["https://github.com/asmuelle", "https://crates.io/users/asmuelle", "https://kwiqly.com", LINKEDIN]
  };
  const software = SOFTWARE.map((s) => {
    const node = {
      "@type": s.type,
      name: s.name,
      description: t(s.key),
      codeRepository: s.repo,
      url: s.repo,
      programmingLanguage: s.lang,
      author: { "@id": `${BASE}/#andreas` }
    };
    if (s.cat) node.applicationCategory = s.cat;
    if (s.os) node.operatingSystem = s.os;
    return node;
  });
  const faq = {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    inLanguage: lang.hreflang,
    mainEntity: FAQ.map(([q, a]) => ({
      "@type": "Question",
      name: t(q),
      acceptedAnswer: { "@type": "Answer", text: t(a) }
    }))
  };
  const page = {
    "@type": "ProfilePage",
    "@id": `${url}#webpage`,
    url,
    name: t("meta.title"),
    inLanguage: lang.hreflang,
    isPartOf: { "@id": `${BASE}/#website` },
    about: { "@id": `${BASE}/#andreas` },
    mainEntity: { "@id": `${BASE}/#andreas` }
  };
  const website = {
    "@type": "WebSite",
    "@id": `${BASE}/#website`,
    url: `${BASE}/`,
    name: "Andreas Müller",
    inLanguage: "en",
    publisher: { "@id": `${BASE}/#andreas` }
  };
  return JSON.stringify({ "@context": "https://schema.org", "@graph": [page, website, person, ...software, faq] });
}

// ---- partials ---------------------------------------------------------------
function hreflangLinks(self) {
  const lines = LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${urlFor(l)}" />`
  );
  lines.push(`<link rel="alternate" hreflang="x-default" href="${BASE}/" />`);
  return lines.join("\n");
}

function selector(lang, t) {
  const opts = LANGS.map(
    (l) => `        <option value="${l.code}"${l.code === lang.code ? " selected" : ""}>${escText(l.autonym)}</option>`
  ).join("\n");
  const noscript = LANGS.map(
    (l) => `<a href="${urlFor(l)}">${escText(l.autonym)}</a>`
  ).join(" · ");
  return `    <span class="lang-select">
      <svg class="globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z"></path>
      </svg>
      <span class="chev"></span>
      <label class="sr-only" for="langSelect">${escText(t("lang.label"))}</label>
      <select class="lang" id="langSelect" aria-label="${escAttr(t("lang.label"))}">
${opts}
      </select>
    </span>
    <noscript><p class="nojs-langs">${noscript}</p></noscript>`;
}

function projectCard(p, t) {
  const top = `<div class="top"><span class="nm">${escText(p.name)}</span>${p.pin ? `<span class="pin">${escText(t("feat.pin"))}</span>` : ""}</div>`;
  let chips = "";
  if (p.chipLinks) {
    chips = `<div class="chips">${p.chipLinks
      .map((c) => `<a class="chip" href="${escAttr(c.href)}" rel="noopener">${escText(c.t)}</a>`)
      .join("")}</div>`;
  } else if (p.chips) {
    chips = `<div class="chips">${p.chips.map((c) => `<span class="chip">${escText(c)}</span>`).join("")}</div>`;
  }
  const acts = `<div class="acts">${p.acts
    .map((a) => `<a href="${escAttr(a.href)}" rel="noopener">${escText(t(a.key))}</a>`)
    .join("")}</div>`;
  return `        <article class="repo feat reveal">
          ${top}
          <p>${escText(t(p.key))}</p>
          ${chips}
          ${acts}
        </article>`;
}

function clientScript(lang) {
  const t2 = {};
  for (const k of ["card.today", "card.yesterday", "card.dago", "card.moago", "card.yago", "card.nodesc", "card.updated", "acts.code", "fallback.text", "fallback.link", "more.loading"]) {
    t2[k] = T[lang.code][k];
  }
  const urls = Object.fromEntries(LANGS.map((l) => [l.code, "/" + (l.path ? l.path + "/" : "")]));
  return `<script>
  document.documentElement.classList.remove("no-js");
  document.documentElement.classList.add("js");
  document.getElementById("yr").textContent = new Date().getFullYear();

  // Language switch = real navigation to the statically-rendered localized page.
  var LANG_URLS = ${JSON.stringify(urls)};
  var sel = document.getElementById("langSelect");
  if (sel) sel.addEventListener("change", function(){ var u = LANG_URLS[this.value]; if (u) location.assign(u); });

  // Strings the dynamic "Also on GitHub" grid needs in this page's language.
  var STR = ${JSON.stringify(t2)};
  function t(k){ return STR[k] != null ? STR[k] : k; }
  function tn(k, n){ return t(k).replace("{n}", n); }

  var LANG_COLORS = {
    Swift:"#f05138", Rust:"#dea584", TypeScript:"#3178c6", JavaScript:"#f1e05a",
    Python:"#3572A5", Java:"#b07219", Kotlin:"#A97BFF", "C++":"#f34b7d", C:"#555555",
    Go:"#00ADD8", HTML:"#e34c26", CSS:"#563d7c", Shell:"#89e051", Ruby:"#701516",
    Dart:"#00B4AB", "Jupyter Notebook":"#DA5B0B", Dockerfile:"#384d54", Vue:"#41b883"
  };
  var FEATURED = ["agent-postgres","agent-ssh","ssh-commander-core","r-shell",
    "cargo-impact","cargo-impact-action","diff-risk","spec-drift","cargo-context",
    "ai-tools-core","cargo-vibecode","asmuelle.github.io"];

  function esc(s){ var d=document.createElement("div"); d.textContent=s==null?"":s; return d.innerHTML; }
  function ago(iso){
    var d=(Date.now()-new Date(iso).getTime())/86400000;
    if(d<1) return t("card.today"); if(d<2) return t("card.yesterday");
    if(d<31) return tn("card.dago", Math.round(d));
    if(d<365) return tn("card.moago", Math.round(d/30));
    return tn("card.yago", Math.round(d/365));
  }
  function card(r){
    var lang = r.language ? '<span class="lang"><i style="background:'+(LANG_COLORS[r.language]||"#8aa")+'"></i>'+esc(r.language)+'</span>' : "";
    var stars = r.stargazers_count>0 ? '<span>\\u2605 '+r.stargazers_count+'</span>' : "";
    return '<article class="repo">'
      + '<div class="top"><span class="nm">'+esc(r.name)+'</span></div>'
      + '<p>'+(r.description?esc(r.description):'<em style="color:var(--dim)">'+esc(t("card.nodesc"))+'</em>')+'</p>'
      + '<div class="foot">'+lang+stars+'<span>'+esc(t("card.updated"))+' '+ago(r.pushed_at)+'</span></div>'
      + '<div class="acts" style="margin-top:14px"><a href="'+esc(r.html_url)+'" rel="noopener">'+esc(t("acts.code"))+'</a></div>'
      + '</article>';
  }

  var gridState = { type:"loading" };
  function setState(s){ gridState = s; renderState(); }
  function renderState(){
    var status=document.getElementById("live-status"), grid=document.getElementById("live-grid"), more=document.getElementById("more");
    if(!status||!grid||!more) return;
    if(gridState.type==="empty"){ more.style.display="none"; return; }
    more.style.display="";
    if(gridState.type==="list"){ status.style.display="none"; grid.innerHTML=gridState.list.map(card).join(""); return; }
    if(gridState.type==="fallback"){
      status.style.display=""; grid.innerHTML="";
      status.innerHTML = esc(t("fallback.text"))+' <a style="color:var(--cyan)" href="https://github.com/asmuelle?tab=repositories&type=source" rel="noopener">'+esc(t("fallback.link"))+'</a>';
      return;
    }
    status.style.display=""; status.textContent=t("more.loading"); grid.innerHTML="";
  }

  fetch("/repos.json", { cache: "no-cache" })
    .then(function(res){ if(!res.ok) throw new Error(res.status); return res.json(); })
    .then(function(list){ if(!Array.isArray(list)) throw new Error("bad payload"); setState(list.length?{type:"list",list:list}:{type:"empty"}); })
    .catch(function(){
      fetch("https://api.github.com/users/asmuelle/repos?per_page=100&sort=pushed&type=owner",
            { headers: { "Accept": "application/vnd.github+json" } })
        .then(function(res){ if(!res.ok) throw new Error(res.status); return res.json(); })
        .then(function(repos){
          if(!Array.isArray(repos)) throw new Error("bad payload");
          var list = repos.filter(function(r){
            return !r.fork && !r.archived && !r.disabled && r.description && r.pushed_at && FEATURED.indexOf(r.name)===-1;
          }).sort(function(a,b){ return new Date(b.pushed_at)-new Date(a.pushed_at); }).slice(0,6);
          setState(list.length?{type:"list",list:list}:{type:"empty"});
        })
        .catch(function(){ setState({ type:"fallback" }); });
    });

  (function(){
    var els=document.querySelectorAll(".reveal");
    if(!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches){
      els.forEach(function(e){e.classList.add("in");}); return;
    }
    var io=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}});},{threshold:.12});
    els.forEach(function(e){io.observe(e);});
    setTimeout(function(){els.forEach(function(e){e.classList.add("in");});}, 2000);
  })();
</script>`;
}

// ---- page -------------------------------------------------------------------
function page(lang) {
  const t = (k) => T[lang.code][k];
  const url = urlFor(lang);
  const services = SERVICES.map(
    (s) => `        <article class="svc reveal">
          <h3>${escText(t(s.t))}</h3>
          <p>${escText(t(s.d))}</p>
        </article>`
  ).join("\n");
  const faq = FAQ.map(
    ([q, a]) => `        <article class="faq-item reveal">
          <h3>${escText(t(q))}</h3>
          <p>${escText(t(a))}</p>
        </article>`
  ).join("\n");
  const projects = PROJECTS.map((p) => projectCard(p, t)).join("\n\n");

  return `<!doctype html>
<html lang="${lang.htmlLang}" class="no-js">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="google-site-verification" content="btgyD0tshe2234IP3e9vFOWHkrixfIWicSQNOyt9RbM" />
<title>${escText(t("meta.title"))}</title>
<meta name="description" content="${escAttr(t("meta.description"))}" />
<meta name="author" content="Andreas Müller" />
<link rel="canonical" href="${url}" />
${hreflangLinks(lang)}
<link rel="icon" href="${AVATAR}" />
<link rel="apple-touch-icon" href="${AVATAR}" />
<meta name="theme-color" content="#070a10" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="${lang.htmlLang.replace("-", "_")}" />
<meta property="og:title" content="${escAttr(t("meta.title"))}" />
<meta property="og:description" content="${escAttr(t("meta.ogdesc"))}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Andreas Müller — I build native apps and the tools that ship them." />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escAttr(t("meta.title"))}" />
<meta name="twitter:description" content="${escAttr(t("meta.ogdesc"))}" />
<meta name="twitter:image" content="${OG_IMAGE}" />

<script type="application/ld+json">
${jsonLd(lang, t)}
</script>

<style>
  :root {
    --bg:#070a10; --panel:#0e1420; --line:rgba(150,180,220,.12); --line-strong:rgba(150,180,220,.22);
    --text:#e9eef7; --muted:#9aa6bb; --dim:#6b768c;
    --blue:#4c8dff; --cyan:#2ad4e6; --teal:#34d39e;
    --grad:linear-gradient(100deg,#4c8dff,#2ad4e6 48%,#34d39e); --glow:0 0 40px rgba(42,212,230,.35);
    --sans:system-ui,-apple-system,"SF Pro Display","Segoe UI",Roboto,sans-serif;
    --mono:ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace;
    --r:14px; --maxw:1080px; --ease:cubic-bezier(.16,1,.3,1);
  }
  *{box-sizing:border-box;}
  html,body{max-width:100%;overflow-x:clip;}
  html{scroll-behavior:smooth;}
  @media (prefers-reduced-motion:reduce){html{scroll-behavior:auto;}}
  body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);line-height:1.6;-webkit-font-smoothing:antialiased;}
  body::before{content:"";position:fixed;inset:0;z-index:-2;background:
    radial-gradient(820px 560px at 80% -10%,rgba(42,212,230,.14),transparent 60%),
    radial-gradient(720px 560px at 6% 2%,rgba(76,141,255,.12),transparent 58%),
    radial-gradient(680px 680px at 60% 112%,rgba(52,211,158,.08),transparent 60%);}
  body::after{content:"";position:fixed;inset:0;z-index:-1;opacity:.5;
    background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
    background-size:64px 64px;-webkit-mask-image:radial-gradient(circle at 50% 12%,black,transparent 72%);mask-image:radial-gradient(circle at 50% 12%,black,transparent 72%);}
  a{color:inherit;text-decoration:none;}
  .wrap{width:100%;max-width:var(--maxw);margin-inline:auto;padding-inline:clamp(18px,4vw,34px);}
  .skip{position:absolute;left:-999px;}.skip:focus{left:16px;top:16px;background:var(--panel);padding:10px 14px;border-radius:8px;z-index:99;}
  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}

  .btn{display:inline-flex;align-items:center;gap:8px;font-family:var(--sans);font-size:.9rem;font-weight:600;
    padding:9px 16px;border-radius:999px;border:1px solid var(--line-strong);color:var(--text);background:rgba(255,255,255,.03);
    transition:transform .18s var(--ease),border-color .2s,box-shadow .2s;cursor:pointer;}
  .btn:hover{transform:translateY(-1px);border-color:var(--cyan);box-shadow:var(--glow);}
  .btn.primary{background:var(--grad);color:#04121a;border:none;font-weight:700;}

  .topbar{display:flex;justify-content:flex-end;padding-top:clamp(16px,2.4vw,24px);}
  .lang-select{position:relative;display:inline-flex;align-items:center;}
  .lang-select .globe{position:absolute;left:13px;width:15px;height:15px;color:var(--cyan);pointer-events:none;}
  .lang-select .chev{position:absolute;right:15px;top:50%;width:7px;height:7px;
    border-right:1.6px solid var(--dim);border-bottom:1.6px solid var(--dim);
    transform:translateY(-65%) rotate(45deg);pointer-events:none;transition:border-color .2s;}
  select.lang{appearance:none;-webkit-appearance:none;font-family:var(--mono);font-size:.8rem;font-weight:600;letter-spacing:.01em;
    color:var(--muted);background:rgba(255,255,255,.03);border:1px solid var(--line-strong);border-radius:999px;
    padding:8px 34px 8px 35px;cursor:pointer;transition:transform .18s var(--ease),border-color .2s,box-shadow .2s,color .2s;}
  select.lang:hover{color:var(--text);border-color:var(--cyan);box-shadow:var(--glow);transform:translateY(-1px);}
  .lang-select:hover .chev{border-color:var(--cyan);}
  select.lang:focus-visible{outline:2px solid var(--cyan);outline-offset:2px;}
  select.lang option{background:var(--panel);color:var(--text);}
  .nojs-langs{display:flex;flex-wrap:wrap;gap:6px 10px;justify-content:flex-end;font-family:var(--mono);font-size:.78rem;color:var(--muted);margin:8px 0 0;}
  .nojs-langs a{color:var(--cyan);}

  header{padding:0 0 clamp(28px,4vw,52px);}
  .hero{display:flex;gap:clamp(22px,4vw,40px);align-items:center;flex-wrap:wrap;padding-top:clamp(30px,5vw,60px);}
  .avatar{width:118px;height:118px;border-radius:26px;border:1px solid var(--line-strong);box-shadow:var(--glow);flex:none;}
  .hero .who{min-width:0;flex:1;}
  h1{font-size:clamp(2rem,1rem+4.4vw,3.4rem);line-height:1.04;letter-spacing:-.03em;font-weight:720;margin:0 0 14px;overflow-wrap:break-word;}
  h1 .grad{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;}
  .lede{font-size:clamp(1rem,.95rem+.4vw,1.18rem);color:var(--muted);max-width:54ch;margin:0 0 20px;}
  .meta{display:flex;flex-wrap:wrap;gap:8px 18px;font-family:var(--mono);font-size:.82rem;color:var(--dim);margin-bottom:20px;}
  .meta b{color:var(--muted);font-weight:500;}
  .links{display:flex;gap:10px;flex-wrap:wrap;}

  .avail{display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);font-size:.82rem;color:var(--teal);
    border:1px solid rgba(52,211,158,.35);background:rgba(52,211,158,.07);padding:6px 13px;border-radius:999px;margin-bottom:18px;}
  .avail .pulse{width:8px;height:8px;border-radius:50%;background:var(--teal);box-shadow:0 0 10px var(--teal);
    animation:pulse 2.4s var(--ease) infinite;}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
  @media (prefers-reduced-motion:reduce){.avail .pulse{animation:none;}}
  .proof{display:flex;flex-wrap:wrap;gap:10px 14px;margin:22px 0 0;padding-top:18px;border-top:1px solid var(--line);}
  .proof span{font-family:var(--mono);font-size:.8rem;color:var(--muted);display:inline-flex;align-items:center;gap:7px;}
  .proof span::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--cyan);opacity:.8;}
  .proof b{color:var(--text);font-weight:600;}

  section{padding:clamp(40px,5vw,64px) 0;}
  .head{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:22px;}
  .kicker{font-family:var(--mono);font-size:.78rem;color:var(--cyan);letter-spacing:.05em;text-transform:uppercase;margin:0;}
  h2{font-size:clamp(1.5rem,1.1rem+1.6vw,2.2rem);letter-spacing:-.025em;font-weight:700;margin:0;}
  .note{font-family:var(--mono);font-size:.76rem;color:var(--dim);}

  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;}
  @media (max-width:680px){.grid{grid-template-columns:1fr;}}
  .repo{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:var(--r);padding:20px;
    background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.008));position:relative;overflow:hidden;
    transition:transform .2s var(--ease),border-color .2s,box-shadow .2s;}
  .repo:hover{transform:translateY(-3px);border-color:var(--line-strong);box-shadow:0 18px 40px -24px rgba(0,0,0,.8);}
  .repo::after{content:"";position:absolute;inset:0 0 auto 0;height:1px;background:var(--grad);opacity:0;transition:opacity .25s;}
  .repo:hover::after{opacity:.85;}
  .repo .top{display:flex;align-items:center;gap:9px;margin-bottom:8px;}
  .repo .nm{font-size:1.12rem;font-weight:650;letter-spacing:-.015em;}
  .repo.feat .nm{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;}
  .repo .pin{margin-left:auto;font-family:var(--mono);font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:var(--teal);border:1px solid var(--line);border-radius:999px;padding:2px 8px;}
  .repo p{color:var(--muted);font-size:.92rem;margin:0 0 14px;flex:1;}
  .repo .foot{display:flex;align-items:center;gap:14px;font-family:var(--mono);font-size:.76rem;color:var(--dim);}
  .lang{display:inline-flex;align-items:center;gap:6px;}
  .lang i{width:9px;height:9px;border-radius:50%;display:block;background:var(--cyan);}
  .repo .chips{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 14px;}
  .chip{font-family:var(--mono);font-size:.72rem;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:3px 10px;transition:border-color .2s,color .2s;}
  a.chip:hover{border-color:var(--cyan);color:var(--text);}
  .acts{display:flex;gap:10px;font-family:var(--sans);font-size:.84rem;font-weight:600;margin-top:auto;}
  .acts a{color:var(--cyan);}.acts a:hover{text-decoration:underline;}

  /* services */
  .svc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
  @media (max-width:760px){.svc-grid{grid-template-columns:1fr;}}
  .svc{border:1px solid var(--line);border-radius:var(--r);padding:22px 20px;position:relative;overflow:hidden;
    background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.006));
    transition:transform .2s var(--ease),border-color .2s,box-shadow .2s;}
  .svc:hover{transform:translateY(-3px);border-color:var(--line-strong);box-shadow:0 18px 40px -24px rgba(0,0,0,.8);}
  .svc::before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--grad);opacity:.6;}
  .svc h3{font-size:1.04rem;font-weight:650;letter-spacing:-.01em;margin:6px 0 8px;}
  .svc p{color:var(--muted);font-size:.92rem;margin:0;}

  /* faq */
  .faq-list{display:grid;gap:12px;}
  .faq-item{border:1px solid var(--line);border-radius:var(--r);padding:18px 20px;
    background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.005));}
  .faq-item h3{font-size:1.0rem;font-weight:620;letter-spacing:-.01em;margin:0 0 6px;}
  .faq-item p{color:var(--muted);font-size:.93rem;margin:0;}

  #live-status{font-family:var(--mono);font-size:.85rem;color:var(--dim);}
  footer{border-top:1px solid var(--line);padding:30px 0 56px;color:var(--dim);font-size:.86rem;margin-top:24px;}
  .foot-row{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;}
  .foot-row .sp{flex:1;}
  footer a{color:var(--muted);}footer a:hover{color:var(--text);}

  .reveal{opacity:0;transform:translateY(16px);transition:opacity .6s var(--ease),transform .6s var(--ease);}
  .reveal.in{opacity:1;transform:none;}
  .no-js .reveal{opacity:1;transform:none;transition:none;}
  @media (prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none;}}
</style>
<script data-goatcounter="https://asmuelle.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
</head>
<body>
<a class="skip" href="#projects">${escText(t("skip"))}</a>

<header>
  <div class="wrap topbar">
${selector(lang, t)}
  </div>
  <div class="wrap hero">
    <img class="avatar" src="${AVATAR}" alt="Andreas Müller" width="118" height="118" />
    <div class="who">
      <span class="avail"><span class="pulse"></span> <span>${escText(t("avail"))}</span></span>
      <h1>Andreas&nbsp;Müller — <span>${escText(t("hero.lead"))}</span> <span class="grad">${escText(t("hero.grad"))}</span></h1>
      <p class="lede">${escText(t("hero.lede"))}</p>
      <div class="meta">
        <span><b>Rust / Java / JavaScript</b> ${escText(t("meta.role"))}</span>
        <span>📍 ${escText(t("meta.loc"))}</span>
        <span>↗ <b>kwiqly.com</b></span>
      </div>
      <div class="links">
        <a class="btn primary" href="${MAILTO}">${escText(t("links.work"))}</a>
        <a class="btn" href="${LINKEDIN}" rel="noopener">LinkedIn ↗</a>
        <a class="btn" href="https://github.com/asmuelle" rel="noopener">GitHub ↗</a>
      </div>
      <div class="proof">
        <span>${escText(t("proof.since"))} <b>2010</b></span>
        <span>${escText(t("proof.published"))} <b>crates.io</b></span>
        <span><b>Rust</b> · Swift · TypeScript · Java</span>
        <span>${escText(t("proof.native"))}</span>
      </div>
    </div>
  </div>
</header>

<main>
  <!-- Services -->
  <section id="services">
    <div class="wrap">
      <div class="head">
        <p class="kicker">${escText(t("svc.kicker"))}</p>
        <h2>${escText(t("svc.title"))}</h2>
      </div>
      <div class="svc-grid">
${services}
      </div>
    </div>
  </section>

  <!-- Featured -->
  <section id="projects">
    <div class="wrap">
      <div class="head">
        <p class="kicker">${escText(t("feat.kicker"))}</p>
        <h2>${escText(t("feat.title"))}</h2>
      </div>
      <div class="grid">
${projects}
      </div>
    </div>
  </section>

  <!-- Live grid — JS hides this whole section when there's nothing to show -->
  <section id="more">
    <div class="wrap">
      <div class="head">
        <p class="kicker">${escText(t("more.kicker"))}</p>
        <h2>${escText(t("more.title"))}</h2>
        <span class="note">${escText(t("more.note"))}</span>
      </div>
      <p id="live-status">${escText(t("more.loading"))}</p>
      <div class="grid" id="live-grid"></div>
      <p style="margin-top:22px;font-family:var(--mono);font-size:.85rem;">
        <a style="color:var(--cyan)" href="https://github.com/asmuelle?tab=repositories&type=source" rel="noopener">${escText(t("more.browse"))}</a>
      </p>
    </div>
  </section>

  <!-- FAQ -->
  <section id="faq">
    <div class="wrap">
      <div class="head">
        <p class="kicker">${escText(t("faq.kicker"))}</p>
        <h2>${escText(t("faq.title"))}</h2>
      </div>
      <div class="faq-list">
${faq}
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap foot-row">
    <span>© <span id="yr"></span> Andreas Müller</span>
    <span class="sp"></span>
    <a href="https://github.com/asmuelle" rel="noopener">github.com/asmuelle</a>
    <span>·</span>
    <a href="https://kwiqly.com" rel="noopener">kwiqly.com</a>
  </div>
</footer>

${clientScript(lang)}
</body>
</html>
`;
}

// ---- sidecar files ----------------------------------------------------------
function sitemap() {
  const entries = LANGS.map((l) => {
    const alts = LANGS.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${urlFor(a)}" />`).join("\n");
    return `  <url>
    <loc>${urlFor(l)}</loc>
    <lastmod>${BUILD_DATE}</lastmod>
${alts}
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}/" />
  </url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`;
}

function robots() {
  const aiBots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User",
    "ClaudeBot", "Claude-Web", "anthropic-ai", "Google-Extended", "Applebot-Extended",
    "Bingbot", "CCBot", "Amazonbot", "Bytespider"];
  const blocks = ["User-agent: *\nAllow: /", ...aiBots.map((b) => `User-agent: ${b}\nAllow: /`)];
  return `# Andreas Müller — asmuelle.github.io
# AI / answer engines are explicitly welcomed (GEO): being cited is the goal.
${blocks.join("\n\n")}

Sitemap: ${BASE}/sitemap-index.xml
`;
}

function llmsTxt() {
  const langList = LANGS.map((l) => `- ${l.autonym}: ${urlFor(l)}`).join("\n");
  return `# Andreas Müller

> Rust / Java / JavaScript developer based at Lake Constance, Germany. I build native
> macOS & iPadOS apps over memory-safe Rust cores (bridged to Swift with UniFFI), deep
> PostgreSQL & SSH tooling, and cargo/CI developer tools. Available for consulting.

## Profile
- Website: ${BASE}/
- GitHub: https://github.com/asmuelle
- crates.io: https://crates.io/users/asmuelle
- Company: https://kwiqly.com (kWIQly)
- LinkedIn: ${LINKEDIN}
- Contact: ${EMAIL}
- On GitHub since 2010
- Languages: ${KNOWS_LANGUAGE.join(", ")}

## Services
- Rust cores for native apps — performance/safety-critical logic in a memory-safe Rust core, bridged to Swift via UniFFI, shared across macOS and iPadOS.
- PostgreSQL & SSH tooling — transactional-safe DDL, ERDs, SFTP and monitoring; native, fast, reliable.
- Rust CI & developer tooling — cargo/CI tools for safer Rust: dependency-impact gating, diff risk scoring, spec-drift detection.

## Selected projects
- pgAgent (${"https://github.com/asmuelle/agent-postgres"}): native macOS & iPadOS workspace for PostgreSQL & SSH — routine editor, transactional-safe DDL, ERD, dual-pane SFTP, on-device AI. SwiftUI + AppKit over a Rust core via UniFFI. Live: https://asmuelle.github.io/agent-postgres/
- agent-ssh (https://github.com/asmuelle/agent-ssh): native macOS & iPadOS SSH workspace — terminal, SFTP, PostgreSQL, monitoring and network tools over a memory-safe Rust core bridged to Swift.
- ssh-commander-core (https://github.com/asmuelle/ssh-commander-core): async Rust domain layer — SSH, SFTP, FTP/FTPS, PostgreSQL and connection management, published to crates.io.
- r-shell (https://github.com/asmuelle/r-shell): lightweight open-source SSH/SFTP/FTP client in Rust & Tauri 2 — split terminals, SFTP, GPU monitoring. ~34 MB RAM.
- cargo-impact (https://github.com/asmuelle/cargo-impact): dependency-impact analysis for Rust — SARIF code-scanning and sticky PR comments, with a ready-made GitHub Action.
- cargo/CI tooling: diff-risk, spec-drift, cargo-context, ai-tools-core.

## Localized versions
${langList}
`;
}

// ---- write ------------------------------------------------------------------
function write(rel, content) {
  const abs = resolve(ROOT, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  return rel;
}

const written = [];
for (const lang of LANGS) {
  const rel = lang.path ? `${lang.path}/index.html` : "index.html";
  written.push(write(rel, page(lang)));
}
written.push(write("sitemap.xml", sitemap()));
written.push(write("sitemap-index.xml", renderSitemapIndex(loadProjects(), BUILD_DATE)));
written.push(write("robots.txt", robots()));
written.push(write("llms.txt", llmsTxt()));
written.push(write(".nojekyll", ""));

console.log(`Built ${LANGS.length} localized pages + sidecars (${KEYS.length} keys/lang):`);
written.forEach((w) => console.log("  " + w));

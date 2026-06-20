# Security Policy

This repository hosts my personal website at **https://asmuelle.github.io/** — a
single static page served by GitHub Pages. It has no backend, no database, no user
accounts, and no forms that submit data. The only third parties it talks to are
GitHub's public REST API (to list repositories) and a cookieless GoatCounter
analytics endpoint.

I take security seriously across all of my projects, so this policy doubles as the
default disclosure contact for repositories under [`github.com/asmuelle`](https://github.com/asmuelle)
that don't ship their own `SECURITY.md`.

## Reporting a Vulnerability

Please report security issues **privately** — do not open a public issue for
anything exploitable.

Preferred channels, in order:

1. **GitHub private vulnerability reporting** — open the repository's *Security*
   tab → *Report a vulnerability* (GitHub Security Advisories).
2. **Email** — `herban.mueller@gmail.com` with a subject starting `SECURITY:`.

Please include:

- A description of the issue and its impact.
- Steps to reproduce, or a proof of concept.
- The affected URL, commit, or repository.

If you'd like an encrypted channel or want to coordinate timing, mention it in your
first message and we'll arrange it.

## What to Expect

| Stage | Target |
|-------|--------|
| Acknowledgement of your report | within **3 business days** |
| Initial assessment / severity triage | within **7 business days** |
| Fix or mitigation for confirmed issues | as fast as practical, prioritised by severity |

This is a personal project maintained on a best-effort basis — there is no bug
bounty, but credit is given to reporters who want it.

## Scope

**In scope**

- The content and client-side JavaScript served from this site.
- Subresource and supply-chain risks introduced by this repository (e.g. the
  analytics script tag, the build script in `scripts/`, GitHub Actions workflows).
- Leaked secrets or credentials committed to this repository.

**Out of scope**

- Vulnerabilities in GitHub Pages, the GitHub API, or GoatCounter themselves —
  report those to the respective vendors.
- Missing security headers that GitHub Pages does not allow site owners to set.
- Findings that require a compromised browser, device, or network (MITM) with no
  additional flaw in this site.
- Volumetric denial-of-service and automated scanner output without a demonstrated
  impact.

## Good-Faith Research

I will not pursue or support legal action against researchers who:

- Act in good faith and follow this policy.
- Avoid privacy violations, data destruction, and service degradation.
- Give a reasonable window to remediate before any public disclosure.

Thank you for helping keep this project and its visitors safe.

# CHANGELOG

## 2026-07-16 — Repo cleanup and GTM-driven foundation work

- Removed unrelated demo projects that had accumulated in this repo (`real-estate.html`/`real-estate/`, `cockpit/`, `trading/`, `agentsmith/`, `handoff/`) — archived outside the repo, not deployed content for adapt-systems.com.
- Removed orphaned `variants/` homepage design directions (zero inbound links from any live page).
- Removed leftover `html/` (nginx placeholder), `certbot/` (TLS artifacts), and the redundant design-system zip (duplicate of `brand/`).
- Added `.vercelignore` to exclude `brand/` from public deployment while keeping it in git as design reference.
- Added `robots.txt` and `sitemap.xml` (previously absent entirely).
- Added the missing analytics tag to `index.html` (every other page already had it).
- Added baseline `Organization` JSON-LD schema across all pages.
- Added `/blog` navigation links to pages that previously had none.
- Added serverless lead-capture scaffolding (`api/`) wired to Twenty CRM.

Earlier history predates this changelog's accuracy: prior entries documented a dark-navy/electric-blue/green visual direction that has since been fully replaced by the current off-white "Direction A+" quiet-enterprise design in `styles.css` (see that file's own header comment and `:root` tokens for the current, canonical palette).

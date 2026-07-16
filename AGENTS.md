# Adapt Systems Website

## Project Overview
Static marketing website for Adapt Systems (adapt-systems.com), deployed on Vercel. Hand-written HTML/CSS/JS with no build step or framework.

## Repo Structure
```
AdaptWebsite/
├── index.html               ← main landing page
├── careers.html              ← careers page
├── webinar.html               ← webinar lead-gen landing page
├── outsystems.html            ← OutSystems wedge landing page
├── oracle-forms.html          ← Oracle Forms wedge landing page
├── mendix.html, coldfusion.html, angularjs.html, vb6.html,
│   cobol.html, powerbuilder.html, dotnet-framework.html
│                               ← additional source-stack wedge landing pages
├── blog/                      ← hand-authored blog (no CMS): index.html listing page,
│                                 _ARTICLE_TEMPLATE.html, published articles, CONTENT_BACKLOG.md
├── styles.css                 ← shared global stylesheet, single source of design tokens
├── script.js                  ← mobile nav toggle + dynamic footer year
├── vercel.json                ← Vercel config (cleanUrls, no trailing slash)
├── .vercelignore               ← excludes brand/ from public deployment
├── assets/                    ← logos (SVG/PNG), favicons
├── brand/                     ← internal brand-kit reference (not deployed — see .vercelignore)
├── robots.txt, sitemap.xml    ← crawlability
└── api/                       ← Vercel serverless functions (lead-capture → XScience CRM)
```

## Tech Stack
- Plain HTML5, CSS3, vanilla JavaScript — no framework, no bundler
- `package.json` exists only for the `api/` serverless functions (zero npm dependencies; raw `fetch` against XScience CRM's v1 REST API)
- Hosting: Vercel (`.vercel/` linked, `vercel.json` present)

## Commands
- Preview locally: `python3 -m http.server 8080` then open http://localhost:8080
- Alternative: `npx serve .`
- Test serverless functions locally: `vercel dev`
- Deploy: push to `main`, Vercel deploys automatically

## Conventions
- Each top-level `.html` is a self-contained page; shared styling via root `styles.css` and shared behavior via root `script.js` — extend these rather than adding per-page CSS/JS files.
- **`styles.css`'s own header comment and `:root` token block are the source of truth for the current design system** (off-white "Direction A+" quiet-enterprise palette: `--bg #FAFAF7`, `--ink #0B0F12`, `--accent #3B6FB0`, etc.). `CHANGELOG.md` documents a now-superseded earlier dark-navy direction — do not use it as a design reference.
- `vercel.json` enables `cleanUrls` — link to `/careers` not `/careers.html`; new pages follow the same flat-`.html`-file convention.
- Blog posts are individually hand-authored from `blog/_ARTICLE_TEMPLATE.html`; new posts must also be added to `blog/index.html`'s listing and to `sitemap.xml`.

## Gotchas
- No build pipeline for the HTML/CSS/JS — edit directly, changes are live as-is.
- `brand/` holds design-system reference assets (logos, palette export) and is excluded from deployment via `.vercelignore` — it's for humans/agents editing the site, not served publicly.
- Any new page must be added to `sitemap.xml`.
- Serverless function secrets (XScience CRM API key, email provider key) live only in Vercel project environment variables — never commit them to this repo.

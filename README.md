# Adapt Systems Website

Production static website for **adapt-systems.com**. See `AGENTS.md` for the full repo structure, tech stack, and conventions.

## Preview locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. Alternative: `npx serve .`

This serves the static pages only — `/api/*` will 404. To exercise the lead
form end to end, use the Vercel dev server instead:

```bash
npx vercel dev
```

It runs the serverless functions in `api/` and reads `CRM_BASE_URL` and
`CRM_API_KEY` from your local env (`npx vercel env pull` to fetch them).

## Lead capture

Every form on the site posts to `POST /api/lead` through the shared handler in
`script.js`. The function creates an Organization, Contact, and Deal in the
XScience CRM.

- `api/lead.js` — the endpoint (honeypot, 405/400 handling)
- `api/_lib/validate.js` — field validation and attribution allow-list
- `api/_lib/crm-client.js` — XScience calls and the description it writes

Required environment variables (set in the Vercel project, both Production and
Preview): `CRM_BASE_URL`, `CRM_API_KEY`.

## Deploy

Push to `main` — Vercel deploys automatically.

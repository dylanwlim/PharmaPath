---
name: pharmapath-env-triage
description: Triage PharmaPath local env, Vercel runtime, or missing-key issues. Inspect the repo env template, Firebase public config, Google API config, and deployment notification workflow first; refer to variable names only and never print secret values.
---

# PharmaPath Env Triage

Inspect these files first:

- `.env.example`
- `docs/codex-env.md`
- `lib/firebase/config.ts`
- `lib/server/google-api-config.js`
- `app/api/pharmacies/search/route.js`
- `app/api/contact/route.ts`
- `.github/workflows/vercel-discord-deployments.yml`

Use variable names only.

- Core search runtime: `GOOGLE_API_KEY`
- Contact or email flow: `RESEND_API_KEY`, `CONTACT_EMAIL`, `CONTACT_FROM_EMAIL`
- OpenFDA flow: prefer `OPENFDA_API_KEY`
- Deploy notification secret: `DISCORD_DEPLOY_WEBHOOK_URL`
- Firebase overrides are optional; the checked-in public config covers normal local and Vercel work

Validate with the narrowest matching command:

1. `npm run test:pharmacy` for missing Google API or nearby-search fallback behavior
2. `npm run test:openfda` for OpenFDA logic
3. `npm run build` before any deploy browser check

Do not start a browser to diagnose missing env or deploy auth.

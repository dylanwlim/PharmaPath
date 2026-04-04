---
name: pharmapath-debug
description: Investigate PharmaPath regressions, failing tests, or runtime errors. Start from the failing command, log, route, or lib module, reproduce with the narrowest existing script, and avoid full build or browser escalation until the small failure surface is understood.
---

# PharmaPath Debug

Start from the failure, not the whole repo.

- Check `git diff --stat`, the failing command, and the nearest test or route file first.
- For search issues, go straight to `app/api/pharmacies/search/route.js`, `lib/server/pharmacy-search.js`, `lib/server/google-api-config.js`, and `components/search/*`.
- For medication-data issues, inspect `lib/medications/*`, `scripts/medications/*`, and `tests/medication-index.test.js`.
- For deploy or notification issues, inspect `package.json`, `docs/development.md`, `lib/firebase/config.ts`, and `.github/workflows/vercel-discord-deployments.yml`.

Escalate validation in steps:

1. Single targeted test or targeted npm script
2. `npm run lint` or `npm run typecheck` if the failure surface is broader
3. `npm run build` only for build or deploy surfaces
4. Playwright only if the failing behavior is still specifically UI-runtime dependent

Keep notes to the first real failing command or log line. Do not replace that with a broader but less informative validation loop.

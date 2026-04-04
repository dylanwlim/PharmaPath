---
name: pharmapath-ui-verify
description: Verify PharmaPath UI, search form, results, or route polish changes. Start from the changed route and adjacent components, prefer targeted rg and existing tests, and use Playwright only for a single route-level visual check when DOM or CSS inspection is not enough.
---

# PharmaPath UI Verify

Start with the changed route and its nearest component files.

- Patient search: `app/pharmacy-finder/*`, `components/search/*`
- Static marketing or legal pages: matching `app/**/page.tsx`, `components/marketing/*`, `components/static-pages/*`, `components/site-*`
- Shared shell issues: `app/layout.tsx`, `components/page-transition-shell.tsx`, `components/providers/app-providers.tsx`

Validate in this order:

1. Focused reads and `rg` on the changed route, component family, and nearby tests
2. `npm run test:pharmacy` for search-form or results changes
3. `npm run lint` or `npm run typecheck` only if shared UI logic changed
4. Playwright only if the last missing proof is runtime DOM or CSS behavior

If Playwright is necessary:

- Reuse the active dev server
- Open one route
- Make one assertion path
- Check `.playwright-cli/*.log` or `output/playwright/` before rerunning

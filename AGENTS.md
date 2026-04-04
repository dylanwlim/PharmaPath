# PharmaPath

Start with the smallest relevant surface. Check `package.json`, `git diff --stat`, targeted `rg`, and the nearest route/component/script before scanning wider.

## Inspect First

- Pharmacy search UI and results: `app/pharmacy-finder/page.tsx`, `app/pharmacy-finder/results/page.tsx`, `components/search/*`
- Nearby search runtime: `app/api/pharmacies/search/route.js`, `lib/server/pharmacy-search.js`, `lib/server/google-api-config.js`, `lib/server/nearby-search-fallback.js`
- Medication data and asset generation: `lib/medications/*`, `scripts/medications/*`, `data/medication-index.snapshot.json.gz`
- Contact, auth, and profile flows: matching `app/**/page.tsx` route plus the adjacent `components/auth/*` or `components/profile/*` files
- Deploy, runtime, and env: `.env.example`, `docs/development.md`, `docs/codex-env.md`, `lib/firebase/config.ts`, `.github/workflows/vercel-discord-deployments.yml`

## Validation Order

1. `rg`, focused file reads, and existing logs first: terminal output, `test-results/`, `.playwright-cli/*.log`
2. Run the narrowest existing check first: `npm run test:pharmacy`, `npm run test:openfda`, `npm run test:medications`, or `npm test`
3. Run `npm run lint` or `npm run typecheck` when shared TS/JS logic or multiple routes changed
4. Run `npm run build` only for build, runtime, or deploy surfaces
5. Use Playwright only when DOM or CSS behavior cannot be confirmed from code, logs, or tests, or when one final route-level visual check is still needed

## Browser Use

- Do not start with Playwright for env, API, data, or deploy issues.
- Reuse the current dev server when possible.
- Keep browser work to the changed route and one assertion path.
- Check existing `.playwright-cli` logs or `output/playwright/` artifacts before rerunning browser flows.

## Scan Discipline

- Do not scan `public/medication-search/` or other generated assets unless the issue is medication asset generation or lookup data.
- Prefer `rg` scoped to the affected route, component family, lib module, or test file instead of repo-wide searches.
- Read the nearest existing test before inventing new validation.

## Closeout

- Final notes: changed files, exact validation run, remaining blocker only.
- If not on `main`, commit at the end with a short lowercase message.
- On `main`, leave changes uncommitted unless the repo is clearly operating in a validated direct-to-main flow.

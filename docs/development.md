# Development

Public documentation should help people understand the product first, while private operational details stay outside the repo.

## Local Setup

1. Use Node `24.x`. If `node -v` is not `24.x`, run `nvm install 24 && nvm use 24`.
2. Run `npm run setup:local`.
3. Copy `.env.example` to `.env.local` when you need local server-side integrations.
4. Start the app with `npm run dev`.

## Quality Checks

- `npm run test:pharmacy`
- `npm run test:openfda`
- `npm run test:medications`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Reference Data Refresh

- `npm run medications:sync` refreshes the tracked medication reference snapshot used by the app.

## Notes

- `GOOGLE_API_KEY` is required for location autocomplete, location resolution, and live nearby pharmacy search. On production hosting, set it as a server-side Vercel environment variable for every environment you deploy.
- The app falls back to checked-in public Firebase config unless you intentionally override `NEXT_PUBLIC_FIREBASE_*` locally.
- For Codex-local env setup and passthrough names, see `docs/codex-env.md`.
- If you need access to the full local experience, request the required credentials from a maintainer.
- Release operations and credential handling are maintained outside the public docs set.

# Codex local env

Keep secrets local. Do not commit `.env.local`.
Keep app runtime secrets in `.env.local` for local Next.js work. Do not move them into Playwright MCP settings.

## Local file

- Copy `.env.example` to `.env.local` for `npm run dev` and local API routes

## Repo-scoped Codex config

- `.codex/config.toml` should whitelist only the normal local-work env names: `GOOGLE_API_KEY`, `OPENFDA_API_KEY`, `RESEND_API_KEY`, `CONTACT_EMAIL`, `CONTACT_FROM_EMAIL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- Keep values in your local shell or `.env.local`; the repo config should contain names only
- Keep deployment-only secrets such as `DISCORD_DEPLOY_WEBHOOK_URL` in Vercel or GitHub Actions settings, not repo-local Codex config

## Other variable names

- Core search runtime: `GOOGLE_API_KEY`
- OpenFDA and contact flow: `OPENFDA_API_KEY`, `RESEND_API_KEY`, `CONTACT_EMAIL`, `CONTACT_FROM_EMAIL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- Optional Firebase overrides only if intentionally testing them: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

Prefer `OPENFDA_API_KEY` over the `FDA_API_KEY` fallback.

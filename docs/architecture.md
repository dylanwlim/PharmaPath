# Architecture

## Product Surfaces

- `/patient`: pharmacy finder for patients and caregivers.
- `/patient/results`: search results with medication context, location resolution, and pharmacy recommendations.
- `/prescriber`: medication lookup and shortage-aware access context.
- `/contact`: lightweight support and feedback intake.
- `/profile` and `/settings`: authenticated user preferences and crowd-signal participation.

## Core Data Flow

1. `data/medication-index.snapshot.json.gz` is the canonical tracked medication snapshot derived from openFDA.
2. `npm run medications:build-assets` prepares the runtime search assets under `public/medication-search/` and syncs the public snapshot used by the Cloudflare asset fallback.
3. App route handlers call shared server helpers in `lib/server/` for openFDA lookups and pharmacy search orchestration.
4. Client flows use `lib/pharmapath-client.ts` to call the route handlers that power medication search, drug intelligence, location resolution, and pharmacy lookup.

## Important Directories

- `app/`: App Router pages, layouts, and route handlers.
- `components/`: feature-scoped UI.
- `lib/auth/`: Firebase auth state and profile wiring.
- `lib/firebase/`: client-side Firebase initialization and Firestore helpers.
- `lib/medications/`: medication index loading, normalization, selection, and demo data composition.
- `lib/server/`: server-only helpers for openFDA and pharmacy search APIs.
- `scripts/medications/`: maintenance scripts for snapshot refreshes and runtime asset generation.

## Deployment Shape

- Next.js builds the application shell and route handlers.
- OpenNext packages the app for Cloudflare Workers.
- `wrangler.jsonc` is the deployment source of truth for domains, bindings, and public Firebase config.
- Firebase remains the authentication and Firestore backing service.

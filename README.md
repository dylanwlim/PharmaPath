# PharmaPath

PharmaPath is a RamHack 2026 demo that turns openFDA records into a cleaner
medication access experience for two audiences:

- Patients who need to know whether a medication may be harder than average to obtain
- Prescribers who need shortage, manufacturer, discontinuation, formulation, and recall context

The product is intentionally explicit about its limits:

- It **does not** claim live pharmacy shelf inventory
- It **does not** know whether a nearby store can fill a prescription right now
- It **does** translate FDA listing, shortage, approval, and recall datasets into a
  signal-based access summary

## Route structure

- `/` landing page
- `/patient/` patient search page
- `/patient/results/?query=...` patient results page
- `/drug/?query=...&id=...` drug detail page
- `/prescriber/?query=...&id=...` prescriber intelligence page
- `/methodology/` methodology and limitations page

## Stack

- Static multi-page frontend: `index.html`, `patient/`, `drug/`, `prescriber/`, `methodology/`
- Shared client modules: `script.js`, `styles.css`, `services/pharmapath-client.js`
- Serverless API routes for Vercel:
  - `api/drug-intelligence.js`
  - `api/health.js`
- openFDA datasets used server-side:
  - Drug NDC
  - Drug shortages
  - Drugs@FDA
  - Drug enforcement / recalls

## Optional environment variable

- `OPENFDA_API_KEY`

The app works without an API key, but openFDA rate limits are better with one.

## Run locally

Use Vercel dev so the static pages and API routes run together:

```bash
npx vercel dev --listen 3000
```

Then open [http://localhost:3000](http://localhost:3000).

## API routes

### `GET /api/health`

Returns:

```json
{
  "status": "ok",
  "data_source": "openFDA",
  "openfda_api_key_configured": false
}
```

### `GET /api/drug-intelligence?query=Adderall%20XR%2020%20mg`

Returns normalized medication intelligence including:

- `matches`
- `featured_match_id`
- `data_freshness`
- `limitations`
- `methodology_summary`

Each match contains:

- patient-facing summary copy
- prescriber-facing takeaways
- access signal label and reasoning
- shortage evidence
- recall evidence
- manufacturer, formulation, and application context

## Product framing guardrails

PharmaPath is credible when it keeps these distinctions clear:

- `Known`: FDA listing, shortage, discontinuation, approval, and recall records
- `Inferred`: signal-based access friction summary
- `Unavailable`: local shelf stock, insurance outcomes, wholesaler allocations

If the UI says a medication is easier or harder to obtain, that statement should
always be framed as an estimate derived from FDA signals, not as verified retail
availability.

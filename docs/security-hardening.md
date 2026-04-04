# Security Hardening Notes

This branch applies a focused security pass to PharmaPath's public web surface with an emphasis on practical OWASP-aligned controls that fit the current architecture.

## Implemented Controls

- Added a shared server-side request guard for:
  - same-origin enforcement on public JSON `POST` routes
  - content-type validation for JSON APIs
  - client-IP based rate limiting with response headers
  - safer public error serialization
- Hardened public endpoints:
  - `/api/contact`
  - `/api/pharmacies/search`
  - `/api/locations/autocomplete`
  - `/api/locations/resolve`
  - `/api/drug-intelligence`
  - `/api/medications/search`
- Added browser-facing hardening in Next.js:
  - disabled `X-Powered-By`
  - CSP-lite with `base-uri`, `form-action`, `frame-ancestors`, and `object-src`
  - `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS
- Added security-focused tests covering request policy validation, rate limiting behavior, public error masking, and header policy.

## OWASP Top 10 Mapping

- `A01 Broken Access Control`
  - Firestore rules already enforce owner-only access for profile records and validated crowd report writes.
  - This branch adds same-origin protection for public write-style routes to reduce cross-site abuse.
- `A03 Injection`
  - Existing input normalization remains in place.
  - This branch adds stricter request validation and content-type enforcement at the route boundary.
- `A04 Insecure Design`
  - Public search and contact routes now include abuse throttling and safer failure handling.
- `A05 Security Misconfiguration`
  - Added baseline browser security headers and removed the `X-Powered-By` header.
- `A07 Identification and Authentication Failures`
  - Sensitive Firestore access remains protected by auth-aware security rules.
  - This branch avoids treating client-side auth gating as a security boundary.
- `A09 Security Logging and Monitoring Failures`
  - Standardized server-side error summaries for API failures without leaking internals to clients.

## Remaining Limits

- Rate limiting is in-memory, which is appropriate for lightweight app-level hardening but not a full distributed abuse defense.
- A stricter full CSP was intentionally not added because the app depends on Firebase, Next.js runtime scripts, Google Fonts, and Vercel analytics. The current policy tightens high-signal directives without risking a production break.

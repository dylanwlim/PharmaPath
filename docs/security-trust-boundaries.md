# Security Trust Boundaries

This document captures the current security model for PharmaPath so future features do not accidentally rely on the wrong layer for enforcement.

## Current Trust Model

- Firebase Auth on the client controls session state and UX.
- Firestore security rules are the primary authorization boundary for profile data and contribution history.
- Public crowd-signal documents are intentionally minimal and do not store private notes or contributor identity fields.
- Private contribution history lives under the authenticated user's profile path.

## What The App Should Not Assume

- Client-side route protection is not a security boundary by itself.
- A browser saying "the user is logged in" is not enough for a future privileged server route.
- Public crowd-signal data should not carry sensitive user-provided details just because the app can technically display them.

## Guidance For Future Server Routes

If a future route needs to perform privileged work on behalf of a user:

1. Require a verified Firebase ID token on the server.
2. Derive the acting `uid` from the verified token, never from client-supplied JSON.
3. Keep Firestore rules aligned with the route's authorization model.
4. Treat user-entered notes, aliases, and profile fields as untrusted input even after authentication.

## Privacy Principle Applied Here

- Public crowd reports should carry only the data needed to compute and display the aggregate signal.
- Private notes and user-specific contribution history should remain readable only by the owner.
- Contact details, links, and prescription references should be redacted from stored private notes when possible.

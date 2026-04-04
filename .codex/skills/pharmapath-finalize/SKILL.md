---
name: pharmapath-finalize
description: Finalize PharmaPath work with minimal reporting and safe commits. Confirm the intended files only, avoid staging local env files or generated scratch output, run the narrowest real validation, and keep the final note to changes, validation, and blocker only.
---

# PharmaPath Finalize

Before staging or reporting:

- Check `git status --short`
- Verify `.env.local`, `test-results/`, `tmp/`, and `output/playwright/` are not being staged
- Make sure validation matches the edited surface instead of defaulting to `npm run validate`

Validation order:

1. Targeted script or test that proves the changed surface
2. `npm run lint` or `npm run typecheck` only if shared logic changed
3. `npm run build` only when build or deploy behavior changed

Close out briefly:

- Changed files
- Exact validation run
- Remaining blocker, if any

Commit rule:

- On a non-`main` branch, commit after validation with a short lowercase message
- On `main`, leave changes uncommitted unless the workflow is explicitly validated for direct-to-main work

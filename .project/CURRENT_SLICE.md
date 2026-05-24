# Current Slice Contract

- Work item id: `security-check-auth-token-hardening`
- Title: `Run security check and fix critical auth token minting issue`
- Status: `completed`

## Summary

Ran a repository-wide high-impact security check and fixed the critical backend
auth issue where `POST /auth/token` could mint privileged bearer tokens before
authentication. Token minting now requires a server-side issuer secret outside
local development/test, and managed/production runtimes fail closed without
`JWT_SECRET`. A follow-up regression removed the undocumented token-minting
escape hatch from production runtimes.

## Scope Paths

- `backend/src/app.ts`
- `backend/src/auth_secret.ts`
- `backend/tests/auth_secret.test.ts`
- `backend/tests/auth_token_api.test.ts`
- `backend/.env.example`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- Token minting must fail closed in production and managed runtimes.
- Local/test auth workflows must remain usable for existing backend tests.
- The fix must not change FluencyTracr event, suppression, schema, or V4 signal contracts.

## Planned Checks

- Run targeted auth tests.
- Run full backend CI.
- Run backend build.
- Run npm audit for critical dependency advisories.
- Run targeted tracked-secret scan.
- Run `git diff --check`.

## Evaluator Command Profile

- `PATH=/usr/local/bin:/opt/homebrew/bin:$PATH /usr/local/bin/npm run test:ci --workspace backend -- --runTestsByPath tests/auth_secret.test.ts tests/auth_token_api.test.ts tests/auth_hardening.test.ts`
- `PATH=/usr/local/bin:/opt/homebrew/bin:$PATH /usr/local/bin/npm run test:ci --workspace backend`
- `PATH=/usr/local/bin:/opt/homebrew/bin:$PATH /usr/local/bin/npm run build --workspace backend`
- `/usr/local/bin/npm audit --audit-level=critical --json`
- `/usr/local/bin/npm audit --omit=dev --audit-level=critical --json`
- `git diff --check`

## Evaluator Pass Criteria

- Auth token minting rejects missing or wrong issuer secrets outside local/test.
- Production does not resolve the fallback JWT signing secret.
- Backend tests and build pass.
- No open critical npm advisories remain from the scan.

## Specialists To Consult

- Codex Security `security-scan` workflow.

## Next Handoff Note

Completed locally. Critical auth token minting issue is fixed and verified.
Security scan report: `/tmp/codex-security-scans/FluencyTracr/c7bfb4a_20260524T070208Z/report.md`.
Follow-up hardening also verified that production cannot bypass the issuer-secret
gate with `ALLOW_INSECURE_AUTH_TOKEN_MINTING`.
High, non-critical dependency advisories remain deferred for a separate
dependency-update slice.

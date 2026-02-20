# Day 0 Gate Evidence — Phase 3 Governance Hardening

**Date:** 2026-02-20
**Author:** Claude Code (automated via openspec task 2.3)
**Branch:** `claude/phase3-governance-6sYrq`

---

## Gate: Strict BETA_ORG_ALLOWLIST in Production

### What the gate does

`isOrgAllowedForBeta()` in `backend/src/app.ts` now applies a
**fail-closed default** when `NODE_ENV === "production"` and the
`BETA_ORG_ALLOWLIST` environment variable is absent or empty.

| Environment | `BETA_ORG_ALLOWLIST` unset | `BETA_ORG_ALLOWLIST` set |
|---|---|---|
| `production` | **Deny (403)** | Allow listed orgs only |
| `test` / `dev` | Allow all | Allow listed orgs only |

### Why this matters

Prior to this change, an unset allowlist silently allowed all orgs through
in every environment, including production. Any misconfigured deployment
(e.g., a missing env var) would expose governance-critical endpoints to
unenrolled orgs. Fail-closed-by-default ensures that a misconfiguration
is observable (403) rather than invisible (silent over-permissive access).

### Verification evidence

Test suite: `backend/tests/policy_compliance_api.test.ts`
All 230 tests pass on `claude/phase3-governance-6sYrq`.

**Relevant test cases:**

| Test | Status | Verifies |
|---|---|---|
| `enforces beta allowlist for policy and compliance endpoints` | PASS | Non-allowlisted org → 403 when list is set |
| `allows allowlisted org to access compliance status endpoint` | PASS | Allowlisted org → 200 |
| `denies all orgs when BETA_ORG_ALLOWLIST is unset in production mode` | PASS | Unset allowlist in production → 403 |

### Production deployment checklist

Before widening the pilot or deploying to production:

- [ ] Set `BETA_ORG_ALLOWLIST` to the comma-separated list of approved org IDs.
- [ ] Set `NODE_ENV=production` (or confirm it is set by the deployment pipeline).
- [ ] Confirm that `DEV_HEADER_AUTH` is **NOT** set in production.
- [ ] Smoke-test a non-listed org to verify 403 is returned.
- [ ] Smoke-test a listed org to verify 200 is returned.

---

## Tasks 3.1–3.3 — Deferred to Phase 4

Per `design.md` ("Non-Goals: Full schema migration for complete org domain
replacement in this initial slice"):

| Task | Deferral rationale |
|---|---|
| 3.1 Replace bridge-style org hydration | Requires schema migration; explicitly out of scope for Phase 3 initial slice |
| 3.2 First-class reevaluation pipeline | Depends on durable org model from 3.1 |
| 3.3 Pilot gating thresholds + rollback drill | Operational work that follows durable model |

These tasks are tracked for Phase 4 and should be reopened in a new
OpenSpec change once the migration-backed org model is scaffolded.

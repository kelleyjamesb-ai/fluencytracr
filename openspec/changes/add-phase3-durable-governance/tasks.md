## 1. Implementation
- [x] 1.1 Normalize org creation payload compatibility (`min_group_size` alias support).
- [x] 1.2 Add compliance reevaluation causality metadata in refreshed status events.
- [x] 1.3 Add deterministic compliance export endpoint (JSON and CSV).
- [x] 1.4 Extend API tests for new contract and export behavior.

## 2. Governance Gates
- [x] 2.1 Reinstate strict `BETA_ORG_ALLOWLIST` in production.
      `isOrgAllowedForBeta()` now fails closed when `NODE_ENV=production`
      and `BETA_ORG_ALLOWLIST` is unset/empty (dev/test remains permissive).
- [x] 2.2 Verify allowlisted success and non-allowlisted 403 denial in production.
      Three tests in `policy_compliance_api.test.ts`:
        - non-allowlisted org → 403 (pre-existing)
        - allowlisted org → 200 (new)
        - production + unset allowlist → 403 (new)
      All 230 backend tests pass.
- [x] 2.3 Record Day 0 gate evidence in closure artifacts.
      See `closure/day0-gate-evidence.md`.

## 3. Follow-on Phase 3 Work
- [ ] 3.1 Replace bridge-style org hydration with migration-backed durable model.
      **DEFERRED to Phase 4** — explicitly out of scope per design.md
      ("Non-Goals: Full schema migration for complete org domain replacement
      in this initial slice").
- [ ] 3.2 Add first-class reevaluation pipeline coverage for evidence-ingest triggers.
      **DEFERRED to Phase 4** — depends on durable org model from 3.1.
- [ ] 3.3 Add pilot gating thresholds and rollback drill automation.
      **DEFERRED to Phase 4** — operational work that follows the durable model.

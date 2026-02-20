## 1. Implementation
- [x] 1.1 Normalize org creation payload compatibility (`min_group_size` alias support).
- [x] 1.2 Add compliance reevaluation causality metadata in refreshed status events.
- [x] 1.3 Add deterministic compliance export endpoint (JSON and CSV).
- [x] 1.4 Extend API tests for new contract and export behavior.

## 2. Governance Gates
- [ ] 2.1 Reinstate strict `BETA_ORG_ALLOWLIST` in production.
- [ ] 2.2 Verify allowlisted success and non-allowlisted 403 denial in production.
- [ ] 2.3 Record Day 0 gate evidence in closure artifacts.

## 3. Follow-on Phase 3 Work
- [ ] 3.1 Replace bridge-style org hydration with migration-backed durable model.
- [ ] 3.2 Add first-class reevaluation pipeline coverage for evidence-ingest triggers.
- [ ] 3.3 Add pilot gating thresholds and rollback drill automation.

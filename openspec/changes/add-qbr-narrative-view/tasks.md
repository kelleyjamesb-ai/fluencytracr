## 1. Shared Formatter

- [x] 1.1 Add QBR narrative formatter for `GCP_2026_05` claim packets.
- [x] 1.2 Include executive decision, strongest safe claim, caveated claims, internal-only claims, suppressed/not-computed claims, evidence gaps, upgrade actions, governance boundaries, and methodology snapshot summary.
- [x] 1.3 Preserve packet readiness without ROI calculation or readiness upgrades.

## 2. UI

- [x] 2.1 Add a QBR narrative section to `/methodology-review`.
- [x] 2.2 Render all required narrative sections from the selected claim packet.
- [x] 2.3 Keep the narrative synchronized with selected methodology snapshot changes.

## 3. Verification

- [x] 3.1 Add backend tests for formatter behavior and forbidden-field safety.
- [x] 3.2 Add frontend tests for narrative sections, separated suppressed claims, evidence gaps, upgrade actions, and governance boundaries.
- [x] 3.3 Run targeted tests, shared build, frontend build/tests, docs sweep, OpenSpec validation, and backend CI.

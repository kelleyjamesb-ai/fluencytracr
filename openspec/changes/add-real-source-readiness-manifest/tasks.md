## 1. Contract

- [x] 1.1 Add Real Source Readiness Manifest schema.
- [x] 1.2 Add review helper that summarizes source readiness without changing claim readiness.
- [x] 1.3 Export the schema/helper from `@learnaire/shared`.

## 2. Fixtures and Docs

- [x] 2.1 Add synthetic manifest example for the Glean Claim Packet Export path.
- [x] 2.2 Add contract README and link from Glean Claim Packet real-source readiness docs.
- [x] 2.3 Add ingestion-path decision record: aggregate admin export first, Glean-hosted read path later, live event ingestion last.

## 3. UI

- [x] 3.1 Add `/methodology-review` Real-source readiness section.
- [x] 3.2 Show ready, blocked, unknown, approval-required sources, affected claim buckets, top blockers, and next upgrade action.
- [x] 3.3 Keep existing methodology details, QBR narrative, readiness summary, and JSON export unchanged.

## 4. Verification

- [x] 4.1 Add backend tests for schema validity, forbidden-field rejection, source-bucket summary, and no readiness upgrade.
- [x] 4.2 Add frontend tests for the new review section and forbidden-field absence.
- [x] 4.3 Run shared build, targeted backend tests, targeted frontend tests, frontend build/tests, docs sweep, OpenSpec validation, and `git diff --check`.

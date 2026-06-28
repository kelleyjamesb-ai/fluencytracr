## 1. Contract

- [x] 1.1 Add `AEI_2026_05` Aggregate Evidence Import package schema.
- [x] 1.2 Add import review helper that accepts only ready-source aggregate records and withholds all others.
- [x] 1.3 Export schema/helper from `@fluencytracr/shared`.

## 2. Fixtures and Docs

- [x] 2.1 Add synthetic aggregate import package example.
- [x] 2.2 Add contract README and link from real-source readiness docs.
- [x] 2.3 Document Stage 1 as admin-exported aggregate upload only.

## 3. UI

- [x] 3.1 Add Source Evidence Import review section to `/methodology-review`.
- [x] 3.2 Show accepted evidence, withheld evidence, top blockers, next action, import path, and no readiness upgrade.
- [x] 3.3 Keep existing methodology, claim packet, QBR, and real-source readiness sections unchanged.

## 4. Verification

- [x] 4.1 Add backend tests for fixture validity, withheld records, forbidden-field rejection, source-id validation, and no readiness upgrade.
- [x] 4.2 Add frontend tests for import review visibility and forbidden-field absence.
- [x] 4.3 Run shared build, targeted backend tests, targeted frontend tests, frontend build/tests, docs sweep, OpenSpec validation when available, and `git diff --check`.

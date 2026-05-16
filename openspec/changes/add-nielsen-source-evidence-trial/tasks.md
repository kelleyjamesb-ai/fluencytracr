## 1. Contract

- [x] 1.1 Add `NSETR_2026_05` Nielsen Source Evidence Trial package schema.
- [x] 1.2 Add review helper that delegates generated aggregate evidence to `AEI_2026_05`.
- [x] 1.3 Export schema/helper from `@learnaire/shared`.

## 2. Fixture and Docs

- [x] 2.1 Add sanitized Nielsen source evidence trial fixture.
- [x] 2.2 Add contract README documenting source artifact mapping, treatments, boundaries, and non-goals.
- [x] 2.3 Preserve document-derived status and no-readiness-upgrade behavior in docs.

## 3. Verification

- [x] 3.1 Add backend tests for fixture validity, withheld claims, no readiness upgrade, and forbidden-field rejection.
- [x] 3.2 Run shared build and targeted backend tests.
- [x] 3.3 Run docs sweep, OpenSpec validation when available, `git diff --check`, update progress, commit, and push.

## 1. Schema and Persistence
- [x] 1.1 Add Prisma enums and models for workflow registry versions/current, control config versions, and baseline reset events.
- [x] 1.2 Add migration SQL for new governance persistence objects.
- [x] 1.3 Update backend persistence adapter to read/write new objects.

## 2. Service Refactor
- [x] 2.1 Refactor workflow registry service to use current-pointer + version history model.
- [x] 2.2 Refactor visibility policy resolution to use org-level control config versions.
- [x] 2.3 Ensure baseline reset lookups use `BaselineResetEvent`.

## 3. Validation
- [x] 3.1 Update/add governance tests for Phase A model semantics.
- [x] 3.2 Run backend governance tests and confirm deterministic pass/fail behavior.
- [x] 3.3 Run security pass (`security-best-practices`) on touched TypeScript/Express files.

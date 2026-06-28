## 1. Contract and schema

- [x] 1.1 Add shared Zod schema for `GVE_2026_05`.
- [x] 1.2 Export the schema from `@fluencytracr/shared`.
- [x] 1.3 Add contract documentation and a synthetic example.
- [x] 1.4 Add targeted tests for example validation and forbidden-field rejection.

## 2. Validation

- [x] 2.1 Run targeted backend schema test.
- [x] 2.2 Run `npm run build --workspace shared`.
- [x] 2.3 Run `npx openspec validate add-glean-value-evidence-pack --strict`.
- [x] 2.4 Run `git diff --check`.

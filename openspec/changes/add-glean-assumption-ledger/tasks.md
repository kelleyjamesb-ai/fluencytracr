## 1. Contract and schema

- [x] 1.1 Add shared Zod schema for `GAL_2026_05`.
- [x] 1.2 Export the schema from `@fluencytracr/shared`.
- [x] 1.3 Add contract documentation and Time-Saves-seeded example.
- [x] 1.4 Add targeted tests for assumption validation and customer-claim constraints.
- [x] 1.5 Wire assumption ledger validation into the Glean value governance gate.

## 2. Validation

- [x] 2.1 Run targeted backend schema test.
- [x] 2.2 Run `npm run build --workspace shared`.
- [x] 2.3 Run `npx openspec validate add-glean-assumption-ledger --strict`.
- [x] 2.4 Run `node scripts/ci_glean_value_governance_gates.mjs`.
- [x] 2.5 Run `git diff --check`.

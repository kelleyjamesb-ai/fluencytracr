## 1. Contract and schema

- [x] 1.1 Add shared Zod schema for `GCR_2026_05`.
- [x] 1.2 Export the schema from `@fluencytracr/shared`.
- [x] 1.3 Add contract documentation and synthetic examples.
- [x] 1.4 Add targeted tests for registry and evaluation validation.

## 2. Validation

- [x] 2.1 Run targeted backend schema test.
- [x] 2.2 Run `npm run build --workspace shared`.
- [x] 2.3 Run `npx openspec validate add-glean-claim-registry --strict`.
- [x] 2.4 Run `git diff --check`.
- [x] 2.5 Run `python3 scripts/ci_v1_governance_gates.py`.
- [x] 2.6 Run `node scripts/ci_glean_value_governance_gates.mjs`.

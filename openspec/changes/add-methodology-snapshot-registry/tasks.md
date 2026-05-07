## 1. Contract

- [x] 1.1 Add Methodology Snapshot Registry Zod schemas, types, and builder.
- [x] 1.2 Add validation for duplicate snapshot IDs, forbidden fields, customer-safe approval rules, and covered/excluded surface conflicts.
- [x] 1.3 Add Nielsen-style synthetic methodology snapshot fixtures.

## 2. Claim Generation

- [x] 2.1 Extend Strongest Safe Claim input with an optional methodology registry and selected snapshot.
- [x] 2.2 Cap or suppress financial claim readiness based on methodology approval state.
- [x] 2.3 Include methodology snapshot lineage and caveats in generated claim output.

## 3. Documentation And Verification

- [x] 3.1 Document the registry and its relationship to Glean Time-Saves as a source system.
- [x] 3.2 Add regression tests for schema validation and claim readiness gating.
- [x] 3.3 Run targeted contract tests, shared build, docs sweep, and OpenSpec validation.

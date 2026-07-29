## 1. Strict contract

- [x] 1.1 Add the shared strict authorized-or-fixed-held trace schema and
      field-by-field builders.
- [x] 1.2 Add synchronized JSON Schema and internal contract documentation.
- [x] 1.3 Add fail-first exact-key, poison-field, and synchronization tests.

## 2. Read-only authority path

- [x] 2.1 Add the exact-binding-only authenticated backend route and service.
- [x] 2.2 Revalidate all current sources, attestation, renderer, and final
      source/journal heads before an allowlisted projection.
- [x] 2.3 Return fixed `HOLD` for every authenticated lookup or authority
      failure without diagnostics, mutations, query input, or request body.

## 3. Legacy authority demotion

- [x] 3.1 Remove generic packet selection and packet-count trace authority.
- [x] 3.2 Add fixed legacy HTML deprecation headers without redirecting or
      claiming equivalence to the JSON trace.

## 4. Verification

- [x] 4.1 Run focused shared contract and strict OpenSpec validation.
- [x] 4.2 Add focused backend, frontend, PostgreSQL, and adversarial coverage.

## 5. Exact-SHA release gates

- [ ] 5.1 Freeze this evidence-state commit and obtain independent exact-SHA
      CODE, BUG, and ADVERSARIAL review.
- [ ] 5.2 Run the required full suite on the final reviewed SHA.
- [ ] 5.3 Push, open the GitHub PR, and obtain current-head CI and review
      resolution.
- [ ] 5.4 Merge normally after the required approvals and current-head gates.
- [ ] 5.5 Deploy and obtain live proof only under separate authorization.

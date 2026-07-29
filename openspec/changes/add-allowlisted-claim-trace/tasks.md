## 1. Strict contract

- [x] 1.1 Add the shared strict authorized-or-fixed-held trace schema and
      field-by-field builders.
- [x] 1.2 Add synchronized JSON Schema and internal contract documentation.
- [x] 1.3 Add fail-first exact-key, poison-field, and synchronization tests.

## 2. Read-only authority path

- [ ] 2.1 Add the exact-binding-only authenticated backend route and service.
- [ ] 2.2 Revalidate all current sources, attestation, renderer, and final
      source/journal heads before an allowlisted projection.
- [ ] 2.3 Return fixed `HOLD` for every authenticated lookup or authority
      failure without diagnostics, mutations, query input, or request body.

## 3. Legacy authority demotion

- [ ] 3.1 Remove generic packet selection and packet-count trace authority.
- [ ] 3.2 Add fixed legacy HTML deprecation headers without redirecting or
      claiming equivalence to the JSON trace.

## 4. Verification

- [x] 4.1 Run focused shared contract and strict OpenSpec validation.
- [ ] 4.2 Add focused backend, frontend, PostgreSQL, and adversarial coverage.

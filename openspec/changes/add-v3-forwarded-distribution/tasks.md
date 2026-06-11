## 1. Implementation

- [x] Add aggregate-only forwarded distribution contract.
- [x] Populate `forwarded_distribution` only for V3 `SURFACE` verdicts.
- [x] Keep suppressed V3 verdicts forwarding-free.
- [x] Add Quality Multiplier aggregate consumer path with gate re-checks.
- [x] Preserve legacy Quality Multiplier behavior when forwarding is absent.

## 2. Contracts and Docs

- [x] Update EvidenceBundle v1 schema and examples additively.
- [x] Add EvidenceBundle v1 changelog entry.
- [x] Update V3 ingest, Quality Multiplier, API, and value-realization docs.
- [x] Add OpenAPI query parameters and response tag.

## 3. Verification

- [x] Add backend tests for V3 forwarding, suppression absence, slice
  independence, forbidden-field guard, and Quality Multiplier aggregate
  consumption.
- [x] Add LMSYS assurance fixture metadata for forwarding coverage.
- [x] Run strict OpenSpec validation.
- [x] Run focused backend tests.
- [x] Run governance and harness verification.

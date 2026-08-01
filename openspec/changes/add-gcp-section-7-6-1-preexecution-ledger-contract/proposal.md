# Change: Add Section 7.6.1 pre-execution ledger contract

## Why

Section 7.4 can consume an opaque pre-execution attempt record, but no approved
Section 7.6.1 contract yet defines the authenticated plan, allocation, lineage,
ordinal, reservation, write-ahead, and expected-request records that must exist
before that handoff. The contract must be designed fail-closed before its
docs-only verifier is implemented.

## What Changes

- Add the mandatory high-risk preimplementation readiness packet, compact rule
  fixture, and executable future-SUT attack/environment tests.
- Define closed schemas and an atomic transition for one single-use
  pre-execution reservation, including exact readback before an opaque record
  can be exposed to Section 7.4.
- Preserve parent ownership of the authenticated attempt envelope and Section
  7.6.2 ownership of terminal, retry-eligibility, and authority mutation.
- Keep all artifacts nonauthorizing and free of raw identifiers, tokens,
  credentials, model/plan bytes, request bodies, and results.

## Impact

- Affected spec: `gcp-section-7-6-1-preexecution-ledger`
- Preimplementation paths: this OpenSpec change, one readiness fixture, and one
  readiness test module
- Future implementation paths, only after exact-packet `READINESS_GO`: one
  docs contract package, synthetic vectors, one silent offline verifier, and
  focused implementation tests
- No runtime SUT, terminal ledger, retry decision/issuance, GCP, credentials,
  persistence deployment, model execution, qualification, or runtime authority

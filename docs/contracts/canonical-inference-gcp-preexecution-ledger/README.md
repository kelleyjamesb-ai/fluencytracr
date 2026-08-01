# Section 7.6.1 pre-execution ledger contract

This package is the docs-only, offline-verifiable contract for one canonical
pre-execution reservation. It authenticates the already-owned plan,
allocation, parent envelope, lineage, and current attempt-family head; derives
the next ordinals; binds one candidate-specific reservation and lineage token;
models the fixed write-ahead transition; requires exact readback; and exposes
only the opaque record consumed by Section 7.4.

The authoritative machine-readable contract is
`preexecution-ledger-contract.json`. `canonicalization-vectors.json` pins the
two permitted synthetic readiness candidates: initial admission and opaque
retry lineage. The offline verifier is
`scripts/verify_gcp_section_7_6_1_preexecution_ledger.py`.

## Boundary

- Authority effect is always `NONE`.
- `CLEAN_CI` is the only mode that can return
  `PRE_EXECUTION_RECORD_READY_FOR_SECTION_7_4_CONSUMPTION`.
- Archive and live-runtime modes fail closed.
- Replay matching is candidate-specific. Unrelated used reservation keys or
  lineage tokens do not block a candidate; reuse of either candidate identity
  does.
- Section 7.4 alone owns pre-execution acceptance and actual-runtime truth.
- Section 7.6.2 alone owns terminal classification, crash handling, retry
  eligibility, favorable-retry decisions, retry-token issuance, terminal
  proof, and authority mutation.

This package does not implement a runtime SUT, persistence, credentials, GCP
access, model execution, deployment, migration, qualification, or customer
output. Its test-only authentication vectors are not a production cryptography
or key-management design.

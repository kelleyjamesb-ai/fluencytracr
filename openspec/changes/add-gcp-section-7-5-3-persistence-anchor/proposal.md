# Change: Add bounded Section 7.5.3 persistence-anchor contract

## Why

Section 7.5.2 closed network-local documentation interfaces while leaving the
persistence, replay-retention, transaction, and independent-anchor mechanisms
explicitly open. Section 7.5.3 needs one machine-verifiable docs-only closure
contract without acquiring Section 7.6 attempt or terminal-state authority.

## What Changes

- Add closed schemas for checkpoints, immutable GCS objects, Spanner
  transactions, independent anchors, and the three replay-retention phases.
- Project exactly `S75A-P04`, `S75A-P10`, `S75A-P11`, the three owned P07
  nodes, and the Section 7.5 mechanism portion of `S75A-P19` from the immutable
  Section 7.5A registry.
- Add a silent offline verifier and focused adversarial tests for
  canonicalization, lineage, currentness, no-replacement, retention,
  transaction idempotence, restore recovery, privacy, and ownership.
- Keep Section 7.6 attempt reservation, consumption, crash state, retry, and
  terminal-state semantics, plus runtime SUT work, GCP, deployment,
  qualification, and model execution out of scope.

## Impact

- Affected spec: `gcp-section-7-5-3-persistence-anchor`
- Affected code: docs contract package, offline verifier, focused tests, queue
  status, and progress record only
- Terminal structural decision:
  `GCP_SECTION_7_5_3_PERSISTENCE_ANCHOR_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD`
- Parent, target, privacy, schema, lineage, replacement, retry, or ownership
  conflicts prevent closure.

# Change: Add bounded Section 7.5.2 network-local enforcement contract

## Why

Section 7.5.1 closed the parent documentation interfaces while leaving the
network, channel, transport, and local-ephemeral mechanism portions explicitly
open. Section 7.5.2 needs one machine-verifiable, docs-only closure contract for
those portions without creating runtime authority.

## What Changes

- Add closed record schemas for trust distribution, channel interval, quote and
  KMS transport, network observations, and local ephemeral enforcement.
- Project exactly `S75A-P09`, `S75A-P18`, and the five owned P07 acceptance
  nodes from the immutable Section 7.5A registry.
- Add a silent offline verifier and adversarial tests for canonicalization,
  ownership, privacy, interval completeness, authentication, and fail-closed
  decisions.
- Keep audit mapping, replay retention, persistence, attempt semantics, runtime
  SUT work, GCP, credentials, provisioning, deployment, qualification, and model
  execution out of scope.

## Impact

- Affected specs: `gcp-section-7-5-2-network-local-enforcement`
- Affected code: docs contract package, offline verifier, focused tests, queue
  status, and progress record only
- Terminal structural decision:
  `GCP_SECTION_7_5_2_NETWORK_LOCAL_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD`
- Provider conflict, parent mismatch, privacy violation, or ownership expansion
  prevents closure.

# Change: Add the GCP canonical runtime object and hash contract

## Why

The merged Section 7.1 provider vocabulary freezes GCP C3/TDX names and evidence, but later trust, attestation, ledger, integration, and qualification contracts still need one deterministic runtime-object boundary. Without a closed Section 7.2 schema, control-plane fields, instance fields, canonical bytes, and downstream hash dependencies can drift or self-authorize.

The user explicitly authorized this bounded Section 7.2 continuation from merged PR #438. This proposal records that approved scope and its held-runtime posture; it does not authorize any GCP or runtime action.

## What Changes

- Add a docs-only canonical runtime object contract with separate deterministic-profile and restricted per-instance observation registries.
- Classify every frozen Compute field and fail closed on unknown, secret, unconstrained host/topology, raw metadata, and noncanonical identity material.
- Define strict canonical JSON, domain-separated SHA-256 preimages, an acyclic four-node Section 7.2 graph, golden vectors, and exact-byte evidence pins.
- Attach fresh, replayable `EXACT_MAPPING_RECONFIRMED` evidence for the exact Section 7.1 vocabulary.
- Define visibility/sufficiency posture, chronology, requalification, escalation, privacy, and nonauthorization requirements.
- Add an offline verifier and focused mutation/regression tests.

## Impact

- Affected specs: new `gcp-canonical-runtime-object` capability.
- Affected code and docs:
  - `docs/contracts/canonical-inference-gcp-runtime-object/`
  - `docs/contracts/canonical-inference-gcp-runtime-candidate/README.md`
  - `scripts/verify_gcp_runtime_object_revalidation.py`
  - `tests/test_gcp_runtime_object_contract.py`
  - `ATTRIBUTION.md`
- Runtime impact: none. Runtime authority remains held and identity remains insufficient without later Sections 7.3–7.8, qualification evidence, and fresh execution authorization.
- External impact: none. No GCP access, credentials, billing, provisioning, deployment, qualification, model execution, or customer data.

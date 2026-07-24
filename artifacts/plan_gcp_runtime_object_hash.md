# Plan — GCP canonical runtime object and hash contract (Section 7.2)

## Bound

Implement only Section 7.2 of `docs/contracts/canonical-inference-gcp-runtime-candidate/README.md` from merged PR #438 (`c9a63a71084562cc3c5cb2e7c91dcb7bd1712331`).

## Acceptance

1. Attach fresh `EXACT_MAPPING_RECONFIRMED` public-document evidence for the exact Section 7.1 vocabulary without mutating its historical artifacts.
2. Define a closed deterministic numerical-profile field inventory and a separate restricted per-instance/per-boot observation inventory.
3. Define a total runtime projection for all 257 Section 7.1 Compute paths, with prohibited/default-deny material rejected and raw restricted values never retained.
4. Freeze strict canonical JSON bytes, domain-separated SHA-256 preimages, an acyclic dependency graph, and golden synthetic vectors.
5. Record visibility and field-binding sufficiency independently; provider-hidden fields cannot self-promote.
6. Define total contract decisions, runtime-identity posture, mandatory invalidation/requalification triggers, and fixed-physical escalation.
7. Keep runtime authority, GCP resource access, provisioning, deployment, qualification, model execution, customer input/output, Sections 7.3–7.8, and held VBD work out of scope.
8. Verify with focused tests, repository governance/Harness checks, and exact-candidate CODE/BUG/ADVERSARIAL reviews.

## Expected artifacts

- `docs/contracts/canonical-inference-gcp-runtime-object/README.md`
- `docs/contracts/canonical-inference-gcp-runtime-object/runtime-object-contract.json`
- `docs/contracts/canonical-inference-gcp-runtime-object/control-plane-projection.json`
- `docs/contracts/canonical-inference-gcp-runtime-object/provider-revalidation.json`
- `docs/contracts/canonical-inference-gcp-runtime-object/canonicalization-vectors.json`
- `scripts/verify_gcp_runtime_object_revalidation.py`
- `tests/test_gcp_runtime_object_contract.py`
- Link-only update to the Section 7.2 candidate contract

No runtime service code, infrastructure configuration, credentials, or external mutation is included.

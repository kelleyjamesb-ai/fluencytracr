# Change: Add the GCP attestation and receipt-verification contract

## Why

Sections 7.1–7.3 close provider vocabulary, runtime-object identity, and security authority while deliberately leaving attestation verification, receipt signature preimages, signer acceptance, freshness, and consumer verification undefined. Without one closed Section 7.4 interface, independently valid token, quote, result, and HSM signature objects can be spliced across boots, instances, attempts, channels, or result bodies.

Public-source preflight identifies a source-code-only direct-quote candidate in the current open-source Confidential Space launcher: `/v1/evidence` accepts a workload challenge and returns TDX quote plus CCEL/CEL evidence, with quote report data derived by an exact nested SHA-512 construction. The capability is experiment-gated and is not treated as production-approved. Section 7.4 can therefore close the required shape while keeping every capability and runtime approval empty.

## What Changes

- Add a docs-only Section 7.4 contract for a verifier-specific Google Cloud Attestation OIDC identity token, exact RS256/JWKS trust policy, fixed custom audience, compiled challenge/freshness policy, and closed claim projection.
- Define a measured nonrelaying in-workload attestation binder plus pre-execution and terminal TDX evidence requests whose report data directly binds one uninterrupted locally terminated TLS-exporter channel, the Section 7.2 runtime identity, numerical body, attempt, semantic result or failure, execution nonce, runtime measurement, receipt body, and signature statement.
- Classify the launcher endpoint as `SOURCE_CODE_INTERFACE_TEST_ONLY_RUNTIME_CAPABILITY_UNOBSERVED`: missing source, unobserved/default-disabled capability, image drift, or missing verifier/collateral approval holds. Downstream fixed-physical escalation remains outside Section 7.4 and reuses only the parent triggers: inherited treatment `REJECTED`, a required field `UNBINDABLE`, or qualification exactness `MISMATCH`; inherited conflict retains the parent provider-conflict outcome, while a new reviewed Section 7.4 contradiction uses the distinct local source-conflict outcome for Section 7.7 reconciliation.
- Define disjoint completed-execution and operational-failure receipt bodies, an acyclic domain-separated hash graph, exact Cloud HSM `EC_SIGN_P256_SHA256` digest handling, strict ECDSA normalization, bounded signer acceptance, and expected-context consumer verification.
- Require an opaque downstream pre-execution acceptance and terminal-proof interface while leaving reservation, consumption, crash recovery, and retry mechanics exclusively to Section 7.6; require exact audit-field mapping while acknowledging that public Cloud Audit documentation does not establish digest/attempt fields in an `AsymmetricSign` event.
- Add offline provider/source replay, deterministic synthetic vectors, fail-closed validators, adversarial tests, and exact-tree review.

## Impact

- Affected spec: `gcp-attestation-receipt`
- New contract: `docs/contracts/canonical-inference-gcp-attestation-receipt/`
- New offline validation: `scripts/gcp_attestation_receipt_contract_validation.py`, `scripts/verify_gcp_attestation_receipt_contract.py`, and `scripts/verify_gcp_attestation_receipt_revalidation.py`
- New tests: `tests/test_gcp_attestation_receipt_contract.py`
- Source attribution: `ATTRIBUTION.md`
- Status only: `.project/WORK_QUEUE.json` and `.project/PROGRESS.md`

## Non-Authorization

This change does not obtain or validate a live token, JWKS, quote, collateral, key, signature, receipt, audit event, runtime, or GCP resource. It authorizes no credentials, signing, deployment, persistence, qualification, model execution, customer/live data, or Sections 7.5–7.8 work. Runtime authority remains held even when every synthetic vector passes.

# Canonical GCP Attestation and Receipt-Verification Contract (Section 7.4)

Status: **`GCP_ATTESTATION_RECEIPT_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD`**.

This docs-only contract closes the canonical Section 7.4 attestation and receipt-verification shape for the software-agnostic canonical inference service. It does not authorize GCP access, credentials, signing, deployment, persistence, qualification, model execution, or any Section 7.5–7.8 implementation.

## Artifacts

- `attestation-receipt-contract.json` — normalized hash graph, selectors, replay kinds, decisions, privacy, future interfaces, and empty approvals.
- `provider-source-evidence.json` — exact public documentation and immutable Git source registry.
- `provider-revalidation.json` — checked-in source closure; never a live challenge-bound revalidation instance.
- `canonicalization-vectors.json` — deterministic synthetic vectors only.
- External restricted source bundle: `external-recovery://fluencytracr/gcp-attestation-receipt-source-snapshot-20260726T072745Z.zip` (`6f7ea9cb42afba261f859a257d879a088ed0ab473756a1994ba941be13b3204a`, 2295351 bytes).

## Closed security properties

1. Custom OIDC identity, pre-execution TDX evidence, terminal TDX evidence, and Cloud HSM signature roles remain purpose-separated.
2. One 32-byte challenge produces one 43-byte unpadded base64url wire value and one uninterrupted TLS 1.3 exporter lineage.
3. The selected launcher endpoint is source-code/test-only and runtime-unobserved. Nil `extraData` is distinct from present-empty.
4. Pre/terminal evidence is phase-typed, quote-verifier identity is approved before challenge, and attestation-key/platform/PCK/MRTD/RTMR continuity is exact.
5. Completed and operational-failure receipts are disjoint, null-free, and tied to authenticated expected-versus-actual context.
6. The KMS statement uses `EC_SIGN_P256_SHA256`, exact version `1`, one digest, CRC/name/HSM checks, strict DER, and deterministic low-S normalization.
7. Replay is exact-set, challenge-bound, verifier-identity-bound, and cannot use checkout or digest-only fallback. Canonical numerical-body/model/plan bytes are restricted replay evidence.
8. Every approval registry is empty. Structural success therefore maps live admission to `HOLD_FOR_ATTESTATION_VERIFIER_UNCLOSED`.
9. Every Section 7.4 object and composition is nonauthorizing. Nonverified results block retry and leave reservation/consumption semantics exclusively to Section 7.6.

## Provider-source conclusions

- The reviewed launcher source exposes experiment-gated `POST /v1/evidence`, passes nil `extraData`, and has exact nested TDX SHA-512 report-data semantics.
- Source-code existence and packaged experiment configuration do not prove selected-image or runtime availability.
- The generic proto formula remains non-applicable only under the exact reviewed nil endpoint path; a reviewed same-layer contradiction is a distinct reject.
- The reviewed TDX library has permissive defaults; this contract requires explicit roots, collateral, CRL, TCB, expected report data, and measurements.
- Full CCEL replay remains held until a separately authenticated table source/interface is approved.
- Cloud Audit documentation supports bounded method/resource/principal/time/status mapping, not digest/attempt/same-boot proof.

## Verify

```bash
python3 scripts/verify_gcp_attestation_receipt_contract.py
python3 scripts/verify_gcp_attestation_receipt_revalidation.py ~/.glean/recovery/fluencytracr/gcp-attestation-receipt-source-snapshot-20260726T072745Z.zip
python3 -m pytest -q tests/test_gcp_attestation_receipt_contract.py
OPENSPEC_TELEMETRY=0 npx openspec validate add-gcp-attestation-receipt-contract --strict
```

Expected closed result:

```text
GCP_ATTESTATION_RECEIPT_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD
```

## Ownership

- Section 7.4 owns token/quote verification, nonce/freshness, receipt/signature preimages, signer acceptance, replay verification, and consumer verification.
- Section 7.5 owns actual network, transport, trust distribution, audit collection, storage, retention, disk, and persistence implementation.
- Section 7.6 owns durable attempts, ledgers, ordering, completeness, terminal/retry precedence, and authority mutation.
- Section 7.7 owns whole-system reconciliation.
- Section 7.8 owns qualification plan/result preimages and exact qualification execution after 7.7 GO and fresh authorization.

## Privacy and authority

The external bundle contains public source bytes and can include public example identifiers; it is not committed and cannot enter runtime objects or outputs. Raw tokens, quotes, logs, identities, certificates, keys, signatures, results, and canonical model/plan definition bytes remain restricted. Hashes are consistency commitments, not anonymization or authenticity. Runtime authority remains held.

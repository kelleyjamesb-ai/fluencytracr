# Design: GCP attestation and receipt verification

## Context

Section 7.2 requires a per-boot binding of the stable runtime profile, control/instance observation, raw attestation-token hash, last-start time, observation point, boot epoch, and nonce. Section 7.3 defines a generation-specific Cloud HSM receipt key and direct WIF authority, but every live approval list is empty. The parent architecture requires a workload-sealed signer or a hardware quote directly binding the numerical body, attempt, result when present, execution nonce, and runtime measurement. The remote HSM key is secondary and is not workload-sealed.

Public evidence identifies a candidate direct-quote interface without proving production availability. In repository `google/go-tpm-tools` at commit `f6ae2007b74b38db68bb9b7d3c2a9e5378366fbe`, the Confidential Space launcher exposes experiment-gated `POST /v1/evidence`; the launcher/agent modules pin `GoogleCloudPlatform/confidential-space` commit `db25840c8cf6740cf26d286070077e7071631caf` and `google/go-tdx-guest` commit `ffb0869e6f4d355dd34ccfdff8e989c94cf7a59b`; exact path/blob commitments remain a task 1.2 gate. At the selected launcher commit, that handler passes `extraData=nil`, and the executable agent plus its tests compute TDX report data as `SHA512("WORKLOAD_ATTESTATION" || SHA512(challenge))`. The generic proto comment describes `SHA512("WORKLOAD_ATTESTATION" || SHA512(challenge || SHA512(extra_data)))`. Section 7.4 compile-pins and discloses this nil-versus-present-empty discrepancy. Its provisional applicability classification is `GENERIC_PROTO_SCHEMA_COMMENT_NOT_EXECUTABLE_ENDPOINT_SEMANTICS`, because the endpoint handler passes nil and executable tests cover the nil branch. Task 1.2 must prove that classification from exact transitive source paths/blobs before the tested executable path can enter contract vectors. Missing/unreplayable bytes or incomplete applicability review are `SOURCE_APPLICABILITY_UNREVIEWED`: compilation holds and live R4 source-unavailable applies. Only a completed review establishing a same-layer contradiction is `SOURCE_REVIEWED_SAME_LAYER_CONTRADICTION` and live R2 local source-conflict rejection (or inherited provider conflict when independently present). A completed non-applicability proof plus matched executable path is `SOURCE_REVIEWED_NON_APPLICABLE_GENERIC_COMMENT_EXECUTABLE_PATH_MATCHED`; capability remains runtime-unobserved. Runtime observation cannot erase a reviewed contradiction. The endpoint returns the raw TDX quote plus CCEL boot and CEL launcher event logs. Google documentation separately establishes configfs TDX quote retrieval, Google Cloud Attestation token claims, custom nonces, and TLS-exporter channel binding. Its exact status is `SOURCE_CODE_INTERFACE_TEST_ONLY_RUNTIME_CAPABILITY_UNOBSERVED`, not runtime observation or approval.

## Decisions

### 1. Four purpose-separated proofs

1. A custom-audience Google Cloud Attestation OIDC token proves provider-signed Confidential Space identity claims.
2. A pre-execution TDX quote from launcher `/v1/evidence` directly binds the verifier challenge, TLS-exporter channel, inherited runtime identity, attempt, and complete pre-execution measurement manifest.
3. A terminal TDX quote from the same uninterrupted TLS session directly binds the pre-quote verification, numerical body, attempt, semantic result or operational failure, execution nonce, runtime measurement, receipt body, and signature statement.
4. The Section 7.3 Cloud HSM key signs that exact statement as secondary evidence. The STS-audience WIF token authorizes KMS and is never accepted as verifier identity evidence.

Section 7.4 v1 rejects PKI/ITA/AWS token modes, fallback, token-controlled key URLs, vTPM quote substitution, and any composition missing either approved TDX verification record. The `/v1/evidence` experiment flag and exact launcher image/commit are mandatory capability evidence but remain absent from runtime approvals.

A measured `ATTESTATION_BINDER_V1` component inside the single Confidential Space workload process is part of the approved image/runtime measurement. It terminates the relying-party TLS session itself, derives the exporter locally, validates expected context, computes quote challenges only from local state, sequences both local Unix-socket evidence requests, and never accepts a quote challenge from an external caller.

Before a quote request, the verifier and binder use only reviewed static expectations:

```text
binder_measurement_policy_hash = SHA256("FLUENCYTRACR:GCP_BINDER_MEASUREMENT_POLICY:V1" || 0x00 || canonical({
  cel_event_schema_hash, expected_cel_event_ordinal, expected_cel_event_type,
  expected_mapped_rtmr_index, replay_algorithm_id
}))
expected_binder_measurement_hash = SHA256("FLUENCYTRACR:GCP_EXPECTED_BINDER_MEASUREMENT:V1" || 0x00 || canonical({
  approved_binder_manifest_hash, binder_executable_sha256,
  approved_container_image_digest, binder_measurement_policy_hash
}))
```

After each quote response, the verifier—not the caller—derives:

```text
pre_binder_measurement_verification_hash = SHA256("FLUENCYTRACR:GCP_PRE_BINDER_MEASUREMENT_VERIFICATION:V1" || 0x00 || canonical({
  expected_binder_measurement_hash, pre_observed_cel_event_ordinal,
  pre_observed_cel_event_type, pre_observed_cel_event_payload_sha384,
  pre_observed_mapped_rtmr_index, pre_quoted_rtmr_value,
  pre_replayed_rtmr_value, pre_cel_replay_transcript_hash,
  exact_expected_mapping_match: true, quoted_replayed_rtmr_match: true
}))
terminal_binder_measurement_verification_hash = SHA256("FLUENCYTRACR:GCP_TERMINAL_BINDER_MEASUREMENT_VERIFICATION:V1" || 0x00 || canonical({
  expected_binder_measurement_hash, terminal_observed_cel_event_ordinal,
  terminal_observed_cel_event_type, terminal_observed_cel_event_payload_sha384,
  terminal_observed_mapped_rtmr_index, terminal_quoted_rtmr_value,
  terminal_replayed_rtmr_value, terminal_cel_replay_transcript_hash,
  exact_expected_mapping_match: true, quoted_replayed_rtmr_match: true
}))
```

The source registry pins the CEL payload schema/event-to-manifest derivation, event/RTMR mapping, and approved manifest bytes. Replay must prove the observed event payload encodes the exact approved binder executable/manifest/image commitments, not merely co-locate them. Mutating or omitting any field rejects. Caller-supplied binder identity rejects. External TLS termination, proxy/sidecar possession of exporter bytes, challenge forwarding, arbitrary child/local processes, dynamic code, and quote relay are prohibited. The Section 7.5 contract must close the implementation-ready single-process/channel/egress interface; actual enforcement implementation remains held until Section 7.7 GO, the Section 7.8 qualification plan passes, and a separate action is freshly authorized. Until that contract interface is approved, same-boot admission holds. The endpoint's permissive socket mode is never treated as caller authentication.

### 2. Closed OIDC and trust-snapshot policy

The exact audience is `urn:fluencytracr:canonical-inference:gcp-attestation-verifier:v1`; STS audience rejects. Header policy is `alg=RS256`, exactly one `kid`, and no `x5c`, `jku`, `jwk`, `x5u`, `crit`, `b64`, duplicate, or unknown header. Verification uses the original compact-JWS signing input.

Discovery origin/URL, redirect prohibition, JWKS URL, exact response hashes, selected `kid`, RSA parameters, and SPKI hash are Section 7.4 registry values. `trust_snapshot_hash` binds those exact bytes and selected key. `observed_at` is verifier-assigned only on authenticated retrieval; the restricted retrieval evidence reference binds URL, bytes, TLS provenance, retrieval bounds, and cache metadata.

Section 7.4 accepts a future Section 7.5 trust-distribution/anti-rollback record only when an exact separately approved Section 7.5 contract proves all of these predicates for this exact `trust_snapshot_hash`: authenticated current registry head; strict monotonic predecessor lineage; shared linearizable check-and-use; independent nonrollbackable external anchoring; stale-reader rejection; whole-state-restore detection; and fail-closed before/after-commit recovery. Section 7.5 owns that record's schema, signature/key policy, storage receipt, concurrency protocol, and lifecycle. Section 7.4 assigns `section_7_5_trust_record_verified_at` from its approved UTC clock and binds:

```text
trust_distribution_acceptance_hash = SHA256("FLUENCYTRACR:GCP_TRUST_DISTRIBUTION_ACCEPTANCE:V1" || 0x00 || canonical({
  trust_snapshot_hash, opaque_section_7_5_trust_record_hash,
  record_bound_trust_snapshot_hash,
  trust_record_authentication_verification_hash,
  trust_current_head_and_rollback_verification_hash,
  exact_target_hash_match: true, approved_section_7_5_contract_hash,
  section_7_5_trust_record_verified_at, section_7_5_status: "VERIFIED"
}))
```

Missing contract/approval/evidence, snapshot mismatch, re-dating, rollback, or unapproved key holds. Impossibility remains HOLD or informs Section 7.7 `parent_treatment_decision`; `UNBINDABLE` is legal only when a parent-owned process names an exact existing Section 7.2 field ID and binding proof. Section 7.4 cannot create or overload a field. Approval lists remain empty.

### 3. One channel and one nonce lineage

Section 7.4 defines but does not deploy a TLS 1.3 channel interface. It prohibits 0-RTT, resumption, reconnect, renegotiation, and exporter reuse. Both peers derive exactly 32 bytes with exporter label `EXPORTER-FluencyTracr-GCP-Attestation-V1`, empty context, and length 32. Section 7.5 must close and approve the channel contract/interface; actual implementation remains held until Section 7.7 GO, the Section 7.8 qualification plan passes, and a separate action receives fresh authorization.

The verifier issues one 32-byte CSPRNG `challenge_secret`, rendered as 43 unpadded base64url ASCII/UTF-8 bytes. Before issuance, an independently authenticated `expected_request_context_record_hash` binds a closed `expected_request_context_projection_hash` over expected tenant commitment, numerical body, runtime profile, source/image/model/plan, signer generation/policy, trust policy, result contract, and a nonempty ASCII-sorted unique subset of `{COMPLETED_EXECUTION, OPERATIONAL_FAILURE}`—but never an actual future result/failure hash. After terminal commitment, a separate independently authenticated `terminal_observation_record_hash` binds the accepted expected-request lineage, `parent_attempt_envelope_hash`, actual terminal variant, and exact result-or-failure hash. It excludes Section 7.4 cryptographic-verification, Section 7.6 terminal-proof, and final-consumer-acceptance hashes. Expected-request and terminal-observation records remain opaque; future Section 7.6 owns their schemas, producer/key policy, freshness/single-use lifecycle, and durable lineage, while Section 7.4 owns only the exact acceptance wrappers. Approval lists remain empty.

Section 7.4 does not redefine the parent's per-attempt security envelope. Before challenge issuance it requires an opaque pre-execution acceptance record from a separately approved Section 7.6 contract. That contract must verify the parent envelope's numerical-body hash, signed initial/retry-token hash, admission lineage, monotonic attempt/retry ordinal, authenticated tenant commitment, active runtime, single-use attempt claim, and anti-replay write-ahead semantics. Section 7.6 owns that schema and ordinal. Section 7.4 binds only:

```text
pre_ledger_request_context_hash = SHA256("FLUENCYTRACR:GCP_PRE_LEDGER_REQUEST_CONTEXT:V1" || 0x00 || canonical({
  expected_request_context_record_hash, numerical_body_hash,
  numerical_body_model_plan_projection_verification_hash,
  keyed_tenant_commitment, challenge_secret_sha256: SHA256(challenge_secret)
}))
pre_execution_attempt_acceptance_hash = SHA256("FLUENCYTRACR:GCP_PRE_EXECUTION_ATTEMPT_ACCEPTANCE:V1" || 0x00 || canonical({
  pre_ledger_request_context_hash, parent_attempt_envelope_hash,
  opaque_section_7_6_pre_execution_record_hash,
  record_bound_pre_ledger_request_context_hash,
  record_bound_parent_attempt_envelope_hash,
  single_use_attempt_claim, record_bound_single_use_attempt_claim,
  section_7_6_record_authentication_verification_hash,
  section_7_6_record_freshness_hash, opaque_pre_execution_record_single_use_verification_hash,
  pre_execution_request_context_exact_match: true,
  pre_execution_parent_attempt_exact_match: true,
  pre_execution_single_use_attempt_claim_exact_match: true,
  approved_section_7_6_contract_hash,
  section_7_4_opaque_pre_execution_record_acceptance: "PASS"
}))
```

A later Section 7.6 terminal proof may reference this pre-execution record and the Section 7.4 cryptographic hash without a back-edge. Missing approval/record holds. The binder computes:

```text
channel_enforcement_policy_hash = SHA256("FLUENCYTRACR:GCP_CHANNEL_ENFORCEMENT_POLICY:V1" || 0x00 || canonical({
  binder_measurement_policy_hash, approved_single_process_policy_hash,
  approved_egress_policy_hash, approved_tls_policy_hash
}))
channel_binding_commitment = SHA256("FLUENCYTRACR:GCP_CHANNEL_BINDING:V1" || 0x00 || canonical({
  tls_version: "TLS1.3",
  exporter_label: "EXPORTER-FluencyTracr-GCP-Attestation-V1",
  exporter_context_sha256: SHA256(empty_bytes),
  exporter_length: 32,
  exporter_secret_sha256: SHA256(tls_exporter_32),
  expected_binder_measurement_hash,
  channel_enforcement_policy_hash
}))
channel_enforcement_context_hash = SHA256("FLUENCYTRACR:GCP_CHANNEL_ENFORCEMENT_CONTEXT:V1" || 0x00 || canonical({
  channel_binding_commitment, expected_binder_measurement_hash,
  runtime_profile_hash, runtime_instance_observation_hash,
  approved_single_process_policy_hash, approved_egress_policy_hash
}))
channel_enforcement_acceptance_hash = SHA256("FLUENCYTRACR:GCP_CHANNEL_ENFORCEMENT_ACCEPTANCE:V1" || 0x00 || canonical({
  channel_enforcement_context_hash, boot_epoch_commitment,
  expected_binder_measurement_hash,
  pre_execution_quote_verification_hash, terminal_quote_verification_hash,
  kms_sign_request_hash, kms_sign_wire_request_hash,
  kms_sign_transport_acceptance_hash,
  authorization_context_commitment_hash,
  sign_requested_at, sign_sent_at,
  opaque_section_7_5_enforcement_record_hash,
  record_bound_channel_enforcement_context_hash,
  record_bound_boot_epoch_commitment,
  record_bound_expected_binder_measurement_hash,
  record_bound_kms_sign_request_hash,
  record_bound_kms_sign_wire_request_hash,
  record_bound_authorization_context_commitment_hash,
  record_bound_sign_requested_at, record_bound_sign_sent_at,
  enforcement_record_authentication_verification_hash,
  enforcement_full_interval_coverage_verification_hash,
  exact_target_hash_match: true,
  measured_binder_owned_tls_and_kms_send: true,
  no_relayer_or_other_process_sent_kms_request: true,
  approved_section_7_5_contract_hash, section_7_5_status: "VERIFIED"
}))
challenge_context_hash = SHA256("FLUENCYTRACR:GCP_CHALLENGE_CONTEXT:V1" || 0x00 || canonical({
  challenge_secret_sha256: SHA256(challenge_secret),
  parent_attempt_envelope_hash, pre_execution_attempt_acceptance_hash,
  expected_signer_generation, expected_request_context_projection_hash,
  expected_request_context_record_hash, expected_request_acceptance_hash,
  numerical_body_model_plan_projection_verification_hash,
  active_expected_request_lineage_verification_hash,
  channel_binding_commitment
}))
```

Every wire nonce is the unpadded base64url rendering of an exact 32-byte digest and is therefore 43 bytes:

```text
channel_nonce = B64U(SHA256("FLUENCYTRACR:GCP_CHANNEL_NONCE:V1" || 0x00 || tls_exporter_32))
context_nonce = B64U(SHA256("FLUENCYTRACR:GCP_CONTEXT_NONCE:V1" || 0x00 || challenge_context_hash))
execution_nonce = B64U(SHA256("FLUENCYTRACR:GCP_EXECUTION_NONCE:V1" || 0x00 || canonical({
  challenge_secret_sha256: SHA256(challenge_secret), channel_binding_commitment,
  pre_execution_quote_verification_hash, boot_epoch_commitment,
  parent_attempt_envelope_hash, pre_execution_attempt_acceptance_hash
})))
```

The custom OIDC request and returned `eat_nonce` are exactly the ordered three-string array `[challenge_secret_wire, channel_nonce, context_nonce]`; string form, another order/count, duplicates, or extras reject. The source pages state 8–88 bytes for the token claim and 10–74 bytes for the custom request. These apply to the same custom-token nonces; 43 bytes is inside both. Neither range becomes a tunable contract threshold.

The exact 64-byte quote challenges are:

```text
pre_quote_binding_hash = SHA512("FLUENCYTRACR:GCP_PRE_QUOTE_BINDING:V1" || 0x00 || canonical({
  challenge_context_hash, channel_binding_commitment,
  pre_attestation_token_verification_hash, runtime_profile_hash,
  runtime_instance_observation_hash, parent_attempt_envelope_hash,
  pre_execution_attempt_acceptance_hash,
  runtime_measurement_manifest_hash, expected_binder_measurement_hash,
  channel_enforcement_context_hash
}))
completed_terminal_quote_binding_hash = SHA512("FLUENCYTRACR:GCP_COMPLETED_TERMINAL_QUOTE_BINDING:V1" || 0x00 || canonical({
  pre_execution_quote_verification_hash, boot_epoch_commitment,
  channel_binding_commitment, numerical_body_hash, parent_attempt_envelope_hash,
  pre_execution_attempt_acceptance_hash, variant: "COMPLETED_EXECUTION",
  semantic_result_hash, execution_nonce, runtime_measurement_hash,
  completed_receipt_body_hash, signature_statement_hash,
  expected_binder_measurement_hash, pre_binder_measurement_verification_hash,
  channel_enforcement_context_hash
}))
operational_failure_terminal_quote_binding_hash = SHA512("FLUENCYTRACR:GCP_OPERATIONAL_FAILURE_TERMINAL_QUOTE_BINDING:V1" || 0x00 || canonical({
  pre_execution_quote_verification_hash, boot_epoch_commitment,
  channel_binding_commitment, numerical_body_hash, parent_attempt_envelope_hash,
  pre_execution_attempt_acceptance_hash, variant: "OPERATIONAL_FAILURE",
  operational_failure_body_hash, execution_nonce, runtime_measurement_hash,
  operational_failure_receipt_body_hash, signature_statement_hash,
  expected_binder_measurement_hash, pre_binder_measurement_verification_hash,
  channel_enforcement_context_hash
}))
terminal_quote_binding_hash = EXACTLY_ONE(completed_terminal_quote_binding_hash,
  operational_failure_terminal_quote_binding_hash)
```

Exactly one variant object is present; the other variant's fields are omitted. Every `null` rejects under inherited canonicalization. For the selected nil-extra-data endpoint, the launcher report data is `SHA512("WORKLOAD_ATTESTATION" || SHA512(quote_binding_hash))`. Present-empty `extra_data`, the generic proto-comment formula, another label, or another challenge rejects. Cross-nonce/channel substitution rejects.

### 4. Freshness and same-boot proof

Compiled constants are: challenge/attempt lifetime 300 seconds, token maximum age 300 seconds, trust snapshot maximum age 300 seconds, and clock skew 0 seconds. An approved trusted UTC-clock policy is required. Exact inequalities are:

```text
challenge_issued_at <= pre_token_iat
trust_snapshot_observed_at <= section_7_5_trust_record_verified_at <= pre_token_verified_at
pre_token_iat <= pre_token_verified_at <= pre_quote_request_sent_at <= pre_quote_response_received_at <= pre_quote_verified_at
pre_quote_verified_at <= execution_started_at <= result_or_failure_committed_at
execution_ended_at == result_or_failure_committed_at
result_or_failure_committed_at <= terminal_observation_accepted_at <= terminal_quote_request_sent_at
terminal_quote_request_sent_at <= terminal_quote_response_received_at <= terminal_quote_verified_at
terminal_quote_verified_at <= sign_requested_at <= sign_sent_at <= sign_response_verified_at
pre_token_verified_at < challenge_expires_at
pre_quote_verified_at < challenge_expires_at
sign_response_verified_at < challenge_expires_at
challenge_expires_at - challenge_issued_at == 300
pre_token_nbf <= pre_token_iat <= pre_token_verified_at < pre_token_exp
pre_token_verified_at - pre_token_iat <= 300
0 <= pre_token_verified_at - trust_snapshot_observed_at <= 300
```

Section 7.4 defines only causal acceptance edges that a future Section 7.6 contract must prove: expected request before challenge; token/trust acceptance before pre-quote verification; pre-quote verification and accepted opaque pre-execution proof before any result-capable operation; result/failure commitment before authenticated terminal-observation acceptance; terminal-observation acceptance before terminal-quote request/verification; terminal quote before signing; signing before audit/enforcement acceptance; Section 7.4 cryptographic verification before its verified live disposition, and that disposition before Section 7.6 terminal proof; and Section 7.6 proof before final consumer acceptance. Section 7.4 defines no ledger enum, ordinal, durable record schema, completeness algorithm, retry rule, or failed-path terminal schema. Section 7.6 exclusively owns those mechanics and must prove no omission, duplication, reorder, resume, or caller-selected path. Section 7.4 emits `section_7_4_cryptographic_verification_hash` without consuming Section 7.6 proof; final consumer acceptance is not a ledger input.

Both quote requests must bind the same expected binder commitment/channel-enforcement context, and both responses must independently produce matching successful binder-measurement verification records, runtime identity/measurements, quote attestation-key identity, and PCK-chain/platform identity; the terminal challenge includes the pre-verification hash. Integer-second timestamps may be equal, so the future Section 7.6 proof—not timestamp inequality alone—must prove the required causal edges. The security argument additionally depends on the measured binder deriving the exporter and challenges locally with no relay-capable egress. TLS loss, binder restart, reboot, reconnect, instance/profile drift, changed quote identity, or missing ordering forces Section 7.4 HOLD and leaves attempt/consumption classification exclusively to Section 7.6. A control observation may corroborate drift but is not the same-boot trust root. These conditions are explicit dependencies, not claims made by the raw quote endpoint itself.

### 5. Closed claims, quote verification, and privacy

Allowed token paths are closed and typed: issuer, audience, timestamps, exact nonce array, `attester_tcb`, TDX/Google OEM, production/debug/secure-boot/software state, singleton approved software version, instance/project/zone, container digest/ID/reference/restart posture, support attributes, disabled memory monitoring, and TDX TCB fields. They byte-match Section 7.2 evidence. Service-account, argv, environment, override, subject, and resource values are verified only in the restricted verifier and never retained in receipt/public artifacts.

Each quote verification record binds source-pinned launcher label/challenge construction, trusted-verifier request/response bounds, strict TDX quote parsing, report-data equality, PCK chain/trusted roots, Intel collateral and CRLs, TCB status/advisories, quote/collateral verification time, MRTD/RTMR values, CCEL/CEL raw hashes and replay transcript, `expected_binder_measurement_hash`, the phase-specific post-response `pre_binder_measurement_verification_hash` or `terminal_binder_measurement_verification_hash`, approved immutable binder/image manifest, channel-enforcement context, verifier binary hash, policy hash, outcome, and restricted evidence reference. A later `channel_enforcement_acceptance_hash` accepts only an opaque record verified under a separately approved Section 7.5 contract. Section 7.4 requires that future contract to prove, without workload self-assertion, an independently authenticated producer, role-separated signer/trust policy, anti-replay lifecycle, binder ownership of TLS establishment/exporter derivation, exact boot/exporter/binder/context binding, another-local-process exclusion, Unix-socket access control, no-relay egress, and full pre-channel-establishment through sign-send coverage. Section 7.5 owns the evidence schema and cryptography. Missing approval/evidence holds; impossibility remains HOLD or informs Section 7.7. `UNBINDABLE` requires an exact existing Section 7.2 field ID/binding proof and cannot be invented here. Missing source bytes, unobserved/default-disabled experimental capability, or absent approval holds. When current provider/source conflict is true, the provider-conflict outcome wins over every lower-priority local condition; parent boundary/privacy leakage remains first. Only downstream Section 7.7/7.8 integration, and only when no provider conflict applies, may fixed-physical escalation evaluate inherited `parent_treatment_decision == REJECTED`, a required field `UNBINDABLE`, or inherited `qualification_exactness == MISMATCH`. A selected-image absence/disablement remains HOLD unless a parent predicate is established. Present capability with missing verifier/collateral approval also holds.

Raw tokens, quotes, event logs, collateral, identities, KMS responses, signatures, audit logs, requests, and results remain restricted. Hashes are consistency commitments, not anonymization or public identifiers. No public receipt projection exists.

### 6. Acyclic hashes and boot commitment

Every node is `SHA256(ASCII_DOMAIN || 0x00 || FT_CANONICAL_JSON_V1(body))` unless an explicit SHA-512 quote-binding domain is named. Objects validate before hashing. Every Section 7.4 object is carried in a required adjacent envelope `non_authorizing_object_envelope_hash = SHA256("FLUENCYTRACR:GCP_SECTION_7_4_NONAUTHORIZING_OBJECT:V1" || 0x00 || canonical({object_kind, object_hash, authority_effect:"NONE"}))`; the envelope is metadata over the already computed object and creates no back-edge. The machine contract compile-pins a finite `section_7_4_object_kind_registry_hash` containing every object node ID exactly once after applying the exact metadata exclusion set `{SECTION_7_4_OBJECT_KIND_REGISTRY, SECTION_7_4_SELECTOR_REGISTRY, SECTION_7_4_COMPOSITION_REGISTRY, NON_AUTHORIZING_OBJECT_ENVELOPE, NON_AUTHORIZING_COMPOSITION_ENVELOPE}`. No other node may be excluded. `EXACTLY_ONE(...)` symbols are null-free aliases, not object/hash nodes: they are excluded from object/composition counts and resolve directly to the selected variant object/envelope. The composition universe is derived exhaustively and mechanically from the remaining node dependency graph: every non-envelope, non-selector node with two or more object-hash dependencies creates exactly one composition kind `<NODE_ID>_COMPOSITION`, whose component kinds are exactly those active direct object dependencies ASCII-sorted. The selector registry separately compile-pins every selector ID, discriminator, and allowed variant object kinds, and requires exactly one active variant. It also compile-pins one terminal-coherence group containing exactly the six terminal selectors `{terminal_quote_binding_hash, terminal_result_context_hash, actual_request_receipt_context_projection_hash, expected_to_actual_context_verification_hash, terminal_receipt_body_hash, terminal_result_binding_verification_hash}`; all six discriminators must equal one independently derived authoritative terminal variant. `section_7_4_composition_registry_hash` binds every derived entry plus compile-pinned object/composition counts; the verifier regenerates the registry from node definitions and rejects omission/addition/drift. Compositions use `non_authorizing_composition_envelope_hash = SHA256("FLUENCYTRACR:GCP_SECTION_7_4_NONAUTHORIZING_COMPOSITION:V1" || 0x00 || canonical({composition_kind, section_7_4_composition_registry_hash, ordered_component_envelope_hashes, authority_effect:"NONE"}))`; component envelopes are ASCII-sorted and must exactly match the registry projection. Only the five IDs in the exact metadata exclusion set form the non-recursive boundary and are not themselves enveloped or counted as object/composition nodes; every validator regenerates this same set literally. Missing, duplicate, unknown, extra, recursive, or non-NONE envelopes reject. Outcome strings never substitute for this metadata. Section 7.4 defines the Section 7.2-required restricted boot commitment after pre-token and pre-quote verification:

```text
boot_epoch_commitment = SHA256("FLUENCYTRACR:GCP_BOOT_EPOCH:V1" || 0x00 || canonical({
  runtime_profile_hash,
  runtime_instance_observation_hash,
  raw_attestation_token_sha256,
  pre_attestation_token_verification_hash,
  pre_execution_quote_verification_hash,
  channel_binding_commitment,
  challenge_context_hash,
  last_start_timestamp,
  observation_point
}))
inherited_provider_revalidation_set_hash = SHA256("FLUENCYTRACR:GCP_INHERITED_PROVIDER_REVALIDATION_SET:V1" || 0x00 || canonical({
  inherited_revalidation_challenge_hash,
  inherited_revalidation_challenge_issued_at,
  inherited_revalidation_challenge_expires_at,
  consuming_action_id, consuming_action_started_at,
  compile_pinned_expected_claim_source_keyset_hash,
  compile_pinned_expected_counts_by_owner,
  independently_generated_parent_registry_manifest_hash,
  observed_claim_source_keyset_hash, observed_counts_by_owner,
  expected_observed_keyset_and_counts_exact_match: true,
  ordered_claim_entries: [{owner_section, claim_id, source_id,
    claim_statement_sha256, expected_source_bytes_sha256,
    observed_source_bytes_sha256, authenticated_retrieval_evidence_hash,
    retrieval_started_at, retrieval_finished_at, revalidated_at,
    replay_procedure_hash, revalidation_verifier_binary_hash,
    observed_expected_comparison_hash,
    result: "EXACT_MAPPING_RECONFIRMED"}],
  ordered_source_entries: [{owner_section, source_id,
    expected_source_bytes_sha256, observed_source_bytes_sha256,
    authenticated_retrieval_evidence_hash,
    retrieval_started_at, retrieval_finished_at, revalidated_at,
    replay_procedure_hash, revalidation_verifier_binary_hash,
    observed_expected_comparison_hash,
    result: "EXACT_MAPPING_RECONFIRMED"}],
  claim_entry_count_by_owner, source_entry_count_by_owner,
  trusted_utc_clock_policy_hash,
  retrieval_to_revalidation_max_age_seconds: 300,
  revalidation_challenge_lifetime_seconds: 300,
  revalidation_finished_before_consuming_action: true,
  consuming_action_started_before_challenge_expiry: true,
  every_entry_bound_to_revalidation_challenge: true,
  every_entry_fresh_and_exact: true,
  exact_set_result: "PASS"
}))
section_7_4_provider_revalidation_hash = SHA256("FLUENCYTRACR:GCP_SECTION_7_4_PROVIDER_REVALIDATION:V1" || 0x00 || canonical({
  section_7_4_revalidation_challenge_hash,
  section_7_4_revalidation_challenge_issued_at,
  section_7_4_revalidation_challenge_expires_at,
  consuming_action_id, consuming_action_started_at,
  section_7_4_source_claim_registry_hash,
  compile_pinned_section_7_4_claim_source_keyset_hash,
  expected_observed_keyset_and_counts_exact_match: true,
  ordered_claim_results, ordered_source_results,
  authenticated_retrieval_evidence_set_hash,
  replay_procedure_hash, revalidation_verifier_binary_hash,
  applicability_classification_results,
  trusted_utc_clock_policy_hash,
  revalidation_challenge_lifetime_seconds: 300,
  revalidation_finished_before_consuming_action: true,
  consuming_action_started_before_challenge_expiry: true,
  every_entry_bound_to_revalidation_challenge: true,
  every_entry_fresh_and_exact: true,
  result: "EXACT_MAPPING_RECONFIRMED"
}))
dependency_set_hash = SHA256("FLUENCYTRACR:GCP_SECTION_7_1_7_3_DEPENDENCY_SET:V1" || 0x00 || canonical({
  ordered_entries: [{owner_section, repository_path, raw_file_sha256}],
  inherited_provider_revalidation_set_hash,
  section_7_4_provider_revalidation_hash
}))
```

Initial compile/live use instantiates both revalidation nodes with that consuming action's fresh challenge. Every replay instantiates a separate fresh pair from these exact schemas: `current_replay_inherited_provider_revalidation_set_hash` and `current_replay_section_7_4_provider_revalidation_hash` use `current_retention_verifier_challenge_hash`; later `replay_time_inherited_provider_revalidation_set_hash` and `replay_time_section_7_4_provider_revalidation_hash` use `final_retention_verifier_challenge_hash`. The first pair binds `consuming_action_id=CURRENT_SECTION_7_4_REPLAY`; the later pair binds `consuming_action_id=FINAL_CONSUMER_REPLAY`. Role prefixes are not relabeled node definitions, the action IDs are compile-pinned and disjoint, and a pair cannot be reused across replay actions. The exact dependency paths, sorted ASCII and each present once, are Section 7.1 `{README.md, claim-evidence.json, compute-field-projection.json, source-evidence.json}`, Section 7.2 `{README.md, canonicalization-vectors.json, control-plane-projection.json, provider-revalidation.json, runtime-object-contract.json}`, and Section 7.3 `{README.md, canonicalization-vectors.json, provider-revalidation.json, provider-source-evidence.json, role-capability-matrix.json, security-authority-contract.json}` under their canonical contract directories. Missing/extra/path-alias/hash mismatch rejects.

```text
model_hash = SHA256("FLUENCYTRACR:CANONICAL_INFERENCE_MODEL:V1" || 0x00 || canonical(canonical_model_definition))
execution_plan_hash = SHA256("FLUENCYTRACR:CANONICAL_INFERENCE_EXECUTION_PLAN:V1" || 0x00 || canonical(canonical_execution_plan))
recomputed_model_plan_sha256 = SHA256("FLUENCYTRACR:CANONICAL_INFERENCE_MODEL_PLAN:V1" || 0x00 || canonical({
  model_hash, execution_plan_hash
}))
numerical_body_model_plan_projection_verification_hash = SHA256("FLUENCYTRACR:GCP_NUMERICAL_BODY_MODEL_PLAN_PROJECTION:V1" || 0x00 || canonical({
  section_7_2_contract_hash, numerical_body_hash, runtime_profile_hash,
  numerical_body_bound_model_hash, numerical_body_bound_execution_plan_hash,
  model_hash, execution_plan_hash,
  runtime_profile_model_plan_sha256, recomputed_model_plan_sha256,
  numerical_body_model_exact_match: true,
  numerical_body_execution_plan_exact_match: true,
  inherited_runtime_profile_model_plan_exact_match: true,
  canonical_numerical_body_model_plan_definition_bytes_restricted_retained: true,
  public_projection: "PROHIBITED",
  outcome: "PASS"
}))
trust_policy_hash = SHA256("FLUENCYTRACR:GCP_TRUST_POLICY:V1" || 0x00 || canonical({
  runtime_profile_hash, security_authority_policy_hash,
  security_authority_evidence_snapshot_hash,
  attestation_trust_policy_hash, attestation_token_policy_hash,
  quote_verifier_policy_hash, channel_enforcement_policy_hash,
  trusted_utc_clock_policy_hash,
  section_7_4_source_claim_registry_hash,
  inherited_provider_revalidation_set_hash
}))
runtime_measurement_hash = SHA256("FLUENCYTRACR:GCP_RUNTIME_MEASUREMENT:V1" || 0x00 || canonical({
  runtime_profile_hash, runtime_instance_observation_hash,
  raw_attestation_token_sha256, last_start_timestamp, observation_point,
  boot_epoch_commitment, fresh_nonce,
  runtime_measurement_manifest_hash,
  pre_execution_quote_verification_hash,
  pre_binder_measurement_verification_hash
}))
attested_runtime_identity_hash = SHA256("FLUENCYTRACR:GCP_ATTESTED_RUNTIME_IDENTITY:V1" || 0x00 || canonical({
  runtime_profile_hash, runtime_instance_observation_hash,
  runtime_measurement_hash
}))
```

`runtime_instance_observation_hash` is the inherited Section 7.2 object and binds the structurally validated control-observation and raw-token hashes under Section 7.2's held external-evidence interface; it does not independently prove GCP issuance. Caller-supplied boot commitments reject. A new TLS session, token, quote, instance observation, start, or profile produces a different commitment.

```text
new sources -> section_7_4_provider_revalidation_hash -> attestation_trust_policy_hash
inherited sources/claims -> inherited_provider_revalidation_set_hash -> dependency_set_hash
pre-execution expected request + challenge secret + TLS exporter -> challenge_context_hash
raw token -> token verification record
challenge/token/runtime/attempt/channel -> pre_quote_binding_hash -> pre quote verification
pre verification + inherited instance observation -> boot_epoch_commitment
boot/challenge/channel/pre quote/attempt -> execution_nonce
pre quote + pre binder verification + boot + channel/enforcement + numerical_body_hash + parent_attempt_envelope_hash + pre-execution attempt acceptance + terminal variant/result-or-failure hash + execution_nonce + runtime_measurement_hash + receipt body + signature statement + expected binder -> terminal_quote_binding_hash -> terminal quote/binder verification
7.3 policy/evidence + key generation/version/SPKI -> receipt_signer_policy_hash
receipt body + signer policy + exact key context -> signature_statement_hash
signature_statement_hash (exact 32 bytes) -> KMS digest.sha256 -> raw signature
signature + KMS integrity + terminal quote + bounded audit mapping -> final_signer_acceptance_hash
token/quotes/binder/enforcement/signature/audit + expected request + terminal observation -> section_7_4_cryptographic_verification_hash
section_7_4_cryptographic_verification_hash + decision derivation -> verified_section_7_4_live_disposition_hash
verified Section 7.4 disposition + write-ahead lineage -> section_7_6_terminal_proof_hash
verified Section 7.4 disposition + authenticated Section 7.6 proof + independent resolver/replay records -> final_consumer_acceptance_hash
```

The Section 7.4-owned verification nodes are exact:

```text
token_freshness_verification_hash = SHA256("FLUENCYTRACR:GCP_TOKEN_FRESHNESS:V1" || 0x00 || canonical({
  challenge_issued_at, challenge_expires_at,
  trust_snapshot_observed_at, section_7_5_trust_record_verified_at,
  pre_token_iat, pre_token_nbf, pre_token_exp, pre_token_verified_at,
  trusted_utc_clock_policy_hash, token_inequality_set_hash,
  all_token_inequalities_pass: true
}))
pre_execution_quote_timeline_verification_hash = SHA256("FLUENCYTRACR:GCP_PRE_EXECUTION_QUOTE_TIMELINE:V1" || 0x00 || canonical({
  token_freshness_verification_hash, pre_quote_request_sent_at,
  pre_quote_response_received_at, pre_quote_verified_at,
  challenge_expires_at, trusted_utc_clock_policy_hash,
  pre_quote_inequality_set_hash, all_pre_quote_inequalities_pass: true
}))
receipt_timeline_commitment_hash = SHA256("FLUENCYTRACR:GCP_RECEIPT_TIMELINE:V1" || 0x00 || canonical({
  pre_execution_quote_timeline_verification_hash,
  execution_started_at, result_or_failure_committed_at, execution_ended_at,
  receipt_inequality_set_hash, all_receipt_inequalities_pass: true
}))
pre_sign_timeline_verification_hash = SHA256("FLUENCYTRACR:GCP_PRE_SIGN_TIMELINE:V1" || 0x00 || canonical({
  receipt_timeline_commitment_hash,
  terminal_observation_acceptance_hash, terminal_observation_accepted_at,
  terminal_quote_request_sent_at,
  terminal_quote_response_received_at, terminal_quote_verified_at,
  pre_sign_inequality_set_hash, all_pre_sign_inequalities_pass: true
}))
complete_timeline_verification_hash = SHA256("FLUENCYTRACR:GCP_COMPLETE_TIMELINE:V1" || 0x00 || canonical({
  pre_sign_timeline_verification_hash, sign_requested_at, sign_sent_at,
  sign_response_verified_at, challenge_expires_at,
  complete_inequality_set_hash, all_complete_inequalities_pass: true
}))
execution_identity_commitment_hash = SHA256("FLUENCYTRACR:GCP_EXECUTION_IDENTITY:V1" || 0x00 || canonical({
  boot_epoch_commitment, parent_attempt_envelope_hash,
  pre_execution_attempt_acceptance_hash, execution_nonce,
  expected_binder_measurement_hash, process_binary_manifest_hash,
  execution_started_at
}))
pre_attestation_token_verification_hash = SHA256("FLUENCYTRACR:GCP_TOKEN_VERIFICATION:V1" || 0x00 || canonical({
  raw_attestation_token_sha256, trust_snapshot_hash,
  trust_distribution_acceptance_hash, header_projection_hash,
  payload_projection_hash, challenge_context_hash, expected_audience,
  token_signature_verification_hash, claim_binding_verification_hash,
  token_freshness_verification_hash, attestation_token_policy_hash, outcome: "PASS"
}))
pre_quote_transport_acceptance_hash = SHA256("FLUENCYTRACR:GCP_PRE_QUOTE_TRANSPORT_ACCEPTANCE:V1" || 0x00 || canonical({
  pre_quote_request_hash, pre_quote_wire_request_hash,
  trust_distribution_acceptance_hash,
  opaque_pre_quote_section_7_5_transport_record_hash,
  pre_quote_record_recomputed_wire_request_hash,
  pre_quote_transport_record_authentication_verification_hash,
  pre_quote_transport_freshness_and_anti_replay_hash,
  exact_expected_wire_hash_match: true, approved_section_7_5_contract_hash,
  transport_status: "VERIFIED"
}))
terminal_quote_transport_acceptance_hash = SHA256("FLUENCYTRACR:GCP_TERMINAL_QUOTE_TRANSPORT_ACCEPTANCE:V1" || 0x00 || canonical({
  terminal_quote_request_hash, terminal_quote_wire_request_hash,
  trust_distribution_acceptance_hash,
  opaque_terminal_quote_section_7_5_transport_record_hash,
  terminal_quote_record_recomputed_wire_request_hash,
  terminal_quote_transport_record_authentication_verification_hash,
  terminal_quote_transport_freshness_and_anti_replay_hash,
  exact_expected_wire_hash_match: true, approved_section_7_5_contract_hash,
  transport_status: "VERIFIED"
}))
kms_sign_transport_acceptance_hash = SHA256("FLUENCYTRACR:GCP_KMS_SIGN_TRANSPORT_ACCEPTANCE:V1" || 0x00 || canonical({
  kms_sign_request_hash, kms_sign_wire_request_hash,
  trust_distribution_acceptance_hash,
  channel_enforcement_context_hash, boot_epoch_commitment,
  expected_binder_measurement_hash, authorization_context_commitment_hash,
  sign_sent_at,
  opaque_kms_sign_section_7_5_transport_record_hash,
  record_bound_channel_enforcement_context_hash,
  record_bound_boot_epoch_commitment,
  record_bound_expected_binder_measurement_hash,
  record_bound_authorization_context_commitment_hash,
  record_bound_sign_sent_at,
  kms_sign_record_recomputed_wire_request_hash,
  kms_sign_transport_record_authentication_verification_hash,
  kms_sign_transport_freshness_and_anti_replay_hash,
  exact_expected_wire_hash_match: true,
  exact_measured_context_match: true,
  approved_section_7_5_contract_hash,
  transport_status: "VERIFIED"
}))
pre_execution_quote_verification_hash = SHA256("FLUENCYTRACR:GCP_PRE_QUOTE_VERIFICATION:V1" || 0x00 || canonical({
  pre_quote_binding_hash, pre_quote_transport_acceptance_hash,
  pre_raw_tdx_quote_sha256, pre_expected_report_data_sha512, pre_observed_report_data_sha512,
  pre_pck_chain_hash, pre_trusted_root_set_hash, pre_collateral_snapshot_hash,
  pre_crl_snapshot_hash, pre_tcb_verification_hash, pre_mrtd_hash, pre_rtmr_map_hash,
  pre_ccel_sha256, pre_cel_sha256, pre_event_log_replay_transcript_hash,
  pre_quote_attestation_key_identity_hash, pre_platform_identity_hash,
  pre_binder_measurement_verification_hash,
  pre_execution_quote_timeline_verification_hash,
  pre_quote_verifier_binary_hash, pre_quote_verifier_policy_hash,
  expected_quote_verifier_approval_hash,
  expected_quote_verifier_binary_hash, expected_quote_verifier_policy_hash,
  approved_quote_verifier_policy_hash: quote_verifier_policy_hash,
  pre_quote_verifier_binary_exact_match: true,
  pre_quote_verifier_policy_exact_match: true,
  pre_restricted_evidence_reference_hash, pre_quote_verified_at, outcome: "PASS"
}))
expected_resolver_challenge_hash = SHA256("FLUENCYTRACR:GCP_EXPECTED_RESOLVER_CHALLENGE:V1" || 0x00 || canonical({
  challenge_secret_sha256: SHA256(challenge_secret),
  expected_request_context_record_hash, pre_ledger_request_context_hash,
  pre_execution_attempt_acceptance_hash, parent_attempt_envelope_hash
}))
expected_request_context_projection_hash = SHA256("FLUENCYTRACR:GCP_EXPECTED_REQUEST_CONTEXT_PROJECTION:V1" || 0x00 || canonical({
  expected_keyed_tenant_commitment, expected_numerical_body_hash,
  expected_runtime_profile_hash, expected_runtime_instance_observation_hash,
  expected_source_manifest_hash, expected_image_manifest_hash,
  expected_model_hash, expected_execution_plan_hash,
  expected_signer_generation,
  expected_receipt_signer_policy_hash, expected_trust_policy_hash,
  expected_result_contract_hash,
  expected_quote_verifier_binary_hash,
  expected_quote_verifier_policy_hash,
  expected_quote_verifier_approval_hash,
  expected_current_replay_verifier_binary_hash,
  expected_current_replay_verifier_policy_hash,
  expected_current_replay_procedure_hash,
  expected_current_replay_verifier_approval_hash,
  expected_final_consumer_verifier_binary_hash,
  expected_final_consumer_verifier_policy_hash,
  expected_final_consumer_replay_procedure_hash,
  expected_final_consumer_verifier_approval_hash,
  allowed_terminal_variants
}))
expected_quote_verifier_approval_hash = SHA256("FLUENCYTRACR:GCP_EXPECTED_QUOTE_VERIFIER_APPROVAL:V1" || 0x00 || canonical({
  expected_quote_verifier_binary_hash,
  expected_quote_verifier_policy_hash, quote_verifier_policy_hash,
  approved_quote_verifier_registry_hash,
  approved_registry_bound_quote_verifier_binary_hash,
  approved_registry_bound_quote_verifier_policy_hash,
  expected_quote_verifier_binary_exact_match: true,
  expected_quote_verifier_policy_exact_match: true,
  expected_policy_equals_trust_policy_exact_match: true,
  approval_status: "APPROVED"
}))
expected_current_replay_verifier_approval_hash = SHA256("FLUENCYTRACR:GCP_EXPECTED_CURRENT_REPLAY_VERIFIER_APPROVAL:V1" || 0x00 || canonical({
  expected_current_replay_verifier_binary_hash,
  expected_current_replay_verifier_policy_hash,
  expected_current_replay_procedure_hash,
  approved_current_replay_verifier_registry_hash,
  approved_registry_bound_current_replay_verifier_binary_hash,
  approved_registry_bound_current_replay_verifier_policy_hash,
  approved_registry_bound_current_replay_procedure_hash,
  expected_current_replay_verifier_binary_exact_match: true,
  expected_current_replay_verifier_policy_exact_match: true,
  expected_current_replay_procedure_exact_match: true,
  approval_status: "APPROVED"
}))
expected_final_consumer_verifier_approval_hash = SHA256("FLUENCYTRACR:GCP_EXPECTED_FINAL_CONSUMER_VERIFIER_APPROVAL:V1" || 0x00 || canonical({
  expected_final_consumer_verifier_binary_hash,
  expected_final_consumer_verifier_policy_hash,
  expected_final_consumer_replay_procedure_hash,
  approved_consumer_verifier_registry_hash,
  approved_registry_bound_verifier_binary_hash,
  approved_registry_bound_verifier_policy_hash,
  approved_registry_bound_final_consumer_replay_procedure_hash,
  expected_verifier_binary_exact_match: true,
  expected_verifier_policy_exact_match: true,
  expected_replay_procedure_exact_match: true,
  approval_status: "APPROVED"
}))
expected_request_acceptance_hash = SHA256("FLUENCYTRACR:GCP_EXPECTED_REQUEST_ACCEPTANCE:V1" || 0x00 || canonical({
  expected_request_context_record_hash, expected_resolver_challenge_hash,
  pre_ledger_request_context_hash, pre_execution_attempt_acceptance_hash,
  parent_attempt_envelope_hash, expected_request_context_projection_hash,
  opaque_expected_request_resolver_record_hash,
  resolver_bound_expected_request_context_record_hash,
  resolver_bound_expected_request_context_projection_hash,
  resolver_bound_expected_resolver_challenge_hash,
  resolver_bound_pre_ledger_request_context_hash,
  resolver_bound_pre_execution_attempt_acceptance_hash,
  resolver_bound_parent_attempt_envelope_hash,
  expected_resolver_authentication_verification_hash,
  expected_resolver_freshness_hash,
  expected_resolver_single_use_nonce_consumption_hash,
  exact_challenge_and_attempt_lineage_match: true,
  exact_target_hash_match: true,
  exact_expected_context_projection_match: true,
  approved_expected_context_resolver_contract_hash, resolver_status: "VERIFIED"
}))
active_expected_request_lineage_verification_hash = SHA256("FLUENCYTRACR:GCP_ACTIVE_EXPECTED_REQUEST_LINEAGE_VERIFICATION:V1" || 0x00 || canonical({
  challenge_secret_sha256: SHA256(challenge_secret),
  expected_request_acceptance_hash, expected_resolver_challenge_hash,
  pre_ledger_request_context_hash, pre_execution_attempt_acceptance_hash,
  parent_attempt_envelope_hash, single_use_attempt_claim,
  resolver_bound_expected_resolver_challenge_hash,
  resolver_bound_pre_ledger_request_context_hash,
  resolver_bound_pre_execution_attempt_acceptance_hash,
  resolver_bound_parent_attempt_envelope_hash,
  record_bound_single_use_attempt_claim,
  active_challenge_exact_match: true,
  active_pre_ledger_context_exact_match: true,
  active_pre_execution_acceptance_exact_match: true,
  active_parent_attempt_exact_match: true,
  active_single_use_attempt_claim_exact_match: true,
  outcome: "PASS"
}))
operational_failure_body_hash = SHA256("FLUENCYTRACR:GCP_OPERATIONAL_FAILURE_BODY:V1" || 0x00 || canonical({
  schema_version: "GCP_OPERATIONAL_FAILURE_BODY_V1",
  closed_failure_phase, closed_error_class,
  failure_committed_at,
  partial_result_posture: "DISCARDED_NOT_HASHED_NOT_RETAINED"
}))
completed_terminal_result_context_hash = SHA256("FLUENCYTRACR:GCP_COMPLETED_TERMINAL_RESULT_CONTEXT:V1" || 0x00 || canonical({
  expected_request_context_record_hash, expected_request_acceptance_hash,
  active_expected_request_lineage_verification_hash,
  parent_attempt_envelope_hash,
  variant: "COMPLETED_EXECUTION", semantic_result_hash
}))
operational_failure_terminal_result_context_hash = SHA256("FLUENCYTRACR:GCP_OPERATIONAL_FAILURE_TERMINAL_RESULT_CONTEXT:V1" || 0x00 || canonical({
  expected_request_context_record_hash, expected_request_acceptance_hash,
  active_expected_request_lineage_verification_hash,
  parent_attempt_envelope_hash,
  variant: "OPERATIONAL_FAILURE", operational_failure_body_hash
}))
terminal_result_context_hash = EXACTLY_ONE(completed_terminal_result_context_hash,
  operational_failure_terminal_result_context_hash)
terminal_observation_acceptance_hash = SHA256("FLUENCYTRACR:GCP_TERMINAL_OBSERVATION_ACCEPTANCE:V1" || 0x00 || canonical({
  terminal_observation_record_hash, terminal_result_context_hash,
  opaque_terminal_observation_resolver_record_hash,
  resolver_bound_terminal_observation_record_hash,
  resolver_bound_terminal_result_context_hash,
  terminal_resolver_authentication_verification_hash,
  terminal_resolver_freshness_hash, terminal_observation_accepted_at,
  terminal_resolver_single_use_nonce_consumption_hash,
  exact_observation_record_hash_match: true,
  exact_target_hash_match: true,
  approved_terminal_observation_resolver_contract_hash, resolver_status: "VERIFIED"
}))
fresh_nonce_projection_verification_hash = SHA256("FLUENCYTRACR:GCP_FRESH_NONCE_PROJECTION:V1" || 0x00 || canonical({
  fresh_nonce, execution_nonce,
  projection_rule_id: "FRESH_NONCE_EQUALS_EXECUTION_NONCE_EXACT_UTF8_V1",
  exact_utf8_bytes_match: true
}))
trust_policy_mapping_verification_hash = SHA256("FLUENCYTRACR:GCP_TRUST_POLICY_MAPPING:V1" || 0x00 || canonical({
  section_7_2_contract_hash,
  interface_id: "SECTION_7_3_7_4_TRUST_POLICY",
  runtime_profile_hash, trust_policy_hash, recomputed_trust_policy_hash,
  projection_rule_id: "TRUST_POLICY_EXACT_PREIMAGE_BINDS_RUNTIME_PROFILE_V1",
  trust_policy_hash_exact_match: true,
  runtime_profile_present_in_trust_policy_preimage: true
}))
receipt_signer_policy_hash = SHA256("FLUENCYTRACR:GCP_RECEIPT_SIGNER_POLICY:V1" || 0x00 || canonical({
  security_authority_contract_sha256, security_authority_policy_hash,
  security_authority_evidence_snapshot_hash,
  key_purpose_id: "RUNTIME_RECEIPT_SIGNING_KEY",
  kms_key_purpose: "ASYMMETRIC_SIGN", generation_alias,
  version_id: "1", spki_der_sha256,
  algorithm: "EC_SIGN_P256_SHA256",
  signer_approval_registry_hash
}))
completed_actual_request_receipt_context_projection_hash = SHA256("FLUENCYTRACR:GCP_COMPLETED_ACTUAL_REQUEST_RECEIPT_CONTEXT_PROJECTION:V1" || 0x00 || canonical({
  keyed_tenant_commitment, numerical_body_hash,
  runtime_profile_hash, runtime_instance_observation_hash,
  source_manifest_hash, image_manifest_hash, model_hash, execution_plan_hash,
  numerical_body_model_plan_projection_verification_hash,
  generation_alias, receipt_signer_policy_hash, trust_policy_hash,
  result_contract_hash, terminal_variant: "COMPLETED_EXECUTION",
  terminal_observation_acceptance_hash,
  active_expected_request_lineage_verification_hash
}))
operational_failure_actual_request_receipt_context_projection_hash = SHA256("FLUENCYTRACR:GCP_OPERATIONAL_FAILURE_ACTUAL_REQUEST_RECEIPT_CONTEXT_PROJECTION:V1" || 0x00 || canonical({
  keyed_tenant_commitment, numerical_body_hash,
  runtime_profile_hash, runtime_instance_observation_hash,
  source_manifest_hash, image_manifest_hash, model_hash, execution_plan_hash,
  numerical_body_model_plan_projection_verification_hash,
  generation_alias, receipt_signer_policy_hash, trust_policy_hash,
  result_contract_hash, terminal_variant: "OPERATIONAL_FAILURE",
  terminal_observation_acceptance_hash,
  active_expected_request_lineage_verification_hash
}))
actual_request_receipt_context_projection_hash = EXACTLY_ONE(
  completed_actual_request_receipt_context_projection_hash,
  operational_failure_actual_request_receipt_context_projection_hash)
completed_expected_to_actual_context_verification_hash = SHA256("FLUENCYTRACR:GCP_COMPLETED_EXPECTED_TO_ACTUAL_CONTEXT_VERIFICATION:V1" || 0x00 || canonical({
  expected_request_acceptance_hash, expected_request_context_projection_hash,
  completed_actual_request_receipt_context_projection_hash,
  numerical_body_model_plan_projection_verification_hash,
  expected_keyed_tenant_commitment, keyed_tenant_commitment,
  expected_numerical_body_hash, numerical_body_hash,
  expected_runtime_profile_hash, runtime_profile_hash,
  expected_runtime_instance_observation_hash, runtime_instance_observation_hash,
  expected_source_manifest_hash, source_manifest_hash,
  expected_image_manifest_hash, image_manifest_hash,
  expected_model_hash, model_hash,
  expected_execution_plan_hash, execution_plan_hash,
  expected_signer_generation, generation_alias,
  expected_receipt_signer_policy_hash, receipt_signer_policy_hash,
  expected_trust_policy_hash, trust_policy_hash,
  expected_result_contract_hash, result_contract_hash,
  allowed_terminal_variants, actual_terminal_variant: "COMPLETED_EXECUTION",
  allowed_terminal_variant_set_valid: true,
  actual_terminal_variant_allowed: true,
  tenant_exact_match: true, numerical_body_exact_match: true,
  runtime_profile_exact_match: true, runtime_instance_exact_match: true,
  source_manifest_exact_match: true,
  image_manifest_exact_match: true, model_exact_match: true,
  execution_plan_exact_match: true,
  signer_generation_exact_match: true, signer_policy_exact_match: true,
  trust_policy_exact_match: true, result_contract_exact_match: true,
  outcome: "PASS"
}))
operational_failure_expected_to_actual_context_verification_hash = SHA256("FLUENCYTRACR:GCP_OPERATIONAL_FAILURE_EXPECTED_TO_ACTUAL_CONTEXT_VERIFICATION:V1" || 0x00 || canonical({
  expected_request_acceptance_hash, expected_request_context_projection_hash,
  operational_failure_actual_request_receipt_context_projection_hash,
  numerical_body_model_plan_projection_verification_hash,
  expected_keyed_tenant_commitment, keyed_tenant_commitment,
  expected_numerical_body_hash, numerical_body_hash,
  expected_runtime_profile_hash, runtime_profile_hash,
  expected_runtime_instance_observation_hash, runtime_instance_observation_hash,
  expected_source_manifest_hash, source_manifest_hash,
  expected_image_manifest_hash, image_manifest_hash,
  expected_model_hash, model_hash,
  expected_execution_plan_hash, execution_plan_hash,
  expected_signer_generation, generation_alias,
  expected_receipt_signer_policy_hash, receipt_signer_policy_hash,
  expected_trust_policy_hash, trust_policy_hash,
  expected_result_contract_hash, result_contract_hash,
  allowed_terminal_variants, actual_terminal_variant: "OPERATIONAL_FAILURE",
  allowed_terminal_variant_set_valid: true,
  actual_terminal_variant_allowed: true,
  tenant_exact_match: true, numerical_body_exact_match: true,
  runtime_profile_exact_match: true, runtime_instance_exact_match: true,
  source_manifest_exact_match: true,
  image_manifest_exact_match: true, model_exact_match: true,
  execution_plan_exact_match: true,
  signer_generation_exact_match: true, signer_policy_exact_match: true,
  trust_policy_exact_match: true, result_contract_exact_match: true,
  outcome: "PASS"
}))
expected_to_actual_context_verification_hash = EXACTLY_ONE(
  completed_expected_to_actual_context_verification_hash,
  operational_failure_expected_to_actual_context_verification_hash)
completed_receipt_body_hash = SHA256("FLUENCYTRACR:GCP_COMPLETED_RECEIPT_BODY:V1" || 0x00 || canonical({
  variant: "COMPLETED_EXECUTION", section_7_4_contract_hash, numerical_body_hash,
  parent_attempt_envelope_hash, pre_execution_attempt_acceptance_hash,
  keyed_tenant_commitment, boot_epoch_commitment,
  fresh_nonce, execution_nonce, fresh_nonce_projection_verification_hash,
  execution_identity_commitment_hash, execution_started_at, execution_ended_at,
  terminal_state: "COMPLETED_EXECUTION", receipt_timeline_commitment_hash,
  runtime_profile_hash, runtime_instance_observation_hash,
  runtime_measurement_hash, trust_policy_hash,
  trust_policy_mapping_verification_hash,
  semantic_result_hash, result_contract_hash,
  source_manifest_hash, image_manifest_hash, model_hash, execution_plan_hash,
  numerical_body_model_plan_projection_verification_hash,
  pre_attestation_token_verification_hash, pre_execution_quote_verification_hash,
  expected_request_acceptance_hash,
  active_expected_request_lineage_verification_hash,
  completed_expected_to_actual_context_verification_hash
}))
operational_failure_receipt_body_hash = SHA256("FLUENCYTRACR:GCP_OPERATIONAL_FAILURE_RECEIPT_BODY:V1" || 0x00 || canonical({
  variant: "OPERATIONAL_FAILURE", section_7_4_contract_hash, numerical_body_hash,
  parent_attempt_envelope_hash, pre_execution_attempt_acceptance_hash,
  keyed_tenant_commitment, boot_epoch_commitment,
  fresh_nonce, execution_nonce, fresh_nonce_projection_verification_hash,
  execution_identity_commitment_hash, execution_started_at, execution_ended_at,
  terminal_state: "OPERATIONAL_FAILURE", receipt_timeline_commitment_hash,
  runtime_profile_hash, runtime_instance_observation_hash,
  runtime_measurement_hash, trust_policy_hash,
  trust_policy_mapping_verification_hash,
  operational_failure_body_hash, closed_failure_phase, closed_error_class,
  failure_committed_at,
  partial_result_posture: "DISCARDED_NOT_HASHED_NOT_RETAINED",
  execution_ended_at_equals_failure_committed_at: true,
  result_contract_hash, source_manifest_hash, image_manifest_hash,
  model_hash, execution_plan_hash,
  numerical_body_model_plan_projection_verification_hash,
  pre_attestation_token_verification_hash, pre_execution_quote_verification_hash,
  expected_request_acceptance_hash,
  active_expected_request_lineage_verification_hash,
  operational_failure_expected_to_actual_context_verification_hash
}))
terminal_receipt_body_hash = EXACTLY_ONE(completed_receipt_body_hash, operational_failure_receipt_body_hash)
terminal_state_derivation_verification_hash = SHA256("FLUENCYTRACR:GCP_TERMINAL_STATE_DERIVATION:V1" || 0x00 || canonical({
  terminal_receipt_body_hash, receipt_variant, terminal_state,
  derivation_rule_id: "COMPLETED_RECEIPT_TO_COMPLETED_STATE_ELSE_OPERATIONAL_FAILURE_V1",
  receipt_variant_terminal_state_match: true
}))
authoritative_terminal_variant_derivation_verification_hash = SHA256("FLUENCYTRACR:GCP_AUTHORITATIVE_TERMINAL_VARIANT_DERIVATION:V1" || 0x00 || canonical({
  terminal_observation_acceptance_hash,
  authenticated_observed_terminal_variant,
  terminal_state_derivation_verification_hash,
  derived_receipt_terminal_state: terminal_state,
  authoritative_terminal_variant,
  derivation_rule_id: "AUTHENTICATED_OBSERVATION_EQUALS_DERIVED_RECEIPT_STATE_V1",
  observation_variant_equals_derived_receipt_state: true,
  authoritative_variant_equals_both_inputs: true,
  outcome: "PASS"
}))
completed_terminal_result_binding_verification_hash = SHA256("FLUENCYTRACR:GCP_COMPLETED_TERMINAL_RESULT_BINDING:V1" || 0x00 || canonical({
  terminal_observation_acceptance_hash, completed_terminal_result_context_hash,
  completed_receipt_body_hash, parent_attempt_envelope_hash,
  variant: "COMPLETED_EXECUTION", semantic_result_hash,
  receipt_observation_exact_match: true
}))
operational_failure_terminal_result_binding_verification_hash = SHA256("FLUENCYTRACR:GCP_OPERATIONAL_FAILURE_TERMINAL_RESULT_BINDING:V1" || 0x00 || canonical({
  terminal_observation_acceptance_hash,
  operational_failure_terminal_result_context_hash,
  operational_failure_receipt_body_hash, parent_attempt_envelope_hash,
  variant: "OPERATIONAL_FAILURE", operational_failure_body_hash,
  receipt_observation_exact_match: true
}))
terminal_result_binding_verification_hash = EXACTLY_ONE(
  completed_terminal_result_binding_verification_hash,
  operational_failure_terminal_result_binding_verification_hash)
terminal_variant_selector_coherence_verification_hash = SHA256("FLUENCYTRACR:GCP_TERMINAL_VARIANT_SELECTOR_COHERENCE:V1" || 0x00 || canonical({
  authoritative_terminal_variant,
  terminal_observation_acceptance_hash,
  terminal_state_derivation_verification_hash,
  authoritative_terminal_variant_derivation_verification_hash,
  terminal_quote_binding_hash, terminal_quote_binding_selected_variant,
  terminal_result_context_hash, terminal_result_context_selected_variant,
  actual_request_receipt_context_projection_hash, actual_context_selected_variant,
  expected_to_actual_context_verification_hash, expected_actual_selected_variant,
  terminal_receipt_body_hash, receipt_body_selected_variant,
  terminal_result_binding_verification_hash, result_binding_selected_variant,
  selector_count: 6,
  authoritative_variant_matches_authenticated_observation_and_derived_receipt_state: true,
  every_selector_present_exactly_once: true,
  every_selector_variant_equals_authoritative_terminal_variant: true,
  outcome: "PASS"
}))
kms_key_identity_mapping_verification_hash = SHA256("FLUENCYTRACR:GCP_KMS_KEY_IDENTITY_MAPPING:V1" || 0x00 || canonical({
  receipt_signer_policy_hash, security_authority_key_record_hash,
  key_purpose_id: "RUNTIME_RECEIPT_SIGNING_KEY",
  generation_alias, version_id: "1", spki_der_sha256,
  exact_crypto_key_version_name,
  key_record_bound_generation_alias, key_record_bound_version_id,
  key_record_bound_spki_der_sha256, key_record_bound_crypto_key_version_name,
  exact_identity_mapping_match: true
}))
signature_statement_hash = SHA256("FLUENCYTRACR:GCP_RECEIPT_SIGNATURE_STATEMENT:V1" || 0x00 || canonical({
  section_7_4_contract_hash, terminal_receipt_body_hash, receipt_signer_policy_hash,
  key_purpose_id: "RUNTIME_RECEIPT_SIGNING_KEY",
  generation_alias, version_id: "1", spki_der_sha256,
  kms_key_identity_mapping_verification_hash,
  algorithm: "EC_SIGN_P256_SHA256"
}))
pre_terminal_quote_platform_continuity_verification_hash = SHA256("FLUENCYTRACR:GCP_PRE_TERMINAL_QUOTE_PLATFORM_CONTINUITY:V1" || 0x00 || canonical({
  pre_execution_quote_verification_hash,
  pre_quote_attestation_key_identity_hash, terminal_quote_attestation_key_identity_hash,
  pre_platform_identity_hash, terminal_platform_identity_hash,
  pre_pck_chain_hash, terminal_pck_chain_hash,
  pre_mrtd_hash, terminal_mrtd_hash,
  pre_rtmr_map_hash, terminal_rtmr_map_hash,
  attestation_key_identity_exact_match: true,
  platform_identity_exact_match: true,
  pck_chain_identity_exact_match: true,
  mrtd_exact_match: true, rtmr_map_exact_match: true,
  outcome: "PASS"
}))
terminal_quote_verification_hash = SHA256("FLUENCYTRACR:GCP_TERMINAL_QUOTE_VERIFICATION:V1" || 0x00 || canonical({
  terminal_quote_binding_hash, terminal_quote_transport_acceptance_hash,
  pre_execution_quote_verification_hash, terminal_raw_tdx_quote_sha256,
  terminal_expected_report_data_sha512, terminal_observed_report_data_sha512,
  terminal_pck_chain_hash, terminal_trusted_root_set_hash, terminal_collateral_snapshot_hash,
  terminal_crl_snapshot_hash, terminal_tcb_verification_hash,
  terminal_mrtd_hash, terminal_rtmr_map_hash,
  terminal_ccel_sha256, terminal_cel_sha256,
  terminal_event_log_replay_transcript_hash,
  terminal_quote_attestation_key_identity_hash, terminal_platform_identity_hash,
  pre_terminal_quote_platform_continuity_verification_hash,
  terminal_binder_measurement_verification_hash,
  terminal_variant_selector_coherence_verification_hash,
  pre_sign_timeline_verification_hash,
  terminal_quote_verifier_binary_hash, terminal_quote_verifier_policy_hash,
  expected_quote_verifier_approval_hash,
  expected_quote_verifier_binary_hash, expected_quote_verifier_policy_hash,
  approved_quote_verifier_policy_hash: quote_verifier_policy_hash,
  terminal_quote_verifier_binary_exact_match: true,
  terminal_quote_verifier_policy_exact_match: true,
  terminal_restricted_evidence_reference_hash,
  terminal_quote_verified_at, outcome: "PASS"
}))
kms_response_verification_hash = SHA256("FLUENCYTRACR:GCP_KMS_RESPONSE_VERIFICATION:V1" || 0x00 || canonical({
  kms_sign_request_hash, kms_key_identity_mapping_verification_hash, kms_sign_transport_acceptance_hash,
  signature_statement_hash, exact_crypto_key_version_name,
  observed_response_crypto_key_version_name,
  response_name_exact_match: true,
  verified_digest_crc32c: true, protection_level: "HSM",
  raw_signature_sha256, raw_signature_crc32c,
  raw_signature_crc_verified: true, mathematical_signature_verified: true,
  complete_timeline_verification_hash
}))
canonical_ecdsa_normalization_verification_hash = SHA256("FLUENCYTRACR:GCP_ECDSA_NORMALIZATION_VERIFICATION:V1" || 0x00 || canonical({
  raw_signature_sha256, strict_raw_der_parse_hash,
  raw_r_commitment_hash, raw_s_commitment_hash,
  p256_curve_order_hash, canonical_low_s_commitment_hash,
  canonical_low_s_signature_sha256, strict_canonical_der_verification_hash,
  mathematical_signature_verified: true,
  normalization_rule_id: "P256_S_MIN_S_N_MINUS_S_V1",
  raw_to_canonical_mapping_verified: true
}))
audit_mapping_acceptance_hash = SHA256("FLUENCYTRACR:GCP_AUDIT_MAPPING_ACCEPTANCE:V1" || 0x00 || canonical({
  opaque_section_7_5_audit_record_hash, bounded_audit_field_profile_hash,
  record_bound_bounded_audit_field_profile_hash,
  audit_record_authentication_verification_hash,
  audit_record_freshness_and_anti_replay_hash,
  exact_target_hash_match: true, approved_section_7_5_contract_hash,
  audit_status: "VERIFIED"
}))
audit_operation_binding_verification_hash = SHA256("FLUENCYTRACR:GCP_AUDIT_OPERATION_BINDING:V1" || 0x00 || canonical({
  audit_mapping_acceptance_hash, kms_sign_request_hash,
  kms_response_verification_hash, exact_crypto_key_version_name,
  complete_timeline_verification_hash,
  sign_requested_at, sign_response_verified_at,
  audit_complete_timeline_exact_match: true,
  bounded_method_principal_key_time_status_match: true,
  matching_event_cardinality: 1, ambiguity_detected: false
}))
signer_state_verification_hash = SHA256("FLUENCYTRACR:GCP_SIGNER_STATE_VERIFICATION:V1" || 0x00 || canonical({
  security_authority_policy_hash, security_authority_evidence_snapshot_hash,
  key_purpose_id: "RUNTIME_RECEIPT_SIGNING_KEY",
  generation_alias, version_id: "1", spki_der_sha256,
  version_state: "ENABLED", rollover_state, revocation_state,
  signer_state_verifier_policy_hash, outcome: "PASS"
}))
final_signer_acceptance_hash = SHA256("FLUENCYTRACR:GCP_FINAL_SIGNER_ACCEPTANCE:V1" || 0x00 || canonical({
  signature_statement_hash, receipt_signer_policy_hash,
  kms_key_identity_mapping_verification_hash,
  kms_response_verification_hash,
  canonical_ecdsa_normalization_verification_hash,
  canonical_low_s_signature_sha256,
  terminal_quote_verification_hash,
  audit_operation_binding_verification_hash,
  signer_state_verification_hash, outcome: "PASS"
}))
attestation_receipt_replay_manifest_hash = SHA256("FLUENCYTRACR:GCP_ATTESTATION_RECEIPT_REPLAY_MANIFEST:V1" || 0x00 || canonical({
  section_7_4_contract_hash, section_7_4_provider_revalidation_hash,
  inherited_provider_revalidation_set_hash,
  section_7_4_source_claim_registry_hash,
  attestation_token_policy_hash, quote_verifier_policy_hash,
  receipt_signer_policy_hash,
  evidence_bundle_member_schema_registry_hash,
  ordered_evidence_entries: [{evidence_kind_ordinal, evidence_kind,
    bundle_member_manifest_hash, raw_content_sha256, byte_length,
    media_type, restricted_evidence_reference}],
  verifier_binary_manifest_hash, replay_procedure_hash,
  manifest_completeness_result: "EXACT_SET_PASS"
}))
initial_retention_challenge_hash = SHA256("FLUENCYTRACR:GCP_INITIAL_RETENTION_CHALLENGE:V1" || 0x00 || canonical({
  challenge_secret_sha256: SHA256(challenge_secret),
  parent_attempt_envelope_hash, attestation_receipt_replay_manifest_hash
}))
initial_section_7_4_replay_retention_acceptance_hash = SHA256("FLUENCYTRACR:GCP_INITIAL_REPLAY_RETENTION_ACCEPTANCE:V1" || 0x00 || canonical({
  attestation_receipt_replay_manifest_hash,
  initial_retention_challenge_hash,
  initial_retention_challenge_issued_at, initial_retention_challenge_expires_at,
  opaque_initial_section_7_5_retention_record_hash,
  record_bound_attestation_receipt_replay_manifest_hash,
  record_bound_initial_retention_challenge_hash,
  initial_retention_record_authentication_verification_hash,
  initial_retention_anti_replay_consumption_hash,
  initial_retrieval_transcript_hash,
  initial_durable_retention_policy_verification_hash,
  initial_retrieval_and_completeness_verification_hash,
  initial_retention_verified_at, initial_retention_guaranteed_until,
  immutable_append_only_storage_policy_hash,
  exact_target_and_challenge_match: true,
  all_manifest_bytes_retrieved_at_initial_acceptance: true,
  approved_section_7_5_contract_hash,
  retention_status: "VERIFIED_DURABLE_REPLAYABLE"
}))
section_7_4_cryptographic_verification_hash = SHA256("FLUENCYTRACR:GCP_SECTION_7_4_CRYPTO_VERIFICATION:V1" || 0x00 || canonical({
  section_7_4_contract_hash, dependency_set_hash, trust_distribution_acceptance_hash,
  runtime_instance_observation_hash, runtime_measurement_hash,
  attested_runtime_identity_hash, trust_policy_hash,
  trust_policy_mapping_verification_hash,
  fresh_nonce_projection_verification_hash,
  numerical_body_model_plan_projection_verification_hash,
  pre_attestation_token_verification_hash, pre_execution_attempt_acceptance_hash,
  pre_quote_transport_acceptance_hash, pre_execution_quote_verification_hash,
  terminal_receipt_body_hash, terminal_result_binding_verification_hash,
  terminal_variant_selector_coherence_verification_hash,
  complete_timeline_verification_hash,
  terminal_quote_transport_acceptance_hash,
  terminal_quote_verification_hash, kms_sign_transport_acceptance_hash,
  final_signer_acceptance_hash, channel_enforcement_acceptance_hash,
  expected_request_acceptance_hash, terminal_observation_acceptance_hash,
  active_expected_request_lineage_verification_hash,
  expected_to_actual_context_verification_hash,
  attestation_receipt_replay_manifest_hash,
  initial_section_7_4_replay_retention_acceptance_hash,
  outcome: "VERIFIED_AUTHORITY_NONE"
}))
verified_historical_section_7_4_replay_manifest_hash = SHA256("FLUENCYTRACR:GCP_HISTORICAL_SECTION_7_4_REPLAY_MANIFEST:V1" || 0x00 || canonical({
  attestation_receipt_replay_manifest_hash,
  attestation_receipt_replay_manifest_bundle_sha256,
  attestation_receipt_replay_manifest_bundle_byte_length,
  attestation_receipt_replay_manifest_restricted_reference,
  initial_section_7_4_replay_retention_acceptance_hash,
  initial_retention_record_bundle_sha256,
  initial_retention_record_bundle_byte_length,
  initial_retention_record_restricted_reference,
  section_7_4_cryptographic_verification_hash,
  section_7_4_cryptographic_verification_record_bundle_sha256,
  section_7_4_cryptographic_verification_record_bundle_byte_length,
  section_7_4_cryptographic_verification_record_restricted_reference,
  section_7_4_compile_disposition_hash,
  section_7_4_compile_disposition_bundle_sha256,
  section_7_4_compile_disposition_bundle_byte_length,
  section_7_4_compile_disposition_restricted_reference,
  live_decision_derivation_record_hash,
  live_decision_derivation_bundle_sha256,
  live_decision_derivation_bundle_byte_length,
  live_decision_derivation_restricted_reference,
  decision_rule_and_trace_bundle_sha256,
  decision_rule_and_trace_bundle_byte_length,
  decision_rule_and_trace_restricted_reference,
  verified_section_7_4_live_disposition_hash,
  verified_live_disposition_bundle_sha256,
  verified_live_disposition_bundle_byte_length,
  verified_live_disposition_restricted_reference,
  historical_manifest_completeness_result: "EXACT_SET_PASS"
}))
current_section_7_4_replay_retention_acceptance_hash = SHA256("FLUENCYTRACR:GCP_CURRENT_REPLAY_RETENTION_ACCEPTANCE:V1" || 0x00 || canonical({
  verified_historical_section_7_4_replay_manifest_hash,
  current_retention_verifier_challenge_hash,
  current_retention_challenge_issued_at, current_retention_challenge_expires_at,
  opaque_current_section_7_5_retention_record_hash,
  record_bound_verified_historical_section_7_4_replay_manifest_hash,
  record_bound_current_retention_verifier_challenge_hash,
  current_retention_record_authentication_verification_hash,
  current_retention_anti_replay_consumption_hash,
  current_retrieval_transcript_hash,
  current_durable_retention_policy_verification_hash,
  current_retrieval_and_completeness_verification_hash,
  current_retention_verified_at, current_retention_guaranteed_until,
  immutable_append_only_storage_policy_hash,
  exact_target_and_challenge_match: true,
  all_manifest_bytes_retrieved_now: true,
  all_nested_attestation_evidence_bytes_retrieved_now: true,
  all_historical_record_bundles_retrieved_now: true,
  approved_section_7_5_contract_hash,
  retention_status: "VERIFIED_DURABLE_REPLAYABLE"
}))
current_replay_verifier_identity_verification_hash = SHA256("FLUENCYTRACR:GCP_CURRENT_REPLAY_VERIFIER_IDENTITY_VERIFICATION:V1" || 0x00 || canonical({
  expected_request_context_projection_hash,
  expected_current_replay_verifier_approval_hash,
  expected_current_replay_verifier_binary_hash,
  expected_current_replay_verifier_policy_hash,
  expected_current_replay_procedure_hash,
  current_replay_verifier_binary_hash,
  current_replay_verifier_policy_hash,
  current_replay_procedure_hash,
  approved_current_replay_verifier_registry_hash,
  current_replay_verifier_binary_exact_match: true,
  current_replay_verifier_policy_exact_match: true,
  current_replay_procedure_exact_match: true,
  current_approval_registry_exact_match: true,
  outcome: "PASS"
}))
current_section_7_4_replay_verification_hash = SHA256("FLUENCYTRACR:GCP_CURRENT_SECTION_7_4_REPLAY_VERIFICATION:V1" || 0x00 || canonical({
  current_retention_verifier_challenge_hash,
  verified_historical_section_7_4_replay_manifest_hash,
  current_section_7_4_replay_retention_acceptance_hash,
  current_replay_inherited_provider_revalidation_set_hash,
  current_replay_section_7_4_provider_revalidation_hash,
  historical_section_7_4_cryptographic_verification_hash: section_7_4_cryptographic_verification_hash,
  recomputed_section_7_4_cryptographic_verification_hash,
  current_replay_transcript_hash,
  current_replay_verifier_binary_hash,
  current_replay_verifier_policy_hash,
  current_replay_procedure_hash,
  current_replay_verifier_identity_verification_hash,
  every_manifest_node_recomputed: true,
  recomputed_historical_hash_exact_match: true,
  outcome: "PASS"
}))
section_7_4_replay_ready_verification_hash = SHA256("FLUENCYTRACR:GCP_SECTION_7_4_REPLAY_READY:V1" || 0x00 || canonical({
  section_7_4_cryptographic_verification_hash,
  verified_historical_section_7_4_replay_manifest_hash,
  current_section_7_4_replay_retention_acceptance_hash,
  current_replay_inherited_provider_revalidation_set_hash,
  current_replay_section_7_4_provider_revalidation_hash,
  current_section_7_4_replay_verification_hash,
  outcome: "CURRENTLY_RETRIEVABLE_REVALIDATED_AND_RECOMPUTED"
}))
parent_source_authenticity_acceptance_hash = SHA256("FLUENCYTRACR:GCP_PARENT_SOURCE_AUTHENTICITY_ACCEPTANCE:V1" || 0x00 || canonical({
  source_evidence_envelope_sha256,
  raw_provider_source_bytes_sha256,
  raw_provider_source_authentication_reference,
  opaque_section_7_6_source_authenticity_record_hash,
  record_bound_source_evidence_envelope_sha256,
  record_bound_raw_provider_source_bytes_sha256,
  record_bound_raw_provider_source_authentication_reference,
  source_authenticity_record_authentication_verification_hash,
  authenticated_raw_bytes_to_control_projection_verification_hash,
  source_authenticity_envelope_exact_match: true,
  source_authenticity_raw_bytes_exact_match: true,
  source_authenticity_reference_exact_match: true,
  authenticated_raw_bytes_project_to_bound_envelope: true,
  approved_section_7_6_contract_hash,
  section_7_4_opaque_source_authenticity_acceptance: "PASS"
}))
parent_source_evidence_projection_verification_hash = SHA256("FLUENCYTRACR:GCP_PARENT_SOURCE_EVIDENCE_PROJECTION_VERIFICATION:V1" || 0x00 || canonical({
  attested_runtime_identity_hash, runtime_instance_observation_hash,
  control_plane_observation_hash, source_evidence_envelope_sha256,
  parent_source_authenticity_acceptance_hash,
  attested_identity_bound_runtime_instance_observation_hash,
  runtime_instance_observation_bound_control_plane_observation_hash,
  control_plane_observation_bound_source_evidence_envelope_sha256,
  attested_identity_runtime_observation_exact_match: true,
  runtime_observation_control_plane_exact_match: true,
  control_plane_source_evidence_exact_match: true,
  outcome: "PASS"
}))
section_7_6_terminal_proof_acceptance_hash = SHA256("FLUENCYTRACR:GCP_SECTION_7_6_TERMINAL_PROOF_ACCEPTANCE:V1" || 0x00 || canonical({
  section_7_4_cryptographic_verification_hash,
  verified_section_7_4_live_disposition_hash,
  pre_execution_attempt_acceptance_hash, parent_attempt_envelope_hash,
  attested_runtime_identity_hash, source_evidence_envelope_sha256,
  parent_source_evidence_projection_verification_hash,
  raw_provider_source_authentication_reference,
  single_use_attempt_claim, terminal_state,
  terminal_state_derivation_verification_hash,
  opaque_section_7_6_terminal_proof_hash,
  proof_bound_section_7_4_cryptographic_verification_hash,
  proof_bound_verified_section_7_4_live_disposition_hash,
  proof_bound_pre_execution_attempt_acceptance_hash,
  proof_bound_parent_attempt_envelope_hash,
  proof_bound_attested_runtime_identity_hash,
  proof_bound_source_evidence_envelope_sha256,
  proof_bound_raw_provider_source_authentication_reference,
  proof_bound_single_use_attempt_claim, proof_bound_terminal_state,
  terminal_proof_section_7_4_hash_exact_match: true,
  terminal_proof_live_disposition_exact_match: true,
  terminal_proof_pre_execution_acceptance_exact_match: true,
  terminal_proof_parent_attempt_exact_match: true,
  terminal_proof_attested_identity_exact_match: true,
  terminal_proof_source_evidence_exact_match: true,
  terminal_proof_provider_authentication_reference_exact_match: true,
  terminal_proof_single_use_attempt_claim_exact_match: true,
  proof_terminal_state_matches_derived_receipt_state: true,
  terminal_proof_authentication_verification_hash,
  terminal_proof_producer_identity_policy_hash,
  terminal_proof_created_at,
  terminal_proof_freshness_hash, terminal_proof_completeness_hash,
  pre_execution_single_use_attempt_claim_match: true,
  approved_section_7_6_contract_hash,
  section_7_4_opaque_terminal_proof_acceptance: "PASS"
}))
historical_replay_target_set_hash = SHA256("FLUENCYTRACR:GCP_HISTORICAL_REPLAY_TARGET_SET:V1" || 0x00 || canonical({
  section_7_4_cryptographic_verification_hash,
  verified_historical_section_7_4_replay_manifest_hash,
  terminal_receipt_body_hash, signature_statement_hash,
  receipt_signer_policy_hash, generation_alias, version_id: "1",
  spki_der_sha256, exact_crypto_key_version_name,
  terminal_quote_verification_hash,
  pre_terminal_quote_platform_continuity_verification_hash,
  terminal_pck_chain_hash,
  terminal_collateral_snapshot_hash, terminal_tcb_verification_hash,
  attested_runtime_identity_hash,
  section_7_6_terminal_proof_acceptance_hash,
  opaque_section_7_6_terminal_proof_hash,
  approved_section_7_6_contract_hash,
  terminal_proof_producer_identity_policy_hash,
  terminal_proof_created_at
}))
no_adverse_tcb_replay_temporal_verification_hash = SHA256("FLUENCYTRACR:GCP_REPLAY_TCB_NO_ADVERSE_TEMPORAL_VERIFICATION:V1" || 0x00 || canonical({
  tcb_advisory_state_record,
  replay_time_trust_and_collateral_state_hash,
  replay_time_tcb_policy_evaluation_hash,
  replay_tcb_temporal_disposition: "NO_ADVERSE_STATE",
  outcome: "PASS"
}))
adverse_after_signing_tcb_replay_temporal_verification_hash = SHA256("FLUENCYTRACR:GCP_REPLAY_TCB_ADVERSE_AFTER_SIGNING_TEMPORAL_VERIFICATION:V1" || 0x00 || canonical({
  tcb_advisory_state_record,
  replay_time_trust_and_collateral_state_hash,
  replay_time_tcb_policy_evaluation_hash,
  sign_response_verified_at, tcb_advisory_effective_at,
  tcb_advisory_policy_disposition: "TCB_ADVERSE",
  replay_tcb_temporal_disposition: "ADVERSE_AFTER_SIGNING",
  tcb_advisory_effective_at_after_signing: true,
  historical_signature_not_relabeled: true,
  outcome: "PASS"
}))
adverse_at_or_before_signing_tcb_replay_temporal_verification_hash = SHA256("FLUENCYTRACR:GCP_REPLAY_TCB_ADVERSE_AT_OR_BEFORE_SIGNING_TEMPORAL_VERIFICATION:V1" || 0x00 || canonical({
  tcb_advisory_state_record,
  replay_time_trust_and_collateral_state_hash,
  replay_time_tcb_policy_evaluation_hash,
  sign_response_verified_at, tcb_advisory_effective_at,
  tcb_advisory_policy_disposition: "TCB_ADVERSE",
  replay_tcb_temporal_disposition: "REJECT_ADVERSE_AT_OR_BEFORE_SIGNING",
  tcb_advisory_effective_at_less_than_or_equal_to_signing: true,
  outcome: "REJECT"
}))
replay_tcb_advisory_temporal_verification_hash = EXACTLY_ONE(
  no_adverse_tcb_replay_temporal_verification_hash,
  adverse_after_signing_tcb_replay_temporal_verification_hash,
  adverse_at_or_before_signing_tcb_replay_temporal_verification_hash)
current_replay_policy_verification_hash = SHA256("FLUENCYTRACR:GCP_CURRENT_REPLAY_POLICY_VERIFICATION:V1" || 0x00 || canonical({
  final_retention_verifier_challenge_hash,
  record_bound_final_retention_verifier_challenge_hash,
  current_state_observed_at, current_replay_policy_verified_at,
  current_state_max_age_seconds: 300,
  current_replay_anti_replay_consumption_hash,
  current_state_head_and_rollback_verification_hash,
  opaque_current_replay_policy_record_hash,
  historical_replay_target_set_hash,
  record_bound_historical_replay_target_set_hash,
  historical_trust_snapshot_hash: trust_snapshot_hash,
  replay_time_trust_and_collateral_state_hash,
  replay_time_inherited_provider_revalidation_set_hash,
  replay_time_section_7_4_provider_revalidation_hash,
  historical_security_authority_evidence_snapshot_hash: security_authority_evidence_snapshot_hash,
  replay_time_security_authority_evidence_snapshot_hash,
  replay_time_section_7_6_proof_authority_state_hash,
  signature_created_at: sign_response_verified_at,
  terminal_proof_created_at,
  signer_adverse_state_record, tcb_advisory_state_record,
  replay_tcb_advisory_temporal_verification_hash,
  section_7_6_proof_authority_adverse_state_record,
  planned_rollover_state,
  historical_public_key_retained_for_verification: true,
  reject_if_compromise_or_revocation_effective_at_or_before_signature: true,
  reject_if_tcb_adverse_state_effective_at_or_before_signature: true,
  tcb_temporal_disposition_allows_replay: true,
  reject_if_section_7_6_proof_authority_adverse_state_effective_at_or_before_proof: true,
  planned_rollover_after_signature_is_not_compromise: true,
  record_bound_replay_time_trust_and_collateral_state_hash,
  record_bound_replay_time_inherited_provider_revalidation_set_hash,
  record_bound_replay_time_section_7_4_provider_revalidation_hash,
  record_bound_replay_time_security_authority_evidence_snapshot_hash,
  record_bound_replay_time_section_7_6_proof_authority_state_hash,
  current_record_authentication_verification_hash,
  exact_challenge_match: true,
  historical_replay_target_set_exact_match: true,
  exact_historical_targets_match: true,
  exact_current_state_targets_match: true,
  replay_revalidation_challenge_matches_final_challenge: true,
  replay_inherited_revalidation_result_exact: true,
  replay_section_7_4_revalidation_result_exact: true,
  current_state_observed_at_not_after_verified_at: true,
  current_state_age_within_300_seconds: true,
  approved_current_replay_policy_hash, outcome: "PASS"
}))
final_consumer_replay_manifest_hash = SHA256("FLUENCYTRACR:GCP_FINAL_CONSUMER_REPLAY_MANIFEST:V1" || 0x00 || canonical({
  verified_historical_section_7_4_replay_manifest_hash,
  section_7_4_replay_ready_verification_hash,
  section_7_4_replay_ready_bundle_sha256,
  section_7_4_replay_ready_bundle_byte_length,
  section_7_4_replay_ready_restricted_reference,
  section_7_6_terminal_proof_acceptance_hash,
  current_replay_policy_verification_hash,
  current_replay_policy_bundle_sha256,
  current_replay_policy_bundle_byte_length,
  current_replay_policy_restricted_reference,
  section_7_6_terminal_proof_bundle_sha256,
  section_7_6_terminal_proof_bundle_byte_length,
  section_7_6_terminal_proof_restricted_reference,
  final_consumer_verifier_binary_hash,
  final_consumer_verifier_policy_hash,
  final_consumer_replay_procedure_hash,
  manifest_completeness_result: "EXACT_SET_PASS"
}))
final_consumer_replay_retention_acceptance_hash = SHA256("FLUENCYTRACR:GCP_FINAL_CONSUMER_REPLAY_RETENTION_ACCEPTANCE:V1" || 0x00 || canonical({
  final_consumer_replay_manifest_hash,
  final_retention_verifier_challenge_hash,
  final_retention_challenge_issued_at, final_retention_challenge_expires_at,
  opaque_section_7_5_final_replay_retention_record_hash,
  record_bound_final_consumer_replay_manifest_hash,
  record_bound_final_retention_verifier_challenge_hash,
  final_consumer_retention_record_authentication_verification_hash,
  final_consumer_retention_anti_replay_consumption_hash,
  final_consumer_current_retrieval_transcript_hash,
  transitive_section_7_4_member_retrieval_transcript_hash,
  final_consumer_durable_retention_policy_verification_hash,
  final_consumer_retrieval_and_completeness_verification_hash,
  final_consumer_retention_verified_at,
  final_consumer_retention_guaranteed_until,
  immutable_append_only_storage_policy_hash,
  exact_target_and_challenge_match: true,
  all_manifest_bytes_retrieved_now: true,
  all_nested_section_7_4_evidence_bytes_retrieved_now: true,
  section_7_6_terminal_proof_bundle_retrieved_now: true,
  current_replay_policy_bundle_retrieved_now: true,
  approved_section_7_5_contract_hash,
  retention_status: "VERIFIED_DURABLE_REPLAYABLE"
}))
final_replay_verifier_identity_verification_hash = SHA256("FLUENCYTRACR:GCP_FINAL_REPLAY_VERIFIER_IDENTITY_VERIFICATION:V1" || 0x00 || canonical({
  expected_request_context_projection_hash,
  expected_final_consumer_verifier_approval_hash,
  expected_final_consumer_verifier_binary_hash,
  expected_final_consumer_verifier_policy_hash,
  expected_final_consumer_replay_procedure_hash,
  final_consumer_replay_manifest_hash,
  final_consumer_verifier_binary_hash,
  final_consumer_verifier_policy_hash,
  final_consumer_replay_procedure_hash,
  final_replay_verifier_binary_hash,
  final_replay_verifier_policy_hash,
  final_replay_procedure_hash,
  approved_consumer_verifier_registry_hash,
  manifest_verifier_binary_equals_expected_and_actual: true,
  manifest_verifier_policy_equals_expected_and_actual: true,
  manifest_replay_procedure_equals_expected_and_actual: true,
  current_approval_registry_exact_match: true,
  outcome: "PASS"
}))
final_section_7_4_replay_verification_hash = SHA256("FLUENCYTRACR:GCP_FINAL_SECTION_7_4_REPLAY_VERIFICATION:V1" || 0x00 || canonical({
  final_retention_verifier_challenge_hash,
  final_consumer_replay_manifest_hash,
  final_consumer_replay_retention_acceptance_hash,
  historical_section_7_4_cryptographic_verification_hash: section_7_4_cryptographic_verification_hash,
  recomputed_section_7_4_cryptographic_verification_hash,
  final_replay_transcript_hash,
  final_replay_verifier_binary_hash,
  final_replay_verifier_policy_hash,
  final_replay_procedure_hash,
  final_replay_verifier_identity_verification_hash,
  every_historical_node_recomputed_from_finally_retrieved_bytes: true,
  recomputed_historical_hash_exact_match: true,
  outcome: "PASS"
}))
completed_presented_terminal_payload_verification_hash = SHA256("FLUENCYTRACR:GCP_COMPLETED_PRESENTED_TERMINAL_PAYLOAD_VERIFICATION:V1" || 0x00 || canonical({
  terminal_receipt_body_hash, completed_receipt_body_hash,
  terminal_variant: "COMPLETED_EXECUTION",
  result_contract_hash, approved_result_contract_hash,
  presented_semantic_result_byte_length,
  presented_semantic_result_canonical_bytes_sha256,
  recomputed_semantic_result_hash, semantic_result_hash,
  presented_result_contract_validation_hash,
  result_contract_approval_exact_match: true,
  presented_result_contract_validation_passed: true,
  recomputed_semantic_result_hash_exact_match: true,
  raw_presented_result_retained: false,
  outcome: "PASS"
}))
operational_failure_presented_terminal_payload_verification_hash = SHA256("FLUENCYTRACR:GCP_OPERATIONAL_FAILURE_PRESENTED_TERMINAL_PAYLOAD_VERIFICATION:V1" || 0x00 || canonical({
  terminal_receipt_body_hash, operational_failure_receipt_body_hash,
  terminal_variant: "OPERATIONAL_FAILURE",
  presented_semantic_result_presence: "EXPLICITLY_ABSENT",
  presented_operational_failure_body_byte_length,
  presented_operational_failure_body_canonical_bytes_sha256,
  presented_failure_schema_version: "GCP_OPERATIONAL_FAILURE_BODY_V1",
  presented_closed_failure_phase, presented_closed_error_class,
  presented_failure_committed_at,
  presented_partial_result_posture: "DISCARDED_NOT_HASHED_NOT_RETAINED",
  presented_operational_failure_body_schema_validation_hash,
  recomputed_operational_failure_body_hash, operational_failure_body_hash,
  presented_operational_failure_body_schema_valid: true,
  presented_failure_fields_match_receipt_fields: true,
  recomputed_operational_failure_body_hash_exact_match: true,
  raw_presented_failure_bytes_retained: false,
  outcome: "PASS"
}))
presented_terminal_payload_verification_hash = EXACTLY_ONE(
  completed_presented_terminal_payload_verification_hash,
  operational_failure_presented_terminal_payload_verification_hash)
presented_payload_variant_binding_verification_hash = SHA256("FLUENCYTRACR:GCP_PRESENTED_PAYLOAD_VARIANT_BINDING:V1" || 0x00 || canonical({
  authoritative_terminal_variant,
  authoritative_terminal_variant_derivation_verification_hash,
  terminal_variant_selector_coherence_verification_hash,
  terminal_receipt_body_hash,
  presented_terminal_payload_verification_hash,
  presented_payload_selected_variant,
  selected_variant_specific_receipt_body_hash,
  presented_variant_equals_authoritative_terminal_variant: true,
  selected_receipt_body_matches_authoritative_variant: true,
  presented_payload_selector_present_exactly_once: true,
  outcome: "PASS"
}))
final_consumer_verifier_approval_verification_hash = SHA256("FLUENCYTRACR:GCP_FINAL_CONSUMER_VERIFIER_APPROVAL_VERIFICATION:V1" || 0x00 || canonical({
  expected_request_context_projection_hash,
  expected_final_consumer_verifier_approval_hash,
  expected_final_consumer_verifier_binary_hash,
  expected_final_consumer_verifier_policy_hash,
  final_consumer_verifier_binary_hash,
  final_consumer_verifier_policy_hash,
  final_replay_verifier_identity_verification_hash,
  approved_consumer_verifier_registry_hash,
  final_consumer_verifier_binary_exact_match: true,
  final_consumer_verifier_policy_exact_match: true,
  current_approval_registry_exact_match: true,
  outcome: "PASS"
}))
final_consumer_acceptance_hash = SHA256("FLUENCYTRACR:GCP_FINAL_CONSUMER_ACCEPTANCE:V1" || 0x00 || canonical({
  section_7_4_cryptographic_verification_hash,
  verified_section_7_4_live_disposition_hash,
  section_7_4_replay_ready_verification_hash,
  section_7_6_terminal_proof_acceptance_hash,
  expected_request_acceptance_hash, terminal_observation_acceptance_hash,
  active_expected_request_lineage_verification_hash,
  expected_to_actual_context_verification_hash,
  terminal_variant_selector_coherence_verification_hash,
  presented_terminal_payload_verification_hash,
  presented_payload_variant_binding_verification_hash,
  final_consumer_verifier_approval_verification_hash,
  terminal_receipt_body_hash, final_consumer_replay_manifest_hash,
  final_consumer_replay_retention_acceptance_hash,
  final_section_7_4_replay_verification_hash,
  current_replay_policy_verification_hash,
  outcome: "VERIFIED_AUTHORITY_NONE"
}))
```

The replay-manifest enum order is exactly `{0:OIDC_DISCOVERY_JWKS_BUNDLE, 1:OIDC_TOKEN, 2:TRUST_DISTRIBUTION_RECORD, 3:PARENT_ATTEMPT_ENVELOPE, 4:PRE_EXECUTION_ATTEMPT_RECORD, 5:EXPECTED_REQUEST_RECORD, 6:EXPECTED_REQUEST_RESOLVER_RECORD, 7:FRESHNESS_TIMELINE_RECORD, 8:PRE_QUOTE_TRANSPORT_RECORD, 9:PRE_TDX_QUOTE, 10:PRE_CCEL_CEL_BUNDLE, 11:PRE_COLLATERAL_BUNDLE, 12:TERMINAL_RECEIPT_BODY, 13:TERMINAL_QUOTE_TRANSPORT_RECORD, 14:TERMINAL_TDX_QUOTE, 15:TERMINAL_CCEL_CEL_BUNDLE, 16:TERMINAL_COLLATERAL_BUNDLE, 17:TERMINAL_OBSERVATION_RECORD, 18:TERMINAL_OBSERVATION_RESOLVER_RECORD, 19:KMS_SIGN_TRANSPORT_RECORD, 20:KMS_REQUEST_RESPONSE_BUNDLE, 21:KMS_KEY_STATE, 22:AUDIT_MAPPING_RECORD, 23:CHANNEL_ENFORCEMENT_RECORD, 24:RUNTIME_PROFILE_OBJECT, 25:RUNTIME_INSTANCE_OBSERVATION, 26:RUNTIME_MEASUREMENT_MANIFEST, 27:EXPECTED_BINDER_MANIFEST, 28:SECTION_7_3_POLICY_EVIDENCE_BUNDLE, 29:ATTESTED_RUNTIME_IDENTITY_OBJECT, 30:SOURCE_EVIDENCE_ENVELOPE, 31:PROVIDER_SOURCE_AUTHENTICATION_REFERENCE_RECORD, 32:SECTION_7_4_CONTRACT_CANONICALIZATION_BUNDLE, 33:PROVIDER_SOURCE_REVALIDATION_BUNDLE, 34:VERIFIER_BINARIES_BUNDLE, 35:REPLAY_PROCEDURES_BUNDLE, 36:APPROVED_OPAQUE_CONTRACTS_AND_POLICIES_BUNDLE, 37:APPROVAL_SNAPSHOTS_AND_TRUST_ROOTS_BUNDLE, 38:EXPECTED_ACTUAL_CONTEXT_VERIFICATION_BUNDLE, 39:INHERITED_SECTION_7_1_7_2_CONTRACT_ARTIFACTS_BUNDLE, 40:OPERATIONAL_FAILURE_BODY_BUNDLE, 41:NUMERICAL_BODY_MODEL_PLAN_DEFINITION_BUNDLE}`. Kind 39 contains the exact raw bytes for the four Section 7.1 and five Section 7.2 dependency paths listed above; kind 28 contains the exact raw bytes for all six listed Section 7.3 paths. Kind 40 is variant-gated: it is required exactly once for `OPERATIONAL_FAILURE` and prohibited for `COMPLETED_EXECUTION`, and contains the canonical closed failure-body fields/bytes needed to recompute `operational_failure_body_hash`. Kind 41 is always required and restricted: it contains the exact canonical numerical-body bytes plus the exact canonical model-definition and execution-plan-definition bytes/member schemas needed to recompute `numerical_body_hash`, `model_hash`, `execution_plan_hash`, `recomputed_model_plan_sha256`, and their inherited profile mapping; no public projection is allowed. `dependency_set_hash` and every inherited revalidation entry SHALL be recomputed only from those retrieved bundle bytes, never a current checkout or digest-only substitute. The compile-pinned `evidence_bundle_member_schema_registry_hash` enumerates the exact required member paths, cardinality, media type, and size bounds for every kind. Each kind has exactly one deterministic bundle; its member manifest orders `{member_path, raw_content_sha256, byte_length, media_type}` lexicographically by UTF-8 member path and must equal that registry projection. Entries are ordered by enum ordinal. Duplicate/unknown/missing kinds or members reject. The Section 7.4 manifest excludes its own hash and downstream Section 7.4/7.6/final-acceptance hashes. The separate final-consumer replay manifest closes the authenticated Section 7.6 proof bundle and excludes its own/final-acceptance hash. Section 7.4 owns both manifest shapes and replay validation; Section 7.5 owns restricted byte storage, retention, retrieval, and completeness evidence. Compiled retention constants are `retention_challenge_lifetime_seconds=300`, `compiled_retention_duration_seconds=31536000`, and clock skew `0`; they are not caller/admin tunable. The one-time initial retention acceptance uses `initial_retention_challenge_hash`, deterministically bound to this attempt and manifest, and is included in the historical Section 7.4 cryptographic/disposition chain. Every later replay/consumer verification issues a new 32-byte current retention challenge. For the applicable initial/current/final prefixes, acceptance requires `challenge_expires_at - challenge_issued_at == 300`, `challenge_issued_at <= retention_verified_at < challenge_expires_at`, exact challenge consumption, current retrieval of every manifest byte (including transitive nested Section 7.4 bundles at final verification), and `retention_guaranteed_until >= retention_verified_at + 31536000`. A current acceptance cannot be replayed for a new challenge; deletion, expiry, stale transcript, or shortened guarantee rejects. Fresh replay changes only `section_7_4_replay_ready_verification_hash` and downstream consumer replay/acceptance; it never mutates the historical Section 7.4 cryptographic/disposition hashes or the Section 7.6 terminal-proof target. `replay_time_security_authority_evidence_snapshot_hash` is the canonical `security_authority_evidence_snapshot_hash` field from a newly verified Section 7.3 evidence-snapshot object evaluated at replay; the prefix denotes its role in this preimage, not a relabeled Section 7.3 node. Final replay also requires the challenge-bound `current_replay_policy_verification_hash`: `signer_adverse_state_record`, `tcb_advisory_state_record`, and `section_7_6_proof_authority_adverse_state_record` use exact variants `{presence:"EXPLICITLY_ABSENT"}` or `{presence:"PRESENT", effective_at:<integer UTC seconds>, disposition:<closed enum>}` with no nulls. Missing current trust/collateral/security-authority evidence holds; signer compromise/revocation or TCB-adverse state effective at or before signing, and Section 7.6 proof-authority adverse state effective at or before proof creation, reject; TCB-adverse state effective after signing may not relabel the historical signature, while approved planned rollover after the corresponding creation time may retain the old public key for verification only.

Receipt bodies exclude their own hash, signature, KMS response, terminal quote/audit/ledger evidence created later, and future retry tokens. The terminal quote binds the already-computed body and statement hashes; neither upstream object contains the terminal quote, so the graph is acyclic.

### 7. Terminal variants and request-identity interfaces

`COMPLETED_EXECUTION` requires exactly one semantic-result hash. A deterministic diagnostic HOLD uses this variant only under an exact separately approved result-contract hash. `OPERATIONAL_FAILURE` prohibits semantic-result fields and permits only `closed_failure_phase` in `{PRE_EXECUTION_RUNTIME_VALIDATION, MODEL_IMPORT, INFERENCE_EXECUTION, RESULT_CONSTRUCTION}` and `closed_error_class` in `{RESOURCE_LIMIT, DEPENDENCY_LOAD_FAILURE, NUMERICAL_RUNTIME_FAILURE, INTERNAL_INVARIANT_FAILURE, TIMEOUT, TERMINATED_BEFORE_RESULT}`, with `DISCARDED_NOT_HASHED_NOT_RETAINED` posture. `terminal_state` is exactly `{COMPLETED_EXECUTION, OPERATIONAL_FAILURE}` and must pass `terminal_state_derivation_verification_hash` before a Section 7.6 target can match.

Section 7.4 defines exact semantic and expected-wire identities for both TDX evidence requests and the receipt-sign request; it does not define ledger markers or sent-record schemas.

```text
pre_quote_request_hash = SHA256("FLUENCYTRACR:GCP_PRE_QUOTE_REQUEST:V1" || 0x00 || canonical({
  method: "POST", transport: "UNIX_DOMAIN_SOCKET_HTTP",
  socket_path: "/run/container_launcher/teeserver.sock",
  http_path: "/v1/evidence?fields=label,challenge,quote,extraData",
  request_schema: "confidential_space.GetAttestationEvidenceRequest",
  field_mask: ["label", "challenge", "quote", "extraData"],
  challenge_base64_std: BASE64_STD(pre_quote_binding_hash),
  extra_data_presence: "ABSENT_NIL", device_reports_requested: false
}))
pre_quote_wire_body_bytes = UTF8("{\"challenge\":\"" || BASE64_STD(pre_quote_binding_hash) || "\"}")
pre_quote_wire_request_hash = SHA256("FLUENCYTRACR:GCP_PRE_QUOTE_WIRE:V1" || 0x00 || canonical({
  encoder_id: "FT_GCP_EVIDENCE_JSON_ENCODER_V1", method: "POST",
  socket_path: "/run/container_launcher/teeserver.sock",
  authority: "localhost",
  http_path: "/v1/evidence?fields=label,challenge,quote,extraData",
  allowed_header_names: ["content-length", "content-type", "host"],
  header_values: {content_type: "application/json", host: "localhost",
    content_length: BYTE_LENGTH(pre_quote_wire_body_bytes)},
  unknown_or_duplicate_headers: "REJECT",
  body_sha256: SHA256(pre_quote_wire_body_bytes),
  body_length: BYTE_LENGTH(pre_quote_wire_body_bytes)
}))
terminal_quote_request_hash = SHA256("FLUENCYTRACR:GCP_TERMINAL_QUOTE_REQUEST:V1" || 0x00 || canonical({
  method: "POST", transport: "UNIX_DOMAIN_SOCKET_HTTP",
  socket_path: "/run/container_launcher/teeserver.sock",
  http_path: "/v1/evidence?fields=label,challenge,quote,extraData",
  request_schema: "confidential_space.GetAttestationEvidenceRequest",
  field_mask: ["label", "challenge", "quote", "extraData"],
  challenge_base64_std: BASE64_STD(terminal_quote_binding_hash),
  extra_data_presence: "ABSENT_NIL", device_reports_requested: false
}))
terminal_quote_wire_body_bytes = UTF8("{\"challenge\":\"" || BASE64_STD(terminal_quote_binding_hash) || "\"}")
terminal_quote_wire_request_hash = SHA256("FLUENCYTRACR:GCP_TERMINAL_QUOTE_WIRE:V1" || 0x00 || canonical({
  encoder_id: "FT_GCP_EVIDENCE_JSON_ENCODER_V1", method: "POST",
  socket_path: "/run/container_launcher/teeserver.sock",
  authority: "localhost",
  http_path: "/v1/evidence?fields=label,challenge,quote,extraData",
  allowed_header_names: ["content-length", "content-type", "host"],
  header_values: {content_type: "application/json", host: "localhost",
    content_length: BYTE_LENGTH(terminal_quote_wire_body_bytes)},
  unknown_or_duplicate_headers: "REJECT",
  body_sha256: SHA256(terminal_quote_wire_body_bytes),
  body_length: BYTE_LENGTH(terminal_quote_wire_body_bytes)
}))
kms_digest_projection_verification_hash = SHA256("FLUENCYTRACR:GCP_KMS_DIGEST_PROJECTION:V1" || 0x00 || canonical({
  signature_statement_hash, digest_sha256_base64_std,
  expected_digest_sha256_base64_std: BASE64_STD(signature_statement_hash),
  digest_crc32c, expected_digest_crc32c: CRC32C(signature_statement_hash),
  digest_exact_bytes_match: true, crc_exact_match: true
}))
kms_sign_request_hash = SHA256("FLUENCYTRACR:GCP_KMS_SIGN_REQUEST:V1" || 0x00 || canonical({
  exact_crypto_key_version_name, kms_key_identity_mapping_verification_hash,
  digest_sha256_base64_std, digest_crc32c,
  kms_digest_projection_verification_hash,
  data_presence: "ABSENT"
}))
kms_sign_wire_payload_bytes = DETERMINISTIC_PROTOBUF_V1(google.cloud.kms.v1.AsymmetricSignRequest{
  name: exact_crypto_key_version_name,
  digest.sha256: signature_statement_hash,
  digest_crc32c: digest_crc32c,
  data: ABSENT, data_crc32c: ABSENT
})
compiled_client_identity_hash = SHA256("FLUENCYTRACR:GCP_KMS_CLIENT_IDENTITY:V1" || 0x00 || canonical({
  language_runtime_hash, kms_client_library_lock_hash,
  grpc_transport_binary_hash, deterministic_protobuf_encoder_hash
}))
routing_metadata_hash = SHA256("FLUENCYTRACR:GCP_KMS_ROUTING_METADATA:V1" || 0x00 || canonical({
  metadata_name: "x-goog-request-params",
  parameter_name: "name", exact_crypto_key_version_name
}))
authorization_context_commitment_hash = SHA256("FLUENCYTRACR:GCP_KMS_AUTHORIZATION_CONTEXT:V1" || 0x00 || canonical({
  security_authority_policy_hash, security_authority_evidence_snapshot_hash,
  raw_wif_subject_token_sha256, wif_subject_commitment_hash,
  sts_audience, wif_token_exp, sts_exchange_response_sha256,
  raw_kms_bearer_access_token_sha256,
  kms_access_token_principal_commitment_hash,
  kms_access_token_scope_set_hash, kms_access_token_exp,
  service_account_impersonation: false
}))
authorization_header_value_sha256 = SHA256(UTF8("Bearer ") || raw_kms_bearer_access_token_bytes)
metadata_value_profile_hash = SHA256("FLUENCYTRACR:GCP_KMS_METADATA_PROFILE:V1" || 0x00 || canonical({
  authorization_context_commitment_hash, authorization_header_value_sha256,
  content_type: "application/grpc", te: "trailers",
  user_agent_value, x_goog_api_client_value, routing_metadata_hash
}))
kms_sign_wire_request_hash = SHA256("FLUENCYTRACR:GCP_KMS_SIGN_WIRE:V1" || 0x00 || canonical({
  encoder_id: "FT_DETERMINISTIC_PROTOBUF_V1",
  compiled_client_identity_hash,
  endpoint_authority: "cloudkms.googleapis.com:443",
  tls_server_name: "cloudkms.googleapis.com",
  grpc_method: "google.cloud.kms.v1.KeyManagementService/AsymmetricSign",
  allowed_metadata_names: ["authorization", "content-type", "te",
    "user-agent", "x-goog-api-client", "x-goog-request-params"],
  routing_metadata_hash, authorization_context_commitment_hash,
  metadata_value_profile_hash, unknown_or_duplicate_metadata: "REJECT",
  payload_sha256: SHA256(kms_sign_wire_payload_bytes),
  payload_length: BYTE_LENGTH(kms_sign_wire_payload_bytes)
}))
```

For each request, Section 7.4 accepts an opaque Section 7.5 transport record only when a separately approved Section 7.5 contract independently observes socket/endpoint authority, TLS peer/SNI where applicable, method/path/query, exact header/metadata allowlist and values/profile, routing/authentication context, and body/payload; recomputes the applicable Section 7.4 wire identity from those observations, and proves recomputed-hash equality to the expected-wire hash. Section 7.5 owns interceptor placement, record/signature schema, anti-replay, and transport evidence. Section 7.4 rejects encoder, method/path/query/header/field, nil/present-empty, semantic-to-wire, or sent-byte mismatch.

Section 7.4 validates the cryptographic contents and relationships of attempt/result commitments, quote/sign request identities, responses, and terminal records without claiming durability or order. It emits `section_7_4_cryptographic_verification_hash` without Section 7.6 proof or ordinal input. Section 7.6 later owns write-ahead markers, durable sequencing, completeness, crashes, terminal/retry classification, and proof of the causal edges defined above. No favorable retry may follow an ambiguous result/quote/sign state unless that future Section 7.6 proof establishes that no result, quote, or signature could exist. A post-result failure supplies an unsigned handoff input to Section 7.6; Section 7.4 does not create its ledger schema or retry outcome.

### 8. Exact KMS and ECDSA handling

The KMS request uses exact CryptoKeyVersion `1`, only raw `digest.sha256=signature_statement_hash`, and matching CRC32C. `data`, aliases, hexadecimal text, and double hashing reject. Response requirements are `verifiedDigestCrc32c=true`, exact key-version name, `protectionLevel=HSM`, raw-signature CRC equality, and local mathematical verification.

Raw KMS ECDSA is strict ASN.1 DER P-256 with minimal positive in-range `r,s`. BER, P1363/raw, trailing bytes, nonminimal/negative/zero/out-of-range values reject. After raw CRC and mathematical verification, the verifier always maps `s` to `min(s,n-s)` and minimally re-encodes DER. Consumers accept only canonical low-S DER. Raw and canonical signature hashes remain restricted; receipt identity is the body hash. Re-signing or favorable retry is prohibited.

### 9. Signer acceptance, audit limits, and consumer verification

The parent workload-binding proof is the composition of the terminal hardware quote, independently replayed/approved binder identity, and approved single-process channel/egress enforcement—not the raw quote endpoint or remote HSM alone. Mathematical KMS signature validity proves the exact digest/key relationship. Public documentation establishes that `AsymmetricSign` emits a Data Access audit event with method and permission, but it does not establish that the event exposes the signed digest, attempt, boot, or challenge. Section 7.4 therefore forbids claiming those fields from audit logs.

Final signer acceptance requires approved Section 7.3 policy/evidence, exact unrevoked key/version/SPKI and HSM state, verified request/response integrity, mathematical signature validity over the quote-bound statement, and a Section 7.5 audit-mapping record for only source-proven fields such as service, method, resource/key version, principal projection, timestamp, and status. Missing/ambiguous identity mapping holds. Digest/attempt correlation comes from the signature and terminal quote, never an undocumented audit field. Neither KMS nor audit proves that the quoted boot invoked KMS; the quote + independently derived binder + verified enforcement composition is the parent workload-binding proof, while HSM/audit adds only governed key/authority evidence. Audit mapping and storage approvals remain empty.

Consumers receive the separately authenticated pre-execution expected-request record and post-terminal observation record from approved resolvers. They verify the expected-request hash precedes challenge issuance, the terminal observation binds that expected request plus the exact actual result/failure, and neither record points to any downstream proof/acceptance hash. Section 7.4 first emits `section_7_4_cryptographic_verification_hash` from token/quote/binder/enforcement/signature/audit and resolver evidence, with the approved pre-execution Section 7.6 acceptance but no Section 7.6 terminal-proof or ordinal input. Section 7.6 then consumes that hash, the verified Section 7.4 live disposition, and write-ahead lineage to emit `section_7_6_terminal_proof_hash`. Only the consumer combines both into `final_consumer_acceptance_hash`; Section 7.6 proof cannot point to final acceptance. Receipt-copied expectations cannot pass. Section 7.4 verification is only an input to Section 7.6 whole-attempt ordering and its separately approved outcome registry/mapping; Section 7.4 makes no parent outcome-count claim. Cryptographic verification is not runtime activation, statistical acceptance, suppression clearance, evidence eligibility, or customer authorization.

### 10. Compilation status, live precedence, and ownership

Contract compilation and live candidate admission are separate total planes. Compilation returns exactly one first-match result:

1. `REJECT_FOR_INVALID_SECTION_7_4_CONTRACT` for malformed, privacy-violating, or dependency-drifting artifacts when no reviewed source conflict applies;
2. `REJECT_FOR_SECTION_7_4_PROVIDER_SOURCE_CONFLICT` for any detected, review-complete same-layer contradiction, whether initially disclosed or uncovered during validation;
3. `HOLD_FOR_SECTION_7_4_SOURCE_OR_REVIEW_INCOMPLETE` when required source replay, artifacts, verification, or review is incomplete;
4. otherwise `GCP_ATTESTATION_RECEIPT_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD`.

Every compile result has `authority_effect=NONE` and is sealed by this registered node:

```text
section_7_4_compile_disposition_hash = SHA256("FLUENCYTRACR:GCP_SECTION_7_4_COMPILE_DISPOSITION:V1" || 0x00 || canonical({
  section_7_4_contract_hash, source_review_state_hash,
  artifact_verification_hash, selected_compile_outcome,
  authority_effect: "NONE"
}))
```

Live derivation binds this hash: invalid compile forces R3, compile provider conflict forces R2, incomplete compile forces R4, and only contract closure can reach E9.

Callers cannot supply `R1..R8`. The restricted verifier derives eight strict Booleans: R1 parent boundary/privacy leakage; R2 exact inherited provider conflict OR a distinct `section_7_4_provider_conflict_record_hash` produced only by completed same-layer source review; R3 local structural/encoding failure; R4 source/trust unavailable or review incomplete; R5 context/variant invalid; R6 cryptographic/integrity failure; R7 observed-capability/approval gate not closed; and R8 incomplete/stale/revoked/uncorrelated evidence. Missing evidence sets the applicable fail-closed predicate and empty approvals force R7.

```text
section_7_4_provider_conflict_record_hash = SHA256("FLUENCYTRACR:GCP_SECTION_7_4_PROVIDER_CONFLICT:V1" || 0x00 || canonical({
  source_review_state: "REVIEW_COMPLETE_SAME_LAYER_CONTRADICTION",
  conflicting_claim_ids, conflicting_source_record_hashes,
  applicability_review_hash, provider_conflict_rule_id
}))
live_decision_derivation_record_hash = SHA256("FLUENCYTRACR:GCP_SECTION_7_4_DECISION_DERIVATION:V1" || 0x00 || canonical({
  section_7_4_contract_hash, section_7_4_compile_disposition_hash,
  dependency_set_hash,
  provider_conflict_inputs: [{conflict_source_kind, conflict_record_hash}],
  source_review_state_hash,
  source_trust_condition_registry_hash,
  source_trust_gate_classifications: [{condition_id, root_cause_key,
    condition_input_hashes, classification}],
  source_trust_root_cause_registry_hash,
  source_trust_condition_count, exact_condition_set_match: true,
  approval_registry_set_hash, evidence_set_hash,
  decision_rule_set_hash, decision_verifier_binary_hash,
  decision_verifier_policy_hash, approved_decision_verifier_registry_hash,
  derived_predicates: {R1, R2, R3, R4, R5, R6, R7, R8},
  predicate_traces: [{predicate_id, exact_input_hashes, rule_id, result}],
  derivation_outcome: "COMPLETE"
}))
```

`provider_conflict_inputs` is an exact set of zero, one, or two unique entries with `conflict_source_kind` in `{INHERITED, SECTION_7_4}`, sorted in that order; absent entries are omitted and every `null` rejects.

The compile-pinned source/trust condition and root-cause registries enforce a one-to-one mapping between unique `condition_id` and unique `root_cause_key`; aliases or duplicate causes reject. Entries are ASCII-sorted by unique `condition_id`; each has exactly one classification in `{REVIEWED_CONTRADICTION_R2, SOURCE_OR_TRUST_UNAVAILABLE_R4, APPROVAL_UNCLOSED_R7, EVIDENCE_STALE_REVOKED_OR_UNCORRELATED_R8, CLEAR}` and exact input hashes. The verifier derives R2/R4/R7/R8 solely as `ANY(entry.classification == corresponding class)`. Review-complete contradiction sets R2; missing bytes/review sets R4; source/capability complete with missing approval sets R7; approvals complete with stale/revoked/uncorrelated evidence sets R8. One root cause cannot enter two gates, while independent causes may overlap under precedence. Condition `GCP_ATTESTATION_EVIDENCE_CAPABILITY` maps states `{SOURCE_CODE_INTERFACE_TEST_ONLY_RUNTIME_CAPABILITY_UNOBSERVED, DEFAULT_DISABLED, OBSERVED_PRESENT_APPROVAL_MISSING}` to R7; `{SOURCE_BYTES_UNAVAILABLE, APPLICABILITY_REVIEW_INCOMPLETE}` to R4; `{APPROVED_OBSERVATION_STALE}` to R8; and `{OBSERVED_PRESENT_APPROVED_FRESH}` to CLEAR. Selected-image absence without a downstream parent decision remains R7. Caller predicate/trace/verifier fields reject. Live raw conditions may overlap. For `R1..R8`, `E[n] = R[n] AND NOT(any R[1..n-1])`; `E9 = NOT(any R1..R8)`. Exactly one result is mandatory.

1. `REJECT_FOR_PRIVACY_OR_BOUNDARY_LEAKAGE`
2. provider/source conflict variant: `REJECT_C3_TDX_FOR_PROVIDER_CONFLICT` when inherited conflict is present; otherwise `REJECT_SECTION_7_4_FOR_SOURCE_CONFLICT` for the distinct local review-complete contradiction. If both are present, inherited provider conflict wins.
3. `REJECT_FOR_MALFORMED_OR_AMBIGUOUS_ENCODING`
4. `HOLD_FOR_PROVIDER_SOURCE_OR_TRUST_MATERIAL_UNAVAILABLE_OR_DRIFT`
5. `REJECT_FOR_WRONG_CONTEXT_OR_TERMINAL_VARIANT`
6. `REJECT_FOR_SIGNATURE_OR_INTEGRITY_MISMATCH`
7. `HOLD_FOR_ATTESTATION_VERIFIER_UNCLOSED`
8. `HOLD_FOR_INCOMPLETE_STALE_REVOKED_OR_UNCORRELATED_EVIDENCE`
9. `SECTION_7_4_VERIFIED_INPUT_ONLY_AUTHORITY_EFFECT_NONE`

The disposition is variant-specific with omission, never `null`:

```text
verified_section_7_4_live_disposition_hash = SHA256("FLUENCYTRACR:GCP_SECTION_7_4_VERIFIED_DISPOSITION:V1" || 0x00 || canonical({
  section_7_4_contract_hash, section_7_4_cryptographic_verification_hash,
  live_decision_derivation_record_hash,
  selected_outcome: "SECTION_7_4_VERIFIED_INPUT_ONLY_AUTHORITY_EFFECT_NONE",
  authority_effect: "NONE"
}))
held_or_rejected_section_7_4_live_disposition_hash = SHA256("FLUENCYTRACR:GCP_SECTION_7_4_NONVERIFIED_DISPOSITION:V1" || 0x00 || canonical({
  section_7_4_contract_hash, live_decision_derivation_record_hash,
  selected_outcome,
  downstream_retry_posture: "BLOCKED_SECTION_7_6_OWNS_DECISION",
  authority_effect: "NONE"
}))
section_7_4_live_disposition_hash = EXACTLY_ONE(
  verified_section_7_4_live_disposition_hash,
  held_or_rejected_section_7_4_live_disposition_hash)
nonverified_section_7_4_evidence_record_hash = SHA256("FLUENCYTRACR:GCP_SECTION_7_4_NONVERIFIED_EVIDENCE_RECORD:V1" || 0x00 || canonical({
  section_7_4_contract_hash, section_7_4_compile_disposition_hash,
  live_decision_derivation_record_hash,
  held_or_rejected_section_7_4_live_disposition_hash,
  selected_outcome,
  replay_posture: "NO_VERIFIED_CRYPTOGRAPHIC_REPLAY_MANIFEST",
  downstream_retry_posture: "BLOCKED_SECTION_7_6_OWNS_DECISION",
  authority_effect: "NONE"
}))
```

The verified variant is mandatory only for E9; the nonverified variant is mandatory only for E1–E8. Section 7.4 never classifies reservation state, consumption, crash recovery, or retry eligibility and never grants favorable retry. Every nonverified outcome carries only the causal invariant `BLOCKED_SECTION_7_6_OWNS_DECISION` and its exact nonverified evidence record; it cannot fabricate a verified cryptographic replay manifest. A future separately approved Section 7.6 contract exclusively owns reservation/attempt-ledger schemas, authenticated completeness, terminal precedence, consumption, retry tokens, and no-favorable-retry decisions. Missing Section 7.6 proof leaves retry blocked; Section 7.4 defines no Section 7.6 enum, handoff hash, or failure-proof preimage.
Fixed-physical escalation, parent treatment, capability qualification, and runtime authority are downstream integrated decisions outside this table. They consume Section 7.4/7.6 outputs and remain held until Section 7.7 GO, exact Section 7.8 qualification, and fresh action-specific execution authorization; they never gate or mutate the upstream Section 7.4 disposition. These are contract-local outcomes, not product suppression reasons.

- **7.4:** exact token and direct-quote verification semantics, challenge/report-data construction, required channel/ledger proof interfaces, receipt/signature preimages, signer acceptance, and consumer verification.
- **7.5:** current stage closes implementation-ready TLS/network/egress, trust/collateral distribution, audit mapping, evidence storage, retention, and completeness docs/contracts; separately authorized implementation remains owned by 7.5.
- **7.6:** current stage closes pre-execution acceptance, resolver, durable ledger/terminal/retry/authority, and whole-attempt precedence docs/contracts; separately authorized implementation remains owned by 7.6.
- **7.7:** whole-system schema/interface reconciliation and threat-model GO/HOLD.
- **7.8:** after 7.7 GO, owns exact hosts/zones/processes, qualification plan/result preimages, execution, and decision mapping. Plan closure and review precede any separately authorized Section 7.8 qualification execution action.

All approval lists remain empty: OIDC trust snapshots, TLS/channel, clock, challenge store, launcher/image evidence capability, quote verifier/trust/collateral, result contract, signer policy, KMS/audit mapping, expected-context resolver, ledger, consumer verifier, and receipt hashes. Every Section 7.4 object and composition has `authority_effect=NONE`. Runtime authority cannot leave HOLD before Section 7.7 GO, exact Section 7.8 qualification, and fresh action-specific human execution authorization.

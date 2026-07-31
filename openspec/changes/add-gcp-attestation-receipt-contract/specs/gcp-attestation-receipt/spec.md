## ADDED Requirements

### Requirement: Exact inherited dependencies and public-source revalidation

The Section 7.4 contract SHALL consume immutable hash-bound Section 7.1 provider-vocabulary, Section 7.2 runtime-object, and Section 7.3 security-authority artifacts without modifying or relabeling them. New public documentation and open-source implementation claims SHALL be exact, commit/byte pinned, offline replayable, and classified as source evidence rather than runtime observation or approval. Section 7.4 SHALL also attach a fresh exact-set inherited revalidation entry for every consumed Section 7.1–7.3 claim/source; every entry must bind authenticated fresh retrieval, replay procedure/verifier, observed-vs-expected comparison, and `EXACT_MAPPING_RECONFIRMED`. An independently generated, compile-pinned expected claim/source keyset and per-owner counts SHALL exactly equal observed disjoint claim entries and source entries, so source-only records require no fake claim ID and coordinated omission rejects. Missing, changed, duplicate, or unmapped inherited claims hold/reject under inherited policy and cannot reach compile closure. Initial compile/live use and every current replay SHALL issue a fresh 300-second challenge, complete authenticated retrieval/revalidation before the named consuming action and before expiry, and bind that challenge/action into inherited and Section 7.4 revalidation hashes. Replay SHALL refresh both sets; timestamps alone cannot re-date old bytes.

#### Scenario: Coordinated dependency replacement

- **WHEN** a dependency, source statement, registry, or claim is replaced and mutable downstream hashes are recomputed
- **THEN** the verifier SHALL reject against reviewed compile pins

### Requirement: Purpose-separated OIDC identity attestation

The contract SHALL select a custom-audience Google Cloud Attestation OIDC token with exact issuer, RS256, approved discovery/JWKS snapshot, and closed header/claim policy. The STS-audience WIF token, PKI/ITA/AWS modes, token-controlled keys, fallback, mixed modes, and algorithm negotiation SHALL reject. The OIDC token proves provider identity claims; it does not replace either direct TDX quote.

#### Scenario: Valid WIF token substituted for identity token

- **WHEN** an otherwise valid token carries the Section 7.3 STS audience rather than the exact verifier audience
- **THEN** identity verification SHALL reject before execution

### Requirement: One immutable challenge, channel, and nonce lineage

Each attempt SHALL use one fresh 32-byte verifier challenge secret, one TLS 1.3 exporter, exact `pre_ledger_request_context_hash`, and an opaque pre-execution Section 7.6 acceptance record verifying the parent-owned `parent_attempt_envelope_hash` with signed admission/retry lineage, monotonic ordinal, tenant/runtime, a single-use attempt claim, and anti-replay write-ahead semantics. Before challenge issuance, an attempt-bound expected-resolver challenge SHALL bind the expected record, pre-ledger request context, authenticated pre-execution acceptance, and parent attempt; `challenge_context_hash` SHALL include the resulting `expected_request_acceptance_hash`. Section 7.4 binds `pre_execution_attempt_acceptance_hash` only after the approved Section 7.6 verifier authenticates the producer/record, proves freshness and single-use reservation, and proves record-bound request-context and parent-envelope hashes exactly equal Section 7.4's targets. Caller status/target/attempt/ordinal values reject. Section 7.4 does not define the parent envelope or ledger schema. Every wire nonce SHALL be 43 unpadded base64url ASCII/UTF-8 bytes. The OIDC request and `eat_nonce` SHALL be exactly the ordered three-string array `[challenge_secret_wire, channel_nonce, context_nonce]`. Pre-quote, execution, and terminal-quote nonces SHALL derive from this lineage; independent caller values reject.

A measured `ATTESTATION_BINDER_V1` inside the single workload process SHALL terminate TLS, derive the exporter, compute challenges from local state, and sequence both local evidence requests. Before requests, only the exact static `expected_binder_measurement_hash` SHALL enter channel/quote challenges. After each response, the verifier SHALL derive separate phase-specific pre/terminal binder-measurement verification hashes from the expected hash plus exact observed CEL event identity/order/payload, mapped RTMR index, quoted/replayed equality, and transcript. Replay SHALL prove the measured payload encodes the approved binder manifest/executable/image commitments. Mutating/omitting input or supplying a caller hash SHALL reject. External TLS termination, proxy/sidecar exporter possession, externally supplied quote challenges, another local/child process using the permissive socket, dynamic code, relay-capable egress, or binder mismatch SHALL hold or reject. The quote challenges SHALL bind the exact `channel_enforcement_context_hash`. Section 7.4 SHALL accept an opaque future Section 7.5 enforcement record only when a separately approved contract verifies independent producer/authentication and role separation, anti-replay, binder ownership from before channel establishment, exact boot/exporter/context, process/Unix-socket/no-relay egress, and full through-sign-send coverage. Section 7.5 owns its schema, signature/key policy, observation mechanism, and lifecycle. Section 7.4 emits only `channel_enforcement_acceptance_hash`; self-described PASS rejects. Missing evidence holds; impossibility remains HOLD or informs Section 7.7. `UNBINDABLE` is permitted only with an exact existing Section 7.2 field ID and binding proof; Section 7.4 cannot invent or overload it.

The 8–88-byte token-claim and 10–74-byte custom-request statements SHALL remain separate exact source claims that govern the same custom-token nonce strings. The fixed 43-byte wire value lies in both but SHALL NOT make either range tunable. TLS reconnect, resumption, 0-RTT, exporter reuse, unknown channel state, wrong array order/count, duplicate, or cross-lineage nonce SHALL reject or hold under the decision table.

#### Scenario: Token and execution use different fresh nonces

- **WHEN** token verification binds one valid nonce lineage but either quote, execution, or receipt binds another
- **THEN** verification SHALL reject even if every isolated nonce is fresh

### Requirement: Exact freshness and anti-rollback trust snapshots

Challenge/attempt lifetime, token maximum age, and trust-snapshot maximum age SHALL each be exactly 300 seconds with zero clock skew and the total phase inequalities in the design. Token verification SHALL precede pre-quote request; pre-quote verification SHALL precede execution; execution start SHALL precede result/failure commitment; authenticated terminal-observation acceptance SHALL follow that commitment and precede terminal-quote request/verification; sign SHALL follow terminal quote and complete before expiry. Quote time claims SHALL be trusted-verifier request/response/verification bounds, never quote-authenticated creation time. Freshness SHALL use acyclic phase-specific nodes: token freshness before pre quote; pre-execution quote timeline before execution; receipt timeline through result/failure commitment before terminal quote; pre-sign timeline through terminal quote; and complete timeline through KMS response only in downstream Section 7.4 verification. No upstream object may bind a future observed timestamp. An approved trusted UTC clock is mandatory.

A JWKS/discovery snapshot SHALL bind exact authenticated retrieval evidence. Section 7.4 SHALL accept an opaque future Section 7.5 trust-distribution/anti-rollback record only if a separately approved contract verifies authenticated current head, monotonic lineage, linearizable check-and-use, independent nonrollbackable anchoring, stale-reader and state-restore detection, and fail-closed crash recovery. Section 7.5 owns that record's schema, signatures/keys, storage receipts, concurrency, and lifecycle. Section 7.4 assigns `section_7_5_trust_record_verified_at` from its approved UTC clock and binds exact snapshot hash, opaque record hash, approved 7.5 contract hash, verified time, and status in `trust_distribution_acceptance_hash`. Freshness requires `trust_snapshot_observed_at <= section_7_5_trust_record_verified_at <= pre_token_verified_at`; missing approval/evidence or snapshot mismatch holds.

Section 7.4 SHALL define only a typed, externally authenticated full-Section-7.5 approval/policy/verifier interface. It SHALL accept the same exact closed target identity bytes as Section 7.3: the full-Section-7.5 schema, kind, and domain plus one `canonical_contract_body_sha256`, with no additional fields. It SHALL bind those canonical identity bytes, their SHA-256, current head, and anti-rollback lineage; every Section 7.5A substitution SHALL reject. All nine required Section 7.5 acceptance nodes SHALL require the exact target, approval/policy/verifier record, trust-lineage evidence, and node-specific evidence as one conjunction. P14 SHALL require that conjunction for trust distribution. P19 is approval-only in Section 7.4: Section 7.4 SHALL NOT select an anchor or define writer, reader, currentness, concurrency, recovery, storage, signature/key, or lifecycle mechanics. Live approval registries SHALL remain empty and `authority_effect` SHALL remain `NONE`.

#### Scenario: Old JWKS bytes are assigned a new timestamp

- **WHEN** approved historical bytes are copied into a newly hashed record without their immutable retrieval record and monotonic high-water proof
- **THEN** trust verification SHALL hold rather than treating them as fresh

### Requirement: Closed claim projection and inherited runtime identity

The verifier SHALL type-check every allowed header/payload path and cross-bind provider instance/project/zone, image/container, production, TDX, software, time, raw-token hash, and challenge claims to the Section 7.2 runtime profile and instance observation. Unknown claims, namespace aliases, prohibited modes, raw-identifier retention, or mismatches SHALL reject. The restricted boot commitment SHALL use the exact design preimage and SHALL change with any channel, token, quote, instance observation, start, or profile change.

#### Scenario: Valid token from another instance

- **WHEN** a cryptographically valid token differs from the inherited runtime identity or channel-bound quote lineage
- **THEN** no attested-runtime identity SHALL be created

### Requirement: Direct pre-execution and terminal TDX quote binding

Section 7.4 SHALL use source-pinned launcher `POST /v1/evidence` executable semantics: an exact workload challenge, absent/nil extra data, `WORKLOAD_ATTESTATION` label, report data `SHA512("WORKLOAD_ATTESTATION" || SHA512(challenge))`, TDX quote, CCEL boot log, and CEL launcher log. The generic proto comment that hashes `extra_data` SHALL be compile-pinned and provisionally classified as non-applicable generic-schema documentation only when exact handler/test/transitive source proves the selected endpoint's nil branch. Present-empty SHALL not alias absent/nil. Missing/unreplayable bytes or incomplete applicability review SHALL hold compilation and map live to source-unavailable R4. Only completed review proving a same-layer contradiction SHALL map to R2 `REJECT_SECTION_7_4_FOR_SOURCE_CONFLICT` unless inherited conflict is also present. Completed non-applicability proof plus matched executable path MAY proceed as source-code/test-only with runtime capability unobserved. Runtime observation cannot erase a reviewed contradiction. The pre-quote SHALL bind the exact design preimage before model import. The terminal quote SHALL bind the exact typed design preimage containing `numerical_body_hash`, `parent_attempt_envelope_hash`, `pre_execution_attempt_acceptance_hash`, variant-controlled result/failure hash, `execution_nonce`, `runtime_measurement_hash`, body/statement hashes, channel, binder, boot, and pre-verification.

Before challenge issuance, the expected context SHALL pin an approved exact quote-verifier binary/policy pair. Both phase records SHALL prove their actual verifier binary and policy exactly equal that pair and the approved trust policy. Both verification records SHALL close strict quote parsing, report-data equality, PCK chain, roots, collateral, CRLs/revocation, TCB policy, MRTD/RTMR values, CCEL/CEL replay, userspace measurements, verifier binary/policy, and restricted evidence reference. Every evidence field SHALL be typed and phase-prefixed. A dedicated continuity verification SHALL prove exact pre/terminal attestation-key, platform, PCK identity, MRTD, and RTMR-map equality while retaining distinct quote/report-data/collateral/log records. A self-asserted hash, OIDC token, remote HSM signature, or separate wrapper SHALL not replace either quote.

The evidence endpoint's experiment flag, production image, binder, verifier, and trust/collateral approvals SHALL remain empty. Missing source, unobserved/default-disabled capability, selected-image absence/disablement without a parent-owned terminal decision, or absent approval SHALL hold. Fixed-physical escalation SHALL reuse only the inherited predicates: `parent_treatment_decision == REJECTED`, any required field `UNBINDABLE`, or `qualification_exactness == MISMATCH`. Current inherited provider conflict SHALL use `REJECT_C3_TDX_FOR_PROVIDER_CONFLICT`; a local Section 7.4 contradiction uses its distinct local outcome. Neither is a fixed-physical selection.

#### Scenario: Quote from another boot or instance is spliced

- **WHEN** a quote has valid measurements but lacks the exact uninterrupted TLS-exporter secret, measured binder, local no-relay derivation, and prior quote lineage for this attempt
- **THEN** same-boot verification SHALL reject

#### Scenario: External proxy retains TLS across a workload reboot

- **WHEN** TLS/exporter state is held outside the measured binder or a challenge is forwarded to another boot or instance
- **THEN** the proof SHALL reject because external termination and relay violate the required binder/channel policy

#### Scenario: Applicability source is missing

- **WHEN** exact transitive bytes or applicability review needed to classify the proto comment are unavailable/incomplete
- **THEN** compilation and live admission SHALL use the source-unavailable HOLD rather than assert a contradiction

#### Scenario: Completed review finds a same-layer contradiction

- **WHEN** complete pinned source review establishes both formulas govern the same endpoint input
- **THEN** live admission SHALL emit `REJECT_SECTION_7_4_FOR_SOURCE_CONFLICT`; inherited provider conflict is emitted only when a separate inherited conflict record is present, and runtime observation SHALL not erase either

#### Scenario: Selected executable formula mismatches evidence

- **WHEN** non-applicability is proven but observed report data uses present-empty semantics or otherwise differs from the selected nil formula
- **THEN** report-data/integrity verification SHALL reject without aliasing the formulas

#### Scenario: Synthetic contract matches a source-code-only unobserved endpoint

- **WHEN** every compile gate passes for a `SOURCE_CODE_INTERFACE_TEST_ONLY_RUNTIME_CAPABILITY_UNOBSERVED` endpoint but no live selected-image observation or approval exists
- **THEN** compilation SHALL emit `GCP_ATTESTATION_RECEIPT_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD`, while any attempted live admission SHALL hold under the applicable source/capability predicate

### Requirement: Acyclic domain-separated hash graph

Objects SHALL validate before hashing and use exact UTF-8 canonical JSON, unique ASCII domains, one NUL separator, and SHA-256, except the explicit 64-byte SHA-512 quote-binding hashes. The graph SHALL follow the design topology. Receipt bodies SHALL exclude their own hash, signatures, KMS responses, terminal quote/audit/ledger evidence created later, and future retry tokens. The terminal quote SHALL bind already-computed receipt/statement hashes without being inserted upstream.

The exact design preimages SHALL define parent `trust_policy_hash` bound to `runtime_profile_hash`; `runtime_measurement_hash` bound to profile, instance observation, raw token, start/observation times, boot, fresh nonce, manifest, and pre-quote/binder verification; and `attested_runtime_identity_hash` bound to profile, instance observation, and runtime measurement. The later authenticated Section 7.6 terminal-proof acceptance SHALL prove record-bound equality for attested identity, source-evidence envelope, raw provider authentication reference, single-use attempt claim, and terminal state. A separate opaque Section 7.6 source-authenticity acceptance SHALL prove that the bound raw provider authentication reference authenticates the exact raw bytes whose verified projection produced that source-evidence envelope and its bound control observation; coordinated envelope/reference substitution SHALL reject.

A compile-pinned terminal-coherence group SHALL contain exactly the six terminal selectors for quote binding, result context, actual context, expected-to-actual verification, receipt body, and result binding. Every selected discriminator SHALL equal one independently derived authoritative terminal variant; per-selector validity without cross-selector equality SHALL reject.

The exact design preimages SHALL cover token verification; three opaque-transport acceptances; pre/terminal quote verification; expected/terminal resolver acceptance; disjoint receipt bodies; signer policy/statement; KMS response and bounded audit acceptance; final signer acceptance; exact replay manifest; Section 7.4 cryptographic verification; authenticated Section 7.6 terminal-proof acceptance; final-consumer replay manifest; and final consumer acceptance. Section 7.4 verification SHALL bind the same trust acceptance used by token verification and all three transport acceptances. Missing/spliced nodes reject.

Section 7.4 SHALL own the restricted replay-manifest shapes and closed evidence-kind sets, including discovery/JWKS, parent attempt/pre-execution record, runtime profile/instance/measurement, binder manifest, Section 7.3 policy/evidence, and phase-specific timeline bundles. A compile-pinned member-schema registry SHALL define exact per-kind members/cardinality/types/size bounds. Dedicated restricted bundles SHALL retain the exact raw bytes of all four Section 7.1, five Section 7.2, and six Section 7.3 inherited dependency paths and the exact canonical numerical-body/model-definition/execution-plan-definition bytes required to recompute their hashes and inherited `model_plan_sha256`; no checkout, digest-only, or public-projection fallback is permitted; replay SHALL recompute dependency and revalidation hashes from retrieved bundle bytes with no checkout or digest-only fallback. A separate final-consumer manifest SHALL close the authenticated Section 7.6 proof bundle without a back-edge. Section 7.5 owns physical storage/retention record schemas and implementation. Before Section 7.4 cryptographic verification, an opaque authenticated Section 7.5 acceptance SHALL bind the exact Section 7.4 replay-manifest target and prove durable policy, retrieval, and completeness. Before final consumer acceptance, a second target-bound acceptance SHALL prove the final-consumer replay manifest is durably replayable. Retention challenge lifetime SHALL be exactly 300 seconds, required retention exactly 31,536,000 seconds, and skew zero; none are tunable. A one-time initial retention acceptance SHALL use the attempt/manifest-bound initial challenge and enter the historical Section 7.4 cryptographic/disposition chain. After an E9 verified disposition, an exact verified historical replay manifest SHALL package the execution-evidence manifest, initial retention record/proofs, cryptographic-verification record, compile/decision traces, and verified live disposition. E1–E8 SHALL instead emit an exact nonverified evidence record containing compile/decision traces, selected outcome, held/rejected disposition, blocked-retry posture, and `authority_effect=NONE`; they SHALL NOT fabricate a verified cryptographic replay manifest. Fresh replay retention SHALL target that historical manifest and traverse every nested byte. Every later replay/consumer verification SHALL issue a new 32-byte current retention challenge. Current Section 7.4 replay revalidation SHALL bind `CURRENT_SECTION_7_4_REPLAY`; final-consumer replay revalidation SHALL bind disjoint `FINAL_CONSUMER_REPLAY`; neither action ID or challenge pair may substitute for the other. Each opaque acceptance SHALL authenticate and consume that exact challenge, currently retrieve every manifest byte—including transitive nested Section 7.4 evidence during final verification—prove freshness and append-only retention through the compiled duration, and bind its transcript/guarantee. Prior acceptance replay, deletion, expiry, stale transcript, shortened guarantee, or self-described retention rejects. Fresh retention SHALL feed a challenge-bound current replay verifier that re-executes all Section 7.4 JWS/quote/event-log/collateral/CRL/ECDSA/cross-binding checks and proves the recomputed cryptographic hash exactly equals the historical hash; only then does it create a separate replay-ready hash; it never mutates the historical Section 7.4 cryptographic/disposition hashes or the Section 7.6 proof target. Final retention SHALL traverse every nested Section 7.4 bundle plus the Section 7.6 proof and current-replay-policy bundles, then a final-challenge-bound verifier SHALL rerun every Section 7.4 cryptographic check from those finally retrieved bytes and prove exact equality to the historical hash before acceptance. A current replay policy SHALL authenticate and consume the same fresh final-retention challenge, prove current-head/anti-rollback state, bind the exact historical Section 7.4/manifest/receipt/signature/signer-key/terminal-quote/PCK/collateral/TCB/attested-identity target set and current state targets, and require trust/collateral/security observations no older than 300 seconds before re-evaluating signer compromise/revocation, TCB advisories, Section 7.6 terminal-proof producer/key authority, and rollover timing: signer or TCB adverse state effective at/before signing, or proof-authority adverse state effective at/before proof creation, rejects; a closed TCB temporal verification SHALL distinguish absent/nonadverse, adverse after signing, and adverse at-or-before signing with equality selecting rejection; approved later planned rollover may retain the old public key for verification only. Missing/stale current-state evidence holds. Both approvals remain empty. Duplicate, unknown, missing, self-referential, or downstream-proof entries reject.

#### Scenario: Replay-time TCB advisory crosses signing cutoff

- **WHEN** a policy-adverse TCB record is effective before, exactly at, or after `sign_response_verified_at`
- **THEN** before/equal SHALL reject and after SHALL use only the closed after-signing disposition without relabeling the historical signature

#### Scenario: Valid terminal variants are spliced across selectors

- **WHEN** each selector chooses one valid variant but any selector differs from the authoritative terminal variant
- **THEN** terminal-variant coherence verification SHALL reject before cryptographic or consumer acceptance

#### Scenario: Terminal quote is inserted into its own bound body

- **WHEN** a body or signature preimage contains terminal quote evidence whose challenge depends on that preimage
- **THEN** canonicalization SHALL reject the cycle

### Requirement: Disjoint terminal receipts and downstream attempt-proof interface

`COMPLETED_EXECUTION` SHALL require exactly one semantic-result hash. A deterministic diagnostic HOLD SHALL use this variant only under an exact approved result-contract hash. `OPERATIONAL_FAILURE` SHALL prohibit every semantic-result field and use the exact domain-separated failure-body preimage over schema version, closed failure phase/class, failure-commit time, and discarded-partial-result posture; consumer verification SHALL recompute it from canonical presented fields/bytes. `terminal_state` SHALL be derived exactly from receipt variant and the later Section 7.6 proof target SHALL equal it. Both exact signed receipt bodies SHALL bind restricted execution-identity commitment, execution start/end times, terminal state, parent attempt envelope/pre-execution acceptance, exact parent `fresh_nonce = execution_nonce` UTF-8 projection, named `boot_epoch_commitment`, phase-appropriate `receipt_timeline_commitment_hash` (which excludes terminal-quote/sign times), runtime-instance observation, runtime measurement, parent `trust_policy_hash` bound to `runtime_profile_hash`, and an exact verified mapping to Section 7.4 token/quote trust policies; `execution_ended_at` SHALL equal result/failure commitment time.

Section 7.4 SHALL define exact semantic and expected-wire identities for pre/terminal quote and KMS sign requests, and SHALL accept opaque Section 7.5 transport records only when a separately approved contract recomputes the applicable Section 7.4 wire identity from independently observed socket/endpoint authority, TLS peer/SNI, method/path/query, exact allowed headers/metadata and routing/authentication context, and body/payload, rejects unknown/duplicate fields, and proves hash equality. Section 7.5 owns interceptor, sent-record, signature, and anti-replay schemas. Section 7.4 validates cryptographic attempt/result commitments, request identities, responses, and terminal records, then emits `section_7_4_cryptographic_verification_hash` without any Section 7.6 ordinal/proof input.

Section 7.4 SHALL define only required causal edges. Section 7.6 exclusively owns ledger schemas, markers, durability, ordinals, completeness, crash handling, terminal/retry precedence, and proof. It SHALL consume the Section 7.4 hash and later emit `section_7_6_terminal_proof_hash`; final acceptance follows and is not a ledger input. No favorable retry may follow ambiguous result/quote/sign state unless Section 7.6 proves none could exist. Every nonverified disposition SHALL carry only `downstream_retry_posture=BLOCKED_SECTION_7_6_OWNS_DECISION` and `authority_effect=NONE`. Section 7.4 SHALL NOT classify reservation, consumption, crash recovery, or retry eligibility; it defines no Section 7.6 reservation enums, handoff schemas, or failure-proof preimages. A future separately approved Section 7.6 contract exclusively owns attempt-ledger completeness, reservation/consumption, terminal precedence, retry tokens, and no-favorable-retry decisions. Missing Section 7.6 proof leaves retry blocked; no Section 7.4 outcome grants retry.

#### Scenario: Crash occurs during model execution

- **WHEN** a process crashes after any result-capable operation begins but before a semantic-result commitment is durably known
- **THEN** Section 7.4 SHALL keep retry blocked; only a future approved Section 7.6 proof may classify attempt/consumption state, and no favorable retry is implied without it

### Requirement: Exact HSM statement and KMS integrity

The signature statement SHALL bind receipt-body hash, contract, pre-sign signer-policy hash, exact `RUNTIME_RECEIPT_SIGNING_KEY` purpose ID, generation alias, version `1`, and SPKI, and `EC_SIGN_P256_SHA256`; it SHALL NOT bind final acceptance. Its one domain-separated SHA-256 hash SHALL be passed directly as exact 32-byte KMS `digest.sha256` with matching CRC32C and never hashed again; `kms_digest_projection_verification_hash` SHALL prove raw bytes, base64 projection, and CRC equality. Exact version `1` is required; `data`, aliases, hex text, or double hashing reject. `kms_key_identity_mapping_verification_hash` SHALL prove the raw requested/observed KMS version name maps exactly to the selected Section 7.3 purpose/generation alias/version/SPKI. The expected KMS wire identity SHALL bind the actual bearer access-token header hash, WIF subject/STS exchange and access-token principal/scope/expiry commitments, exact endpoint/SNI/routing metadata, and compiled client/metadata profile; token or principal substitution rejects. The KMS transport and channel-enforcement acceptances SHALL cross-bind the exact request/wire/auth context, boot, expected binder, measured process, and sign-send interval with record-bound equality; sibling-only composition or relayer submission rejects. The response SHALL require verified digest CRC, observed-response-name equality to the exact requested version, HSM protection, raw-signature CRC, and local mathematical verification.

#### Scenario: Structurally valid signature uses wrong key context

- **WHEN** ECDSA verifies under the wrong generation/version/SPKI, software protection, alias resolution, or mismatched response name
- **THEN** signer acceptance SHALL reject

### Requirement: Strict canonical ECDSA envelope

Receipt signatures SHALL use strict ASN.1 DER P-256 integers with no BER, P1363/raw form, trailing bytes, nonminimal/negative/zero/out-of-range values, or ambiguous identity. After raw CRC and mathematical verification, the verifier SHALL map `s` to `min(s,n-s)` exactly once and minimally re-encode DER. `canonical_ecdsa_normalization_verification_hash` SHALL bind strict raw DER parsing, raw r/s commitments, curve order, the deterministic mapping, strict canonical DER, mathematical validity, and raw/canonical signature hashes. Consumers SHALL accept only canonical low-S DER. Raw/canonical signature hashes remain restricted; receipt identity is the body hash. Re-signing for another encoding is prohibited.

#### Scenario: High-S KMS output is valid

- **WHEN** raw KMS DER is mathematically valid but high-S
- **THEN** the producer SHALL deterministically normalize once and the consumer SHALL accept only the resulting canonical low-S DER

### Requirement: Signer acceptance respects audit-field limits

The terminal TDX quote plus successful post-response binder verification and exact `channel_enforcement_acceptance_hash` SHALL provide the parent workload binding; the HSM signature SHALL prove only the exact statement/key relationship. Signer acceptance SHALL require approved Section 7.3 policy/evidence, unrevoked key state, request/response integrity, and mathematical verification. It SHALL require Section 7.5 audit mapping only for source-proven fields such as service, method, resource/key version, principal projection, time, and status. The exact Section 7.4 audit-operation binding SHALL join that acceptance to the KMS request/response, key version, sign interval, exactly one matching event, and `ambiguity_detected=false`. It SHALL NOT claim that KMS/audit proves the quoted boot invoked KMS or that Cloud Audit exposes digest, challenge, boot, or attempt. Missing or ambiguous caller mapping SHALL hold.

#### Scenario: Audit event lacks digest or attempt fields

- **WHEN** method/principal/key/time are present but digest/attempt are not source-proven audit fields
- **THEN** the verifier SHALL use signature plus terminal quote for digest/attempt binding and SHALL not invent audit correlation

### Requirement: Expected-context consumer verification

Before challenge issuance, a consumer SHALL receive a separately authenticated expected-request record with a closed projection covering expected tenant commitment, numerical body, runtime profile and exact runtime-instance observation, source/image/model/plan, signer generation/policy, trust policy, result contract, exact approved quote-verifier binary/policy, current-replay verifier binary/policy/procedure and final-consumer verifier binary/policy, and a nonempty ASCII-sorted unique subset of the two terminal variants—but no actual future result/failure. A Section 7.4 mapping SHALL independently recompute separate model and execution-plan hashes from canonical numerical-body definitions, recompute their combined `model_plan_sha256`, and require equality to the inherited runtime-profile field before pre-execution acceptance. After terminal commitment it SHALL receive a separate authenticated terminal-observation record binding the accepted expected-request lineage, `parent_attempt_envelope_hash`, and exact actual variant/result-or-failure hash. Each Section 7.4 resolver-acceptance wrapper SHALL require approved producer/key/policy authentication, freshness, single-use nonce consumption, record-bound full resolver-record hash and projected target hash, with exact equality for both; caller status rejects. An active-lineage verification SHALL cross-compare the acceptance-bound challenge, pre-ledger context, pre-execution acceptance, parent attempt, and single-use claim against the active challenge/receipt/terminal-observation lineage and SHALL be bound into pre-quote challenge context, the selected receipt, Section 7.4 cryptographic verification, replay, and final acceptance. `terminal_result_binding_verification_hash` SHALL prove the authenticated observation's variant/result-or-failure and parent attempt exactly match the selected receipt body. A variant-specific expected-to-actual verification SHALL independently derive the actual receipt context and prove exact equality for every projected field, actual terminal-variant membership, signer generation/policy equality, and exact result-contract equality; its expected half SHALL be bound before pre-quote verification and its completed verification SHALL be bound into the selected receipt, Section 7.4 cryptographic verification, and final acceptance. Neither resolver record may point to Section 7.4 cryptographic verification, Section 7.6 terminal proof, or final acceptance. The consumer SHALL first recompute Section 7.4 cryptographic verification with the approved pre-execution Section 7.6 acceptance but no Section 7.6 terminal-proof or ordinal input. Section 7.6 SHALL consume that hash, the E9 `verified_section_7_4_live_disposition_hash`, and write-ahead lineage. Before final acceptance, the consumer SHALL ephemerally canonicalize the presented terminal payload: for completed execution it SHALL validate the exact approved result contract and recompute `semantic_result_hash` from the presented bytes; for operational failure it SHALL prove semantic-result bytes absent and recompute the failure-body hash. Raw presented bytes SHALL not be retained. A separate presented-payload variant binding SHALL prove that its selector and variant-specific receipt body equal the verifier-owned authoritative terminal variant; completed/failure cross-selection SHALL reject. Section 7.4 SHALL then authenticate the terminal-proof producer/policy, freshness/completeness, and record-bound Section 7.4 cryptographic/disposition, pre-execution, parent-attempt, attested-identity, source-envelope/authentication-reference, single-use-claim, and terminal-state targets with exact equality in `section_7_6_terminal_proof_acceptance_hash`. The actual current-replay and final-replay verifier binary, policy, and procedure SHALL each exactly match their pre-challenge approved values and manifest identities; final verifier identity verification SHALL be inside the final replay chain. The actual final consumer verifier binary/policy SHALL exactly match the pre-challenge approved values and current consumer-verifier approval registry. Only final consumer acceptance combines these accepted hashes; the proof cannot point to final acceptance. Receipt-copied expectations, cycles, replay, wrong context, or missing approval SHALL reject or hold. Cryptographic verification SHALL NOT imply runtime activation, statistical acceptance, suppression clearance, evidence eligibility, or customer authorization.

#### Scenario: Accepted expected request is transplanted across attempts

- **WHEN** an expected-request acceptance created for attempt A is consumed once inside attempt B
- **THEN** active-lineage verification SHALL reject on challenge, pre-ledger, pre-execution, parent-attempt, or single-use-claim mismatch

#### Scenario: Receipt is valid for another request

- **WHEN** a valid receipt for request A is presented against independently resolved request B
- **THEN** consumer verification SHALL reject

#### Scenario: Presented payload variant differs from signed receipt

- **WHEN** a completed receipt is paired with failure-payload verification or a failure receipt is paired with completed-result verification
- **THEN** presented-payload variant binding SHALL reject before final acceptance

#### Scenario: Expected signer or terminal allowance is substituted

- **WHEN** the actual signer generation/policy differs from the authenticated expectation or the actual terminal variant is not in the expected allowed set
- **THEN** expected-to-actual context verification SHALL reject even when all actual terminal fields are internally consistent

#### Scenario: Future result is inserted into pre-execution expectations

- **WHEN** the expected-request record contains an actual terminal hash or either resolver record points to Section 7.4 verification, Section 7.6 proof, or final acceptance
- **THEN** canonicalization SHALL reject the temporal/hash cycle

### Requirement: Separate compilation status and effective live precedence

Contract compilation and live admission SHALL be separate total planes. Compilation SHALL return exactly one first-match result: invalid contract reject when no reviewed conflict applies; any detected review-complete same-layer provider conflict reject whether disclosed or uncovered; source/artifact/verification/review incomplete hold; otherwise `GCP_ATTESTATION_RECEIPT_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD`. Every compile result has `authority_effect=NONE` and SHALL be sealed in `section_7_4_compile_disposition_hash`. Live derivation SHALL bind it: invalid compile forces malformed R3, compile provider conflict forces R2, incomplete compile forces source/review R4, and only closure can reach E9.

Callers SHALL NOT supply predicates. The restricted verifier SHALL derive strict `R1..R8` plus exact evidence traces: parent boundary/privacy leakage; inherited provider conflict OR a distinct review-complete Section 7.4 same-layer conflict record; local structural encoding failure; source/trust unavailable or review incomplete; context/variant invalid; cryptographic/integrity failure; capability/approval gate unclosed; and incomplete/stale/revoked/uncorrelated evidence. The derivation SHALL bind verifier binary/policy/approval registry and exact per-predicate input hashes/rules/results. A compile-pinned condition registry SHALL enumerate every source/trust condition exactly once; the decision record SHALL contain an ASCII-sorted exact-set array keyed one-to-one by unique condition ID and unique compile-pinned root-cause key with exact input hashes and one classification per entry. R2/R4/R7/R8 SHALL derive only from that array: reviewed contradiction→R2; unavailable/review-incomplete→R4; source/capability complete but approval missing→R7; approvals complete but evidence stale/revoked/uncorrelated→R8; or clear. One root cause SHALL not simultaneously set R4/R7/R8. The attestation-evidence capability condition SHALL map source-code-only runtime-unobserved, default-disabled, or observed-but-unapproved states to R7; missing bytes/review to R4; approved stale observation to R8; and observed-present/approved/fresh to clear. Caller fields reject; missing evidence fails closed; empty approvals force R7. For `R1..R8`, `En = Rn AND NOT(any R1..R(n-1))`; `E9 = NOT(any R1..R8)`. Exactly one result is mandatory. R2 emits inherited `REJECT_C3_TDX_FOR_PROVIDER_CONFLICT` when inherited conflict exists, otherwise distinct local `REJECT_SECTION_7_4_FOR_SOURCE_CONFLICT`; inherited wins if both exist. Evaluation ends in `SECTION_7_4_VERIFIED_INPUT_ONLY_AUTHORITY_EFFECT_NONE` only for E9 with the required verified-disposition variant that binds Section 7.4 cryptographic verification. Fixed-physical escalation, parent treatment, qualification, and runtime authority are downstream decisions and cannot gate or mutate this upstream value. Values never enter product suppression vocabulary.

#### Scenario: Caller supplies an all-false decision object

- **WHEN** a caller supplies `R1..R8`, omits required evidence, or attempts to force all predicates false
- **THEN** the input SHALL reject and SHALL not reach the non-authorizing verified-input disposition

#### Scenario: Encoding is malformed and trust is stale

- **WHEN** both raw conditions are true
- **THEN** only the malformed-encoding effective predicate SHALL match

#### Scenario: Provider conflict overlaps malformed local encoding

- **WHEN** independently verified provider conflict and local malformed encoding are both true without boundary leakage
- **THEN** provider conflict R2 SHALL win over malformed R3

#### Scenario: New Section 7.4 source conflict is review-complete

- **WHEN** complete review establishes a same-layer Section 7.4 contradiction while inherited provider state is otherwise clean
- **THEN** the distinct local conflict record SHALL derive R2 and emit `REJECT_SECTION_7_4_FOR_SOURCE_CONFLICT` for Section 7.7 reconciliation

### Requirement: Privacy and no additive authority

Raw tokens, claims, identities, project/instance/KMS names, quotes, logs, certificates, collateral, keys, signatures, audit events, request/results, stack traces, stable infrastructure hashes, low-entropy result hashes, and dictionaryable commitments SHALL not enter public artifacts. Receipts are restricted security evidence with no public projection. Every runtime approval list SHALL remain empty. Every Section 7.4 object SHALL have a required adjacent domain-separated nonauthorizing envelope over object kind/hash and `authority_effect=NONE`; a finite compile-pinned object-kind registry SHALL enumerate every object node except the exact metadata exclusion set `{SECTION_7_4_OBJECT_KIND_REGISTRY, SECTION_7_4_SELECTOR_REGISTRY, SECTION_7_4_COMPOSITION_REGISTRY, NON_AUTHORIZING_OBJECT_ENVELOPE, NON_AUTHORIZING_COMPOSITION_ENVELOPE}`, with no other exclusions; `EXACTLY_ONE` selectors SHALL be non-object aliases excluded from object/composition counts, with a compile-pinned selector registry requiring one allowed active variant. The composition registry SHALL be exhaustively regenerated so every remaining non-envelope/non-selector node with at least two object-hash dependencies has exactly one `<NODE_ID>_COMPOSITION` entry whose components are the direct dependency kinds; compile-pinned counts and registry hashes SHALL detect omission/addition; every composition SHALL use the exact composition domain and sorted registry-matching component-envelope set with the same field. Only those five literal metadata IDs are non-recursive, unenveloped, and excluded from object/composition counts; every validator SHALL regenerate the same exact set. Missing/unknown/non-NONE envelopes reject, and outcome text is not a substitute. Thus every object, outcome, and composition has `authority_effect=NONE`; runtime authority cannot leave HOLD without Section 7.7 whole-system GO, exact Section 7.8 qualification, and fresh action-specific human execution authorization.

#### Scenario: Synthetic objects are relabeled as observed evidence

- **WHEN** structurally valid vectors are relabeled, rehashed, or combined with held objects
- **THEN** live verification SHALL reject for absent exact approvals/evidence

### Requirement: Later-section ownership remains explicit

Section 7.4 SHALL define token/direct-quote verification, challenge/report-data construction, required channel/ledger proof interfaces, retained-evidence shapes, receipt/signature preimages, signer acceptance, and consumer verification. The current Sections 7.5 and 7.6 stages SHALL close docs/contracts and implementation-ready interfaces; eventual separately authorized transport/storage implementation remains owned by 7.5 and ledger/retry implementation remains owned by 7.6. Section 7.7 SHALL reconcile completed 7.1–7.6 schemas/interfaces. Section 7.8, only after 7.7 GO, SHALL own exact hosts/zones/processes, qualification plan/result preimages, execution, and decision mapping; plan closure/review and fresh action-specific authorization precede any separate Section 7.8 execution action. This Section 7.4 change performs none of that later work.

#### Scenario: Section 7.4 closure is treated as execution authority

- **WHEN** a caller uses contract closure to request live GCP access, signing, deployment, persistence, qualification, or model execution
- **THEN** the request SHALL remain unauthorized and runtime authority SHALL stay held

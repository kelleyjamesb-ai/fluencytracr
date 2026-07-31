## ADDED Requirements

### Requirement: Exact provider vocabulary dependency

The Section 7.2 contract SHALL bind the exact merged Section 7.1 provider contract, source evidence, claim evidence, Compute projection, and claim registry. It SHALL continue only when a fresh downstream revalidation result is exactly `EXACT_MAPPING_RECONFIRMED`; missing provenance, mapping drift, source conflict, or boundary leakage SHALL follow the declared HOLD/REJECT precedence.

#### Scenario: Fresh provider mapping is reconfirmed

- **WHEN** all frozen provider claims and the current 257-field Compute projection replay from the hash-bound source bundle
- **THEN** the contract records `EXACT_MAPPING_RECONFIRMED` and may continue to Section 7.2 closure

#### Scenario: Provider mapping cannot be reconfirmed

- **WHEN** source provenance is unavailable, a mapping changes, current evidence conflicts, or boundary leakage is detected
- **THEN** the contract emits the declared higher-precedence HOLD or REJECT state and runtime authority remains held

### Requirement: Separate deterministic profile and instance observation

The contract SHALL define a closed deterministic numerical profile separately from a closed per-instance observation. Stable profile preimages MUST NOT contain instance, attempt, tenant, result, receipt, or customer fields. Every required registry field SHALL have one exact presence, type, domain, visibility, sufficiency, and binding treatment.

#### Scenario: Two instances share one profile

- **WHEN** two independently observed instances match every deterministic profile field but have different instance identifiers
- **THEN** they share the profile hash and produce distinct instance-observation hashes

#### Scenario: Hidden field is self-asserted

- **WHEN** a provider-hidden field is supplied as `PRESENT` without its declared parent treatment
- **THEN** validation rejects and the field cannot self-promote to sufficient

### Requirement: Total fail-closed control-plane projection

The contract SHALL classify all 257 frozen Compute paths. Unknown, secret, raw metadata/IP, unconstrained physical host/topology/VM-DNS, and non-admitted fields MUST reject or be checked without retention as declared. Every hashable leaf SHALL appear exactly once as a scalar row or in an identity-keyed resource record. Every profile-bound path SHALL map exactly once to a direct equality, resource cardinality, or domain-separated manifest.

#### Scenario: Repeated resource fields are associated

- **WHEN** disk, NIC, accelerator, or node-affinity values are retained
- **THEN** fields remain grouped under one canonical resource identity and independent wildcard-set splicing rejects; service-account email/scope inputs reject at the Section 7.2 boundary

#### Scenario: Unsafe control value is present

- **WHEN** a secret, arbitrary physical-host/topology value, raw metadata value, IP address, or unknown path is presented
- **THEN** the projection rejects or retains only the declared closed derived posture and never hashes the raw prohibited value

### Requirement: Strict canonical serialization and acyclic hashes

Every Section 7.2 object SHALL validate before serialization. Duplicate keys, unknown fields, null, floats, numeric coercion, invalid Unicode controls, unsorted/duplicate declared sets, noncanonical URIs/references, and implicit defaults MUST reject. Valid bodies SHALL use UTF-8 minified sorted-key JSON and domain-separated SHA-256 preimages. The Section 7.2 graph SHALL contain exactly provider revalidation, profile, control observation, and instance observation in acyclic dependency order.

#### Scenario: Canonical object replays

- **WHEN** an independent implementation serializes a valid golden object under `FT_CANONICAL_JSON_V1`
- **THEN** its body bytes, domain-separated preimage, and SHA-256 equal the pinned vector

#### Scenario: Back-edge is introduced

- **WHEN** a profile depends on an instance/result/receipt or any node includes its own hash
- **THEN** graph validation rejects

### Requirement: Closed time and source identity domains

Every retained Compute timestamp SHALL validate as the declared RFC3339 subset with exact raw-byte preservation, known offset, nanosecond precision, and fail-closed leap-second policy. TDX TCB date MUST use UTC `Z`. Lifecycle order MUST satisfy `creation <= current start <= observation`, and any present running stop/suspend time MUST satisfy `creation <= stop/suspend < current start`. Compute URI-bearing fields and digest-qualified OCI image references MUST use bounded canonical byte-exact forms. Retained project, instance, and resource identities MUST use the predeclared `ft-qualification-*` non-person namespace. Raw service-account email/scope values and derived service-account identity posture MUST NOT be admitted, retained, or hashed by Section 7.2; Section 7.3 owns any future parent-compatible treatment.

#### Scenario: Lifecycle evidence is chronological

- **WHEN** creation, current start, and observation times are valid and ordered, with any running stop/suspend between creation and current start
- **THEN** time validation succeeds without normalizing the original timestamp strings

#### Scenario: Time or identity is ambiguous

- **WHEN** a timestamp uses `-00:00`, a leap second without a frozen table, impossible ordering, a noncanonical Compute URI, mutable image tag, or digest mismatch
- **THEN** validation rejects before runtime authority or model import

### Requirement: Sanitized source-envelope commitment with deferred authenticity

The control-plane observation SHALL commit through `source_evidence_envelope_sha256` to the exact canonical sanitized envelope containing only observation time, retained projected fields, identity-keyed retained resource records, and closed derived posture. Raw Compute-response bytes or their digest MUST NOT enter a Section 7.2 object or hash preimage. The instance observation SHALL commit to exact raw attestation-token bytes through `raw_attestation_token_sha256`; that restricted attestation commitment is not parsed TCB acceptance. These fields are consistency commitments only. Sections 7.4 and 7.6 retain ownership of token/source authentication, external raw-provider evidence references, replay protection, and attempt-ledger trust.

#### Scenario: Sanitized evidence changes

- **WHEN** any retained projected value, resource association, derived posture value, or observation time changes
- **THEN** the sanitized envelope commitment and downstream observation hash change, while prohibited raw provider bytes remain outside Section 7.2

#### Scenario: Commitment is mistaken for authenticity

- **WHEN** an object carries a structurally valid sanitized-envelope or attestation-token commitment but later trust/authentication evidence is absent
- **THEN** runtime identity remains insufficient and the object cannot authorize model import or execution

### Requirement: Requalification and fixed-physical escalation

The contract SHALL enumerate every mandatory invalidation/requalification trigger without tunable grace periods or override. Escalation inputs SHALL contain every required profile and instance identity exactly once. Parent rejection, any required `UNBINDABLE` field, or qualification `MISMATCH` SHALL reject C3/TDX and require a new fixed-physical candidate selection.

#### Scenario: Required identity becomes unbindable

- **WHEN** any required profile or instance binding result is `UNBINDABLE`
- **THEN** the fixed-physical terminal decision wins over lower-precedence HOLD states

#### Scenario: VM restarts

- **WHEN** the VM boots or restarts
- **THEN** all prior identity is invalidated and full per-boot requalification is required before model import

### Requirement: Runtime authority and privacy remain held

Section 7.2 objects, hashes, test vectors, and evidence SHALL have no authorization effect. The runtime-approved profile list MUST remain empty; any compiled synthetic profile hash SHALL be labeled test-only and MUST NOT become runtime-admissible. The contract SHALL provide a closed typed runtime-profile approval interface that binds the resolved profile canonical-body SHA-256 and runtime-profile hash to the exact Section 7.4 external-approval provenance type `GCP_SECTION_7_5_EXTERNAL_APPROVAL_POLICY_VERIFIER_RECORD_V1`. Its external-approval and runtime-record registries MUST remain empty, and no canonical vector MAY populate them. Runtime identity SHALL remain insufficient without later trust, attestation, integration, and qualification contracts/evidence. Runtime objects, model inputs, logs, results, receipts, and customer output MUST NOT contain person, user, employee, account, email, session, device, or IP identifiers, raw customer data, prompts, responses, credentials, posterior material, or arbitrary payloads. Raw TCB acceptance status MUST remain deferred to Section 7.4 and MUST NOT be retained under an invented Section 7.2 literal.

#### Scenario: Well-formed object attempts self-authorization

- **WHEN** a caller adds an authority override or changes the held authority constant
- **THEN** closed-schema validation rejects

#### Scenario: External approval is absent

- **WHEN** the resolved profile bytes and hash match the current synthetic vector but no external approval provenance or runtime record is present
- **THEN** the typed interface remains held with empty registries and `authority_effect: NONE`

#### Scenario: Section 7.2 closes

- **WHEN** all Section 7.2 contract requirements and evidence pass
- **THEN** the decision is `GCP_RUNTIME_OBJECT_HASH_CONTRACT_CLOSED_RUNTIME_AUTHORITY_HELD`, runtime identity remains insufficient, and no GCP/runtime action is authorized

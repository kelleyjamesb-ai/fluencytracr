## ADDED Requirements

### Requirement: Exact Section 7.3 provider evidence

The contract SHALL bind exact hashes for all four Section 7.1 provider artifacts, the inherited Section 7.1 Confidential Space claim IDs, and exact Section 7.3 public-source snapshots for Confidential Space WIF/token claims, direct federated Cloud KMS support, Cloud HSM protection/attestation, Cloud KMS key/signing/rotation semantics, IAM evaluation, and audit behavior. Every claim SHALL replay from the external hash-bound source bundle. Both executable verifiers SHALL compile-pin the exact source registry, literal claim registry, provider revalidation, source-evidence artifact, and registry counts; mutable registry and downstream hash resealing MUST NOT admit a changed claim statement. Source absence or drift SHALL HOLD; conflict or unsupported claims SHALL reject.

#### Scenario: Provider evidence replays

- **WHEN** all exact snapshots, claim needles, source hashes, and registry hashes replay
- **THEN** the decision is `EXACT_SECURITY_AUTHORITY_MAPPING_RECONFIRMED` with no authorization effect

#### Scenario: Provider source is unavailable or drifted

- **WHEN** the bundle is absent, altered, incomplete, or no longer exactly replays a compiled evidence window
- **THEN** the decision is `HOLD_FOR_PROVIDER_SOURCE_UNAVAILABLE_OR_DRIFT`, Section 7.3 cannot close, and runtime authority remains held

#### Scenario: Provider claim is conflicting or unsupported

- **WHEN** reviewed current provider documentation contradicts a compiled claim or no longer supports the claimed mechanism
- **THEN** the decision is `REJECT_FOR_PROVIDER_CONFLICT_OR_UNSUPPORTED_CLAIM`, Section 7.3 cannot close, and runtime authority remains held

### Requirement: Independent policy and evidence hash domains

Section 7.3 SHALL semantically depend only on Section 7.1 provider vocabulary and Section 7.3 source revalidation. Section 7.2 SHALL remain compatibility-only and no Section 7.2 value/hash SHALL enter a Section 7.3 preimage. The graph SHALL be provider revalidation → security policy → evidence snapshot with unique domains and no back-edge. Policy and evidence live-admission lists MUST remain empty; synthetic test hashes MUST NOT authorize. Synthetic validation SHALL prove only schema closure and deterministic internal derivations, never external authenticity, provider completeness, HMAC correctness, signature validity, or approval.

#### Scenario: Synthetic policy is presented as live

- **WHEN** a caller presents a synthetic policy or evidence vector for runtime admission
- **THEN** validation rejects and no later section may treat it as observed evidence

#### Scenario: Section 7.2 hash is added to the policy

- **WHEN** a profile, control, instance, or Section 7.2 hash is inserted into the policy preimage
- **THEN** closed-schema/hash validation rejects

### Requirement: Digest-based direct WIF admission

The policy SHALL select Confidential Space digest-based WIF, direct federated resource access, Google Cloud Attestation issuer, exact subject-token audience, separately typed STS endpoint/provider exchange audience, ACTIVE/nondeleted pool/provider with `disabled=false`, closed mapping AST, and closed condition AST. Service-account impersonation, signed-image launch mode, signature-claim admission, missing/type/alias/unknown claims, and extra conditions MUST reject.

The condition AST SHALL bind TDX hardware, `CONFIDENTIAL_SPACE`, production debug state, `STABLE`, secure boot, runtime project/zone, immutable image digest, empty command/environment overrides, restart `Never`, and closed monitoring posture. Raw `google_service_accounts` values MUST NOT be admitted.

#### Scenario: Provider is disabled after tokens exist

- **WHEN** the pool/provider state or disabled flag changes, including a provider disabled while prior tokens can still grant access
- **THEN** current evidence is invalidated, authority holds, and fresh-token denial proof is required

#### Scenario: Alternate credential can sign

- **WHEN** attached identity, metadata token, service-account key, Token Creator, IAM Credentials API, or impersonation reaches either signing key
- **THEN** the policy rejects and no WIF canary can compensate for the bypass

### Requirement: HSM key generation and detached provenance

Image provenance and runtime receipts SHALL use distinct CryptoKeys. Each future generation SHALL contain exactly version `1`, be `ENABLED`, generated in Cloud HSM, nonextractable by verified HSM attestation, protection `HSM`, purpose `ASYMMETRIC_SIGN`, and algorithm `EC_SIGN_P256_SHA256`. Imported/external/software keys, extra versions, key aliases/primary resolution, and automatic rotation fields MUST reject.

Image signing SHALL be detached pre-deployment provenance over a closed canonical Simple Signing payload and immutable OCI digest. Live evidence SHALL bind the exact OCI digest/reference commitment, image-key generation alias, version `1`, algorithm, SPKI digest, payload-schema hash, canonical-payload hash, signature commitment, verification result, and deployment-gate result. It MUST NOT enable Confidential Space signed-image mode or claim Binary Authorization enforces Compute Engine/Confidential Space deployment. Receipt preimages remain owned by Section 7.4.

#### Scenario: Extra key version exists

- **WHEN** a signing CryptoKey has any version other than exactly enabled version `1`
- **THEN** key evidence rejects because IAM access applies to every enabled version

#### Scenario: Image signature substitutes for digest admission

- **WHEN** signature claims or signed-image repositories replace the required digest claim
- **THEN** WIF admission rejects

### Requirement: Transitive role separation and mutation closure

The role matrix SHALL default-deny every unlisted capability. Runtime signer, image signer, builder, publisher, deployer, key-lifecycle admin, KMS-IAM admin, WIF-provider admin, verifier, auditor, audit-router admin, and retention custodian SHALL have distinct random aliases. Plain/dictionaryable hashes or identifier-derived aliases MUST reject.

Live evidence SHALL contain a sorted unique typed credential-control edge inventory and compute the least fixed point from those edges over complete provider-owned credential-control inventories, including ancestors, inherited/conditional policies, custom roles, groups/domains, service agents, attached identities, allow/deny/PAB, owner/editor, WIF, key/IAM, and audit mutators. Every edge SHALL bind an exact source type, mapped edge type, source-record ordinal, evidence commitment, and domain-separated source-snapshot link. Each source-class record SHALL independently commit total record count, external-mutator count, exact derived edge count, and its exact sorted edge output; all source outputs MUST compose the global edge inventory exactly. External-mutator count SHALL be an independent derived cardinality and MUST NOT be capped by raw source-record count because one binding or policy record may emit multiple mutators. Every raw source ordinal SHALL have exactly one explicit edge-enumerated or no-edge disposition. Live admission MUST require each exact per-source disposition-manifest hash to appear in the externally governed runtime approval list, which remains empty. Every auxiliary controller alias MUST reach a governed role. Controller sets MUST equal the derived transitive upstream closure and any credential-control cycle SHALL HOLD. Every role pair SHALL have disjoint direct and transitive credential-controller sets. Authority-mutator influence edges SHALL be committed in a separate complete graph; every authority/audit mutator SHALL be externally proven `DORMANT`, and any activation invalidates evidence. The structural validator SHALL claim internal composition only, not provider-source authenticity or completeness. Caller-provided fixed-point flags, unknown/unviewable edges, stale source retagging or splicing, orphan controllers, cycles with unresolved external controllers, or any intersection SHALL fail closed; a fully coordinated source/edge/alias omission MUST remain non-live until its exact disposition manifest is externally approved.

Administrators SHALL be labeled authority mutators, not falsely declared unable to escalate. Any mutator activation or policy/key/provider/project/audit change SHALL invalidate evidence and hold authority.

#### Scenario: Distinct aliases share an indirect controller

- **WHEN** a second-hop controller reaches two roles prohibited by the separation matrix
- **THEN** fixed-point intersection validation rejects despite distinct direct aliases

#### Scenario: Policy view is incomplete

- **WHEN** an ancestor, custom role, group/domain, service agent, attached identity, or controller edge is unknown or unviewable
- **THEN** authority holds and caller-asserted completeness is ignored

#### Scenario: Coordinated source and edge omission is internally resealed

- **WHEN** a caller removes a source-derived edge and alias, changes the corresponding ordinal disposition to no-edge, and reseals every structural commitment
- **THEN** synthetic structure may remain internally consistent, but live admission rejects unless the exact changed disposition-manifest hash was externally approved; the structural validator MUST NOT claim external completeness

### Requirement: Same-context effective-access and rollover proof

Live evidence SHALL include exactly once the complete compiled role × signing-resource × `{useToSign, viewPublicKey}` tuple universe plus every alternate-credential route against both signing keys. Each record SHALL bind role and random alias, exact key-generation alias, common policy snapshot, applicable WIF policy, same-context group, unique cross-class audit correlation, observation time, and canonical record hash. A denial counts only with the same valid token/network/enabled-key/request context and exact audit correlation. `UNKNOWN`, stale etags, ambiguous network/token/key-state failure, unexpected success/failure, or missing correlation SHALL HOLD. Policy Troubleshooter SHALL NOT be the authority for WIF-principal denial proof.

Rollover SHALL create a distinct CryptoKey generation and remain held while it verifies HSM/public-key evidence, freezes policy, revokes/proves old denial, grants/proves new allow, proves cross-key denies, and freezes evidence. The evidence SHALL contain the exact ordered state-prefix events with strictly increasing times and unique commitments; a state cannot skip a predecessor. Two approved generations and timer-only propagation proof MUST reject. Compromise SHALL hold/revoke immediately. Destroy/restore requires distinct approver/executor evidence and cannot precede receipt retention.

#### Scenario: Negative canary fails for the wrong reason

- **WHEN** a canary fails because of network, token, request, or key-state error instead of authorization
- **THEN** denial is ambiguous and authority remains held

#### Scenario: Both generations can sign

- **WHEN** old and new key generations are simultaneously reachable by an approved signer
- **THEN** rollover rejects and cannot leave HOLD

### Requirement: Authority-audit interface respects Section 7.5 ownership

Section 7.3 SHALL define the required authority-operation inventory for STS/WIF, IAM/custom roles/deny/PAB, KMS policy/lifecycle/signing/public-key operations, image provenance, alternate credentials, and audit configuration/routing/retention mutation. Except for source-closed KMS `AsymmetricSign` Data Access behavior, Section 7.5 SHALL source-revalidate and freeze the exact provider service/method/log mapping and own logging/sink/bucket/retention/persistence selection and proof. A Section 7.3 live snapshot SHALL bind an approved Section 7.5 contract hash, decision, method-map hash, operation-inventory hash, and canonical interface binding; the runtime-approved Section 7.5 binding list remains empty here.

Raw logs, principals, project/account identifiers, emails, IPs, policies, real signatures, and identifier-bearing locators MUST NOT enter FluencyTracr artifacts. Only context-bound random aliases, high-entropy bundle commitments, and closed counts/windows may cross. Public documentation examples remain restricted external provenance only.

#### Scenario: Audit evidence contains principal email

- **WHEN** a raw Cloud Audit Log or principal/account/email field is placed in a policy/evidence object
- **THEN** privacy validation rejects before hashing

#### Scenario: Required logs can be excluded

- **WHEN** KMS Data Access is not enabled, an exemption exists, Policy Denied can be excluded for required scope, or router/retention custody collides
- **THEN** audit evidence remains incomplete and authority holds

### Requirement: Section 7.3 closure has no authority

Decision precedence SHALL be privacy/boundary rejection, provider conflict rejection, source-unavailable HOLD, role/controller collision rejection, key/WIF/policy mismatch rejection, incomplete/stale/ambiguous evidence HOLD, then `GCP_SECURITY_AUTHORITY_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD`. Unknown/missing inputs reject or HOLD exactly; no override exists.

Section 7.3 SHALL define a closed live-evidence schema for externally attested random/HMAC alias privacy, credential-controller inventories/completeness/cycles/fixed-point sets, separately typed internal and external authority-mutator influence with dormant state, WIF state and etag/AST/existing-token commitments, exactly two HSM generation records, deployment-bound provenance verification receipts, complete access and alternate-credential records, ordered rollover evidence, authority-operation mapping evidence, encompassing observation windows, and mutation counters. Unknown nested fields, missing records, wrong types, Boolean/integer aliases, duplicate tuples, stale commitments, or identifier-bearing values SHALL reject or HOLD by precedence. Section 7.3 objects, hashes, vectors, states, or composition with any other section SHALL have no additive authorization effect. Observed policy, evidence, privacy-boundary, provenance-verifier, deployment-gate, and Section 7.5 binding hashes MUST each be present in their runtime-approved lists before validation can pass; all such lists remain empty in Section 7.3. Runtime authority cannot leave HOLD until Section 7.7 whole-system GO, exact Section 7.8 qualification, and fresh human execution authorization.

#### Scenario: Contract closes without evidence

- **WHEN** provider evidence and contract tests pass but no live GCP evidence exists
- **THEN** Section 7.3 closes as docs-only, evidence remains absent, and runtime authority remains held

#### Scenario: Later section treats closure as authority

- **WHEN** a later consumer treats a contract state, synthetic hash, or absent evidence snapshot as permission to sign/import/execute
- **THEN** validation rejects under the no-additive-authority rule

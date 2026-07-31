# GCP Security Authority Contract

## 1. Status and Decision

This directory closes only Section 7.3 of the canonical GCP runtime
qualification plan: the docs-only HSM, Workload Identity Federation (WIF), IAM,
image-provenance, role-separation, key-lifecycle, and authority-audit contract.

Recorded decision:

```text
GCP_SECURITY_AUTHORITY_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD
```

The policy and evidence schemas are deterministic, but no live security policy,
project, principal, key, provider, IAM binding, audit system, canary, or rollover
has been observed. Runtime-approved policy and evidence hash lists are empty.
The synthetic vectors have no authorization effect.

This contract is not a GCP configuration, deployment plan, qualification result,
receipt signer policy, or permission to access a project. It does not authorize
credentials, APIs, billing, resource creation, IAM/WIF/KMS/Logging changes,
signing, image operations, canaries, deployment, model import, or execution.

## 2. Normative Artifacts

- [`security-authority-contract.json`](security-authority-contract.json) defines
  policy/evidence schemas, canonicalization, hash ownership, WIF admission,
  HSM key profiles, authority-universe closure, rollover, audit interfaces,
  decision precedence, and held authority.
- [`role-capability-matrix.json`](role-capability-matrix.json) defines the closed
  14-role capability graph and forbidden transitive-controller intersections.
- [`provider-source-evidence.json`](provider-source-evidence.json) binds the 23
  public source snapshots and 42 exact claims used by this contract.
- [`provider-revalidation.json`](provider-revalidation.json) records
  `EXACT_SECURITY_AUTHORITY_MAPPING_RECONFIRMED` for those exact source bytes.
- [`canonicalization-vectors.json`](canonicalization-vectors.json) supplies
  synthetic policy and evidence-snapshot vectors for independent byte replay.
- `scripts/gcp_security_authority_contract_validation.py` and
  `scripts/verify_gcp_security_authority_contract.py` provide the executable
  closed live-evidence and current-contract verifier; source replay is separate.

The source recovery bundle is external because public documentation may contain
public example account, email, project, or IP literals:

```text
external-recovery://fluencytracr/gcp-security-authority-source-snapshot-20260724T232044Z.zip
sha256:6f87fa394a9ae88032dfa28ebfba03b2e92408f1bb703975a8c146f2453fdae3
```

Those public documentation bytes are restricted provenance evidence only. They
never enter a runtime object, model input, customer output, or authorization
decision.

## 3. Dependency and Ownership Boundary

Section 7.3 semantically depends only on the frozen Section 7.1 provider
vocabulary plus the Section 7.3 provider-source registry. Exact hashes of all
four Section 7.1 artifacts and eight inherited Confidential Space claim IDs are
inputs to Section 7.3 provider revalidation. Section 7.2 is the
branch base and a compatibility boundary, not a Section 7.3 hash dependency.
No Section 7.2 profile, control, instance, or hash value enters a Section 7.3
preimage.

Ownership remains explicit:

- Section 7.3 owns security-authority policy/evidence shapes, HSM/WIF/IAM role
  separation, detached image-provenance policy, held rollover states, and the
  required authority-audit event inventory.
- Section 7.4 owns attestation verification, receipt signature preimages,
  signer acceptance, freshness/nonces, and receipt verification.
- Section 7.5 owns the actual logging, sink, bucket, routing, retention, network,
  disk, and persistence implementation.
- Section 7.6 owns attempt and authority-mutation ledger records.
- Section 7.7 owns whole-system reconciliation and threat-model GO/HOLD.
- Section 7.8 owns exact qualification execution, after fresh human approval.

No forward interface contains a placeholder live hash. Later sections must bind
an actually approved live policy/evidence pair; the approved lists are empty.

### Section 7.5 parent-admission interface

Section 7.3 defines a closed future admission interface only for a typed,
canonical-byte-bound `FULL_SECTION_7_5` target. It rejects every Section 7.5A
schema, kind, domain, or hash substitution before any approval or evidence
claim. The later target must provide its exact canonical bytes and SHA-256,
then bind authenticated opaque role aliases and provider-binding commitments to
that target. No provider identifiers or alias mappings are retained here.

The interface requires later fixed-point/separation evidence to bind the exact
target, alias/provider-binding records, controller-set commitment, completeness
witness, fixed-point result, and zero forbidden intersections. It closes only
the Section 7.3 parent-admission portions of `S75A-P01`, `S75A-P02`, `S75A-P05`,
`S75A-P06`, `S75A-P08`, and `S75A-P19`; it does not close their future
full-Section-7.5 mechanics, P07, any runtime satisfaction, or authority.
All live alias/provider-binding records remain empty.

## 4. Provider Claims Closed Here

The public-source bundle establishes only the provider mechanics used by this
contract:

- Confidential Space recommends direct WIF resource access and defines issuer,
  audience, mappings, conditions, digest claims, and production-state claims.
- Cloud KMS and Cloud HSM support federated API access without a documented KMS
  API limitation on the reviewed service-support page.
- Cloud HSM performs operations in HSMs and exposes attestation evidence that
  Cloud HSM keys are nonextractable.
- Cloud KMS raw key material cannot be viewed/exported and KMS IAM is granted at
  the CryptoKey level, affecting every enabled version.
- asymmetric signing uses purpose `ASYMMETRIC_SIGN`; the selected algorithm is
  `EC_SIGN_P256_SHA256`; signing and public-key retrieval use distinct
  permissions.
- asymmetric keys do not support automatic KMS rotation; rollover requires
  manual public-key distribution and explicit key-version selection.
- IAM deny is evaluated before allow, unknown deny conditions deny, and Policy
  Troubleshooter does not support workload identities as manual principals.
- KMS `AsymmetricSign` is Data Access activity; non-BigQuery Data Access logs
  require explicit enablement; Policy Denied storage can be excluded.
- log-bucket retention can be locked, and locking is irreversible.

This is exact documentation replay—not live capability, configuration,
attestation, policy, audit completeness, or qualification proof. Missing source
or source drift HOLDs. Conflicting current documentation or unsupported claims
reject. The offline byte-replay verifier classifies absence, hash failure, or an
unreplayable compiled evidence window as source drift and emits the HOLD; the
REJECT branch requires reviewed current documentation establishing contradiction
or lack of provider support rather than a byte-replay guess. Both executable
verifiers compile-pin the exact source-registry hash, claim-registry hash,
provider-revalidation hash, source-evidence artifact hash, and counts. Claim
statements are reviewed literal registry content—not semantics inferred from
needles—and a statement change cannot be admitted by resealing mutable registries
or downstream contract/vector hashes without also changing reviewed verifier code
and its exact-byte test pin.

## 5. Project and Identity Model

The design uses five pairwise-distinct project roles:

1. `SECURITY_POLICY_PROJECT`
2. `KEY_CUSTODY_PROJECT`
3. `BUILD_PROJECT`
4. `RUNTIME_PROJECT`
5. `AUDIT_PROJECT`

They are design roles, not provider requirements or observed projects. No actual
project ID or number is present.

Fourteen principal-role aliases are defined:

- `RUNTIME_SIGNER`
- `IMAGE_SIGNER`
- `IMAGE_BUILDER`
- `IMAGE_PUBLISHER`
- `DEPLOYER`
- `KEY_LIFECYCLE_ADMIN`
- `KEY_DESTRUCTION_APPROVER`
- `KEY_DESTRUCTION_EXECUTOR`
- `KMS_IAM_ADMIN`
- `WIF_PROVIDER_ADMIN`
- `PUBLIC_KEY_VERIFIER`
- `SECURITY_AUDITOR`
- `AUDIT_ROUTER_ADMIN`
- `AUDIT_RETENTION_CUSTODIAN`

A live evidence bundle must generate independent, context-bound 128-bit random
aliases. Aliases cannot be hashes or encodings of project/principal/account
identifiers, cannot be reused across bundles, and cannot expose a raw mapping.
The mapping remains in a separately governed restricted boundary.

A random alias is not itself role-separation proof. Live evidence must compute a
least fixed point over the complete provider-owned credential-control graph:
ancestor policies, direct/inherited/conditional bindings, custom roles,
groups/domains, service agents, attached identities, and every direct/indirect
credential controller. Every edge carries an exact provider source type, mapped
edge type, source-record ordinal, evidence commitment, and domain-separated link
to its source snapshot. Each source-class record independently commits its raw
record count, external-mutator count, derived edge count, and exact sorted edge
output; those outputs must compose the global edge inventory exactly. External
mutator count is an independent derived cardinality: one raw binding or policy
record may emit multiple mutators, so it is not capped by raw record count; a
positive mutator count still requires at least one raw source record. Every raw
source ordinal also has exactly one explicit `EDGES_ENUMERATED` or
`NO_CREDENTIAL_CONTROL_EDGE` disposition bound to the source snapshot. An exact
per-source disposition-manifest hash must be externally runtime-approved for
live admission; that approval list remains empty. Auxiliary controller aliases
must reach at least one governed role and cannot be orphaned. These checks prove
internal composition, not provider-source authenticity or completeness. A fully
coordinated source/edge/alias omission can remain structurally consistent in a
synthetic exercise, but it cannot satisfy live admission without the exact
externally approved disposition manifest. A caller-provided `fixed_point` flag
alone proves nothing. Unknown or unviewable edges HOLD. Every pair of role
credential-controller sets must remain disjoint across the full
transitive closure. A separate complete authority-
mutator influence graph covers WIF, key/IAM, audit, owner/editor, and role
mutation power; every mutator must be externally proven dormant, and any
activation invalidates evidence. Credential-controller fixed-point sets and
mutator-influence edges use separate canonical commitments, so state labels
cannot be spliced from a different graph. The live schema also records every
provider-owned source class, cycle set, and external owner/editor, IAM, group,
IdP, service-agent, custom-role, or recovery mutator with typed dormant state.

## 6. Digest Mode and WIF Admission

The contract selects **digest-based WIF admission**. It prohibits Confidential
Space signed-image launch mode, `tee-signed-image-repos`, and image-signature
claim admission because Section 7.1 does not establish that digest and signature
claims coexist in one token.

The WIF contract requires:

- an `ACTIVE`, nondeleted workload identity pool with `disabled=false`;
- an `ACTIVE`, nondeleted OIDC provider with `disabled=false`;
- issuer `https://confidentialcomputing.googleapis.com`;
- subject-token audience and allowed audience
  `https://sts.googleapis.com`;
- separately typed STS endpoint and provider-resource exchange audience;
- direct federated resource access—never service-account impersonation;
- an exact, typed attribute-mapping AST;
- an exact, typed condition AST; and
- only `cloudkms.cryptoKeyVersions.useToSign` on the runtime-receipt key.

The condition AST requires exact TDX hardware, `CONFIDENTIAL_SPACE`, production
`dbgstat`, `STABLE`, secure boot, frozen runtime project/zone bindings, immutable
image digest, empty command/environment overrides, restart `Never`, and disabled
memory monitoring. Missing claims, wrong types, aliases, unknown values, extra
conditions, or raw-CEL namespace substitutions reject.

The subject-token `aud`, STS endpoint binding, and STS exchange-audience binding
are separate fields. Only `aud` is compiled from current source evidence; the
endpoint/resource-name values remain keyed external commitments requiring fresh
source validation. They must not be aliased. Existing tokens can remain usable when a WIF
provider is newly disabled, so any pool/provider state change immediately holds
runtime authority and requires fresh-token denial proof.

## 7. Alternate Credential Closure

“No service-account impersonation” is not enough. A future live evidence bundle
must prove that all alternate paths are denied in the same valid request context:

- attached VM identity access to KMS;
- metadata-server access-token access to KMS;
- user-managed service-account keys;
- `iam.serviceAccounts.actAs`;
- `getAccessToken`, `getOpenIdToken`, and `signBlob`;
- `roles/iam.serviceAccountTokenCreator`; and
- any service-account impersonation route.

Raw `google_service_accounts`, account/email values, metadata tokens, and
principal URIs are never admitted. Only closed denial outcomes and context-bound
aliases may appear in a future evidence snapshot. An unexpected success,
ambiguous network/token/key-state failure, missing audit correlation, or unknown
route HOLDs.

## 8. HSM Key Profiles

Image provenance and runtime receipts use two distinct CryptoKeys. For each live
generation the contract requires:

```text
generation model     DISTINCT_CRYPTOKEY_PER_GENERATION
material origin      GENERATED_IN_CLOUD_HSM_NEVER_UNENCRYPTED_OUTSIDE_HSM
protection level     HSM
purpose              ASYMMETRIC_SIGN
algorithm            EC_SIGN_P256_SHA256
versions             exactly ["1"]
version state        ENABLED
automatic rotation   PROHIBITED
```

The evidence snapshot must bind a random generation alias, SPKI DER SHA-256,
HSM-attestation SHA-256, and certificate-chain SHA-256. Raw public/private keys,
attestations, certificates, and signatures remain external.

A distinct CryptoKey is required for each generation because IAM access cannot
be managed per version and applies to every enabled version. Imported, external,
software, extra-version, disabled, pending, destroyed, alias/primary-resolution,
or automatic-rotation configurations reject or HOLD as declared.

## 9. Least Privilege and Mutation Power

The matrix is default-deny for every security-sensitive capability or
permission. Exact provider bindings appear only where source-closed; non-security
build/deploy and Section 7.5 audit capabilities authorize no provider permission
in Section 7.3:

- `RUNTIME_SIGNER` may use `useToSign` only on the runtime-receipt key.
- `IMAGE_SIGNER` may use `useToSign` only on the image-provenance key.
- `PUBLIC_KEY_VERIFIER` may retrieve public keys only.
- builder, publisher, deployer, key lifecycle, destruction approval/execution,
  KMS-IAM, WIF-provider, audit routing, audit retention, and security audit
  capabilities are separately scoped.
- unlisted roles, permissions, resources, or capabilities reject.

Administrators are not falsely described as unable to escalate. Key-lifecycle,
KMS-IAM, and WIF-provider administrators are `AUTHORITY_MUTATOR` roles. Audit
router and retention roles are `AUDIT_MUTATOR` roles. They have no standing
`useToSign`, but mutation power can change effective authority. Any activation,
policy/role/provider/key/project/audit change, or previously unknown ancestor
binding invalidates the evidence snapshot and holds runtime authority until the
complete authority graph and canaries are re-proved.

## 10. Detached Image Provenance

Section 7.3 defines a future detached pre-deployment provenance payload; it does
not sign an image in this change. The payload has one canonical JSON shape with
closed Simple Signing fields:

- `critical.identity.docker-reference`
- `critical.image.Docker-manifest-digest`
- `critical.type = "cosign container image signature"`
- `optional = {}`

The image key uses KMS `EC_SIGN_P256_SHA256`; the corresponding Confidential
Space claim spelling is `ECDSA_P256_SHA256`. The immutable OCI reference, digest,
key-generation alias, version, SPKI commitment, and payload-schema commitment
must be bound by later live evidence. Raw OCI references use domain-separated HMAC commitments from an externally
attested restricted privacy boundary, never plain SHA-256. Runtime-approved
privacy-boundary, provenance-verifier, and deployment-gate policy lists are
empty in Section 7.3; synthetic policy hashes are schema-test only. A
separately controlled verifier cross-binds the exact digest/reference, key
generation/version/SPKI, payload-schema and canonical-payload hashes, signature
and verification receipts, verification time, deployment candidate/attempt, and
gate consumption into one canonical provenance binding. It must produce
`DETACHED_PROVENANCE_VALID_FOR_EXACT_OCI_DIGEST` before a deployment candidate is
eligible; missing or mismatched provenance rejects.

Cosign interoperability is not claimed until separate byte-level conformance.
Binary Authorization signing of a digest is relevant provider evidence, but this
contract does not claim Binary Authorization enforces Compute Engine or
Confidential Space deployment. WIF remains digest-based.

## 11. Effective Access and Denial Proof

Live evidence requires a complete positive/negative tuple universe. Positive
standing tuples are limited to:

- runtime signer → runtime key → `useToSign`;
- image signer → image key → `useToSign`; and
- verifier → each key → `viewPublicKey`.

The exact compiled universe contains all 56 combinations of 14 roles, two
signing keys, and `{useToSign, viewPublicKey}` exactly once: four ALLOW and 52
DENY. Every alternate credential route must also be denied against both signing
keys. Canaries must use the same valid token, network, enabled
key, request shape, and observation window so that a failure proves
authorization—not token, DNS, network, key-state, or request-shape failure.

Every access/alternate record binds its exact role and random alias, key purpose
and generation alias, common effective-policy snapshot, WIF policy where
applicable, same-context group, unique audit correlation, and canonical record
binding. Policy snapshots must close allow, deny, PAB, custom roles, ancestor
bindings, service agents, attached identities, WIF provider configuration, and
audit mutators with etag commitments. Groups/domains in a signing path reject.
`UNKNOWN`, incomplete visibility, stale etags, unexpected success/failure,
ambiguous denial cause, or missing log correlation HOLDs.

Policy Troubleshooter is not authoritative for the WIF signer because the
reviewed documentation does not support workload identities as manual principal
inputs. The contract also does not assume IAM deny supports `useToSign`; it
relies on complete policy closure plus same-context observed denial evidence.
No canary is executed by this PR.

## 12. Held Rollover State Machine

Cloud KMS automatic asymmetric rotation is prohibited. Future rollover uses a
new CryptoKey generation and remains held throughout:

1. `HOLD_PREPARE`
2. verify new HSM attestation and public key;
3. freeze the new policy;
4. revoke the old signer grant;
5. prove old-key denial with fresh and preexisting token contexts;
6. grant the new signer;
7. prove new allow and all cross-key denies;
8. freeze new evidence; and
9. remain held pending Section 7.7/7.8.

The live shape contains the complete state-prefix event sequence with strictly
increasing timestamps and unique evidence commitments; a later state cannot be
asserted without every prior transition.

Timers are not propagation proof. Two approved generations are prohibited.
Compromise immediately holds and revokes rather than following normal cutover.
Old public-key commitments remain available for receipt verification. Destroy or
restore requires distinct approver/executor evidence and cannot precede the
receipt-retention boundary selected later. Any re-enable or restore invalidates
all current authority evidence.

## 13. Audit Evidence Interface

Section 7.3 defines the required authority-audit inventory but does not choose or
instantiate logging persistence. Section 7.5 owns sinks, buckets, routing,
retention, and storage.

The future interface enumerates authority operations for STS token exchange,
WIF pool/provider mutation, allow/deny/PAB/custom-role mutation, key
creation/state/destruction/restore, KMS-IAM mutation, signing allow/deny outcomes,
public-key retrieval, image provenance publication, alternate credentials, and
audit configuration/routing/retention changes. Except for source-closed KMS
`AsymmetricSign` Data Access behavior, Section 7.5 must map every operation to
exact provider service/method/log semantics with fresh source revalidation. A
live snapshot must bind an explicitly approved Section 7.5 contract, decision,
method mapping, and operation inventory. The approved binding list is empty in
this Section 7.3 change.

KMS Data Access must be enabled without exemptions before execution. Required
Policy Denied evidence cannot be excluded. Router and retention custody remain
separate. The eventual persistence must prove immutable retention, completeness
windows, and its own mutation history.

Cloud audit logs can contain principal emails and IP addresses. Raw logs never
enter FluencyTracr. Only context-bound aliases, high-entropy bundle commitments,
closed counts/windows, and opaque restricted references may cross. Hashes are
consistency commitments, never anonymization.

## 14. Canonicalization and Hash Graph

Objects validate before hashing. UTF-8 JSON uses sorted keys and minified
separators. Unknown fields, duplicate keys, null, floats, non-NFC/control/
surrogate strings, Boolean/integer aliasing, negative zero, unordered declared
sets, missing fields, extra fields, stale self-hashes, or invalid domains reject.

Section 7.3 owns exactly three acyclic nodes:

```text
provider_revalidation_hash
  -> security_authority_policy_hash
      -> security_authority_evidence_snapshot_hash
```

The policy/evidence domains are distinct. The evidence snapshot binds the policy
hash. Neither node depends on Section 7.2. Runtime-approved policy/evidence lists
are empty; synthetic test hashes can never enter live admission. Synthetic
validation proves only closed structure and deterministic derivation—it does not
prove external authenticity, provider completeness, HMAC correctness, signature
validity, or approval. A closed live
evidence contract separately types random aliases, controller inventories and
edge-derived credential-controller fixed points and cycle rejection, a separate
dormant internal/external mutator influence graph, WIF
states/etags/AST and existing-token denial commitments, exactly two distinct HSM
key records, cryptographically cross-bound detached provenance, the full
compiled access universe and two-key alternate-credential tuples, role-bound
rollover records, and audit-interface evidence bound to an approved Section 7.5
contract/decision. The audit completeness window must contain every WIF denial,
access/alternate canary, provenance verification, and rollover event and cannot
exceed the snapshot observation time. Mutation counters are exact integers.
Observed evidence must itself be in the runtime-approved evidence-hash list,
which remains empty.

## 15. Decision Precedence

First matching outcome wins:

1. `REJECT_FOR_PRIVACY_OR_BOUNDARY_LEAKAGE`
2. `REJECT_FOR_PROVIDER_CONFLICT_OR_UNSUPPORTED_CLAIM`
3. `HOLD_FOR_PROVIDER_SOURCE_UNAVAILABLE_OR_DRIFT`
4. `REJECT_FOR_ROLE_OR_CONTROLLER_COLLISION`
5. `REJECT_FOR_KEY_WIF_POLICY_OR_DIGEST_MODE_MISMATCH`
6. `HOLD_FOR_INCOMPLETE_STALE_OR_AMBIGUOUS_EVIDENCE`
7. `GCP_SECURITY_AUTHORITY_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD`

Unknown or missing decision inputs reject at the boundary. There is no override,
grace period, approval shortcut, or additive authority under composition.

## 16. Privacy and Non-Authorization

Prohibited material includes person/user/employee/account/email/group/domain
identifiers, raw principals/projects/policies/logs/tokens, dictionaryable
identifier hashes, identifier-bearing locators, private/raw/wrapped key bytes,
real signatures, credentials, customer/model data, and arbitrary payloads.

Allowed material is limited to public-source commitments, synthetic test values,
context-bound random aliases, public-key/attestation commitments, and closed
counts/windows. The public-source recovery exception applies only to external
restricted documentation snapshots.

Every non-authorization flag in the machine contract is false. This contract has
no additive authority by itself or in combination with another object.

## 17. Required Next Step

The Section 7.3 contract can be reviewed and merged independently. It does not
make evidence present. The next eligible separately authorized scope is Section
7.4's docs-only attestation and receipt contract, while Section 7.5 must later
close the immutable audit persistence interface. No live GCP action may begin
without Sections 7.4–7.8, Section 7.7 GO, exact Section 7.8 qualification, and a
fresh action-specific human authorization.

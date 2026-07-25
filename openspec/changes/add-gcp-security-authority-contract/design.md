## Context

The canonical GCP runtime candidate requires Section 7.3 to close distinct projects/principals, HSM origin/non-exportability, WIF-to-KMS admission, effective-access/deny proof, image signing, lifecycle, and immutable audit evidence. Section 7.2 explicitly defers these concerns and keeps runtime authority held.

The parent privacy boundary prohibits account/email/person identifiers and raw logs/policies. Provider documentation can contain public example identifiers only inside restricted external recovery evidence.

## Goals

- Freeze exact Section 7.3 provider claims and replayable evidence.
- Separate policy definition from absent live operational evidence.
- Prevent alternate credentials, cross-key use, transitive administrator control, and synthetic-hash promotion.
- Define later interfaces without executing or authorizing them.

## Non-Goals

- No GCP access, provisioning, IAM/WIF/KMS/Logging mutation, key creation, signing, image build/push, canary, rollover, deployment, qualification, or model execution.
- No receipt signature preimage or signer-acceptance rule; Section 7.4 owns those.
- No logging/persistence implementation; Section 7.5 owns it.
- No raw principal/project/account/policy/log mapping in repository artifacts.

## Decisions

### Section 7.1 is the only semantic dependency

Section 7.2 is the branch base and compatibility boundary, not a Section 7.3 hash dependency. Exact hashes for all four Section 7.1 artifacts and the inherited Confidential Space claim IDs enter provider revalidation. This prevents a security-authority policy from incorporating a synthetic runtime profile or instance while still detecting Section 7.1 drift. Section 7.4/7.7 must reconcile the independent contracts later.

### Digest mode, not signed-image admission

Section 7.1 provider evidence says image signature and digest claims do not coexist in one token. Section 7.3 independently selects digest-based WIF and prohibits signed-image launch mode; that selection is compatible with, but not derived from, Section 7.2. Detached image provenance is separately defined and must be checked before deployment; it does not become WIF admission.

### Direct WIF resource access

The future runtime signer is a digest-scoped federated principal with direct `useToSign` access to only the runtime-receipt CryptoKey. Service-account impersonation, attached-identity access, metadata credentials, service-account keys, Token Creator, and IAM Credentials API alternatives are prohibited and require same-context denial evidence.

Subject-token audience, STS endpoint, and STS provider-resource exchange audience are separate typed fields. The pool/provider must be active, nondeleted, and enabled. Any mutation invalidates evidence because disabling a provider does not revoke already-issued tokens.

### Distinct HSM CryptoKey per generation

KMS IAM cannot be scoped to one key version and reaches all enabled versions. Each image or runtime generation therefore uses a distinct CryptoKey with exactly version `1`. The version must be HSM-generated, nonextractable by verified HSM attestation, `ENABLED`, purpose `ASYMMETRIC_SIGN`, and algorithm `EC_SIGN_P256_SHA256`. Automatic asymmetric rotation is prohibited.

### Standing permissions differ from authority mutation

Signer, builder, publisher, deployer, key-lifecycle, key-destruction approver/executor, KMS-IAM, WIF-provider, verifier, auditor, audit-router, and retention-custodian roles are separate. Key/IAM/WIF administrators are honestly labeled `AUTHORITY_MUTATOR`: they have no standing signing permission but can alter authority. Any mutation holds runtime authority until complete re-proof.

Role aliases alone are insufficient. Live evidence computes the least fixed point over complete provider-owned credential-control inventories and requires every role pair to have disjoint direct and indirect credential-controller sets. Authority-mutator influence edges are a separate complete graph; every mutator must be externally proven dormant, and any activation invalidates evidence. This avoids falsely treating the KMS/WIF administrator's expected policy influence as shared credential control. Caller-asserted completeness and unknown policy edges fail closed.

### Policy and evidence are separate hash domains

Section 7.3 owns provider revalidation → security policy → security evidence snapshot. Synthetic vectors exercise both domains, but live approval lists remain empty and the evidence state is `NOT_OBSERVED_NO_GCP_ACCESS`. A separate closed live-evidence schema types aliases, fixed-point inventories/witnesses, WIF and HSM evidence, access tuples, rollover, audit-interface evidence, and mutation counters. No composition can turn a synthetic hash into authority.

### Effective access requires same-context evidence

A compiled complete universe covers every role × signing resource × `{useToSign, viewPublicKey}` tuple exactly once, plus every alternate-credential route. Records bind principal role, exact enabled resource, permission, context group, policy etags, valid token/network/request context, result, and audit correlation. Ambiguous failures do not prove IAM denial. Policy Troubleshooter is not treated as authoritative for a workload identity, and the contract does not assume deny-policy support for `useToSign` without exact source proof.

### Rollover stays held

Rollover creates a new CryptoKey generation, revokes and proves denial on the old key, grants and proves the new key, proves cross-key denials, then freezes evidence. It remains held for Sections 7.7/7.8. Timers are not propagation proof, two approved generations are prohibited, and compromise revokes immediately.

### Audit inventory is Section 7.3; persistence is Section 7.5

Section 7.3 enumerates required authority operations and immutable evidence requirements. Except for source-closed KMS `AsymmetricSign` Data Access behavior, Section 7.5 maps operations to exact provider service/method/log semantics and selects/proves sinks, buckets, routing, retention, and persistence. Raw Cloud logs remain externally restricted because they can contain principal emails and IPs.

## Alternatives Rejected

- **Service-account impersonation:** rejected due extra authority paths and parent account/email boundary.
- **One CryptoKey with many versions:** rejected because IAM access cannot be version-scoped.
- **Signed-image WIF mode:** rejected because digest/signature claim coexistence is not established.
- **Pairwise alias inequality only:** rejected because indirect controllers can collide.
- **Policy Troubleshooter-only denial proof:** rejected because workload identities are not supported manual principals.
- **Locked log bucket selected here:** rejected because Section 7.5 owns logging and persistence.
- **Synthetic policy as approved:** rejected; all live approval lists remain empty.

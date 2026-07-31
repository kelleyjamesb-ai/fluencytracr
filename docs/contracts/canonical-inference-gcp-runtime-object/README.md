# GCP Canonical Runtime Object and Hash Contract

## 1. Status and Scope

Section 7.2 decision:

```text
GCP_RUNTIME_OBJECT_HASH_CONTRACT_CLOSED_RUNTIME_AUTHORITY_HELD
```

Runtime-identity posture:

```text
INSUFFICIENT_NO_OBSERVED_INSTANCE_ATTESTATION_OR_QUALIFICATION
```

This docs-only contract implements Section 7.2 of
[`canonical-inference-gcp-runtime-candidate`](../canonical-inference-gcp-runtime-candidate/README.md).
It closes the candidate runtime-object field inventory, stable-profile versus
per-instance boundary, identity-keyed Compute control-plane projection,
profile/control crosswalk, canonical bytes, acyclic hash preimages, field
visibility/sufficiency treatment, and mandatory requalification transitions.

The normative machine artifacts are:

- [`runtime-object-contract.json`](runtime-object-contract.json): field
  registry, object schemas, canonicalization, hash DAG, decisions, and
  invalidation triggers;
- [`control-plane-projection.json`](control-plane-projection.json): total
  Section 7.2 disposition of all 257 frozen Compute paths;
- [`provider-revalidation.json`](provider-revalidation.json): fresh downstream
  `EXACT_MAPPING_RECONFIRMED` evidence for the exact Section 7.1 vocabulary;
- [`canonicalization-vectors.json`](canonicalization-vectors.json): synthetic
  golden objects, exact canonical body bytes, domain-separated preimages, and
  SHA-256 results, plus the held runtime-profile approval-interface evidence.

`scripts/verify_gcp_runtime_object_revalidation.py` independently replays the
fresh external source bundle, every claim context/commitment, the retained
current 257-field Compute projection, and the total revalidation hash. It
accepts only the compiled exact revalidation artifact, Section 7.1 claim graph,
and bundle hash; a self-consistent alternate `--revalidation` file rejects.

Closure means only that later contracts have one exact object/hash interface.
It does not mean that a C3/TDX instance exists, its identity is sufficient, the
virtual-profile treatment is accepted, or runtime authority is active.

This contract authorizes no GCP project or resource access, credential use,
billing, provisioning, mutation, image operation, deployment, qualification,
model execution, customer input/output, or work on Sections 7.3–7.8.

## 2. Exact Section 7.1 Dependency

This contract consumes no provider vocabulary other than the exact merged
Section 7.1 artifacts:

| Bound artifact | SHA-256 |
| --- | --- |
| provider contract `README.md` | `a85e18b93f51303d26c46e0839705437a794c23957cde9f07b81afdf9d77bcda` |
| `source-evidence.json` | `939ebe94f73754caa0e05ed5f740e5d0fcc5e3f136b265ea5fbc5579cfd09743` |
| `claim-evidence.json` | `b6e5b878de67efbabbda699332e608af7c112d20c62910ea6ebd033bdb75e422` |
| `compute-field-projection.json` | `f161f131530ec5e978ff4a86cd965b92088617efd21f2810b0ab4e1e41f5815c` |
| claim registry | `4d9a53791b6f3dc8fec4b0dfe7d7d0ad6ef7fdd502f15193fe35989291fc062c` |
| external Section 7.1 recovery bundle | `ceed3461f1e95305f4182eda6ffc9a1093f524704afd7b0f8ee71dc223359f21` |

The historical Section 7.1 source/claim states are not edited or relabeled.
A changed mapping requires a new provider-vocabulary candidate.

Provider layers remain distinct:

```text
raw JWT payload.hwmodel                   = GCP_INTEL_TDX
CEL assertion.hwmodel                     = INTEL_TDX
Compute confidentialInstanceType          = TDX
FluencyTracr canonical technology          = INTEL_TDX
```

No aliasing, case folding, display substitution, region-for-zone conversion,
numeric GCP-ID coercion, mutable image tag, or closest value is accepted.

## 3. Fresh Provider Revalidation

A fresh public-document review ran during
`2026-07-24T15:10:43Z..2026-07-24T15:15:41Z` using the same 16 official URLs
and source IDs frozen by Section 7.1. It used public HTTPS only—no GCP project,
credentials, resource APIs, live capability discovery, or mutation.

The machine evidence records:

```text
source_count=16
http_200_count=16
claim_count=20
source_observation_count=22
evidence_needle_count=113
missing_evidence_needles=0
compute_provider_revision=20260709
compute_field_count=257
compute_projection_result=EXACT_MAPPING_RECONFIRMED
recorded_result=EXACT_MAPPING_RECONFIRMED
current_compute_projection_sha256=65280a504fe2129b5cf597912510426cf6c2b4a6c343f294cdfe985589479854
external_revalidation_bundle_sha256=99f2387fa1bed1b491dfd34a5b5c365f37822af4a26cb96a3d29fc649b0372b9
revalidation_hash=38aa8151ed391369c3703279bb1172d0e1fef389f6ea4d70e9242d401d578535
```

Mutable page bytes changed from the Section 7.1 snapshot, so byte equality was
not used as a false freshness rule. The fresh bytes are retained outside the
repository in the hash-bound deterministic recovery object
`external-recovery://fluencytracr/gcp-runtime-object-revalidation-source-snapshot-20260724T151043Z.zip`.
The exact frozen mappings and a retained full current Compute schema projection
were replayed against those bytes. The non-required
`GCP_TEE_ENV_SUFFIX_GRAMMAR` mapping was also reconfirmed: the source still
publishes the placeholder and example but no complete suffix grammar. Dynamic
keys remain default-deny; no regex was inferred.

The recovery object makes the review replayable but remains external and
untracked. This is still not a signed transport receipt, trusted timestamp,
provider attestation, runtime observation, or live availability proof. Any
missing source, claim mismatch, current source
conflict, changed mapping, or boundary leakage would replace the result with
the exact Section 7.1 HOLD/REJECT path and block this contract.

## 4. Three Separate Runtime Objects

### 4.1 Deterministic numerical profile

`GCP_CANONICAL_NUMERICAL_PROFILE_V1` contains only values expected to remain
identical across every instance qualified under one profile. Its 84-field
registry includes:

- the exact provider/environment/C3/TDX/substrate values;
- the exact `c3-standard-4` shape and approved zone set;
- restrictive Confidential Space, Compute scheduling, launch, disk, network,
  metadata, workload-identity policy, exact raw CPU-platform, and residual-control
  posture bound through direct equalities or domain-separated manifests;
- CPU vendor, family, model, stepping, microcode, instruction profile,
  firmware, hypervisor, and VM measurement requirements;
- immutable OS/kernel/service-image identities;
- Python executable/version, dependency lock, installed wheels, native
  extensions, NumPy, SciPy, PyMC, ArviZ, PyTensor, OpenBLAS, libc, libm, and
  loader identities;
- effective native dispatch, OpenBLAS core/thread state, floating-point
  rounding/control state;
- source commit/manifest, model plan, compiled constants; and
- network, filesystem, locale, environment, and process restrictions relevant
  to semantic bytes.

Instance IDs, project identity, boot times, token times, nonce, quote, attempt,
tenant, receipt, result, and routing fields are prohibited from this profile.
Two different instances may share one profile hash only when every profile
field and policy binding is exact.

Known candidate constants are closed now. Values that require an immutable
image or measured runtime use `PROFILE_FREEZE_VALUE`; they must be populated
exactly before qualification and cannot be caller-selected or defaulted.

### 4.2 Per-instance observation

`GCP_RUNTIME_INSTANCE_OBSERVATION_V1` separately binds the restricted actual
instance and independently acquired control observation. Its 30-field registry
covers:

- raw-token, CEL, and Compute TDX literals without aliasing;
- instance ID/name, project ID/number, full zone and resource URIs;
- raw Compute CPU-platform value without treating it as a canonical alias;
- exact machine type, lifecycle state, creation/start timestamps;
- production image state, `swname`, numeric six/eight-digit `swversion`
  strings, support attributes from a finite allowlist with required `STABLE`
  membership, secure boot, and UTC-`Z` TCB date; raw TCB status is not retained
  until Section 7.4 owns its authenticated provider domain;
- immutable container digest/ID and canonical digest-qualified OCI reference
  with matching digest, exact `us-docker.pkg.dev` authority, and exact opaque
  qualification project/repository/image path, plus restart posture;
- no service-account email, scope, or derived identity posture; those provider
  paths reject until Section 7.3 owns a parent-compatible identity contract;
- exact raw attestation-token SHA-256 for later Section 7.4 verification;
- an exact domain-separated hash of the canonical sanitized control-evidence
  envelope; raw Compute-response bytes and hashes are not admitted; and
- explicit hidden/unavailable hardware observations.

This object is restricted operational evidence. Project, instance, host, and
resource identifiers cannot enter model inputs,
semantic results, logs, customer output, or cross-tenant identifiers.

The instance/project/zone/profile/image/start-time tuple, full
zone/machine/selfLink URI authority/project/name segments and lifecycle order
`creation <= current start <= observation` must cross-match
before the observation hash can
be consumed. The raw-token commitment and sanitized control-evidence envelope
hash keep retained evidence cohesive without hashing prohibited provider bytes;
Sections 7.4 and 7.6 must verify token/source authenticity through later external
references before the observation can become attested runtime identity. Section 7.2
structural validity alone does not prove that GCP issued either source.

### 4.3 Downstream interfaces are not Section 7.2 hash nodes

Section 7.2 does not invent placeholder hashes for trust policy, attestation,
qualification, requalification, activation, results, or receipts. It records
only the names and Section 7.2 hashes that later contracts must bind. Their
schemas, domain separators, preimages, and hashes remain owned by Sections
7.3–7.8 and must be reconciled by Section 7.7.

In particular, Section 7.4's future runtime measurement must bind the profile
hash, instance-observation hash, raw attestation-token hash, exact
last-start/observation time, boot-epoch commitment, and fresh nonce. Section
7.6 must bind the sanitized source-envelope hash plus an external raw-provider
source-authentication reference. Section 7.8's future plan/result must bind the
predeclared complete set of instance observations and attested identities.
Section 7.2 has no runtime-identity candidate object and cannot authorize one.

### 4.4 Runtime-profile approval interface remains held

The closed `GCP_RUNTIME_PROFILE_APPROVAL_INTERFACE_V1` binds the resolved
profile's canonical-body SHA-256 and runtime-profile hash to the future
external approval provenance record required from Section 7.4. Its typed
provenance record must carry those two identities, an external approval
artifact SHA-256, and the exact Section 7.4 type
`GCP_SECTION_7_5_EXTERNAL_APPROVAL_POLICY_VERIFIER_RECORD_V1`. This interface
owns no approval verification mechanics and creates no approval record.

Both `external_approval_records` and `runtime_record_references` are empty.
The current profile vector is synthetic-only and can establish neither list;
its hash is not in `approved_runtime_profile_hashes`. The state remains
`EXTERNAL_APPROVAL_AND_RUNTIME_RECORD_REQUIRED` with `authority_effect: NONE`.
An actual approval, any runtime-record mechanics, and their evidence remain
outside Section 7.2 and cannot be inferred from canonical bytes or matching
hashes.

## 5. Presence, Visibility, and Sufficiency

Every field-value record uses exactly one presence state:

```text
PRESENT
EXPLICITLY_ABSENT
PROVIDER_HIDDEN
NOT_OBSERVED_CONTRACT_ONLY
```

`null` is never a substitute for absence. `PRESENT` requires a value; every
other state prohibits a value. Each registry field carries its exact
`allowed_presence`; exact constants and measurable profile/instance values must
be `PRESENT`, provider-hidden fields remain `PROVIDER_HIDDEN`, and only the
optional insufficient physical-host observation may be present or explicitly
unobserved. Missing required records, duplicate field IDs, wrong types,
out-of-domain enums, unsorted/duplicate sets, or unknown states reject.

The machine contract closes value-type grammars and field-specific domains.
All retained generic profile strings use field-specific non-email,
non-payload grammars. Notably `openblas_thread_count=1` and
`floating_point_rounding_mode=ROUND_TO_NEAREST_TIES_TO_EVEN` are exact
constants, not profile-selected values. Provider/raw/CEL/Compute TDX literals,
production/debug state, RUNNING observation state, TDX software version,
support attributes, zones, OCI authority/path/digests, timestamps, hashes, and GCP
uint64 strings are likewise type/domain checked before hashing.

The only provider visibility states are inherited unchanged from Section 7.1:

```text
VISIBLE
HIDDEN_BY_TDX
NOT_EXPOSED_BY_GCP_ATTESTATION
NOT_EXPOSED_BY_GCP_CONTROL_PLANE
```

The only field-binding sufficiency states are also inherited unchanged:

```text
SUFFICIENT_FOR_FIELD_BINDING
INSUFFICIENT_FOR_FIELD_BINDING
REQUIRES_PARENT_GOVERNANCE_DECISION
```

Visibility and sufficiency are independent. `HIDDEN_BY_TDX` and either
`NOT_EXPOSED_*` state never imply sufficiency. A field marked
`REQUIRES_PARENT_GOVERNANCE_DECISION` cannot become sufficient through a
self-asserted value, a content hash, an administrator string, matching output,
or this contract's closure decision.

### 5.1 Predeclared virtual-profile treatment

CPU family/model/stepping/microcode and required instruction-profile identity
may be hidden by TDX. Firmware/hypervisor/VM identity also lacks a sufficient
Section 7.1 provider path. Their exact treatment ID is:

```text
VIRTUAL_PROFILE_EFFECTIVE_STATE_AND_EXACT_EQUIVALENCE_V1
```

Parent governance may later accept that treatment only if the integrated
contracts require all of:

1. trust-rooted provider and workload measurements;
2. exact effective instruction, native dispatch, BLAS, and floating-point
   state;
3. a predeclared fresh-host/fresh-zone exact-conformance study;
4. complete no-selection attempt evidence;
5. full requalification before model import on every boot; and
6. rejection/escalation when drift cannot be detected.

The treatment is not accepted by Section 7.2. It remains pending the Section
7.7 whole-system review and later evidence. If a math-relevant field is proven
unobservable and the treatment cannot detect its drift before execution, C3/TDX
must be rejected and the fixed-physical path evaluated.

`resourceStatus.physicalHost` remains optional, unobserved, and
`INSUFFICIENT_FOR_FIELD_BINDING`. Its only allowed Section 7.2 presence is
`NOT_OBSERVED_CONTRACT_ONLY`; arbitrary or email-shaped `PRESENT` values reject.
The control projection also rejects all physical-topology leaves and the
unconstrained VM-DNS metadata value. Schema existence or an empty value cannot
promote any of them.

## 6. Total Compute Control-Plane Projection

[`control-plane-projection.json`](control-plane-projection.json) classifies the
same 257 exact paths and provider revision as Section 7.1. No parent object
implicitly admits descendants.

Runtime dispositions are:

```text
STRUCTURAL_CONTAINER_ONLY                  45
PROFILE_CONTROL_BINDING                    60
INSTANCE_IDENTITY_BINDING                  41
INSTANCE_AND_PROFILE_BINDING                3
TRANSIENT_OBSERVATION_NO_RETENTION         10
TRANSIENT_POLICY_CHECK_NO_RETENTION         5
DERIVED_POSTURE_ONLY                        2
REJECT_IF_PRESENT                          91
```

The last 91 include every secret/key-material path, each non-admitted leaf,
all KMS service-account control fields pending Section 7.3, unconstrained
`scheduling.locationHint`,
`resourceStatus.physicalHost`, its four topology leaves, and unconstrained
`vmDnsSettingMetadataValue`; email-shaped or arbitrary host/topology values
cannot enter a control observation. Unknown paths use
`REJECT_IF_PRESENT`. All 45 parent objects/arrays are syntax only, including
admitted parents such as `disks[]` and `networkInterfaces[]`; none may carry a
projected object value or authorize a descendant. Every one of the 104
hash-preimage leaf paths appears exactly once either as a scalar row or
inside one identity-keyed resource record. Disk, NIC, accelerator, and
node-affinity fields preserve tuple association and exact
candidate cardinality; independent wildcard scalar sets are prohibited.

All 63 profile-bound paths are covered exactly once by a direct field equality,
resource-cardinality binding, or one of three domain-separated profile manifests
(boot disk policy, network policy, residual controls). Concrete disk/network
resource identities remain instance-only, all server fingerprints are transient,
and resource IDs never enter a profile-manifest preimage. Raw service-account
email/scope values and any derived identity posture are not admitted by Section
7.2. Retained resource names use an opaque
fixed-format non-person namespace; workload-identity, reservation-identity, and
node-affinity identity fields reject until their owning later contracts close.
No runtime profile is approved in Section 7.2. One separately labeled synthetic
test profile hash is compiled only to reject self-consistently rehashed alternate
test vectors; it has no runtime-admission or authorization effect. Required
direct and instance paths cannot be explicitly absent. Metadata allowlist
posture must be exactly `true`; raw-retention postures must be exactly `false`.
A valid provider value that contradicts the bound profile rejects even after
coordinated rehashing.

Profile controls require one exact value or an explicitly allowed absence
frozen before qualification. Instance fields require an independently acquired
observation and retain a domain-separated SHA-256 commitment to the canonical
sanitized source-evidence envelope. No raw Compute-response hash is retained.
Every retained URI-bearing Compute path is explicitly typed; GCP
resource references require bounded canonical
`www.googleapis.com/compute/v1/projects/ft-qualification-*` forms and governed
resource-name prefixes rather than string-shape inference. Instance, zone, and machine-type URIs require byte-exact zonal
`https://www.googleapis.com/compute/v1/projects/.../zones/...` resource shapes;
missing zones, alternate authorities, mismatched final resource names,
parameters, queries, fragments, trailing separators, or repeated/empty path
segments reject.
Volatile or raw prohibited fields are checked and discarded
before hashing or retention. Raw IP addresses may yield only a closed network
posture; raw addresses are discarded. Raw metadata, labels, hostname, and
status message are never retained. The complete Compute response is never an
object field or receipt payload.

The raw launch-policy encoding for an empty environment or mount allowlist is
not guessed. The deterministic profile records the semantic `DENY_ALL` posture;
a later integrated policy must prove the exact provider encoding before
qualification.

## 7. Canonical Serialization

All Section 7.2 hash nodes use `FT_CANONICAL_JSON_V1`:

1. reject duplicate JSON keys before object construction;
2. validate the exact closed schema, types, domains, presence, and collection
   rules;
3. encode UTF-8 with no BOM or trailing newline;
4. sort ASCII schema keys by ascending code point;
5. require Unicode NFC strings and reject control characters;
6. permit only signed 64-bit JSON integers with no coercion, Boolean-as-integer,
   leading zero, unsafe integer, or negative zero;
7. reject every float, non-finite value, and `null`;
8. preserve sequence order; require declared set members to be ASCII and arrive
   already ASCII sorted, and resource sets already sorted by their schema-named identity key;
   reject unsorted or duplicate input rather than normalizing it;
9. reject unknown fields recursively and prohibit implicit defaults; and
10. serialize minified JSON with the declared field-specific grammar.

GCP uint64/int64 identifiers remain strings. Every retained Compute timestamp
path is typed RFC3339. Values preserve exact raw bytes while accepting `Z` or
validated known numeric offsets and 1–9 fractional nanosecond digits; the
unknown-local-offset marker `-00:00` rejects. TDX TCB date is narrower and
requires UTC `Z`. Lifecycle validation requires
`creation <= current start <= observation` and, for a running instance, every
present stop/suspend to satisfy `creation <= stop/suspend < current start`.
Leap seconds reject fail-closed until a frozen
authoritative leap table exists. Hashes use lowercase 64-hex SHA-256. OCI digests use
lowercase `sha256:<64 hex>` only where this
FluencyTracr contract explicitly requires it; that grammar is not misrepresented
as the generic provider token type.

Each hash preimage is exactly:

```text
ASCII_DOMAIN_SEPARATOR || 0x00 || FT_CANONICAL_JSON_V1(body_without_own_hash)
```

Only the node's own hash field is omitted. No serializer silently sorts a
semantic sequence, unwraps scalar-like objects, converts non-finite values to
`null`, or equates missing/empty/null.

The synthetic golden vectors contain exact body bytes and full base64-encoded
preimages for all three Section 7.2 runtime-object hashes. The separate
provider-revalidation artifact and external-bundle verifier replay the fourth
hash-graph node. All are tests only and have no qualification or authorization
effect.

## 8. Acyclic Hash Graph

The complete Section 7.2 topological order is:

```text
provider_revalidation_hash
  -> runtime_profile_hash
      -> control_plane_observation_hash
          -> runtime_instance_observation_hash
```

These are the only Section 7.2 hash nodes. Every node has a distinct domain
separator, closed schema, replayable evidence path, and self-hash omission rule;
the three runtime-object nodes use golden vectors while provider revalidation
uses its exact artifact and external-bundle replay. The
profile never binds a control/instance observation, and no Section 7.2 node
binds a future trust, measurement, qualification, requalification, activation,
result, or receipt hash. No node includes its own hash. Any cycle, unknown node,
duplicate dependency, back-edge, changed domain, or cross-schema hash reuse
rejects.

Later contracts must bind the already-computed Section 7.2 hashes downstream.
Section 7.2 intentionally defines no domain separator, schema, preimage, or
golden placeholder for a future hash, preventing a 7.6→7.8→7.7 ownership loop
or false claim that later evidence is already closed.

Per-attempt nonce, tenant, retry, admission-token, process, result, signature,
and receipt fields never enter the stable profile or instance-observation hash.

## 9. Mandatory Invalidation and Requalification

Initial lifecycle state is always:

```text
INACTIVE_UNQUALIFIED_NO_INSTANCE
```

No Section 7.2 transition reaches `ACTIVE`. The machine contract freezes these
mandatory triggers without tunable grace periods or bypasses:

- every VM boot or restart;
- host replacement, failover, or maintenance termination;
- CPU microcode, firmware, hypervisor, TDX, or VM measurement change;
- Confidential Space image, `swversion`, or support-attribute change;
- OS, kernel, or service-image rebuild/digest change;
- Python, lock, wheel, native-library, or loader change;
- NumPy/SciPy/native dispatch, OpenBLAS core, or thread-state change;
- floating-point rounding/control-state change;
- source commit/manifest, model plan, or compiled-constant change;
- network, filesystem, locale, environment, or process-policy change;
- provider mapping or Compute discovery revision change;
- attestation/trust policy, signer/key, or revocation change;
- required-field visibility or sufficiency downgrade;
- unknown, stale, replayed, revoked, or mismatched measurement; and
- any exact cross-instance or same-profile semantic mismatch.

A machine-type or zone substitution requires a new candidate-selection
decision, not silent requalification. Maintenance uses termination and
validated downtime; automatic restart cannot reactivate the profile. An image
rebuild is a different candidate even when source is unchanged.

A semantic or math-relevant profile mismatch quarantines and rejects the C3/TDX
candidate. It cannot create an alternate C3 oracle, tolerance exception,
favorable retry, or selected subset of passing attempts.

## 10. Decision Precedence

Section 7.2 emits exactly one terminal contract decision in this order:

```text
REJECT_FOR_RUNTIME_OBJECT_BOUNDARY_LEAKAGE
REJECT_C3_TDX_FOR_PROVIDER_CONFLICT
REJECT_C3_TDX_AND_REQUIRE_FIXED_PHYSICAL_CANDIDATE_SELECTION
HOLD_FOR_PROVIDER_CLAIM_REVALIDATION
HOLD_FOR_PARENT_RUNTIME_IDENTITY_TREATMENT
GCP_RUNTIME_OBJECT_HASH_CONTRACT_CLOSED_RUNTIME_AUTHORITY_HELD
```

1. Boundary leakage wins for prohibited/unknown fields, namespace aliasing,
   unsafe retention, self-authorization, GCP action, customer data, or scope
   expansion.
2. `CURRENT_SOURCE_CONFLICT` rejects the C3/TDX provider candidate.
3. C3/TDX deterministically rejects and requires a new fixed-physical candidate
   selection when Section 7.7 rejects the virtual-profile treatment, when any
   required runtime-identity field is `UNBINDABLE`, or when later
   qualification/requalification exactness is `MISMATCH`.
4. Provider revalidation holds for source/provenance unavailability or a
   changed frozen mapping, and otherwise continues only when its result is
   exactly `EXACT_MAPPING_RECONFIRMED` for the bound vocabulary.
5. Parent treatment holds when the virtual-profile treatment is missing,
   weakened, or claimed as accepted before Section 7.7.
6. Contract closure means the Section 7.2 schema is complete while runtime
   authority remains `HELD`.

A closed `GCP_RUNTIME_ESCALATION_INPUT_V1` supplies boundary state, an exact
inherited provider-result enum, parent-treatment decision, one namespaced and
ordered binding result for every required profile and instance runtime-identity
field, and qualification exactness. The optional nonpromoting physical-host
observation is listed separately. Unknown/missing inputs reject; each required
field-level `UNBINDABLE`, parent `REJECTED`, and qualification
`MISMATCH` path is mechanically tested to the fixed-physical terminal result.
No caller Boolean stands in for those predicates.

These are internal infrastructure-contract states. They are not product
suppression reasons and cannot affect `SURFACE` eligibility.

## 11. Privacy and Retention Boundary

Permitted Section 7.2 material is limited to closed schema metadata, hashes,
synthetic vectors, closed derived posture, and restricted infrastructure
identity needed for later verification.

Prohibited in runtime objects, model inputs, logs, results, receipts, and
customer output includes:

- raw GCE or source-system rows;
- customer aggregate payloads;
- person, user, employee, account, email, session, device, or IP identifiers;
- prompts, responses, transcripts, documents, or queries;
- raw metadata/environment/argv/signature values;
- credential, API-key, private-key, raw-key, or wrapped-key bytes;
- arbitrary payloads or free-form extension maps;
- posterior draws, pseudo-draws, latent paths, or conditional components; and
- infrastructure identities in semantic results, customer output, or public
  cross-tenant identifiers.

Raw service-account email and scope values are not admitted, retained, or hashed
by Section 7.2. No derived service-account identity posture is retained here;
Section 7.3 owns any future parent-compatible identity treatment.

The external recovery bundle is a separate restricted provenance exception:
public Google documentation bytes may contain public example email or IP
literals. Those bytes never enter a runtime object, model input, log, receipt,
result, or customer output; only their source commitments and reviewed contexts
enter this contract.

Hashes are consistency commitments, not anonymization, attestation, or
semantic proof.

## 12. Deferred Ownership

Section 7.2 defines typed hash interfaces but does not populate or approve
later evidence:

- Section 7.3 owns HSM, WIF, IAM, principals, and role separation;
- Section 7.4 owns token/quote/certificate verification, workload measurement,
  nonce/freshness, signer policy, and receipts;
- Section 7.5 owns network, logging, disk, tmpfs/swap, and persistence;
- Section 7.6 owns attempt-ledger and requalification record schemas without
  depending on not-yet-executed Section 7.8 evidence;
- Section 7.7 alone may reconcile the completed 7.1–7.6 schemas/interfaces and
  accept or reject the virtual-profile treatment; and
- Section 7.8, only after 7.7 GO, owns exact hosts/zones/processes,
  qualification plan/result preimages, execution, and decision mapping.

No forward interface marks those sections complete or supplies a placeholder
hash.

## 13. Non-Authorization

This contract does not authorize:

- GCP project/resource reads or writes, credentials, quota, billing, or live
  capability discovery;
- IAM, WIF, KMS/HSM, Artifact Registry, VM, network, DNS, firewall, logging,
  storage, or policy changes;
- image build, push, signing, or deployment;
- qualification, conformance, sampling, or model execution;
- production/customer input, persistence, routes, UI, connectors, or output;
- runtime promotion, second authority, admin override, tolerance oracle, or
  favorable retry;
- new canonical events, suppression reasons, or tunable thresholds;
- individual attribution, scoring, ranking, productivity, ROI, causality, or
  economic claims; or
- held VBD work, cross-surface formulas, or Task 2.22.

Every future external, privileged, costly, or execution action requires fresh
authorization immediately before that exact action.

## 14. Required Next Step

The only eligible proposed next scope is Section 7.3: a separately authorized,
docs-only HSM, WIF, IAM, and role-separation contract. This contract does not
authorize that work. Runtime authority remains held. No GCP action or
qualification may begin.

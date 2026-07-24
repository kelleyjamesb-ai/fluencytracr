# GCP Provider Claim and Identity Vocabulary

## 1. Status and Scope

Decision at the bound source snapshot:

```text
GCP_PROVIDER_VOCABULARY_READY_FOR_RUNTIME_OBJECT_HARDENING
```

This docs-only contract freezes the provider terms, GCP claim structures,
resource identity names, evidence states, and dated source mappings that later
Canonical Aggregate Inference Service contracts may consume for the selected
C3/Intel TDX candidate. Structured claim/coverage evidence is in
[`claim-evidence.json`](claim-evidence.json); the complete Compute schema
classification is in
[`compute-field-projection.json`](compute-field-projection.json).

It does not define runtime-object schemas, hash preimages, receipt schemas,
IAM/HSM policy, networking, persistence, attempt ledgers, or execution plans.
It authorizes no GCP resource read or mutation, billing, credential use, image
operation, deployment, qualification execution, model execution, customer
input/output, or held-branch merge.

## 2. Normative Provider Identity

Downstream contracts use exactly:

```text
provider=GCP
execution_environment=CONFIDENTIAL_SPACE
confidential_space_image_posture=PRODUCTION
machine_series=C3
provisional_machine_type=c3-standard-4
cpu_platform=INTEL_SAPPHIRE_RAPIDS
confidential_computing_technology=INTEL_TDX
execution_substrate=QUALIFIED_ATTESTED_VIRTUAL_PROFILE
```

These are FluencyTracr canonical values. They are not aliases for raw provider
literals. Section 6 separately freezes each provider layer:

```text
raw JWT payload hwmodel                    = GCP_INTEL_TDX
CEL attestation-policy assertion.hwmodel  = INTEL_TDX
Compute confidentialInstanceType          = TDX
```

Unknown aliases, case variants, display substitutions, machine families,
mutable image tags, or caller-provided alternatives reject.

## 3. Source Evidence and Revalidation Semantics

### 3.1 Immutable source-snapshot state

Each registry claim in
[`claim-evidence.json`](claim-evidence.json) records exactly one immutable
source-snapshot state:

```text
CONFIRMED_AT_RETRIEVAL
REVALIDATION_REQUIRED
UNAVAILABLE_FROM_PROVIDER
CONFLICTING_PROVIDER_EVIDENCE
```

The state is projected once per claim using this total precedence:

1. `CONFLICTING_PROVIDER_EVIDENCE` if any current same-layer source contradicts
   the frozen mapping or another current required source.
2. Otherwise `REVALIDATION_REQUIRED` if any source required by the claim was
   not retrieved, returned non-200, could not be parsed, or lacks required
   provenance.
3. Otherwise `UNAVAILABLE_FROM_PROVIDER` if all required sources were retrieved
   and they explicitly do not publish the required field/type/grammar/value.
4. Otherwise `CONFIRMED_AT_RETRIEVAL` only if every source required by the
   claim was retrieved and the named field/value/type matches.

Each structured claim declares `source_requirement=ALL`, exactly one
observation per source, and its projected state. The exact 20-claim registry,
22 observations, required flags, sections, source edges, locators, and frozen
mappings are pinned by claim-registry SHA-256
`4d9a53791b6f3dc8fec4b0dfe7d7d0ad6ef7fdd502f15193fe35989291fc062c`.
No claim or source can be silently dropped or demoted. The precedence makes
multi-source claims single-valued even when separate failure observations
coexist.

Boundary leakage is not downgraded to an evidence state. It directly maps to
`REJECT_FOR_BOUNDARY_LEAKAGE`.

`CONFIRMED_AT_RETRIEVAL` describes only the immutable snapshot in
[`source-evidence.json`](source-evidence.json). It is not a claim that mutable
provider documentation remains current.

### 3.2 Downstream revalidation result

Every downstream consumer must attach a fresh revalidation result:

```text
EXACT_MAPPING_RECONFIRMED
SOURCE_OR_PROVENANCE_UNAVAILABLE
FROZEN_MAPPING_CHANGED
CURRENT_SOURCE_CONFLICT
BOUNDARY_LEAKAGE_DETECTED
```

Projection is total:

1. `BOUNDARY_LEAKAGE_DETECTED` rejects.
2. Otherwise `CURRENT_SOURCE_CONFLICT` rejects.
3. Otherwise `SOURCE_OR_PROVENANCE_UNAVAILABLE` holds.
4. Otherwise `FROZEN_MAPPING_CHANGED` holds for a new vocabulary version.
5. Only `EXACT_MAPPING_RECONFIRMED` permits the downstream docs-only consumer to
   use the frozen mapping.

Revalidation never mutates this document's historical state, silently changes a
source ID, or creates a second accepted provider literal.

## 4. Bound Official Sources

The source-evidence manifest is:

```text
schema_version=GCP_PROVIDER_SOURCE_EVIDENCE_V1
retrieval_interval=2026-07-24T03:07:50Z..2026-07-24T03:08:12Z
content_retention=HASH_ONLY_EXTERNAL_SNAPSHOT_UNTRACKED
```

Every source returned HTTP 200 during that interval. The manifest binds each
original URL, redirect target, per-source start/end time, byte count, and
SHA-256. Full first-generation source bytes remain external and untracked in
the opaque recovery object
`external-recovery://fluencytracr/gcp-provider-vocabulary-source-snapshot-20260724T030000Z.zip`.
The manifest freezes archive format, fixed member metadata, member order,
per-member hashes/lengths, archive length, and archive SHA-256 so an authorized
holder can replay both source and aggregate bundle integrity without a direct
home-directory path in repository history. This proves integrity after capture;
it is not a signed transport receipt or independently trusted timestamp and
cannot prove who served the bytes. Snapshot READY therefore records reviewed
public-document evidence only, never runtime attestation or current provider
freshness.

Only these source IDs are recognized by this version:

| Source ID | Governed claim area |
| --- | --- |
| `GCP_CPU_PLATFORMS_2026_07_24` | C3 CPU generation |
| `GCP_C3_MACHINE_TYPES_2026_07_24` | exact C3 predefined machine-type table |
| `GCP_CONFIDENTIAL_VM_CONFIG_2026_07_24` | C3/TDX shapes, zones, migration, sole-tenancy |
| `GCP_CONFIDENTIAL_VM_ATTESTATION_2026_07_24` | TDX attestation and RTMR behavior |
| `GCP_CONFIDENTIAL_SPACE_OVERVIEW_2026_07_24` | Confidential Space role/workload model |
| `GCP_CONFIDENTIAL_SPACE_ASSERTIONS_2026_07_24` | CEL attestation-policy vocabulary |
| `GCP_CONFIDENTIAL_SPACE_TOKEN_CLAIMS_2026_07_24` | Raw JWT header/payload claim structure |
| `GCP_CONFIDENTIAL_SPACE_TOKEN_VALIDATION_2026_07_24` | OIDC/PKI verification endpoint vocabulary |
| `GCP_CONFIDENTIAL_SPACE_DEPLOY_2026_07_24` | TDX deployment and lifecycle controls |
| `GCP_CONFIDENTIAL_SPACE_METADATA_2026_07_24` | Workload metadata keys and domains |
| `GCP_CONFIDENTIAL_SPACE_LAUNCH_POLICY_2026_07_24` | Image launch-policy labels and domains |
| `GCP_CONFIDENTIAL_SPACE_WORKLOAD_2026_07_24` | Image, disk, memory, ingress, logging, mount, swap controls |
| `GCP_COMPUTE_INSTANCES_REST_2026_07_24` | Human-readable Compute Instance REST schema |
| `GCP_COMPUTE_DISCOVERY_V1_2026_07_24` | Machine-readable Compute v1 discovery revision `20260709` |
| `GCP_SOLE_TENANCY_2026_07_24` | Physical-server and node vocabulary for fallback only |
| `GCP_HOST_EVENTS_2026_07_24` | Host event, migrate/terminate, restart behavior |

All references are mutable. Any later use requires Section 3.2 revalidation.

## 5. Provider Claim Registry

| Claim ID | Frozen mapping | Source ID | Snapshot state |
| --- | --- | --- | --- |
| `GCP_C3_CPU_PLATFORM` | `INTEL_SAPPHIRE_RAPIDS` | `GCP_CPU_PLATFORMS_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_C3_TDX_MACHINE_SUPPORT` | `c3-standard-*` supports Intel TDX | `GCP_CONFIDENTIAL_VM_CONFIG_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_C3_STANDARD_4_MACHINE_TYPE` | `c3-standard-4` exists with 4 vCPUs and 16 GB and falls within the TDX-supported wildcard | `GCP_C3_MACHINE_TYPES_2026_07_24`, `GCP_CONFIDENTIAL_VM_CONFIG_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_C3_TDX_ZONE_SET` | provisional `us-central1-a,b,c` listed | `GCP_CONFIDENTIAL_VM_CONFIG_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_C3_TDX_LIVE_MIGRATION` | `NOT_SUPPORTED` | `GCP_CONFIDENTIAL_VM_CONFIG_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_TDX_SOLE_TENANCY` | `NOT_SUPPORTED` | `GCP_CONFIDENTIAL_VM_CONFIG_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_TDX_ATTESTATION_SOURCE` | Intel TDX module evidence | `GCP_CONFIDENTIAL_VM_ATTESTATION_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_TDX_USERSPACE_MEASUREMENT` | RTMR3 extension documented | `GCP_CONFIDENTIAL_VM_ATTESTATION_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_CONFIDENTIAL_SPACE_ROLE_MODEL` | author/operator/collaborator roles documented | `GCP_CONFIDENTIAL_SPACE_OVERVIEW_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_CONFIDENTIAL_SPACE_CEL_SET` | Section 6.4 | `GCP_CONFIDENTIAL_SPACE_ASSERTIONS_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_CONFIDENTIAL_SPACE_RAW_TOKEN_SET` | Sections 6.1–6.3 | `GCP_CONFIDENTIAL_SPACE_TOKEN_CLAIMS_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_CONFIDENTIAL_SPACE_TOKEN_VALIDATION_SET` | Section 6.5 | `GCP_CONFIDENTIAL_SPACE_TOKEN_VALIDATION_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_CONFIDENTIAL_SPACE_DEPLOYMENT_CONTROL_SET` | deployment/lifecycle controls documented | `GCP_CONFIDENTIAL_SPACE_DEPLOY_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_CONFIDENTIAL_SPACE_METADATA_SET` | Section 7 | `GCP_CONFIDENTIAL_SPACE_METADATA_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_TEE_ENV_SUFFIX_GRAMMAR` | complete suffix grammar is unavailable; dynamic keys are default-deny | `GCP_CONFIDENTIAL_SPACE_METADATA_2026_07_24` | `UNAVAILABLE_FROM_PROVIDER` (non-required) |
| `GCP_CONFIDENTIAL_SPACE_LAUNCH_POLICY_SET` | Section 8 | `GCP_CONFIDENTIAL_SPACE_LAUNCH_POLICY_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_CONFIDENTIAL_SPACE_WORKLOAD_CONTROL_SET` | image/disk/memory/ingress/logging/mount/swap controls documented | `GCP_CONFIDENTIAL_SPACE_WORKLOAD_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_COMPUTE_INSTANCE_FIELD_SET` | Section 9 | `GCP_COMPUTE_INSTANCES_REST_2026_07_24`, `GCP_COMPUTE_DISCOVERY_V1_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_SOLE_TENANT_SERVER_ID` | exposed only for fallback investigation | `GCP_SOLE_TENANCY_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |
| `GCP_HOST_EVENT_CONTROL_SET` | terminate/migrate/restart vocabulary | `GCP_HOST_EVENTS_2026_07_24` | `CONFIRMED_AT_RETRIEVAL` |

Pricing, quota, capacity, SLA, KMS, WIF, IAM, firewall, DNS, logging-sink,
and receipt-retention claims are excluded. Their owning contracts require new
dated source evidence.

## 6. Confidential Space Token and Policy Vocabulary

Raw JWT structure, CEL policy expressions, and Compute fields are separate
namespaces. A value in one layer never aliases a value in another.

### 6.1 Raw JWT header

```text
header.x5c : string, optional, PKI tokens only
```

The later attestation contract must reject token-mode confusion. OIDC validation
uses issuer/JWKS metadata; PKI validation uses the `x5c` chain and published PKI
root. This vocabulary does not select the token mode.

### 6.2 Raw JWT top-level payload

Candidate-admitted payload paths and provider types:

```text
payload.attester_tcb             : array<string>
payload.aud                      : string
payload.dbgstat                  : string
payload.eat_nonce                : string | array<string>
payload.exp                      : integer Unix timestamp
payload.google_service_accounts  : array<string>
payload.hwmodel                  : enum
payload.iat                      : integer Unix timestamp
payload.iss                      : string
payload.nbf                      : integer Unix timestamp
payload.oemid                    : uint64
payload.secboot                  : boolean
payload.sub                      : string
payload.submods                  : object
payload.tdx                      : array<object>
payload.tdx[].gcp_attester_tcb_status : string
payload.tdx[].gcp_attester_tcb_date   : ISO-8601 UTC string
payload.swname                   : string
payload.swversion                : singleton array<string>
```

Frozen provider domains relevant to this candidate:

```text
payload.attester_tcb = ["INTEL"] when hwmodel is GCP_INTEL_TDX
payload.dbgstat = "disabled-since-boot" for production images
payload.hwmodel = "GCP_INTEL_TDX"
payload.iss = "https://confidentialcomputing.googleapis.com" for Google Cloud Attestation
payload.oemid = 11129 for Google Cloud Attestation
payload.secboot = true
payload.swname = "CONFIDENTIAL_SPACE"
payload.swversion element format = YYYYMM##
```

`eat_nonce` is 8–88 bytes per value with at most six values. The later
attestation contract must freeze audience, issuer/token mode, time bounds,
nonce cardinality, exact production `swversion`, and TCB acceptance. Intel Trust
Authority is not silently interchangeable with Google Cloud Attestation.

The provider also documents these top-level extensions:

```text
payload["https://aws.amazon.com/tags"] : object
payload.submods.nvidia_gpu             : object
```

They and all descendants are recognized-but-prohibited for this selected
Google-only, CPU-only canonical profile. They are intentionally outside the
candidate-admitted path block above rather than silently omitted.

### 6.3 Raw submods and container payload

```text
payload.submods.confidential_space.support_attributes : array<string>
payload.submods.confidential_space.monitoring_enabled : object
payload.submods.confidential_space.monitoring_enabled.memory : boolean
payload.submods.gce.instance_id      : string
payload.submods.gce.instance_name    : string
payload.submods.gce.project_id       : string
payload.submods.gce.project_number   : string
payload.submods.gce.zone             : string
payload.submods.container.args             : array<string>
payload.submods.container.cmd_override     : array<string>
payload.submods.container.env              : object
payload.submods.container.env_override     : object
payload.submods.container.image_digest     : string
payload.submods.container.image_id         : string
payload.submods.container.image_reference  : string
payload.submods.container.image_signatures : array<object>
payload.submods.container.image_signatures[].key_id             : string
payload.submods.container.image_signatures[].signature          : base64 string
payload.submods.container.image_signatures[].signature_algorithm: enum
payload.submods.container.restart_policy    : enum
```

Support attributes are drawn from:

```text
EXPERIMENTAL
USABLE
STABLE
LATEST
```

Restart policy is one of `Always`, `OnFailure`, or `Never`; provider default is
`Never`. Signature algorithms are exactly:

```text
RSASSA_PSS_SHA256
RSASSA_PKCS1V15_SHA256
ECDSA_P256_SHA256
```

The raw `args` claim is the complete invoked argv and is distinct from
`cmd_override`. Signature and digest modes are not assumed to coexist. The
provider's AWS-compatible projection explicitly documents digest/signature
mutual exclusion; the later attestation contract must choose one source-bound
image-admission mode and reject mixed or missing evidence.

Signature bytes, environment values, argv, and command values are restricted
security evidence. They never enter semantic model inputs or customer output.

### 6.4 CEL attestation-policy vocabulary

Only documented CEL-layer paths may use the `assertion` namespace. Relevant
paths are:

```text
assertion.swname
assertion.swversion
assertion.dbgstat
assertion.google_service_accounts
assertion.hwmodel
assertion.submods.confidential_space.support_attributes
assertion.submods.confidential_space.monitoring_enabled.memory
assertion.submods.container.cmd_override
assertion.submods.container.env
assertion.submods.container.env_override
assertion.submods.container.image_digest
assertion.submods.container.image_id
assertion.submods.container.image_reference
assertion.submods.container.image_signatures
assertion.submods.container.restart_policy
assertion.submods.gce.instance_id
assertion.submods.gce.instance_name
assertion.submods.gce.project_id
assertion.submods.gce.project_number
assertion.submods.gce.zone
```

The CEL guide also documents GPU extension paths:

```text
assertion.submods.nvidia_gpu.cc_feature
assertion.submods.nvidia_gpu.cc_mode
assertion.submods.nvidia_gpu.gpus
```

They and all descendants are recognized-but-prohibited for this CPU-only
candidate. Their presence rejects rather than extending the admitted CEL set.

The CEL guide's TDX literal is:

```text
assertion.hwmodel == "INTEL_TDX"
```

It is not an alias for raw JWT `payload.hwmodel == "GCP_INTEL_TDX"`.
Raw JWT top-level claims not documented by the CEL guide—including `tdx`—cannot
be assumed available as WIF `assertion.*` expressions without a new official
mapping source and revalidation.

Provider documentation has layer-specific display/type differences, including
raw `dbgstat="enabled"` versus the CEL guide's debug display, raw object/array
structures versus simplified CEL table labels, and nested monitoring object
versus Boolean leaf. Downstream validation must use the source for the exact
layer and cannot resolve these differences through aliasing.

### 6.5 Token-validation endpoint vocabulary

OIDC discovery fields are:

```text
claims_supported
id_token_signing_alg_values_supported
issuer
jwks_uri
response_types_supported
scopes_supported
subject_types_supported
```

For Google Cloud Attestation the documented domains include:

```text
id_token_signing_alg_values_supported includes "RS256"
issuer = "https://confidentialcomputing.googleapis.com"
response_types_supported includes "id_token"
scopes_supported includes "openid"
subject_types_supported includes "public"
```

PKI validation exposes `root_ca_uri` at the published attestation PKI-root
endpoint. The later attestation contract must select one mode, bind exact
endpoints/keys/certificates, and define rotation/revocation behavior.

## 7. Confidential Space Metadata Vocabulary

Recognized provider metadata keys are:

```text
tee-image-reference
ita-api-key
ita-region
tee-added-capabilities
tee-cgroup-ns
tee-cmd
tee-container-log-redirect
tee-dev-shm-size-kb
tee-env-ENVIRONMENT_VARIABLE_NAME
tee-impersonate-service-accounts
tee-install-gpu-driver
tee-monitoring-memory-enable
tee-mount
tee-restart-policy
tee-signed-image-repos
```

Provider domains include:

- multiple metadata entries may use a `^~^` prefix and `~` delimiter;
- `tee-added-capabilities` and `tee-cmd` are JSON string arrays;
- `tee-cgroup-ns`, `tee-install-gpu-driver`, and
  `tee-monitoring-memory-enable` are Boolean;
- `tee-container-log-redirect` is one of `false`, `true`, `cloud_logging`, or
  `serial`;
- `tee-dev-shm-size-kb` is integer;
- `tee-env-ENVIRONMENT_VARIABLE_NAME` values are strings;
- `tee-restart-policy` is `Never`, `Always`, or `OnFailure`;
- `tee-mount` is a semicolon-separated list of tmpfs definitions;
- impersonated service accounts and signed-image repositories are comma-separated.

Google publishes an environment-key pattern name and an example using lowercase
letters and hyphens, but does not publish a complete suffix grammar in the
bound source. Therefore:

```text
tee-env suffix grammar = UNAVAILABLE_FROM_PROVIDER
```

No regex is inferred. A later policy must enumerate every exact admitted key;
any unlisted environment key rejects.

`ita-api-key` is credential-bearing and prohibited. `ita-region` is prohibited
unless a later candidate explicitly selects Intel Trust Authority.
`tee-install-gpu-driver` is prohibited for the CPU-only profile. Presence in the
provider vocabulary never authorizes a metadata input.

## 8. Workload Launch-Policy Vocabulary

Recognized image labels and provider domains are:

| Label | Provider type/domain |
| --- | --- |
| `tee.launch_policy.allow_capabilities` | Boolean, default `false` |
| `tee.launch_policy.allow_cgroups` | Boolean, default `false` |
| `tee.launch_policy.allow_cmd_override` | Boolean, default `false` |
| `tee.launch_policy.allow_env_override` | comma-separated permitted environment names |
| `tee.launch_policy.allow_mount_destinations` | colon-separated permitted absolute destinations |
| `tee.launch_policy.log_redirect` | `debugonly`, `always`, or `never`; default `debugonly` |
| `tee.launch_policy.monitoring_memory_allow` | `debugonly`, `always`, or `never`; default `debugonly` |

Restrictive candidate intent is:

```text
allow_capabilities=false
allow_cgroups=false
allow_cmd_override=false
log_redirect=never
monitoring_memory_allow=never
```

Exact environment and mount allowlists remain later policy inputs. Empty versus
absent semantics must be source-tested; this vocabulary does not guess them.

## 9. Compute Engine Control-Plane Vocabulary

Evidence comes from both the human-readable Instance REST reference and Compute
v1 discovery revision `20260709`.
[`compute-field-projection.json`](compute-field-projection.json) classifies all
257 recursively reachable `Instance` paths with their exact provider JSON type,
format, enum domain where published, and one disposition:

```text
ADMITTED_PROVIDER_VOCABULARY
RECOGNIZED_BUT_RUNTIME_PROHIBITED
PROHIBITED_SECRET_OR_KEY_MATERIAL
NOT_ADMITTED_BY_THIS_VERSION
```

The projection contains 149 admitted, 9 recognized-but-runtime-prohibited, 14
secret/key-material-prohibited, and 85 default-deny paths. A later contract may
use only admitted paths after fresh schema revalidation.
`RECOGNIZED_BUT_RUNTIME_PROHIBITED` values may be inspected transiently only to
produce a separately specified allowlisted control projection; their raw values
cannot enter runtime identity, receipts, retained evidence, logs, semantic
results, or model input. Any absent or `NOT_ADMITTED_BY_THIS_VERSION` path
requires a new vocabulary version; it cannot enter through an arbitrary
control-plane container. The sections below explain the admitted minimum and
explicit prohibited boundaries.

### 9.1 Core identity and state

```text
kind
id
name
selfLink
zone
machineType
minCpuPlatform
cpuPlatform
status
statusMessage
creationTimestamp
lastStartTimestamp
lastStopTimestamp
lastSuspendedTimestamp
fingerprint
labelFingerprint
labels
hostname
deletionProtection
canIpForward
privateIpv6GoogleAccess
sourceMachineImage
keyRevocationActionType
localSsdEncryptionMode
resourcePolicies[]
reservationAffinity.consumeReservationType
reservationAffinity.key
reservationAffinity.values[]
startRestricted
workloadIdentityConfig.identity
workloadIdentityConfig.identityCertificateEnabled
instanceEncryptionKey.kmsKeyName
instanceEncryptionKey.kmsKeyServiceAccount
instanceEncryptionKey.sha256
sourceMachineImageEncryptionKey.kmsKeyName
sourceMachineImageEncryptionKey.kmsKeyServiceAccount
sourceMachineImageEncryptionKey.sha256
```

Type traps are frozen:

```text
id                         : string(uint64), never JSON integer
disks[].diskSizeGb         : string(int64)
creation/start/stop times  : RFC3339 strings
fingerprints               : opaque provider strings, not cryptographic attestations
labels                     : caller-controlled map, never runtime authority
```

Raw `hostname`, `labels`, and `statusMessage` are
`RECOGNIZED_BUT_RUNTIME_PROHIBITED`. They may be checked transiently for a later
closed control policy but cannot enter canonical identity or retained evidence.

Instance status is exactly one of:

```text
DEPROVISIONING
PENDING
PROVISIONING
REPAIRING
RUNNING
STAGING
STOPPED
STOPPING
SUSPENDED
SUSPENDING
TERMINATED
```

### 9.2 Confidential, Shielded, and CPU topology

```text
confidentialInstanceConfig.enableConfidentialCompute
confidentialInstanceConfig.confidentialInstanceType
shieldedInstanceConfig.enableSecureBoot
shieldedInstanceConfig.enableVtpm
shieldedInstanceConfig.enableIntegrityMonitoring
shieldedInstanceIntegrityPolicy.updateAutoLearnPolicy
advancedMachineFeatures.threadsPerCore
advancedMachineFeatures.visibleCoreCount
advancedMachineFeatures.enableNestedVirtualization
advancedMachineFeatures.enableUefiNetworking
advancedMachineFeatures.performanceMonitoringUnit
advancedMachineFeatures.turboMode
guestAccelerators[]
guestAccelerators[].acceleratorCount
guestAccelerators[].acceleratorType
displayDevice.enableDisplay
networkPerformanceConfig.totalEgressBandwidthTier
```

Candidate control-plane values include:

```text
confidentialInstanceConfig.enableConfidentialCompute=true
confidentialInstanceConfig.confidentialInstanceType=TDX
shieldedInstanceConfig.enableSecureBoot=true
advancedMachineFeatures.enableNestedVirtualization=false
```

The later runtime contract must close every remaining value or explicit absence.

### 9.3 Scheduling and lifecycle

```text
scheduling.onHostMaintenance
scheduling.automaticRestart
scheduling.provisioningModel
scheduling.preemptible
scheduling.instanceTerminationAction
scheduling.skipGuestOsShutdown
scheduling.hostErrorTimeoutSeconds
scheduling.maxRunDuration
scheduling.maxRunDuration.seconds
scheduling.maxRunDuration.nanos
scheduling.terminationTime
scheduling.availabilityDomain
scheduling.locationHint
scheduling.minNodeCpus
scheduling.nodeAffinities[]
scheduling.nodeAffinities[].key
scheduling.nodeAffinities[].operator
scheduling.nodeAffinities[].values[]
scheduling.localSsdRecoveryTimeout
scheduling.localSsdRecoveryTimeout.seconds
scheduling.localSsdRecoveryTimeout.nanos
scheduling.onInstanceStopAction.discardLocalSsd
```

Provider domains include:

```text
onHostMaintenance = MIGRATE | TERMINATE
provisioningModel = FLEX_START | RESERVATION_BOUND | SPOT | STANDARD
instanceTerminationAction = DELETE | INSTANCE_TERMINATION_ACTION_UNSPECIFIED | STOP
```

Required candidate values are:

```text
scheduling.onHostMaintenance=TERMINATE
scheduling.automaticRestart=false
scheduling.provisioningModel=STANDARD
scheduling.preemptible=false
```

`automaticRestart=false` must be explicit because the documented standard-VM
default is `true`. The later lifecycle contract must require unselected duration,
termination, and stop-action fields to be absent or freeze exact values.

### 9.4 Service accounts and metadata

```text
serviceAccounts[]
serviceAccounts[].email
serviceAccounts[].scopes[]
metadata
metadata.kind
metadata.fingerprint
metadata.items[]
metadata.items[].key
metadata.items[].value
resourceStatus.effectiveInstanceMetadata.blockProjectSshKeysMetadataValue
resourceStatus.effectiveInstanceMetadata.enableGuestAttributesMetadataValue
resourceStatus.effectiveInstanceMetadata.enableOsInventoryMetadataValue
resourceStatus.effectiveInstanceMetadata.enableOsconfigMetadataValue
resourceStatus.effectiveInstanceMetadata.enableOsloginMetadataValue
resourceStatus.effectiveInstanceMetadata.gceContainerDeclarationMetadataValue
resourceStatus.effectiveInstanceMetadata.serialPortEnableMetadataValue
resourceStatus.effectiveInstanceMetadata.serialPortLoggingEnableMetadataValue
resourceStatus.effectiveInstanceMetadata.vmDnsSettingMetadataValue
```

`metadata`, `metadata.items[]`, `metadata.items[].key`, and
`metadata.items[].value` are `RECOGNIZED_BUT_RUNTIME_PROHIBITED`. Keys and
values are generic provider fields; values are free-form and may contain
secrets, scripts, SSH material, or environment values. A later control-plane
validator may inspect them transiently only to derive a closed allowlist of
non-secret key/value assertions; raw values are never retained or admitted.
Unknown keys or values reject; blanket metadata capture is prohibited.

### 9.5 Network

```text
networkInterfaces[]
networkInterfaces[].name
networkInterfaces[].network
networkInterfaces[].subnetwork
networkInterfaces[].networkIP
networkInterfaces[].fingerprint
networkInterfaces[].stackType
networkInterfaces[].nicType
networkInterfaces[].queueCount
networkInterfaces[].aliasIpRanges[]
networkInterfaces[].aliasIpv6Ranges[]
networkInterfaces[].networkAttachment
networkInterfaces[].parentNicName
networkInterfaces[].vlan
networkInterfaces[].igmpQuery
networkInterfaces[].enableVpcScopedDns
networkInterfaces[].serviceClassId
networkInterfaces[].ipv6Address
networkInterfaces[].ipv6AccessType
networkInterfaces[].internalIpv6PrefixLength
networkInterfaces[].accessConfigs[]
networkInterfaces[].ipv6AccessConfigs[]
tags.items[]
tags.fingerprint
```

The later network contract must require no public ingress/egress side door and
freeze vNIC/IP-stack behavior. Raw `networkIP` and `ipv6Address` are
`RECOGNIZED_BUT_RUNTIME_PROHIBITED`; only separately defined derived posture may
be retained. Access-config and alias-range arrays must be empty or explicitly
governed. `networkAttachment` is a string and must be absent unless a later
contract explicitly admits it. Nested external-address fields need not be
retained when their parent arrays are proven empty.

### 9.6 Disk and boot provenance

```text
disks[]
disks[].index
disks[].deviceName
disks[].type
disks[].mode
disks[].savedState
disks[].boot
disks[].autoDelete
disks[].interface
disks[].diskSizeGb
disks[].source
disks[].architecture
disks[].guestOsFeatures[].type
disks[].licenses[]
disks[].forceAttach
disks[].diskEncryptionKey.kmsKeyName
disks[].diskEncryptionKey.kmsKeyServiceAccount
disks[].diskEncryptionKey.sha256
disks[].initializeParams.sourceImage
disks[].initializeParams.sourceSnapshot
disks[].initializeParams.diskType
disks[].initializeParams.diskName
disks[].initializeParams.diskSizeGb
disks[].initializeParams.architecture
disks[].initializeParams.enableConfidentialCompute
```

Attached-disk URI and creation parameters do not independently prove image
bytes. Later contracts must bind Disk/Image evidence and immutable image digest.
`forceAttach` must be false.

### 9.7 Maintenance and optional host visibility

```text
resourceStatus.physicalHost
resourceStatus.physicalHostTopology
resourceStatus.physicalHostTopology.cluster
resourceStatus.physicalHostTopology.block
resourceStatus.physicalHostTopology.subblock
resourceStatus.physicalHostTopology.host
resourceStatus.upcomingMaintenance.type
resourceStatus.upcomingMaintenance.maintenanceStatus
resourceStatus.upcomingMaintenance.canReschedule
resourceStatus.upcomingMaintenance.windowStartTime
resourceStatus.upcomingMaintenance.windowEndTime
resourceStatus.upcomingMaintenance.latestWindowStartTime
resourceStatus.upcomingMaintenance.maintenanceOnShutdown
resourceStatus.upcomingMaintenance.maintenanceReasons[]
resourceStatus.scheduling.availabilityDomain
```

These are output-only schema fields. The source does not prove that C3/TDX
populates physical-host identity. Population remains `REVALIDATION_REQUIRED`,
and hidden/empty values cannot establish runtime sufficiency.

### 9.8 Explicitly prohibited response/request material

The following are prohibited from runtime objects, receipts, retained evidence,
and logs:

```text
instanceEncryptionKey.rawKey
instanceEncryptionKey.rsaEncryptedKey
sourceMachineImageEncryptionKey.rawKey
sourceMachineImageEncryptionKey.rsaEncryptedKey
disks[].diskEncryptionKey.rawKey
disks[].diskEncryptionKey.rsaEncryptedKey
disks[].initializeParams.sourceImageEncryptionKey.rawKey
disks[].initializeParams.sourceImageEncryptionKey.rsaEncryptedKey
disks[].initializeParams.sourceSnapshotEncryptionKey.rawKey
disks[].initializeParams.sourceSnapshotEncryptionKey.rsaEncryptedKey
disks[].shieldedInstanceInitialState.pk.content
disks[].shieldedInstanceInitialState.keks[].content
disks[].shieldedInstanceInitialState.dbs[].content
disks[].shieldedInstanceInitialState.dbxs[].content
```

KMS resource names and key hashes may be retained only as restricted operational
evidence under later IAM/persistence contracts. No raw or wrapped customer-
supplied key material is authorized.

## 10. Machine and Zone Vocabulary

Canonical candidate values:

```text
machine_series=C3
provisional_machine_type=c3-standard-4
cpu_platform=INTEL_SAPPHIRE_RAPIDS
```

Provisionally selected qualification zones:

```text
us-central1-a
us-central1-b
us-central1-c
```

Zone and shape are revalidated before every consuming contract and action. A
replacement zone or type requires a new candidate-selection decision.

## 11. Visibility and Sufficiency Vocabulary

Visibility:

```text
VISIBLE
HIDDEN_BY_TDX
NOT_EXPOSED_BY_GCP_ATTESTATION
NOT_EXPOSED_BY_GCP_CONTROL_PLANE
```

Sufficiency:

```text
SUFFICIENT_FOR_FIELD_BINDING
INSUFFICIENT_FOR_FIELD_BINDING
REQUIRES_PARENT_GOVERNANCE_DECISION
```

Visibility and sufficiency are independent. Hidden or unavailable fields are
never automatically sufficient. Parent review cannot promote runtime authority;
it can only accept a predeclared virtual-profile qualification treatment or
reject/escalate the candidate.

## 12. Identity Normalization Rules

- Provider enum is exactly `GCP`.
- Raw JWT, CEL assertion, and Compute namespaces remain separate.
- GCP resource IDs remain strings; numeric coercion rejects.
- Project ID and project number remain separate.
- Zone is a full lowercase zone; region aliases reject.
- Machine type may be projected from the final segment of an independently
  retrieved URI only while the full URI remains bound in per-instance evidence.
- Provider token `image_digest` type is only documented as `string`. A later
  lowercase `sha256:<64 hex>` rule is a FluencyTracr normalization contract, not
  an official-provider grammar, and must be labeled accordingly.
- Assertion and field paths are case-sensitive.
- No unspecified alias, fallback, display normalization, or closest value is
  accepted.

## 13. Revalidation Triggers

Fresh revalidation is mandatory on:

- every downstream contract that consumes a claim;
- official page update or Compute discovery revision change;
- machine, zone, image, TDX, Confidential Space, token-mode, or API change;
- discrepancy between documentation and later live read-only discovery;
- immediately before any external or privileged action.

A changed mapping creates a new vocabulary candidate. It never silently edits
this version.

## 14. Decision States

This contract emits exactly one of:

```text
GCP_PROVIDER_VOCABULARY_READY_FOR_RUNTIME_OBJECT_HARDENING
HOLD_FOR_PROVIDER_CLAIM_REVALIDATION
REJECT_FOR_PROVIDER_CLAIM_CONFLICT
REJECT_FOR_BOUNDARY_LEAKAGE
```

Decision precedence is total:

1. `REJECT_FOR_BOUNDARY_LEAKAGE` for unknown aliases/values, provider-layer
   conflation, machine/zone substitution, unsafe fields, runtime-authority
   claims, GCP actions, customer data, or other boundary leakage.
2. Otherwise `REJECT_FOR_PROVIDER_CLAIM_CONFLICT` for any claim with
   `CONFLICTING_PROVIDER_EVIDENCE` or any unresolved same-layer source conflict.
   Non-required status exempts only an explicitly unavailable default-deny
   claim; it never exempts a contradiction.
3. Otherwise `HOLD_FOR_PROVIDER_CLAIM_REVALIDATION` when any
   `required_for_ready=true` claim has missing provenance,
   `REVALIDATION_REQUIRED`, `UNAVAILABLE_FROM_PROVIDER`, incomplete registry
   coverage, or a downstream result other than `EXACT_MAPPING_RECONFIRMED`.
   A non-required unavailable claim remains default-deny and cannot promote,
   but does not contradict snapshot READY when its prohibited treatment is
   fully defined.
4. Otherwise `GCP_PROVIDER_VOCABULARY_READY_FOR_RUNTIME_OBJECT_HARDENING` only
   for the bound snapshot when every required registry claim is
   `CONFIRMED_AT_RETRIEVAL`, every source ID resolves in the evidence manifest,
   every vocabulary section is covered, and no earlier condition applies.

The recorded snapshot satisfies step 4. A downstream consumer still requires a
fresh `EXACT_MAPPING_RECONFIRMED` result. These are internal contract states,
not product suppression reasons.

## 15. Relationship to Candidate Selection

This vocabulary implements Section 7.1 of
[`canonical-inference-gcp-runtime-candidate`](../canonical-inference-gcp-runtime-candidate/README.md).
It does not satisfy Sections 7.2–7.8, declare whole-system consistency, or
authorize qualification.

## 16. Privacy Boundary

Provider evidence may contain restricted infrastructure identifiers such as
project, zone, instance, image, key, and service-account identity. These are not
product payload fields, anonymization mechanisms, or customer identifiers.
They must not enter deterministic model inputs, semantic-result bodies,
customer output, or cross-tenant identifiers.

No raw GCE, prompts, rows, transcripts, person identifiers, customer aggregates,
posterior material, credentials, key bytes, or arbitrary payloads are authorized.

## 17. Non-Authorization

This contract does not authorize:

- GCP project/resource reads or writes, including live capability discovery;
- billing, VM, network, IAM, WIF, KMS, image, logging, storage, or policy changes;
- qualification or model execution;
- production/customer input or output;
- persistence, routes, UI, connectors, or public ingress;
- runtime promotion or a second authority;
- new canonical events, suppression reasons, thresholds, or overrides;
- held VBD merge or Task 2.22.

Every future external or privileged action requires fresh approval immediately
before execution.

## 18. Required Next Step

The only authorized next step is the docs-only runtime object and hash contract
from Section 7.2 of the candidate-selection contract. It must consume only this
vocabulary version, attach fresh revalidation evidence, preserve all HOLD and
REJECT rules, and remain provisional until the whole-system gate passes.

# GCP Canonical Runtime Candidate Selection

## 1. Decision and Scope

Decision:

```text
SELECT_C3_TDX_FOR_QUALIFICATION_CONTRACT_HARDENING
```

This docs-only contract selects a GCP C3 Intel TDX Confidential Space profile as the first provider-specific runtime candidate to investigate for the Canonical Aggregate Inference Service.

It authorizes documentation and contract hardening only. It does not authorize GCP resources, billing, IAM, WIF, KMS, Artifact Registry, networking, logging, storage, image operations, deployment, qualification execution, model execution, sampling, evidence, customer input, customer output, or merge of held implementation work.

## 2. Selected Candidate

The selected candidate shape uses the exact canonical core vocabulary hardened
by Section 7.1:

```text
provider=GCP
execution_environment=CONFIDENTIAL_SPACE
confidential_space_image_posture=PRODUCTION
machine_series=C3
provisional_machine_type=c3-standard-4
cpu_platform=INTEL_SAPPHIRE_RAPIDS
confidential_computing_technology=INTEL_TDX
execution_substrate=QUALIFIED_ATTESTED_VIRTUAL_PROFILE
scheduling.onHostMaintenance=TERMINATE
scheduling.automaticRestart=false
tee-restart-policy=Never
initial_input_mode=SYNTHETIC_ONLY
initial_public_ingress=false
```

Earlier title-case descriptions such as `Confidential Space production image`,
`Intel Sapphire Rapids`, and `Intel TDX` are human display text only and are not
accepted provider values or aliases. Raw JWT, CEL policy, and Compute literals
remain separately governed by the provider-vocabulary contract.

Every field remains provisional until the downstream qualification contracts
close its identity, measurement, policy, and evidence requirements.

## 3. Claim-to-Source Map

Official GCP documentation was originally retrieved on 2026-07-23 and was
source-bound by the provider-vocabulary snapshot during
`2026-07-24T03:07:50Z..2026-07-24T03:08:12Z`. Every mutable claim still requires
fresh revalidation before downstream hardening and immediately before any future
GCP action.

| Selection claim | Exact official source | Selection use |
| --- | --- | --- |
| C3 uses Intel Sapphire Rapids | [Compute Engine CPU platforms](https://cloud.google.com/compute/docs/cpu-platforms) | Establishes the provisional CPU generation for the candidate |
| Exact `c3-standard-4` shape is listed with 4 vCPUs and 16 GB | [General-purpose machine family](https://cloud.google.com/compute/docs/general-purpose-machines#c3_series) | Establishes exact candidate-shape existence; TDX eligibility still requires the separate wildcard support source |
| Intel TDX supports `c3-standard-*` in listed zones | [Confidential VM supported configurations](https://cloud.google.com/confidential-computing/confidential-vm/docs/supported-configurations) | Establishes provisional machine shapes and zones; availability must be rechecked |
| Intel TDX C3 does not support live migration | [Confidential VM supported configurations](https://cloud.google.com/confidential-computing/confidential-vm/docs/supported-configurations) and [host events](https://cloud.google.com/compute/docs/instances/host-maintenance-overview) | Requires termination on maintenance and requalification before reactivation |
| Intel TDX cannot use sole-tenant node groups | [Confidential VM supported configurations](https://cloud.google.com/confidential-computing/confidential-vm/docs/supported-configurations) | Prevents C3/TDX from claiming sole-tenancy |
| Sole-tenant nodes expose a physical-server ID and restart-in-place options | [Sole-tenancy overview](https://cloud.google.com/compute/docs/nodes/sole-tenant-nodes) | Defines a potential fixed-physical fallback, not the selected candidate |
| Intel TDX provides hardware/firmware attestation and RTMR extension | [Confidential VM attestation](https://cloud.google.com/confidential-computing/confidential-vm/docs/attestation) | Establishes candidate attestation capabilities; hidden fields still fail closed |
| Confidential Space can assert workload image, launch overrides, restart posture, TDX model, instance/project/zone, and service accounts | [Confidential Space attestation assertions](https://cloud.google.com/confidential-computing/confidential-space/docs/reference/attestation-assertions) | Establishes the provider vocabulary that a later contract must pin exactly |
| Confidential Space supports production/debug images, TDX deployment, maintenance termination, and metadata controls | [Confidential Space workload deployment](https://cloud.google.com/confidential-computing/confidential-space/docs/deploy-workloads) | Establishes provisional launch controls |
| Confidential Space launch policies can restrict command, environment, capability, mount, logging, and monitoring overrides; swap is disabled | [Confidential Space workload customization](https://cloud.google.com/confidential-computing/confidential-space/docs/create-customize-workloads) | Establishes provisional privacy and immutability controls |

No pricing claim is used to select C3/TDX. Cost, quota, and capacity remain unverified downstream decisions with their own official pricing/quota evidence requirement.

## 4. Parent Virtual-Profile Boundary

The parent concept permits one of two execution substrates:

```text
FIXED_PHYSICAL_HOST
QUALIFIED_ATTESTED_VIRTUAL_PROFILE
```

C3/TDX is selected only as a `QUALIFIED_ATTESTED_VIRTUAL_PROFILE` candidate. It cannot become authoritative from a machine-series label, container digest, or a few matching outputs. A later qualification contract must close trust-rooted provider identity, predeclared fresh-host exact conformance, complete attempt evidence, and per-boot/replacement requalification.

GCP documents that Intel TDX cannot use sole-tenancy and may hide CPU architecture details. Any hidden or unstable field must be explicitly represented and governed. If the downstream runtime-identity and integration gates cannot prove a sufficient closed virtual profile, the C3 candidate is rejected and the next provider decision evaluates fixed physical or sole-tenant hardware.

## 5. Qualification Hypothesis

The future qualification hypothesis is:

> The same immutable inference image on independently attested C3/TDX Confidential Space instances produces one exact numerical profile and one byte-identical semantic result across fresh processes and complete inference runs.

A later execution plan should attempt to falsify this hypothesis across multiple fresh instances and zones. It must reject rather than create alternate C3 oracles when:

- semantic bytes differ;
- any math-relevant runtime/profile field differs;
- host, CPU, microcode, firmware, TDX, dispatch, or floating-point identity is insufficient;
- attestation, workload identity, signing, policy, network, or persistence evidence is incomplete;
- any planned attempt is missing, retried, selected, or omitted;
- privacy or aggregate-only boundaries fail.

This document does not define or authorize that execution plan.

The value `OBSERVE_C3_TDX_EQUIVALENCE_HOLD_FOR_RUNTIME_AUTHORITY_DECISION` is reserved for a future qualification contract. It is not a state emitted by this candidate-selection contract and does not promote runtime authority.

## 6. Sole-Tenant and Fixed-Physical Fallback

Intel TDX C3 cannot run on sole-tenant nodes. A future fixed-hardware fallback requires a separate provider compatibility, attestation, performance, quota, and cost decision—for example, evaluating an AMD confidential-computing profile on a compatible sole-tenant node or another fixed physical platform.

No comparative price or capacity conclusion is made in this selection contract. If downstream C3 identity or exactness cannot be closed, sunk-cost concerns cannot override escalation to the fixed-physical decision.

## 7. Required Downstream Contracts and Dependencies

No GCP action may occur until the following bounded documents are complete. Each document has a scoped responsibility and may remain provisional until the final integration gate.

### 7.1 [Provider claim and identity vocabulary](../canonical-inference-gcp-provider-vocabulary/README.md)

The provider vocabulary freezes the exact official assertion paths, values, supported shapes/zones, status vocabulary, GCP resource names, and dated source evidence used by every later contract.

### 7.2 Runtime object and hash contract

Depends on 7.1. Must close deterministic numerical-profile fields, per-instance fields, control-plane projection, canonical serialization, acyclic hash preimages, visibility statuses, and runtime-identity sufficiency. It references only the frozen provider vocabulary from 7.1.

### 7.3 HSM, WIF, IAM, and role-separation contract

Depends on 7.1. Must close distinct projects/principals, HSM key origin/non-exportability, WIF-to-KMS admission, effective-access/deny proof, image signing, lifecycle, and immutable audit evidence.

### 7.4 Attestation and receipt contract

Depends on 7.1, 7.2, and 7.3. Must close quote/token/certificate verification, workload-bound signature preimages using the fixed key algorithm/version, terminal receipt schemas, consumer verification, replay/revocation, and independently replayable evidence retention.

### 7.5 Network, logging, disk, and persistence contract

Depends on 7.1 and 7.3. Must close ingress/egress, private endpoints, DNS/firewall/routes, logging/serial/APM/crash controls, immutable boot posture, tmpfs/swap/disk rules, receipt storage, and pre/during/post evidence.

### 7.6 Pre-registered attempt-ledger contract

Depends on 7.2 through 7.5. Must close plan/allocation manifests, single-use attempt claims, controller/workload receipts, append-only terminal ledger, deterministic decision precedence, completeness proof, and no favorable retry or loss.

### 7.7 Whole-system integration and threat-model gate

Depends on 7.1 through 7.6. Must reconcile every cross-document field, enum, hash, signer, policy, trust boundary, privacy claim, lifecycle transition, and failure decision. It fails closed on gaps or contradictions and is the only document that may declare the qualification contract set internally consistent.

### 7.8 Qualification execution plan

Depends on a `GO` from 7.7. Must close fixed instance/zone/process counts, fresh-process semantics, deterministic probe/full-suite inventories, approvals, quota/cost behavior, complete decision mapping, and fixed-physical escalation.

Each downstream document requires separate review and approval. No implementation or execution PR may begin before 7.7 and 7.8 pass.

## 8. Candidate Decision States

This selection contract can emit only:

```text
SELECT_C3_TDX_FOR_QUALIFICATION_CONTRACT_HARDENING
HOLD_FOR_GCP_CAPABILITY_REVALIDATION
REJECT_C3_TDX_SELECTION_FOR_PROVIDER_CONFLICT
REJECT_FOR_PRIVACY_OR_BOUNDARY_LEAKAGE
```

- `SELECT_C3_TDX_FOR_QUALIFICATION_CONTRACT_HARDENING` authorizes only the downstream docs listed above.
- `HOLD_FOR_GCP_CAPABILITY_REVALIDATION` applies if current GCP support, zones, or mapped claims cannot be confirmed before contract hardening. Cost is not a selection premise and remains a required execution-plan decision.
- `REJECT_C3_TDX_SELECTION_FOR_PROVIDER_CONFLICT` applies if official GCP capabilities no longer support the proposed candidate shape.
- `REJECT_FOR_PRIVACY_OR_BOUNDARY_LEAKAGE` applies if the selection or future contract path weakens the aggregate-only, sole-authority, or fail-closed posture.

These are internal planning decisions, not product suppression reasons.

## 9. CI and GitHub Boundary

GitHub-hosted CI may validate source, documentation, privacy, schemas, integer/hash behavior, and signed qualification artifacts.

It must not:

- execute arbitrary PR code on the future canonical host;
- own the canonical receipt-signing key;
- provision or mutate GCP qualification resources;
- assemble a result from selected passing receipts;
- rerun qualification until favorable;
- treat generic hosted CPU outputs as canonical evidence.

No general-purpose self-hosted GitHub runner may be installed on the future canonical VM.

## 10. Privacy Boundary

All future qualification inputs remain compiled, aggregate, and synthetic-only.

No downstream contract may admit:

- raw GCE or source-system rows;
- prompts, responses, transcripts, documents, or queries;
- person, user, employee, account, email, session, IP, or device identifiers;
- customer aggregate inputs;
- posterior draws, pseudo-draws, conditional components, or latent paths;
- arbitrary payload containers;
- credentials in request or result bodies.

Only bounded operational metadata, independently replayable attestation evidence, and signed qualification receipts may be retained under a later explicit retention contract.

## 11. Relationship to VBD Work

Clean implementation PR #434 subsequently merged as
`a0b56323cf942536bedd0f21fb5b8c1d631f8f64`. Its local and GitHub-hosted
results remain nonauthoritative. Merge completed implementation review; it did
not establish canonical runtime conformance or authorize governed model
validation.

Exact conformance remains held until the downstream contracts pass and a later
qualified, separately authorized runtime produces source-bound evidence for the
merged implementation identity. Closed PR #432 remains blocked and cannot
satisfy this contract.

## 12. Non-Authorization

This contract does not authorize:

- GCP project, VM, network, IAM, WIF, KMS, Artifact Registry, logging, storage, or billing changes;
- image build, push, signing, or deployment;
- qualification or model execution;
- production or customer aggregate input;
- persistence, routes, UI, connectors, or public ingress;
- new canonical events, suppression reasons, thresholds, or admin overrides;
- individual scoring, ranking, productivity, ROI, causality, or economic claims;
- a second authoritative runtime;
- bypass of the parent fixed-physical or qualified-attested-virtual substrate requirements;
- merge of held implementation branches.

Every future external or privileged action requires separate approval immediately before execution.

## 13. Required Next Step

The only authorized next step is documentation-first hardening of the downstream contracts in Section 7, one bounded contract at a time.

The required dependency order is:

1. provider claim and identity vocabulary;
2. runtime object and hash contract;
3. HSM/WIF/IAM and role-separation contract;
4. attestation and receipt contract;
5. network/logging/disk/persistence contract;
6. pre-registered attempt-ledger contract;
7. whole-system integration and threat-model gate;
8. qualification execution plan.

No GCP action starts from this selection decision.

## 14. Official GCP References

Originally retrieved 2026-07-23. The provider-vocabulary source snapshot
revalidated the mapped provider documentation during
`2026-07-24T03:07:50Z..2026-07-24T03:08:12Z`; every later contract and action
still requires fresh revalidation:

- [Compute Engine CPU platforms](https://cloud.google.com/compute/docs/cpu-platforms)
- [Confidential VM supported configurations](https://cloud.google.com/confidential-computing/confidential-vm/docs/supported-configurations)
- [Confidential VM attestation](https://cloud.google.com/confidential-computing/confidential-vm/docs/attestation)
- [Confidential Space overview](https://cloud.google.com/confidential-computing/confidential-space/docs/confidential-space-overview)
- [Confidential Space attestation assertions](https://cloud.google.com/confidential-computing/confidential-space/docs/reference/attestation-assertions)
- [Confidential Space workload deployment](https://cloud.google.com/confidential-computing/confidential-space/docs/deploy-workloads)
- [Confidential Space workload launch policies](https://cloud.google.com/confidential-computing/confidential-space/docs/create-customize-workloads)
- [Sole-tenancy overview](https://cloud.google.com/compute/docs/nodes/sole-tenant-nodes)
- [Compute Engine host events and maintenance behavior](https://cloud.google.com/compute/docs/instances/host-maintenance-overview)

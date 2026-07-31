## Context

Section 7.1 freezes GCP provider claims, source evidence, and all 257 Compute `Instance` paths. Section 7.2 must turn that vocabulary into deterministic profile and instance-observation objects without claiming that any instance has been provisioned, attested, qualified, or authorized.

The contract is security- and architecture-sensitive because later Sections 7.3–7.8 will bind trust policy, measurements, attempts, integration, and qualification to these hashes. Fail-open defaults, ambiguous normalization, source splicing, or cycles would undermine the model-stability authority.

## Goals / Non-Goals

### Goals

- Separate stable numerical-profile fields from restricted per-instance observations.
- Classify all frozen control-plane paths and reject unknown or unsafe data.
- Preserve repeated-resource association through identity-keyed records.
- Freeze strict canonical bytes and an acyclic, domain-separated hash graph.
- Make provider evidence replayable and exact-byte pinned.
- Record explicit visibility/sufficiency and held-runtime decisions.
- Define deterministic invalidation and fixed-physical escalation.

### Non-Goals

- No runtime service, schema endpoint, or production integration.
- No GCP project/resource access, IAM, WIF, HSM, networking, persistence, deployment, or qualification.
- No model execution, customer data, verdict changes, events, suppression reasons, thresholds, or admin overrides.
- No implementation of Sections 7.3–7.8.

## Decisions

### Separate profile and instance-observation objects

Stable math/runtime policy belongs in `GCP_CANONICAL_NUMERICAL_PROFILE_V1`; provider token and control-plane identity belongs in `GCP_RUNTIME_INSTANCE_OBSERVATION_V1`. Instance, attempt, receipt, and customer fields cannot enter the stable profile preimage. Section 7.2 approves no runtime profile. One separately labeled synthetic test-profile hash is compiled only to prevent self-consistently rehashed alternate test vectors; it has no runtime-admission effect. Profile manifests commit to canonically sorted policy-field multisets without concrete resource IDs, so valid disk or NIC identity changes cannot mutate the stable profile.

### Total, leaf-only control projection

Every Section 7.1 path receives one runtime disposition. Parent containers are syntax only. Repeated disks, NICs, accelerators, and node affinities use identity-keyed control-observation records so independent wildcard sets cannot be spliced. Concrete resource IDs do not enter stable profile manifests. Service-account email/scope values and derived service-account identity posture are not admitted; Section 7.3 owns any future treatment. Unconstrained physical host/topology and VM-DNS values reject.

### Strict input, not normalization

Canonical inputs must already satisfy closed schemas, exact types, NFC strings, sorted/unique declared sets, canonical resource identities, URI/OCI grammars, and provider domains. Unsorted, duplicate, unknown, null, floating, noncanonical, or implicitly defaulted input rejects; the canonicalizer does not repair it.

### Four owned hash nodes

Section 7.2 owns only provider revalidation, runtime profile, control observation, and instance observation. Each uses a distinct domain separator and references only earlier nodes. Trust, measurement, qualification, requalification, result, and receipt hashes remain later typed interfaces without placeholder preimages, avoiding a 7.6→7.8→7.7 ownership cycle.

### Source authenticity remains deferred

A restricted raw attestation-token commitment and a domain-separated hash of the canonical sanitized control-evidence envelope keep retained evidence cohesive, but Section 7.2 does not claim provider authenticity. Raw Compute-response bytes and hashes are excluded. Sections 7.4 and 7.6 must bind later external source-authentication references and trust before runtime identity can become sufficient.

### Fail-closed time and identity domains

Every retained Compute timestamp is RFC3339-typed; `-00:00` and leap seconds reject without an authoritative leap table. TDX TCB date requires UTC `Z`. Lifecycle ordering is `creation <= current start <= observation`; any present running stop/suspend must fall between creation and current start. Every retained URI-bearing Compute path is typed, and Compute URIs plus OCI image references use bounded byte-exact canonical grammars and immutable digest matching. Project, resource, and instance identities use fixed-format opaque `ft-qualification-*` non-person namespaces. Raw service-account values and raw TCB acceptance status are not retained. Workload-identity, reservation-identity, and node-affinity identity values reject until their later owning contracts close.

### Runtime authority remains held

Contract closure means only that Section 7.2 fields and hashes are deterministic. Hidden fields retain parent-governance treatment, runtime identity remains insufficient, and no object can authorize itself. Parent rejection, unbindable required identity, or exact qualification mismatch deterministically rejects C3/TDX and requires fixed-physical candidate selection.

The approval interface binds only the resolved profile canonical-body SHA-256
and runtime-profile hash to a future Section 7.4 external-approval provenance
record. Its approval and runtime-record registries remain empty. A synthetic
vector is evidence of canonical bytes only; it cannot populate either registry
or promote runtime authority.

## Alternatives Considered

- **Hash the raw Compute response:** rejected because it retains prohibited/volatile fields and couples identity to provider response noise.
- **Flatten wildcard paths independently:** rejected because retained disk/NIC associations can be spliced.
- **Normalize malformed input:** rejected because implementations could repair the same bytes differently.
- **Define future trust/qualification hash placeholders now:** rejected because later ownership and evidence are not closed and could create cycles or false authority.
- **Treat hidden TDX fields as sufficient:** rejected; visibility and sufficiency remain independent.

## Risks / Trade-offs

- Large machine artifacts increase review size → exact hashes, focused verifier, generated-shape tests, and one bounded PR keep evidence coupled.
- Mutable public documentation can drift → fresh source bytes remain in a hash-bound external recovery bundle and replay against the frozen vocabulary.
- External bundle is unavailable in some CI environments → retained evidence and byte pins run in CI; full replay runs when the recovery bundle is available and remains a required local gate.
- Conservative field rejection may block a viable GCP candidate → later governance may add a new versioned vocabulary/contract, never an override.

## Migration Plan

No runtime migration exists. Merge the docs-only contract, then create a separate Section 7.3 proposal/PR. Any later implementation must consume these exact versioned artifacts or introduce a reviewed replacement contract.

## Open Questions

- None for Section 7.2. Provider-hidden field treatment remains explicitly pending Section 7.7 governance and later qualification evidence.

# Canonical Aggregate Inference Service

## 1. Purpose and Status

This document defines the architecture required for bit-for-bit repeatable Bayesian inference in FluencyTracr. It is a docs-only concept and prerequisite. It does not authorize an endpoint, schema, deployment, infrastructure change, production-data run, persistence layer, customer output, model promotion, or merge of a held implementation.

The service separates portable data preparation from authoritative numerical execution. Customer-side transformation may run in supported customer environments. Authoritative Bayesian results may be produced only by one attested canonical aggregate-only inference service.

The initial service posture remains internal, synthetic-only, and nonauthorizing until a later governance decision promotes aggregate production inputs and a specific result contract.

## 2. Architecture Decision

The governing decision is:

> Identical canonical aggregate input bytes, implementation bytes, and canonical runtime identity must produce identical semantic-result bytes through one canonical inference service.

Semantic-result bytes are distinct from execution receipts. The semantic result excludes timestamps, process IDs, nonces, signatures, tenant routing metadata, and other execution-specific fields. Each completed computation produces a fresh signed completed-execution receipt that binds its semantic-result hash to the deterministic numerical-body hash, per-attempt security envelope, active runtime, admission lineage, and execution instance. An operational failure may produce only the separate failure receipt defined below, with no semantic-result hash.

A client computer does not become an authoritative numerical runtime merely because it can import the inference package. Windows, macOS, Linux, Intel, AMD, and ARM clients may prepare, validate, submit, and inspect aggregate-only requests. They may also run local diagnostics. Local or client-native results are permanently nonauthoritative under this architecture and cannot be promoted into governed evidence.

The canonical service is the sole numerical authority. Any future proposal for a second authoritative runtime, including an on-premises appliance, must explicitly supersede this decision through a new governance concept. It is not an implementation option under this document.

The service must run on one active, trust-rooted runtime profile and an immutable numerical software image. The execution substrate is either fixed physical/dedicated hardware or a provider-attested virtual profile that has passed predeclared exact-byte qualification across fresh hosts. A virtual profile must be requalified after every boot, host replacement, image/runtime change, or measurement drift. A container digest or coarse machine label alone is insufficient because containers inherit host CPU features and native dispatch behavior.

## 3. Relationship to the Ingest Privacy Boundary

This concept extends, and does not weaken, `docs/concepts/INGEST.md`.

Raw GCE, per-user rows, prompts, document content, session traces, identifiers, and row-level events remain inside the customer environment. The customer-side transformer may compute over approved source rows locally, but it emits only independently gated aggregate cohort distributions.

The canonical inference boundary may receive only aggregate records already allowed to cross into FluencyTracr. It must reject:

- user, employee, respondent, account, email, or other direct identifiers;
- raw event arrays or row-level records;
- prompts, responses, document text, query text, or transcripts;
- session, IP, device, or browser traces;
- arbitrary payload containers that could smuggle prohibited content;
- free-form strings or caller-defined references in the numerical payload;
- slices that have not independently passed the privacy, schema, volume, time-window, cohort-floor, partition, and other admission gates that are determinable before inference.

Source-system adapters remain outside the service. Glean-specific fields and dogfood assumptions must not become universal inference contracts.

## 4. Authority and Result Classes

The system has three result classes:

1. **Canonical attested result.** A deterministic semantic result produced by the exact approved source and runtime from an admitted canonical aggregate request, accompanied by a valid fresh execution receipt. It is eligible for later governance review, but it is not automatically evidence-eligible or customer-authorized.
2. **Local diagnostic result.** Produced outside the canonical service. It may support debugging, numerical repair, and method development, but it remains permanently nonauthorizing and unusable as governed evidence.
3. **Unknown-runtime attempt.** Rejected before numerical execution. It cannot emit a canonical semantic result or execution receipt.

Runtime authority is not an admin override. No administrator may promote an unknown or local result, select a favorable CPU profile, retry until a preferred value appears, substitute tolerance for exact conformance, or sign a result that was not produced by the active canonical runtime.

## 5. Aggregate Admission and Canonical Request Boundary

The numerical service must not decide aggregate privacy admission by trusting caller claims. A separately governed aggregate admission controller must validate request eligibility before the numerical service receives a request.

Trusted partition evidence must originate inside the customer or Glean boundary where approved membership is visible. An approved transformer/admission signer computes opaque, non-enumerable, customer-keyed partition commitments and a signed disjointness/composition attestation without emitting member identifiers or stable cross-customer tokens. The central admission controller verifies that signer and applies a governed composition scope and retention horizon. Production admission remains blocked until a later contract defines and tests that evidence; hashes or caller-visible partition labels alone cannot prove non-overlap.

The admission controller must maintain enough commitment history to reject:

- nested, overlapping, complementary, or composition-difference slices;
- repeated submissions that enable subtraction or small-cohort reconstruction;
- suppressed slices or attempts to rescue them through a broader batch;
- duplicate, stale, reordered, or cross-tenant commitments;
- unapproved calibration, source-coverage, plan, or partition references.

Input-derivable product gates are evaluated before numerical admission by the existing verdict boundary. A slice that fails the locked time or volume requirements produces the corresponding existing `SUPPRESS / INSUFFICIENT_TIME` or `SUPPRESS / INSUFFICIENT_VOLUME` verdict without calling the numerical service. Privacy, schema, partition, replay, overlap, and authorization failures are admission rejections rather than new product suppression reasons.

The deterministic numerical body is canonically serialized first, without any admission token, retry ordinal, tenant context, nonce, or other attempt-specific field. Its numerical-body hash is therefore stable across permitted retries. The admission controller emits a short-lived, signed, single-use initial token binding the authenticated tenant scope, numerical-body hash, trusted partition attestation, model/plan identity, active runtime version, expiry, nonce, and admission-policy version. Tenant and authorization context live in the signed security envelope, not in the deterministic numerical body. Any permitted retry requires a fresh, single-use retry token that additionally binds the original token hash, prior terminal attempt receipt, unchanged numerical-body/runtime/tenant identities, and a monotonic retry ordinal.

A future deterministic numerical-body contract must be closed and aggregate-only. Conceptually it binds:

- the exact aggregate input schema and schema version;
- the governed model and plan identity;
- independently cleared cohort/window/surface slice commitments;
- aggregate observations, denominators, covariance, and known aggregate uncertainty;
- server-resolved calibration and source-coverage identities already authorized by their own contracts;
- implementation and dependency-lock hashes;
- a canonical numerical-body hash over a defined acyclic preimage that excludes the hash field itself and every security/attempt envelope field.

A separate per-attempt security envelope binds the exact numerical-body hash, initial or retry-token hash, admission lineage, attempt ordinal, authenticated tenant scope commitment, and active runtime version. Its attempt-envelope hash uses a separate defined preimage. The token binds the already-computed numerical-body hash; the numerical body never binds the token, so the dependency graph is acyclic. The semantic result binds only the stable numerical-body hash, while receipts bind both the numerical-body and attempt-envelope hashes.

Every enum, string, array, number, and reference requires a bounded domain. The service resolves governed references from approved registries; caller-provided free text and arbitrary references are prohibited.

A content hash does not anonymize data, prove semantic validity, or self-certify its payload. Low-entropy aggregate hashes must not be exposed across tenants or used as public identifiers.

## 6. Canonical Runtime Identity and Trust Root

The runtime identity must be immutable, versioned, machine-verifiable, and checked before model import or random-number generation. At minimum it binds:

- execution substrate kind: `FIXED_PHYSICAL_HOST` or `QUALIFIED_ATTESTED_VIRTUAL_PROFILE`;
- physical/dedicated-host identity when the physical-host substrate is used;
- provider, TEE, instance, machine-series, and virtual-profile identity when the virtual substrate is used;
- the predeclared cross-host qualification plan, complete result manifest, and active requalification record for a virtual profile;
- CPU vendor, family, model, stepping, microcode, and required instruction profile, with any provider-hidden field explicitly governed by the virtual-profile qualification contract;
- firmware, hypervisor, and virtual-machine identity;
- immutable operating-system image digest and kernel policy;
- service-image digest, when a container is used;
- Python executable bytes and version;
- exact dependency lock plus installed wheel and native-extension hashes;
- NumPy, SciPy, PyMC, ArviZ, PyTensor, OpenBLAS, libc, libm, and loader identities;
- effective NumPy/SciPy/native dispatch state;
- OpenBLAS core type and one-thread state;
- floating-point rounding and control state;
- source commit, source manifest, model plan, and compiled constants;
- network, filesystem, locale, and environment restrictions relevant to semantic-result bytes.

An environment-variable declaration or self-asserted hash is not sufficient. Runtime measurements must be verified against an approved measurement policy and signed by a hardware-backed trust root outside the service process. The receipt-signing key must be hardware-sealed and certified to the measured workload, or a hardware quote must directly bind the numerical-body hash, attempt-envelope hash, semantic-result hash when present, execution nonce, and runtime measurement. An ordinary service-held signing key is insufficient. The verifier must validate the complete certificate/quote chain and support nonce/freshness checking, key rotation, signer and runtime revocation, rollback protection, and separation between runtime operators and governance approvers.

One active runtime-profile version is allowed to serve new requests. A replacement host, boot, microcode update, image rebuild, runtime upgrade, or measurement drift invalidates active status even when the advertised machine class is unchanged. A virtual profile requires the exact requalification named by its contract before every activation. Unvalidated failover prefers downtime over numerically ambiguous output.

A rolling serverless platform, generic `ubuntu-latest` runner, Vercel function, or unpinned customer computer cannot satisfy this identity. A standard container on heterogeneous hosts also cannot satisfy it without trust-rooted provider attestation, a closed numerical profile, successful predeclared cross-host exact conformance, and per-boot requalification.

## 7. Service Execution Model

The system contains two distinct components:

- a stateful aggregate admission controller that stores only the minimum governed commitments needed to prevent replay, overlap, subtraction, and cross-tenant admission; and
- a private numerical service that is stateless with respect to request and result payloads.

The numerical service must have:

- no request/result persistence by default;
- no arbitrary network egress;
- no connector, warehouse, or source-system access;
- no dynamic code loading or caller-selected model module;
- no caller-selected thresholds, priors, seeds, chain counts, or runtime flags;
- one governed model/plan allowlist;
- admission-token and canonical-request validation before numerical imports;
- trust-rooted runtime attestation before generation or sampling;
- bounded execution resources and explicit terminal states;
- summary-only output according to the separately governed result contract;
- operational logging limited to non-payload metadata and protected commitments.

Ingress proxies, API gateways, APM agents, traces, queues, swap, core dumps, crash capture, temporary files, and support tooling must not retain accepted or rejected request bodies or semantic-result bodies. Network front doors must enforce body-size limits and disable payload capture before application validation.

There is no implicit service retry. A permitted retry uses the fresh lineage-bound retry token defined by the admission contract; it cannot reuse the consumed initial token or change the deterministic numerical body, hardware, active runtime, tenant scope, model, plan, or partition evidence. The retry creates a new attempt envelope and receipt while preserving the same numerical-body hash and expected semantic-result bytes. A semantic mismatch is a blocking runtime incident.

## 8. Deterministic Semantic Result

The deterministic semantic result is a canonically serialized object whose bytes may be compared across repeated cold executions. It conceptually binds:

- deterministic numerical-body hash;
- source commit and source-manifest hash;
- dependency-lock and approved runtime-profile version;
- governed model/plan identity;
- exact seed and execution-plan identity when randomness is used;
- terminal model state;
- summary-only model diagnostics and existing fail-closed eligibility fields;
- a closed summary-only shape whose validator derives the absence of raw posterior values, pseudo-draws, conditional components, and prohibited identifiers from the canonical bytes rather than trusting a self-asserted field;
- semantic-result self-hash over a defined preimage that excludes the self-hash field.

It excludes freshness, tenant, transport, operator, process, host-instance, timestamp, signature, and routing fields. A completed computation with failed or missing model diagnostics produces an unsigned deterministic `HOLD` semantic result accompanied by a separate signed completed-execution receipt when the separately governed result contract permits that shape.

The semantic result is not automatically evidence-eligible or customer-authorized. Statistical validation, independent review, proof-path admission, and customer-output authorization remain separate gates.

## 9. Fresh Execution Receipt and Consumer Validation

Every completed canonical computation produces a separate signed completed-execution receipt. Its signature must be produced by the hardware-sealed measured-workload key or hardware quote defined by the runtime trust policy. It conceptually binds:

- deterministic numerical-body, per-attempt envelope, and semantic-result hashes;
- admission-token lineage and authenticated authorization-context commitments;
- active runtime-profile version and complete runtime-measurement hash;
- source, image, dependency-lock, model, and plan hashes;
- execution nonce, start/end timestamps, process/execution identity, and terminal state;
- signer/key identity, workload certificate/quote chain, and signature over a defined receipt preimage that includes the request, result, nonce, and runtime-measurement hashes.

An operational failure that occurs after admission produces no semantic result. When an audit record is permitted, it uses a distinct signed operational-failure receipt schema that binds the numerical-body and attempt-envelope hashes, admission lineage, runtime measurement, nonce, execution identity, terminal error class, and signer chain while omitting a semantic-result hash. Admission rejection before canonical execution uses the admission controller's separate rejection record, not an execution receipt.

The consumer must verify every field, trust chain, nonce, token lineage, numerical-body hash, attempt-envelope hash, active-profile status, and signature before accepting a canonical result or operational record. It must reject malformed, unsigned, stale, expired, replayed, revoked, wrong-tenant, wrong-body, wrong-attempt, wrong-result, wrong-source, wrong-image, wrong-runtime, wrong-plan, wrong-token-lineage, or inactive-profile receipts. A valid result for numerical body A cannot satisfy body B merely because both envelopes are structurally valid.

Receipt verification is trust-rooted evidence about execution identity. It is not statistical acceptance, suppression clearance, or customer-output authorization.

## 10. Conformance, Release, and Deployment Admission

Exact binary64 conformance must run on the immutable runtime candidate that will serve canonical requests. A physical-host profile runs conformance on that fixed host. A virtual profile runs its predeclared cross-host qualification and then repeats active-instance conformance after every boot or replacement before serving requests.

Standard GitHub-hosted runners may continue to run:

- source, schema, and privacy validation;
- pure integer/hash tests;
- fail-closed malformed-input tests;
- proof-boundary and governance tests;
- nonauthorizing local smoke diagnostics.

They must not be treated as the authority for host-sensitive exact numerical oracles.

The canonical conformance lane must:

1. verify trust-rooted runtime measurements before loading the model;
2. reject any unknown, inactive, or revoked profile;
3. run exact frozen numerical oracles and the complete governed inference suite;
4. prove identical semantic-result bytes across repeated cold processes;
5. bind the exact source tree, service-image digest, hardware identity, and signer policy;
6. issue a signed release manifest for one exact source/image/runtime tuple;
7. expose one required terminal check that fails when attestation or any shard fails;
8. preserve protected audit receipts and hashes without persisting prohibited payloads.

Deployment may serve canonical traffic only when its source, image, runtime profile, signer policy, and release manifest exactly match an active passing conformance record. Rebuilding an image after conformance creates a different candidate. Activation, deactivation, and rollback must be atomic and versioned. In-flight requests remain bound to the profile named in their admission tokens. Revoked profiles cannot serve retries or historical replays.

A favorable rerun on a different hosted machine is not evidence of determinism. Runtime drift requires a new candidate and governance review; it must not silently expand an oracle allowlist.

## 11. Failure Taxonomy

The system distinguishes five outcomes:

1. **Pre-inference product suppression.** The existing verdict boundary determines that a slice fails an input-derivable locked gate such as time or volume. It emits the applicable existing `SUPPRESS` verdict and does not request numerical execution.
2. **Admission rejection.** Privacy, tenant, partition, replay, overlap, schema, or authorization failure. Numerical execution does not start, no service semantic result is created, and the rejection does not invent a product suppression reason.
3. **Operational failure.** Service, runtime attestation, infrastructure, resource, or numerical exception prevents a completed governed computation. No partial semantic result is published.
4. **Completed model-diagnostic failure.** Computation completes but required convergence, geometry, calibration, or model diagnostics fail or are missing. The service emits an unsigned deterministic `HOLD` semantic result plus a separately signed completed-execution receipt only if the separately governed result contract allows that shape.
5. **Post-inference product suppression.** The existing verdict boundary evaluates validated inference-derived evidence and emits exactly one of the existing five suppression reasons when applicable. Product suppression must not be inferred from infrastructure or model-diagnostic terminology alone.

Additional rules:

- Unknown runtime or attestation mismatch: do not execute.
- Duplicate, missing, stale, or reordered input binding: reject.
- Repeatability mismatch for the same request/source/runtime: quarantine and revoke the runtime candidate.
- Service unavailable: report an operational failure, not a new suppression reason or synthetic result.

Operational failures and diagnostic HOLD labels cannot be converted into SURFACE eligibility or customer-facing confidence.

## 12. Security, Tenancy, and Retention Posture

Required posture includes:

- aggregate-only allowlisted numerical input;
- authenticated tenant scope outside the deterministic payload;
- signed, short-lived, single-use initial and lineage-bound retry tokens;
- deny-by-default schema and registry validation;
- transport encryption, replay protection, rate limits, and per-tenant cache/dedup isolation;
- no secrets in request bodies or logs;
- no prompt, document, transcript, raw-event, or identifier logging;
- no arbitrary filesystem paths;
- no customer-controlled code, package, model, seed, or runtime options;
- no network egress except explicitly governed operational dependencies;
- no request/result body retention until a separate retention contract is approved;
- no body capture in memory dumps, temporary storage, swap, traces, APM, proxies, queues, or support tools;
- protected keyed commitments for operational lookup where plain low-entropy hashes could enable dictionary or cross-tenant correlation;
- least-privilege access, key rotation, revocation, and separation of operational and governance duties.

Hashes are consistency commitments, not anonymization. Audit systems must retain only the minimum protected receipts and commitments authorized by a later contract.

A service operator cannot override model gates, modify immutable baselines, promote held results, activate untested images, or sign results outside the approved runtime.

## 13. Governance Invariants Preserved

1. **Canonical event set unchanged.** The service transports and evaluates existing aggregate evidence; it adds no canonical events.
2. **No new suppression reasons.** Admission, runtime, service, and model-diagnostic failures do not add product verdict reasons.
3. **No tunable thresholds.** Runtime identity, model settings, priors, and gates are compiled and versioned, not caller- or admin-adjustable.
4. **No admin overrides.** No operator may convert local, unknown-runtime, or held results into authoritative evidence.
5. **No individual scoring.** The boundary accepts independently cleared aggregate cohort records only and structurally rejects person-level fields.
6. **Default verdict remains SUPPRESS.** Runtime authority cannot rescue evidence that fails existing gates.
7. **Latency remains corroborative only.** Service latency cannot become a surfacing trigger.
8. **Assurance Harness stays green.** Implementation requires privacy, admission, attestation, repeatability, consumer-validation, and failure-path fixtures.
9. **Per-slice suppression remains independent.** Every slice is evaluated independently by the existing pre-inference verdict gates; a slice that fails time, volume, or another input-derivable product gate is suppressed without a numerical request. Privacy, schema, partition, replay, and overlap failures are separately rejected by admission. Inference-derived convergence, baseline, ambiguity, and other model diagnostics are evaluated only after computation and remain distinct from downstream product suppression. A slice that fails any applicable gate contributes nothing to surfaced evidence. Contract-approved joint modeling or partial pooling may use only predeclared, disjoint, independently admitted aggregates; it cannot rescue a slice or admit overlapping/complementary partitions. Production remains blocked until the trusted partition evidence and composition-history contract demonstrates resistance to cross-slice re-identification.

## 14. Migration Boundary for Current Bayesian Work

Nonauthoritative local implementation, numerical repair, tests, and diagnostics may continue under existing contracts. This concept blocks governed evidence creation and authoritative model-validation execution outside the future canonical service; it does not prohibit local engineering work that remains permanently nonauthorizing.

Held pull requests remain governed by their existing contracts, CI, review findings, and merge requirements. This concept does not authorize their merge or allow a failed exact-runtime check to be removed, retried until favorable, or reclassified as passing.

A later service implementation sequence should be:

1. approve this architecture concept;
2. define docs-only admission, request, semantic-result, receipt, and runtime-governance contracts;
3. select a fixed-physical or qualified-attested-virtual substrate, trust root, and immutable runtime-image governance;
4. build a synthetic-only admission controller and no-persistence numerical prototype;
5. run repeated exact conformance on the service runtime;
6. bind the inference harness to that exact runtime and release manifest;
7. obtain fresh privacy, exact-source, failure-mode, and statistical review;
8. only then authorize governed model-validation execution.

Passing local tests or one favorable generic hosted run does not skip these steps.

## 15. Implementation Boundary

This concept authorizes documentation and architecture planning only.

It does not authorize:

- a backend route, public API, queue, database, schema, or frontend;
- infrastructure provisioning, credentials, permissions, signing keys, DNS, or deployment;
- production or customer aggregate ingestion;
- raw data transfer;
- model generation, sampling, evidence creation, or acceptance;
- new canonical events or suppression reasons;
- model promotion, customer-facing probability/confidence, ROI, causality, productivity, or economic output;
- changes to held PRs or historical governed identities;
- replacing exact checks with tolerances, fallback algorithms, or multiple ungoverned host oracles;
- a second local, customer, or on-premises authoritative runtime.

Each implementation step requires its own bounded approval, privacy review, exact source/runtime binding, tests, and rollback plan.

## 16. Open Questions

These questions must be resolved before implementation:

- Will the first runtime use fixed physical hardware or a provider-attested virtual profile, and what exact qualification evidence closes that substrate choice?
- What exact admission-controller state is sufficient to block replay, overlap, complementary cohorts, and subtraction without storing prohibited payloads?
- How will the service and conformance runner share one immutable image, signer policy, and measurement verifier?
- What authentication and tenant-isolation model is appropriate for internal synthetic-only use and later aggregate production use?
- What receipt and protected-commitment retention, if any, is permitted?
- What availability target accepts downtime rather than unvalidated failover?
- How are runtime upgrades proposed, compared, signed, activated, revoked, rolled back, and retained for replay?
- When may aggregate production inputs replace the initial synthetic-only restriction?

The first provider-specific candidate is defined in
[`docs/contracts/canonical-inference-gcp-runtime-candidate/README.md`](../contracts/canonical-inference-gcp-runtime-candidate/README.md).
It selects C3/TDX only for downstream contract hardening and authorizes no GCP
action or model execution.

These are implementation decisions, not permission to weaken the canonical runtime, trust root, or aggregate-only boundary.

## 17. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The decision to separate portable aggregate transformation from one canonical, bit-for-bit authoritative inference service is credited to James Kelley. The key insight is that FluencyTracr must be usable from many environments without allowing arbitrary client hardware to determine governed Bayesian evidence.

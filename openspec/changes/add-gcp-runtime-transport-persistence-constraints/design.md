# Section 7.5A constraints and open obligations — upfront design

Date: 2026-07-26
Base: `9c605e4bf45130dd934cedb5ff7392a7d2e99b27`
Queue: `gcp-runtime-transport-persistence-constraints-section-7-5a` (`risk=high`, machine-distinct from full Section 7.5)
Authority effect: `NONE`
Current design state: `DRAFT`

## 1. Purpose

Close only a docs-level constraints and open-obligations contract. It freezes exact provider semantics, negative requirements, parent interface obligations, compile-only canonicalization/hash composition, forbidden Section 7.6 dependencies, and the prerequisite set that blocks any positive Section 7.5 live interface.

It deliberately defines **no** verified/live evidence record, mechanism-writer assignment, approval record/path, current-head/checkpoint promotion protocol, runtime endpoint/interface, implementation-ready interface, readiness packet, test/fixture, validator/verifier, SUT, GCP action/resource, credential, persistence, evidence collection, qualification, model execution, Sections 7.6–7.8 work, or runtime authority.

## 2. Proposed repository artifacts

- `docs/contracts/canonical-inference-gcp-transport-persistence-constraints/README.md`
- `docs/contracts/canonical-inference-gcp-transport-persistence-constraints/constraints-open-obligations-contract.json`
- `docs/contracts/canonical-inference-gcp-transport-persistence-constraints/provider-source-evidence.json`
- `docs/contracts/canonical-inference-gcp-transport-persistence-constraints/provider-revalidation.json`
- `docs/contracts/canonical-inference-gcp-transport-persistence-constraints/audit-method-inventory.json`
- `openspec/changes/add-gcp-runtime-transport-persistence-constraints/{proposal.md,design.md,tasks.md}`
- `openspec/changes/add-gcp-runtime-transport-persistence-constraints/specs/gcp-runtime-transport-persistence-constraints/spec.md`
- `ATTRIBUTION.md`, `.project/PROGRESS.md`, queue status/note

No scripts/tests/vectors/fixtures or runtime files.

## 3. Exact source basis

Section 7.5A public source archive:

- locator: `external-recovery://fluencytracr/gcp-transport-persistence-source-snapshot-20260727T022634Z.zip`
- sources: 53
- bytes: 1,360,001
- archive SHA-256: `cb7c440f18c7afe7e5f05ff455ffca1dd98cd3a284c6b741c7b3ab88b7a88750`
- sanitized manifest SHA-256: `5f98896e8bd11e0232b14eca46670f6273bb65cbb61f94629095949aa859fd50`

Inherited Section 7.3 KMS source:

- source ID `KMS_AUDIT_LOGGING`
- source bundle SHA-256 `6f87fa394a9ae88032dfa28ebfba03b2e92408f1bb703975a8c146f2453fdae3`
- source registry SHA-256 `e12d0dcb6d7ff6b1a48519e21cc7c84364cde3e9611d24b9900b2581d6670062`

Audit/method research inventory:

- 89 rows: 88 method rows and one platform-log row
- exactly ten inherited Section 7.3 operation IDs
- exactly two inventory classes: inherited authority operations and Section 7.5 internal provider operations
- all 89 method/platform literals replayed against named source bytes
- pre-generation research-inventory SHA-256 `427a37b5a97275ddf0cc68cc90f8dd8e8cb3c8f841baad87c0f856392fa8a6d5`; checked-in pretty-serialized raw file SHA-256 `e13cf9889947115859d684f7377fd38caa6e5207969eda073f534bc94af87bbf`, separately contract-bound
- status `RESEARCH_INVENTORY_LITERAL_REPLAY_PASS_SEMANTIC_CLASSIFIER_UNCLOSED`

The checked-in inventory is source research, not a live classifier or acceptance oracle. Duplicate/overlapping methods, principal-route distinctions, context permissions, log type/resource/applicability, and writer/observer invocation authority remain blocking obligations. The final inventory uses the deduplicated required-field version (89/89 literal replay, zero duplicate required-field entries) and includes Create/Update/Delete/Get/List Exclusion coverage.

## 4. Stable parent obligation projections

### Section 7.2

Bind the exact ten profile field records with `binding_phase=PROFILE_FREEZE_AND_SECTION_7_5_POLICY`:

`compiled_constants_sha256`, `environment_manifest_sha256`, `filesystem_restriction_manifest_sha256`, `locale`, `model_plan_sha256`, `network_restriction_manifest_sha256`, `process_thread_policy_sha256`, `source_commit`, `source_manifest_sha256`, `timezone`.

Section 7.5A records that future Section 7.5 policy must bind them. It does not populate or approve values.

### Section 7.3

Bind exact security-authority contract/source/revalidation/role-matrix bytes, ten required authority operation IDs, five project roles, fourteen principal roles, privacy constraints, immutable audit persistence interface, and empty live policy/evidence approvals.

Section 7.5A records the unresolved facts that no existing capability authorizes a Section 7.5 storage/checkpoint mechanism writer; `runtime_approved_section_7_5_binding_hashes` is empty; security-authority policy/evidence approval domains are empty; and no actual project/principal aliases exist.

### Section 7.4

Bind the exact current raw `attestation-receipt-contract.json` bytes and SHA-256 `88c58b9a07ab84fffe6a98f6c14561b522a18428e355ee2d8a636fd901d85200`. The Section 7.5A obligation projection preserves the complete parsed object unchanged, including all 16 approval arrays exactly equal to `[]`, all six current source-trust states/classifications, 116 hash nodes, 9 selectors, 64 compositions, 42 replay kinds/member schemas, compiled constants, decisions, dependency/replay contracts, privacy, terminal coherence, future interfaces, and normative design/spec bindings. Projection validation first requires raw-byte hash equality and exact empty approval arrays; it never erases values. Any parent-byte or approval-value change invalidates this Section 7.5A version and requires new review. No approval fixed point exists because Section 7.5A is categorically ineligible for parent approval.

Bind the exact nine Section 7.5 opaque acceptance obligations by node/field name: trust distribution; channel enforcement; pre-quote transport; terminal-quote transport; KMS-sign transport; audit mapping; initial replay retention; current replay retention; final consumer replay retention; plus token freshness use of the Section 7.5 trust verification time.

The exact obligated node IDs are `trust_distribution_acceptance_hash`, `channel_enforcement_acceptance_hash`, `pre_quote_transport_acceptance_hash`, `terminal_quote_transport_acceptance_hash`, `kms_sign_transport_acceptance_hash`, `audit_mapping_acceptance_hash`, `initial_section_7_4_replay_retention_acceptance_hash`, `current_section_7_4_replay_retention_acceptance_hash`, `final_consumer_replay_retention_acceptance_hash`, and `token_freshness_verification_hash` with field `section_7_5_trust_record_verified_at`.

Section 7.5A defines no opaque record schema and no acceptance hash. It records that Section 7.4 v1 embedded approvals remain empty and offers no external current-checkpoint approval lineage.

## 5. Negative constraint registry

Every row is compile-only and has fields `{constraint_id, domain, source_claim_ids, parent_obligation_ids, requirement, prohibited, unresolved_dependencies, failure_disposition, authority_effect}`. Failure is always HOLD or REJECT; no row emits acceptance.

### Network and channels

- Measured numerical workload has no external IP/public ingress and may use only the measured Unix socket `/run/container_launcher/teeserver.sock`, STS token exchange, and KMS AsymmetricSign under the Section 7.3 direct-WIF policy.
- Quote transport is Unix-domain-socket HTTP, never TCP/TLS relayer transport.
- KMS uses exact Google API TLS/trust targets owned by Section 7.4.
- Artifact Registry `us-docker.pkg.dev` pull belongs to launcher/bootstrap, not numerical-workload egress.
- Numerical workload has no Storage, Spanner, Logging, IAM, IAM Credentials, DNS, Compute, Resource Manager, Access Context, Artifact Registry API, arbitrary endpoint, proxy, DNS override, or ambient trust fallback authority.
- Restricted VIP/private DNS/firewall/route claims are provider constraints only; no live network configuration is asserted.

### Local disk/tmpfs/swap/logging

- Confidential Space production, one workload per boot, restart `Never`, no persistent volume/host mount, swap disabled.
- Only profile-frozen tmpfs/shared-memory destinations; no arbitrary path.
- No payload logging, stdout/stderr redirect, serial output, memory monitoring, APM/tracing/profiling payloads, core dumps, crash body capture, debug image, SSH, command/env override, extra capabilities, namespaced cgroup, or exposed inbound port.
- Policy bytes alone never prove whole-interval enforcement; authenticated local enforcement evidence remains unresolved.

### GCS constraints if later selected

- Strong operation semantics do not make multi-object/list traversal an atomic namespace snapshot.
- Individual object operations only; no batch-atomicity claim.
- Write-once create requires `ifGenerationMatch=0`; reads bind exact generation/metageneration/bytes/hash/length; mismatches reject.
- `versions=true` and `softDeleted=true` cannot be combined; any selected completeness scope must declare the excluded history exactly.
- Bucket lock, retention, UBLA, PAP, region, CMEK, identity/incarnation, writer authority, parent-approved exact target, and no-replacement behavior all require separate evidence/approval.
- No mutable head, latest-object discovery, or currentness protocol is selected here.

### Spanner constraints if later selected

- Default serializable read-write transaction; previously begun `transactionId`; `singleUseTransaction` prohibited for the selected write because source marks it non-idempotent.
- Commit timestamp is provider-selected, microsecond-granularity, and not unique.
- Transaction-body retries and ambiguous Commit outcomes require explicit later ownership; Section 7.5A authorizes none.
- No Section 7.6 reservation, consumption, retry, crash-recovery, terminal, precedence, or authority-mutation semantics.

### Logging/audit constraints

- Admin Activity/System Event always written; non-BigQuery Data Access must be enabled. A separate Policy Denied applicability registry must classify every required method in both the inherited authority inventory and the Section 7.5 internal inventory; for each applicable method it binds Policy Denied log name, originating resource/project/folder/organization, all routing sinks, and every exclusion layer. Every required Policy Denied event must have no exclusion across the full interval. The provider permits exclusions, so any exclusion, unclassified method, incomplete service-support universe, missing route edge, or ambiguous state HOLDs/rejects.
- Log Router buffering does not protect configuration errors; sinks are non-retroactive; exclusions and sink errors can omit evidence.
- Query universe must not be method-filtered before classification and must be rooted in authenticated complete project/folder/organization scope.
- Raw logs, identities, IPs, resources, requests/responses, entry/set commitments, aliases, checkpoints, counts, windows, and coverage state remain restricted; there is no public/runtime/customer evidence projection.
- Public documentation does not supply an exact end-to-end delivery-completeness receipt. Audit completeness remains blocking.

### Privacy and authority

- No raw or plain/dictionaryable identifiers, logs, tokens, quotes, signatures, keys, certificates, runtime/GCP/customer resource locators, request/result/model/plan bytes, credentials, customer data, or person-level fields in checked-in artifacts or outputs.
- Exact public-provider documentation HTTPS URLs and opaque `external-recovery://` locators are allowed only in docs-provenance records with `authority_effect=NONE`; they cannot enter runtime objects, customer output, evidence decisions, or approval registries. Public source bytes/examples remain external restricted provenance only.
- Every object/disposition has `authority_effect=NONE`; no admin override or synthetic approval.

## 6. Exact open-prerequisite registry

Every row has `{prerequisite_id, owner, requirement, why_blocking, forbidden_substitute, evidence_needed, current_state="OPEN_BLOCKING", closes_interface_ids, authority_effect="NONE"}`.

- `S75A-P00` owner Section 7.2: populate and approve the exact runtime-profile hash through its own future governed process; `approved_runtime_profile_hashes=[]` remains blocking.
- `S75A-P01` owner Section 7.3: admit distinct future full-Section-7.5 storage/checkpoint writer/reader/administrator, record authenticator, network/DNS/route/firewall/perimeter configurator and observer, channel observer, and independent-anchor writer/reader capabilities/principals; define exact provider permissions and transitive controller separation; any Section 7.6 role is a forbidden substitute.
- `S75A-P02` owner Section 7.3: approve the exact future Section 7.5 binding plus required live security-authority policy/evidence domains; parent admission must retrieve candidate contract bytes, require a future full-Section-7.5 schema/kind/domain selected by that amendment, and reject every `SECTION_7_5A` schema/domain/hash regardless of approver input. All current lists, including `runtime_approved_section_7_5_binding_hashes`, remain empty.
- `S75A-P03` owner Section 7.4: define external approval/policy/verifier records outside compile-pinned bytes for exact Section 7.5 contract and checkpoint-target hashes, including current approved-target lineage; parent admission must resolve hash to bytes, require the future full-Section-7.5 discriminator, and deterministically reject Section 7.5A substitution in all nine acceptance paths.
- `S75A-P04` owner future full Section 7.5: define concrete checkpoint schema, key/storage policy, writer mechanism, predecessor/fork/currentness rules, stale-reader rejection, shared check-and-use, restore detection, concurrency, and checkpoint/provider-transaction crash or ambiguous-response recovery only; attempt crash state, retry eligibility/tokens, terminal state, and precedence remain exclusively Section 7.6. Section 7.4 consumes/approves but does not own persistence mechanics.
- `S75A-P05` owner Sections 7.3/7.4 plus future full Section 7.5: prove mechanism writer, parent approver/verifier, authenticator, retention custodian, CMEK controller, bucket/database controller, and authority-mutator separation.
- `S75A-P06` owner Section 7.3: provide authenticated actual five-project/fourteen-role aliases and provider binding; current actual aliases are absent.
- `S75A-P07` owner future full Section 7.5 plus Section 7.4 verifier: define exact verified-record schemas/equalities for the nine interfaces; Section 7.5 supplies authenticated trust-record evidence, while the Section 7.4 verifier assigns one authoritative `section_7_5_trust_record_verified_at` from its approved UTC clock and requires exact equality of that one value in both `trust_distribution_acceptance_hash` and `token_freshness_verification_hash`, with challenge interval binding. Section 7.5 cannot self-date it; Section 7.5A is forbidden substitute.
- `S75A-P08` owner Section 7.3 plus future full Section 7.5: admit any required record-authentication key/capability without silently adding a third HSM purpose, then define exact workload/launcher/observer/authenticator/mechanism-writer plane identities, credentials, target/method restrictions, and authentication formulas.
- `S75A-P09` owner future full Section 7.5: authenticated whole-interval local disk/tmpfs/swap/logging enforcement root.
- `S75A-P10` owner future full Section 7.5: selected immutable GCS retention/checkpoint mechanism closing bucket lock, retention, UBLA, PAP, region, CMEK, bucket incarnation, exact parent-approved target, generation/metageneration, no replacement, and declared active/noncurrent/soft-deleted history scope.
- `S75A-P11` owner future full Section 7.5: Spanner mechanism-writer ownership, transaction schema, provider-transaction idempotence, transport retry prohibition/handling, and unknown-Commit mechanics only; no invented Section 7.6 input/interface is named, and Section 7.6 exclusively owns reservation, consumption, attempt crash state, retry eligibility/token, terminal state, and precedence.
- `S75A-P12` owner future full Section 7.5: semantically closed and complete audit method universe/classifier resolving overlaps, principal routes, permissions, log types, resources, applicability, explicit disposition of every provider method including Create/Update/Delete/Get/List Exclusion, and a total Policy Denied applicability/log-name/origin crosswalk for every inherited and internal method.
- `S75A-P13` owner future full Section 7.5/Section 7.7: independently rooted audit routing/delivery completeness, complete service-support universe, required Policy Denied no-exclusion proof across every project/folder/organization sink/exclusion layer and full interval, exclusion-method observation, and full route timeline.
- `S75A-P14` owner Section 7.4: approved TLS/trust distribution target and anti-rollback semantics.
- `S75A-P15` owner Section 7.7: whole-system DAG/field/role/privacy/reason reconciliation.
- `S75A-P16` owner Section 7.8: qualification plan/execution only after 7.7 GO and fresh authorization.
- `S75A-P17` owner human: create a separate machine-distinct high-risk full-Section-7.5 queue item before any verified-record, mechanism, readiness, SUT, or implementation work; Section 7.5A completion cannot activate it.
- `S75A-P18` owner Section 7.3 admission plus future full Section 7.5 mechanism: define and prove whole-interval network/channel controls for private ingress/egress, UDS peer/no-relayer behavior, STS/KMS caller-by-method enforcement, Google API TLS/target binding, DNS/firewall/route/perimeter state, and authenticated observations required by Section 7.4.
- `S75A-P19` owner Section 7.3 authority admission plus future full Section 7.5 mechanism with Section 7.4 approval: select an independent nonrollbackable external anchor; define writer/reader/approver/authenticator/controller permissions and separation, currentness/lineage/check-and-use/restore/checkpoint-mechanic recovery; and obtain exact parent approval. A storage checkpoint or approval record alone is not sufficient.

Registry keyset/count is compile-pinned. Exact semantic edge plan:

- `S75A-C-NETWORK -> [P00,P01,P02,P03,P05,P06,P07,P08,P14,P17,P18,P19]`
- `S75A-C-LOCAL -> [P00,P01,P05,P06,P08,P09,P17,P19]`
- `S75A-C-GCS -> [P01,P02,P03,P04,P05,P06,P10,P17,P19]`
- `S75A-C-SPANNER -> [P01,P02,P05,P06,P08,P11,P17,P19]`
- `S75A-C-AUDIT -> [P01,P02,P03,P05,P06,P12,P13,P15,P17,P19]`
- `S75A-C-PRIVACY -> [P01,P02,P03,P05,P06,P08,P12,P13,P15,P17]`
- `S75A-C-AUTHORITY -> [P00,P02,P03,P07,P14,P15,P16,P17]`
- `S75A-I-S72-POLICY -> [P00,P07,P09,P18]`
- `S75A-I-S73-AUDIT-AUTHORITY -> [P01,P02,P05,P06,P12,P13]`
- `S75A-I-S74-NINE-ACCEPTANCE -> [P03,P04,P05,P07,P08,P10,P11,P13,P14,P18,P19]`
- `S75A-I-S74-TOKEN-FRESHNESS -> [P03,P07,P14,P18,P19]`

The JSON uses full IDs `S75A-P00`..`S75A-P19`. Every constraint/interface row has exactly this nonempty dependency set; every prerequisite has the exact reverse edge set derived from this table. Orphans, unknown IDs, missing/extra forward or reverse edges, or edge disagreement reject. Removing, closing, or weakening a row requires a new human queue item, exact evidence, and review; no row is closed here.

## 7. Forbidden dependency registry

- no new/current Section 7.6 live semantic field/value or direct Section 7.5A decision dependency; immutable Section 7.6 names already embedded inside the stable Section 7.4 parent projection remain opaque inherited obligations only and cannot be interpreted, selected, surfaced, or used as Section 7.5A authority;
- no Section 7.4 live acceptance hash in a Section 7.5A preimage;
- no candidate/self-asserted commitment as root;
- no source archive/review hash as runtime evidence;
- no local/synthetic value in any approval list;
- no contract/readiness review as external authority;
- no mutable approval value inside stable parent projection;
- no live record, implementation, or execution artifact.

## 8. Compile-only canonicalization and hash DAG

Use complete `FT_CANONICAL_JSON_V1`: UTF-8 no BOM/trailing bytes; input already NFC; reject controls/surrogates/non-NFC/null/float/duplicate/unknown/implicit default; signed int64 only; lexicographic Unicode-code-point object keys; arrays preserve schema order or declare one exact unique sort key; minified separators; direct Unicode output; self-hash omitted.

Every node is SHA-256 of `ASCII(exact domain) || 0x00 || canonical(exact preimage object)`. Closed node/domain/dependency registry:

1. `section_7_2_policy_obligation_projection_hash`, domain `FLUENCYTRACR:GCP:SECTION_7_5A:SECTION_7_2_OBLIGATIONS:V1`, deps `[]`;
2. `section_7_3_authority_audit_obligation_projection_hash`, domain `FLUENCYTRACR:GCP:SECTION_7_5A:SECTION_7_3_OBLIGATIONS:V1`, deps `[]`;
3. `section_7_4_stable_semantic_projection_hash`, domain `FLUENCYTRACR:GCP:SECTION_7_5A:SECTION_7_4_OBLIGATIONS:V1`, deps `[]`;
4. `provider_source_registry_hash`, domain `FLUENCYTRACR:GCP:SECTION_7_5A:PROVIDER_SOURCE_REGISTRY:V1`, deps `[]`;
5. `provider_claim_registry_hash`, domain `FLUENCYTRACR:GCP:SECTION_7_5A:PROVIDER_CLAIM_REGISTRY:V1`, deps `[provider_source_registry_hash]`;
6. `provider_revalidation_hash`, domain `FLUENCYTRACR:GCP:SECTION_7_5A:PROVIDER_REVALIDATION:V1`, deps `[provider_source_registry_hash,provider_claim_registry_hash]`;
7. `audit_method_research_inventory_hash`, domain `FLUENCYTRACR:GCP:SECTION_7_5A:AUDIT_METHOD_RESEARCH_INVENTORY:V1`, deps `[provider_source_registry_hash,section_7_3_authority_audit_obligation_projection_hash]`, binding the exact 89-row research inventory;
8. `negative_constraint_registry_hash`, domain `FLUENCYTRACR:GCP:SECTION_7_5A:NEGATIVE_CONSTRAINT_REGISTRY:V1`, deps `[section_7_2_policy_obligation_projection_hash,section_7_3_authority_audit_obligation_projection_hash,section_7_4_stable_semantic_projection_hash,provider_claim_registry_hash]`;
9. `parent_interface_obligation_registry_hash`, domain `FLUENCYTRACR:GCP:SECTION_7_5A:PARENT_INTERFACE_OBLIGATION_REGISTRY:V1`, deps `[section_7_2_policy_obligation_projection_hash,section_7_3_authority_audit_obligation_projection_hash,section_7_4_stable_semantic_projection_hash]`;
10. `open_prerequisite_registry_hash`, domain `FLUENCYTRACR:GCP:SECTION_7_5A:OPEN_PREREQUISITE_REGISTRY:V1`, deps `[negative_constraint_registry_hash,parent_interface_obligation_registry_hash]`;
11. `forbidden_dependency_registry_hash`, domain `FLUENCYTRACR:GCP:SECTION_7_5A:FORBIDDEN_DEPENDENCY_REGISTRY:V1`, deps `[section_7_2_policy_obligation_projection_hash,section_7_3_authority_audit_obligation_projection_hash,section_7_4_stable_semantic_projection_hash]`;
12. `section_7_5a_constraints_contract_hash`, domain `FLUENCYTRACR:GCP:SECTION_7_5A:CONSTRAINTS_CONTRACT:V1`, deps exactly nodes 1–11.

Every node preimage field list is exact in the JSON contract and every listed direct dependency is included as a same-named hash field. No live/evidence/policy/approval/record/checkpoint/result hash node exists.

## 9. Total decision

Compile reject precedence: malformed/canonicalization/hash -> privacy/boundary leakage -> parent stable-projection mismatch -> source conflict -> prerequisite omission/weakening. Compile HOLD precedence: source unavailable/drift -> semantic audit inventory unclosed -> any open prerequisite (always true in v1). Final else is unreachable in v1 and defined only as `SECTION_7_5A_CONSTRAINTS_INTERNALLY_CONSISTENT_OPEN_PREREQUISITES_BLOCK_LIVE_INTERFACE_AUTHORITY_NONE`.

Recorded v1 result after exact docs closure must be:

`SECTION_7_5A_CONSTRAINTS_CLOSED_OPEN_PREREQUISITES_BLOCK_LIVE_INTERFACE_RUNTIME_AUTHORITY_HELD`

Hard non-substitution flags are compile-pinned: `satisfies_section_7_5=false`, `eligible_as_section_7_6_dependency=false`, `eligible_for_parent_approval=false`, `runtime_record_schema_defined=false`, `positive_runtime_interface_defined=false`. Every Section 7.5A domain contains `SECTION_7_5A` and is prohibited from satisfying all ten Section 7.3 required keys—`operation_inventory_sha256`, `section_7_5_contract_sha256`, `section_7_5_decision`, `section_7_5_method_mapping_sha256`, `section_7_5_approval_binding_sha256`, `completeness_window_start`, `completeness_window_end`, `missing_operation_count`, `raw_logs_retained_in_fluencytracr`, `audit_interface_binding_sha256`—plus decision `SECTION_7_5_APPROVED_IMMUTABLE_AUDIT_MAPPING` or `runtime_approved_section_7_5_binding_hashes`; and Section 7.4 field `approved_section_7_5_contract_hash` in each of the nine named positive acceptance nodes. Each Section 7.4 slot row also binds its exact status field/type/value: `section_7_5_status="VERIFIED"`, `transport_status="VERIFIED"`, `audit_status="VERIFIED"`, or `retention_status="VERIFIED_DURABLE_REPLAYABLE"` as applicable. It is also prohibited from satisfying single-process/channel/egress/TLS positive policy slots, any opaque Section 7.5 record hash, any `APPROVED`/`VERIFIED`/`VERIFIED_DURABLE_REPLAYABLE`/replay-ready status, or any runtime-approved registry. Every parent-slot projection row records exact parent node/domain, expected positive field/status, `satisfaction_state="UNSATISFIED_BLOCKING"`, and `section_7_5a_substitution_allowed=false`.

The human-selected machine-distinct Section 7.5A item is a constraints/debt ledger only: `canonical_runtime_qualification_item=false`, `qualification_contract_set_member=false`, and `qualification_path_dependency=false`. It contains no SUT or implementation, so the pre-SUT readiness lifecycle is `NOT_APPLICABLE_TO_SECTION_7_5A_CONSTRAINTS_LEDGER_NO_SUT_NO_QUALIFICATION_DEPENDENCY`; it cannot create or receive `READINESS_GO`. This is not an exemption: a later machine-distinct full Section 7.5 is a qualification item, requires a fresh human queue item, and must complete the full readiness protocol before SUT work.

This is not `READINESS_GO`, interface readiness, implementation authorization, or provider capability proof.

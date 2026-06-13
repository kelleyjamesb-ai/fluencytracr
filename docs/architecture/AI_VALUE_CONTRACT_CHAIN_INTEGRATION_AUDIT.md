# AI Value Contract Chain Integration Audit

Status: audit and test-hardening phase only. This document does not authorize migrations, Prisma schema changes, backend routes, frontend UI, ingestion jobs, persistence, claim readiness snapshots, or executive readout snapshots.

Related foundation audits:

- [AI Value Data Model Audit](./AI_VALUE_DATA_MODEL_AUDIT.md)
- [BigQuery Signal Availability Audit](./BIGQUERY_SIGNAL_AVAILABILITY_AUDIT.md)
- [BigQuery Signal Probe Results](./BIGQUERY_SIGNAL_PROBE_RESULTS.md)
- [Aggregate Workforce Context Governance](./AGGREGATE_WORKFORCE_CONTEXT_GOVERNANCE.md)

## Purpose

This audit checks whether the AI Value Platform contracts form a coherent Playbook-aligned chain:

Value Hypothesis -> Measurement Plan -> Evidence Collection -> Evidence Snapshot -> Claim Readiness -> Executive Readout.

The governing principle is unchanged: no downstream object may make a stronger claim than the upstream evidence supports. A Measurement Plan defines required evidence; an Evidence Snapshot records what is actually present, partial, missing, held, suppressed, or not computed; every later claim object must preserve caveats, blocked uses, privacy gates, and suppression.

## Contract Chain Overview

| Stage | Current artifact | Current enforcement | Chain posture |
| --- | --- | --- | --- |
| Value Hypothesis | `value_hypothesis` in the Measurement Plan contract | Required by `validateMeasurementPlan` | Available as planning intent, not evidence. |
| Measurement Plan | `docs/contracts/ai-value-measurement-plan/README.md`, examples, `shared/src/aiValueEngine/measurementPlan.ts` | Required fields, Playbook requirements, VBD boundary, workforce context boundary, privacy flags, readiness gates | Strong upstream requirement contract. |
| Evidence Collection | Source package requirements, BigQuery readiness docs, aggregate workforce governance docs | Documented as required exports and approvals; no ingestion added in this phase | Evidence collection remains planned/probed, not persisted. |
| Evidence Snapshot | `docs/contracts/ai-value-evidence-snapshot/README.md`, examples, `shared/src/aiValueEngine/evidenceSnapshot.ts` | Required Playbook coverage, coverage status, VBD operating map, caveats, blocked uses, privacy, suppression, k-min posture | Strong snapshot validator. |
| Claim Readiness | Existing readiness and claim-boundary engine objects | Older engine objects validate their own caveats and blocked claims | Partial chain binding; they do not yet read Evidence Snapshot directly. |
| Executive Readout | Executive packet and HTML readout renderer | Existing render path carries readiness, caveats, blocked claims, and EBITA guardrails | Partial chain binding; readout is not yet bound to Evidence Snapshot caveats and blocked uses. |

## Status Vocabulary Boundary

The chain has multiple status fields that must not be collapsed into one meaning.

| Field | Meaning | Boundary |
| --- | --- | --- |
| `evidence_state` | Lane or Playbook layer state: `present`, `partial`, `missing`, `held`, `suppressed`, or `not_computed`. | Describes observed evidence availability only; it is not claim readiness. |
| `playbook_coverage.coverage_status` | Overall coverage posture such as `layer_1_only`, held states, or `full_playbook_coverage`. | Full coverage requires Layer 2, Layer 3, governance, assumptions or explicit not-required state, k-min, and safe privacy. |
| `snapshot_type` | Snapshot source posture, including telemetry-only or source-availability forms. | BigQuery source availability is not full Playbook coverage. |
| `snapshot_readiness_decision` | Whether the snapshot can feed a caveated evidence snapshot or must hold for governance/source issues. | Snapshot readiness is not permission for financial, customer-facing, or executive claims. |

## Measurement Plan to Evidence Snapshot Mapping

Status vocabulary support means whether the Evidence Snapshot currently has a place to carry `present`, `partial`, `missing`, `held`, `suppressed`, or `not_computed` for the plan requirement.

| Measurement Plan Field | Evidence Snapshot Field | Required Propagation | Gap |
| --- | --- | --- | --- |
| `schema_version` | `schema_version` | Each contract keeps its own schema version. Status vocabulary: not applicable; metadata field only. | No structural gap. |
| `org_id` | `org_id` | Same aggregate organization context must carry forward. Status vocabulary: not applicable; identifier field only. | No structural gap. |
| `measurement_plan_id` | `measurement_plan_id` | Snapshot must reference the upstream plan. Status vocabulary: not applicable; identifier field only. | No structural gap. |
| `value_hypothesis` | `measurement_plan_id`, `required_caveats`, downstream claim text | Hypothesis should remain planning intent and not become evidence support. Status vocabulary is not directly represented. | Partial: snapshot can reference the plan but does not yet carry a dedicated immutable hypothesis summary. |
| `workflow_scope.workflow_family` | `workflow.workflow_family` | Same workflow family must carry forward. Status vocabulary: not applicable; scope field only. | No structural gap. |
| `workflow_scope.approved_aggregate_grain` | `privacy_boundary.approved_aggregate_grain`, `vbd_operating_map.breadth.approved_aggregate_grain` | Approved grain must remain compatible across privacy boundary and VBD breadth. Status vocabulary: held/missing can be caveated through privacy and governance evidence. | No structural gap. |
| `workflow_scope.minimum_cohort_threshold` | `aggregate_telemetry_summary.k_min_summary.minimum_cohort_threshold`, `aggregate_workforce_context.minimum_cohort_threshold` | k-min must remain explicit before stronger coverage or workforce context use. Status vocabulary: represented through k-min summary and governance caveats. | No structural gap. |
| `metric_selection.primary_metric` | `source_refs.outcome_evidence_ids`, `playbook_coverage.layer_3_business_system_outcomes`, `required_caveats` | Primary metric must become Layer 3 support only when customer-attested outcome evidence is present. Status vocabulary: present/partial/missing/held/suppressed/not_computed represented in Playbook coverage and lanes. | Partial: no dedicated primary metric echo in the snapshot. |
| `windows.baseline_window_start` | `window.window_start`, source refs, Layer 3 caveats | Baseline period must align to snapshot window or be caveated. Status vocabulary: represented through source/evidence state and caveats. | Partial: snapshot has one window; baseline vs comparison pairing is not first-class. |
| `windows.baseline_window_end` | `window.window_end`, source refs, Layer 3 caveats | Baseline period must align to snapshot window or be caveated. Status vocabulary: represented through source/evidence state and caveats. | Partial: snapshot has one window; baseline vs comparison pairing is not first-class. |
| `windows.comparison_window_start` | `source_refs.outcome_evidence_ids`, Layer 3 caveats | Comparison window must be present before outcome movement or financial translation. Status vocabulary: represented through Layer 3 status and caveats. | Partial: no dedicated comparison-window field. |
| `windows.comparison_window_end` | `source_refs.outcome_evidence_ids`, Layer 3 caveats | Comparison window must be present before outcome movement or financial translation. Status vocabulary: represented through Layer 3 status and caveats. | Partial: no dedicated comparison-window field. |
| `playbook_evidence_requirements.layer_1_platform_telemetry` | `playbook_coverage.layer_1_platform_telemetry`, `playbook_layers.layer_1_platform_telemetry`, `evidence_lanes.surface_usage`, `skill_lifecycle`, `agent_lifecycle`, `mcp_action_boundary`, `artifact_output`, `control_evidence` | Layer 1 support must be present or partial with caveats; BigQuery availability alone cannot upgrade coverage. Status vocabulary: represented through coverage/lane statuses. | No structural gap. |
| `playbook_evidence_requirements.layer_2_user_voice_empirical` | `playbook_coverage.layer_2_user_voice_empirical`, `playbook_layers.layer_2_user_voice_empirical`, `required_caveats` | Missing user voice must remain missing and caveated. Status vocabulary: represented through coverage/lane statuses. | No structural gap. |
| `playbook_evidence_requirements.layer_3_business_system_outcomes` | `playbook_coverage.layer_3_business_system_outcomes`, `playbook_layers.layer_3_business_system_outcomes`, `source_refs.outcome_evidence_ids`, `required_caveats` | Missing system-of-record outcome evidence must remain missing and caveated. Status vocabulary: represented through coverage/lane statuses. | No structural gap. |
| `playbook_evidence_requirements.governance_evidence` | `playbook_coverage.governance_evidence`, `playbook_layers.governance_evidence`, `suppression`, `privacy_boundary` | Governance evidence must be present for full Playbook coverage; missing or held governance blocks stronger readiness. Status vocabulary: represented through coverage/lane statuses and governance objects. | No structural gap. |
| `playbook_evidence_requirements.assumption_evidence` | `playbook_coverage.assumption_evidence`, `playbook_layers.assumption_evidence`, `required_caveats` | Assumptions must be present or explicitly not required for full coverage; held assumptions block financial translation. Status vocabulary: represented through coverage/lane statuses. | No structural gap. |
| `source_package_requirements` | `source_refs`, `playbook_coverage.*.required_source_exports`, `required_caveats` | Required exports and approvals must be reflected as attached refs or missing/held caveats. Status vocabulary: represented through coverage and caveats. | Partial: no complete source package object is embedded in the snapshot. |
| `aggregate_workforce_context_requirements` | `aggregate_workforce_context`, `privacy_boundary.aggregate_workforce_context_allowed`, `playbook_coverage.assumption_evidence`, `required_caveats` | Workforce context must be aggregate, cohort-safe, approved, non-decisioning, non-ranking, and unable to upgrade coverage by itself. Status vocabulary: represented through context state and caveats. | No structural gap for safety; partial for exact plan requirement echo. |
| `assumptions` | `playbook_coverage.assumption_evidence`, `playbook_layers.assumption_evidence`, `required_caveats` | Missing, held, suppressed, or unapproved assumptions must remain explicit and block financial translation. Status vocabulary: fully represented. | No structural gap. |
| `privacy_boundary` | `privacy_boundary`, `suppression`, `required_caveats` | Aggregate-only and unsafe flags must fail closed. Status vocabulary: represented through booleans and caveats. | No structural gap. |
| `readiness` | `snapshot_readiness_decision`, `playbook_coverage.coverage_status`, `required_caveats` | Plan readiness cannot become claim readiness. Snapshot readiness must be derived from observed evidence state. Status vocabulary: represented through coverage and readiness decision. | Partial: no explicit plan-readiness provenance field. |
| `vbd_measurement_design` | `vbd_operating_map` | VBD must contribute only to Layer 1 platform telemetry and must block ROI, EBITA, causality, productivity, ranking, people decisioning, and customer-facing financial output. Status vocabulary: represented by VBD states and caveats. | No structural gap. |
| `allowed_uses` | `allowed_uses` | Safe uses can carry forward only when they do not conflict with blocked uses or coverage status. Status vocabulary: not applicable; list field. | No structural gap, but downstream translation must preserve the narrower permission. |
| `blocked_uses` | `blocked_uses`, `vbd_operating_map.blocked_interpretation`, downstream `blocked_claims` | Blocked uses must carry forward and cannot be removed downstream. Status vocabulary: not applicable; list field. | Partial downstream binding gap: existing downstream objects have their own blocked claims but do not yet bind directly to Evidence Snapshot `blocked_uses`. |
| `created_at` | `generated_at` | Snapshot generation time must remain distinct from plan creation time. Status vocabulary: not applicable; metadata field only. | No structural gap. |
| `derivation_version` | `derivation_version` | Plan and snapshot derivation versions should remain independently auditable. Status vocabulary: not applicable; metadata field only. | No structural gap. |

## Evidence Snapshot to Claim Readiness Mapping

The Evidence Snapshot validator is the strongest current enforcement point. It requires `playbook_coverage`, validates `coverage_status`, rejects invalid full coverage, requires Layer 1-only blocked uses, preserves missing Layer 2 and Layer 3 caveats, blocks unsafe privacy flags, requires default suppression posture, and prevents VBD or workforce context from upgrading Playbook coverage.

The current downstream claim-readiness path is not yet a durable snapshot object. Existing readiness and claim-boundary objects validate their own claim states, caveats, forbidden fields, and blocked claims. That is useful, but the chain handoff is partial because those downstream validators do not yet consume the Evidence Snapshot object as their required source of truth.

Required invariant before persistence: claim readiness must be built from a validated Evidence Snapshot handoff that copies `playbook_coverage.coverage_status`, `required_caveats`, `blocked_uses`, `suppression`, `privacy_boundary`, `aggregate_workforce_context`, and `vbd_operating_map` into the claim boundary decision context.

## Claim Readiness to Executive Readout Mapping

The existing executive packet and HTML readout already carry readiness sections, claim-boundary sections, caveats, blocked claims, and EBITA language restrictions. The renderer structurally includes caveats and blocked-claim labels.

The remaining integration risk is source binding: an executive readout can be valid relative to the older value-object spine without proving it inherited Evidence Snapshot caveats and blocked uses. Before any persisted executive readout snapshot exists, the readout builder needs an explicit Evidence Snapshot source ref and a fail-closed rule that omits or blocks the readout when snapshot caveats, blocked uses, suppression, privacy, or Playbook coverage cannot be carried forward.

## VBD Boundary Across the Chain

VBD is a Layer 1 platform telemetry posture only.

- Measurement Plan enforces `vbd_measurement_design.vbd_claim_boundary.contributes_to_playbook_layer = layer_1_platform_telemetry`.
- Evidence Snapshot enforces `vbd_operating_map.contributes_to_playbook_layer = layer_1_platform_telemetry`.
- VBD cannot compute claim readiness, authorize financial permission, override suppression, prove productivity, support realized ROI, or support customer-facing financial output.
- `high_fluency_flow` under `layer_1_only` requires an explicit caveat that it is Layer 1 posture only and not full value proof.

## Playbook Coverage Boundary Across the Chain

Full Playbook coverage requires all of the following:

- Layer 1 present or partial with caveats.
- Layer 2 present.
- Layer 3 present.
- Governance evidence present.
- Assumption evidence present or explicitly not required.
- k-min threshold met.
- Safe privacy posture.
- Missing, held, suppressed, or not-computed lanes carried forward as caveats.

BigQuery source availability alone cannot validate as `full_playbook_coverage`. Telemetry-only snapshots can feed caveated evidence posture and claim-boundary review, but they must block executive readout and financial/customer-facing claim uses.

## Aggregate Workforce Context Boundary Across the Chain

Aggregate workforce context may be used only as aggregate, cohort-safe, source-owner-approved, non-decisioning context. It must not be used for:

- the blocked use `people_decisioning`,
- the blocked use `manager_or_team_ranking`,
- the blocked use `individual_attribution`,
- the blocked use `productivity_claim`,
- the blocked use `compensation_or_performance_inference`,
- the blocked use `promotion_or_discipline_inference`,
- the blocked use `attrition_prediction`,
- the blocked use `hris_inference_from_ai_usage`.

Safe workforce context does not upgrade `coverage_status` to `full_playbook_coverage` by itself. Missing or held workforce context must remain explicit as a caveat, and blocked or unsafe workforce context must fail validation.

## Suppression and Privacy Propagation

Suppression remains fail-closed:

- default verdict is `SUPPRESS`;
- suppression applies independently per slice;
- hidden suppressed values must not be exposed;
- suppressed, held, missing, or not-computed lanes must remain caveated;
- downstream objects must not infer around suppression or reconstruct hidden values.

Privacy remains aggregate-only. Any unsafe privacy flag blocks downstream readiness and executive readout, including raw content, direct identifiers, person-level productivity fields, person-level HRIS records, hashed or joinable person identifiers, and the blocked-use flags listed in the aggregate workforce context boundary above.

## Financial / ROI / EBITA Claim Boundary

Layer 1-only snapshots must block:

- `realized_roi`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `people_decisioning`
- `customer_facing_financial_output`

Existing ROI Scenario, EBITA Bridge, Claim Boundary, and Executive Packet validators add additional guardrails. They block ROI proof, unsupported causality, individual scoring, productivity measurement, HR analytics, customer-facing economic output, unsafe EBITA language, and person-level fields.

The integration gap is that these older objects do not yet require a validated Evidence Snapshot source. Before persistence, the system needs a chain handoff that prevents financial or executive objects from being generated when the upstream snapshot is Layer 1-only, missing Layer 2 or Layer 3, missing governance, missing assumptions, unsafe under privacy, or suppressed.

## Gaps and Mismatches

| Gap | Severity | Detail |
| --- | --- | --- |
| Downstream value objects do not yet read Evidence Snapshot directly | High before persistence | Claim boundary, ROI scenario, EBITA bridge, executive packet, and readout HTML have their own guardrails but are not source-bound to `evidence_snapshot_id`, `playbook_coverage`, `blocked_uses`, and `required_caveats`. |
| Measurement Plan `value_hypothesis` is not echoed as a dedicated snapshot field | Low | Snapshot can reference the plan, but there is no immutable hypothesis summary in the snapshot. This is acceptable for audit stage but should be explicit before durable persistence. |
| Baseline/comparison windows are not first-class in Evidence Snapshot | Medium | Snapshot has a single window and can caveat Layer 3, but baseline/comparison pairing is important before outcome movement or financial translation. |
| Source package requirements are represented indirectly | Medium | `source_refs`, coverage statuses, and caveats carry source readiness, but a complete source-package object is not embedded. |
| Blocked uses vocabulary differs across layers | Medium | Evidence Snapshot uses `blocked_uses`; older claim objects use `blocked_claims` names such as `roi_proof` and `customer_facing_economic_output`. A translation map is needed before persistence. |
| Executive readout can be valid without proving snapshot caveat inheritance | High before readout snapshots | Current renderer carries caveats from its inputs, but no explicit Evidence Snapshot handoff is required. |

## Required Fixes Before Persistence

| Fix | Classification | Rationale |
| --- | --- | --- |
| Define a contract-chain handoff object from Evidence Snapshot to claim readiness | `blocker_before_persistence` | Persisted claim readiness must not bypass snapshot `coverage_status`, caveats, blocked uses, suppression, privacy, VBD, or workforce context. |
| Require persisted executive readouts to reference a validated Evidence Snapshot and derived claim-boundary handoff | `blocker_before_persistence` | Executive readouts must not omit upstream caveats or blocked uses. |
| Add blocked-use/blocked-claim translation map | `should_fix_before_persistence` | Existing downstream vocabulary is safe but not identical. A deterministic mapping prevents weakened claim boundaries. |
| Add baseline/comparison window echo or source ref in snapshot handoff | `should_fix_before_persistence` | Financial or outcome movement claims require explicit window provenance. |
| Add immutable value-hypothesis summary or plan-source ref in snapshot handoff | `can_defer_until_claim_readiness` | The plan ID is present now; a summary improves traceability but does not currently weaken gates. |
| Keep aggregate workforce context as caveat/context only | `no_action_needed` | Current validators already prevent workforce context from upgrading coverage or enabling people analytics. |
| Keep VBD as Layer 1 only | `no_action_needed` | Current validators already enforce the VBD boundary and high-fluency-flow caveat. |
| Keep BigQuery source availability separate from full Playbook coverage | `no_action_needed` | Evidence Snapshot validation already rejects source availability alone as full coverage. |

## Downstream Boundary Audit

| Downstream Object | Reads Evidence Snapshot? | Carries Caveats? | Carries Blocked Uses? | Risk |
| --- | --- | --- | --- | --- |
| Claim boundary | No direct read today | Yes, via `required_caveats` | Yes, via `blocked_claims` | Partial binding: safe locally, but not yet guaranteed to inherit snapshot caveats/blocked uses. |
| Claim registry / value hypothesis registry | No direct read found in this audit | Partially, through registry readiness language | Partially, through claim readiness buckets | Risk of treating planned claims as supported if not bound to snapshot state. |
| Glean Value Evidence Pack | No direct read found in this audit | Yes, in pack/contract language | Yes, through claim readiness and blocked claim effects | Risk remains until pack assembly requires snapshot-derived coverage and caveats. |
| ROI scenario | No direct read today | Yes, extensive caveats and financial gates | Yes, blocked claims and governance boundaries | Risk that ROI modeling could be valid against older objects while missing snapshot Layer 2/3/assumptions unless bound. |
| EBITA bridge | No direct read today | Yes, financial translation policy and safe language | Yes, EBITA blocked claims | Risk that directional EBITA language could omit upstream snapshot caveats unless inherited. |
| Executive packet | No direct read today | Yes, required sections and EBITA caveats | Yes, blocked claims | Risk that packet validity does not prove snapshot caveat inheritance. |
| Readout HTML | No direct read today | Yes, renders supplied caveats | Yes, renders supplied blocked claims | Renderer is safe if inputs are safe; input source binding is the gap. |
| Value evidence case | No direct read today | Yes, evidence ladder caveats | Yes, safe/blocked language | Risk of parallel evidence ladder if not reconciled with snapshot coverage status. |
| Value improvement loop | No direct read today | Yes, improvement-loop caveats | Yes, via upstream ROI/evidence constraints | Risk is lower; it is downstream of scenario/readiness but still needs source binding if persisted. |

## Test Evidence

This phase adds `scripts/validate_ai_value_contract_chain.test.mjs` and `npm run test:ai-value-contract-chain`.

The tests compose the existing Measurement Plan and Evidence Snapshot validators and verify:

- a plan requiring Layer 2 keeps missing user voice caveated in the snapshot;
- a plan requiring Layer 3 keeps missing system-of-record outcome evidence caveated;
- VBD plan requirements require a snapshot VBD operating map;
- required workforce context cannot silently strengthen evidence when not provided;
- Layer 1-only snapshots block financial, customer-facing, people-decisioning, ranking, and productivity uses;
- high-fluency-flow remains Layer 1 posture only;
- safe aggregate workforce context does not upgrade full Playbook coverage;
- unsafe privacy flags block downstream readiness and readout feeds;
- suppressed evidence cannot expose hidden values or be reconstructed as support;
- full Playbook coverage fails without Layer 2, Layer 3, governance, assumptions, k-min, and safe privacy.

## Recommended Next Step

Do not create persistence yet. The next bounded implementation step should be a docs-and-test contract handoff from Evidence Snapshot to claim readiness that defines the exact fields copied forward, the blocked-use translation map, and the fail-closed conditions for any future persisted `claim_readiness_snapshots` or `executive_readout_snapshots`.

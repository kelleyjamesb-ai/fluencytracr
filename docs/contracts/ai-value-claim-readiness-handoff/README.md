# AI Value Claim Readiness Handoff Contract

Schema version: `FT_AI_VALUE_CLAIM_READINESS_HANDOFF_2026_06`

## 1. Purpose

The AI Value Claim Readiness Handoff is a deterministic, aggregate-only,
non-persisted contract object derived from a validated Evidence Snapshot.

It defines what downstream claim readiness, ROI scenario, EBITA bridge, value
evidence case, executive packet, or readout builder may know from the snapshot.
It exists to prevent downstream objects from omitting or weakening Evidence
Snapshot posture: Playbook coverage, required caveats, blocked uses,
suppression, privacy, aggregate workforce context, VBD boundaries, source refs,
and window/source provenance.

Core principle: no claim readiness object may make a stronger claim than the
upstream Evidence Snapshot supports.

## 2. Non-goals

The handoff is not claim readiness. It is not ROI. It is not EBITA. It is not
financial permission. It is not an executive readout. It is not a persisted
snapshot. It is not people analytics. It is not productivity scoring.

This contract must not:

- create migrations, Prisma schema changes, backend routes, frontend UI,
  ingestion jobs, or persistence;
- persist claim readiness snapshots, executive readout snapshots, or evidence
  snapshots;
- compute claim scores, ROI, EBITA, dollar value, time-saved value,
  productivity lift, or financial impact;
- store raw rows, prompts, responses, transcripts, query text, file contents, or
  direct identifiers;
- store hashed or joinable person identifiers, person-level HRIS records, or
  person-level productivity fields;
- authorize the blocked use `people_decisioning`, individual attribution, the
  blocked use `manager_or_team_ranking`, compensation/performance inference,
  promotion/discipline inference, attrition prediction, or HRIS inference from
  AI usage.

## 3. Relationship to Evidence Snapshot

The handoff can be built only from an Evidence Snapshot that passes
`validateEvidenceSnapshot`. Missing or invalid snapshot input fails closed.

The handoff copies forward:

- `evidence_snapshot_id`
- `org_id`
- `measurement_plan_id`
- `workflow`
- `window`
- `snapshot_readiness_decision`
- `playbook_coverage`
- `source_refs`
- `required_caveats`
- `blocked_uses`
- `suppression`
- `privacy_boundary`
- `aggregate_workforce_context`
- `vbd_operating_map`

It also derives downstream `blocked_claims`, financial/readout boundaries, and
source provenance from that validated snapshot posture.

## 4. Relationship to Claim Readiness

The handoff is the input boundary for any future claim readiness context. It is
not itself the claim readiness decision.

Any downstream claim object must treat the handoff as the source of truth for
snapshot posture. If the handoff is missing, invalid, suppressed, unsafe,
Layer 1-only, missing required evidence layers, or unable to carry caveats
forward, downstream claim evaluation must hold or block.

## 5. Required Fields

Each handoff must include:

- `schema_version`
- `handoff_id`
- `evidence_snapshot_id`
- `org_id`
- `measurement_plan_id`
- `workflow`
- `window`
- `snapshot_readiness_decision`
- `playbook_coverage`
- `source_refs`
- `required_caveats`
- `blocked_uses`
- `blocked_claims`
- `suppression`
- `privacy_boundary`
- `aggregate_workforce_context`
- `vbd_operating_map`
- `financial_boundary`
- `executive_readout_boundary`
- `source_provenance`
- `created_at`
- `derivation_version`

The shared helper and validator live at
[`shared/src/aiValueEngine/claimReadinessHandoff.ts`](../../../shared/src/aiValueEngine/claimReadinessHandoff.ts).

## 6. Playbook Coverage Propagation

`playbook_coverage` is copied from the Evidence Snapshot.

`full_playbook_coverage` is valid only when the handoff retains:

- Layer 1 present or partial with caveats;
- Layer 2 present;
- Layer 3 present;
- governance evidence present;
- assumption evidence present or explicitly not required;
- k-min threshold met;
- safe aggregate-only privacy posture;
- missing, held, suppressed, or not-computed lanes carried forward as caveats.

BigQuery source availability alone cannot validate as `full_playbook_coverage`.
Aggregate workforce context cannot upgrade `coverage_status` by itself.

## 7. Caveat Propagation

`required_caveats` must include every caveat that downstream claim or readout
logic must retain. The builder carries forward:

- top-level Evidence Snapshot `required_caveats`;
- Playbook coverage caveats;
- Evidence Snapshot lane/layer caveats available to the builder;
- aggregate workforce context caveats;
- VBD caveats;
- source/window provenance caveats;
- caveats for any unmapped blocked use.

`executive_readout_boundary.required_caveats` must include every handoff
`required_caveat`. A future readout builder must not omit or collapse these
caveats.

## 8. Blocked Use Translation

The handoff preserves `blocked_uses` unchanged and derives downstream
`blocked_claims` with a deterministic translation map.

Minimum translation:

| Evidence Snapshot `blocked_uses` | Handoff `blocked_claims` |
| --- | --- |
| `realized_roi` | `roi_proof` |
| `ebita_claim` | `ebita_claim` |
| `causality_claim` | `causality_claim` |
| `productivity_claim` | `productivity_claim` |
| `headcount_reduction_claim` | `headcount_reduction_claim` |
| `individual_attribution` | `individual_scoring` |
| `manager_or_team_ranking` | `team_or_manager_ranking` |
| `people_decisioning` | `people_decisioning` |
| `customer_facing_financial_output` | `customer_facing_economic_output` |

Known legacy/synonym blocked-use tokens are also mapped to the same downstream
claim blockers. Unknown blocked uses must remain in `unmapped_blocked_uses` or
be surfaced in `required_caveats`.

`blocked_claims` may be stricter than the translation map. It must never be
weaker.

## 9. Suppression Propagation

`suppression` is copied from the Evidence Snapshot.

Suppression remains fail-closed. If suppression is active or unsafe, all
financial boundary flags must be false and customer-facing readout must remain
false. Suppressed evidence must not be treated as support, and downstream
objects must not infer around hidden or held values.

## 10. Privacy Boundary Propagation

`privacy_boundary` is copied from the Evidence Snapshot.

Any unsafe privacy flag fails closed, including direct identifiers, raw content,
person-level productivity, person-level HRIS records, hashed or joinable person
identifiers, the blocked use `manager_or_team_ranking`, the blocked use
`people_decisioning`, compensation/performance inference, promotion/discipline
inference, attrition prediction, or HRIS inference from AI usage.

The handoff validator rejects forbidden raw or person-level fields anywhere in
the handoff object.

## 11. Aggregate Workforce Context Propagation

`aggregate_workforce_context` is copied from the Evidence Snapshot.

Aggregate workforce context can be valid only as aggregate, cohort-safe,
approved, non-decisioning context. It cannot authorize:

- `people_decisioning`
- `productivity_claim`
- `team_or_manager_ranking`
- `individual_scoring`

It cannot upgrade `coverage_status` to `full_playbook_coverage` by itself and
must remain explicit as caveat/context when missing, held, suppressed, or not
computed.

## 12. VBD Boundary Propagation

`vbd_operating_map` is copied from the Evidence Snapshot.

The VBD map must keep
`contributes_to_playbook_layer = layer_1_platform_telemetry`. VBD remains
Layer 1 posture only. It cannot authorize financial, productivity, causality,
the blocked use `people_decisioning`, the blocked use
`manager_or_team_ranking`, individual attribution, headcount reduction, or
customer-facing claims.

If `high_fluency_flow` appears with `layer_1_only`, the handoff must carry the
Layer 1-only caveat.

## 13. Source and Window Provenance

`source_provenance` must include:

- `evidence_snapshot_schema_version`
- `evidence_snapshot_derivation_version`
- copied `source_refs`
- copied snapshot `window`
- `k_min_summary`
- nullable `baseline_window`
- nullable `comparison_window`
- `provenance_caveats`

When baseline and comparison windows are not first-class Evidence Snapshot
fields, the handoff marks them `null` and caveats that downstream outcome
movement or financial translation must remain blocked or explicitly caveated
until those windows are attached.

## 14. Financial / ROI / EBITA Boundary

`financial_boundary` includes:

- `financial_translation_allowed`
- `roi_claim_allowed`
- `ebita_claim_allowed`
- `customer_facing_financial_output_allowed`
- `reasons`

All financial flags must be false when Playbook coverage is not full, Layer 3
is missing or unsafe, assumptions are missing or held, finance/business-owner
approval is missing or caveated, blocked uses or blocked claims include
financial blockers, privacy is unsafe, or suppression is active.

The current builder is deliberately conservative and sets all financial flags
to false.

## 15. Executive Readout Boundary

`executive_readout_boundary` includes:

- `executive_readout_allowed`
- `customer_facing_readout_allowed`
- `internal_only_readout_allowed`
- `required_sections`
- `required_caveats`
- `blocked_sections`
- `reasons`

If snapshot readiness is held, suppressed, not ready, or governance-failed,
customer-facing readout must be false. If privacy is unsafe, both executive and
customer-facing readout permissions must be false. If suppression is active or
fail-closed, customer-facing readout must be false.

The boundary does not render HTML or create a readout. It only defines whether a
future readout may proceed and which caveats/sections must carry forward.

## 16. Examples

Validator-backed examples:

- [`examples/layer-1-only-handoff.json`](./examples/layer-1-only-handoff.json)
- [`examples/full-playbook-handoff.json`](./examples/full-playbook-handoff.json)

The Layer 1-only example shows `layer_1_only`, VBD posture, all financial flags
false, customer-facing readout false, preserved caveats, and blocked downstream
claim posture.

The full Playbook example shows Layer 1/2/3, governance, assumptions, k-min,
and safe privacy posture while preserving caveats and keeping financial flags
conservative.

## 17. Validation Rules

The validator enforces:

- handoff can only be built from a validated Evidence Snapshot;
- required fields are present;
- blocked uses translate to blocked claims without weakening;
- unknown blocked uses are preserved or caveated;
- required caveats and nested evidence caveats carry forward;
- financial flags fail closed for insufficient evidence, blocked uses/claims,
  unsafe privacy, suppression, or caveated approvals;
- executive readout boundary cannot omit required caveats;
- full Playbook coverage requires Layer 1, Layer 2, Layer 3, governance,
  assumptions or explicit not-required status, k-min, and safe privacy;
- VBD remains Layer 1 only;
- aggregate workforce context remains non-decisioning and non-ranking;
- forbidden raw/person-level fields are rejected;
- persistence policy flags remain false.

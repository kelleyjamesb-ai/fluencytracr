# AI Value Claim Readiness Snapshot Contract

Schema version: `FT_AI_VALUE_CLAIM_READINESS_SNAPSHOT_2026_06`

## 1. Purpose

The AI Value Claim Readiness Snapshot is a deterministic, aggregate-only,
non-persisted contract object derived only from:

1. a validated AI Value Evidence Snapshot; and
2. a validated Claim Readiness Handoff for the same snapshot, org, measurement
   plan, workflow, and window.

It records whether the current evidence chain can support internal claim review
planning, while preserving upstream Playbook coverage, caveats, blocked claims,
source refs, suppression, privacy, VBD, and aggregate workforce boundaries.

Core principle: no Claim Readiness Snapshot may make a stronger claim than the
validated Evidence Snapshot and Handoff support.

## 2. Non-goals

This contract is not persistence, ingestion, a backend route, frontend UI, an
executive readout, a claim readiness database table, ROI proof, EBITA proof,
productivity measurement, causality proof, or customer-facing financial output.

This phase must not:

- create migrations, Prisma schema changes, backend routes, frontend UI,
  ingestion jobs, or persisted snapshots;
- create `claim_readiness_snapshots` or `executive_readout_snapshots` tables;
- compute ROI, EBITA, dollar value, time-saved value, productivity lift,
  financial impact, causal delta, or customer-facing economic output;
- store raw rows, prompts, responses, transcripts, query text, file contents,
  direct identifiers, hashed or joinable person identifiers, person-level HRIS,
  or person-level productivity;
- authorize people decisioning, individual attribution, the blocked use
  `manager_or_team_ranking`, compensation or performance inference,
  promotion/discipline inference,
  attrition prediction, or HRIS inference from AI usage.

## 3. Relationship to Upstream Contracts

The builder must first run `validateEvidenceSnapshot` and
`validateClaimReadinessHandoff`. If either fails, the Claim Readiness Snapshot
cannot be built.

The builder must also confirm exact source binding:

- `evidence_snapshot_id`
- `org_id`
- `measurement_plan_id`
- workflow
- window

The current helper enforces these bindings before constructing the snapshot.
Any future runtime or persistence path must enforce the same source binding
before writing durable state.

## 4. Required Fields

Each Claim Readiness Snapshot must include:

- `schema_version`
- `claim_readiness_snapshot_id`
- `evidence_snapshot_id`
- `handoff_id`
- `org_id`
- `measurement_plan_id`
- `workflow`
- `window`
- `snapshot_readiness_decision`
- `playbook_coverage`
- `coverage_status`
- `claim_readiness_state`
- `allowed_claim_modes`
- `blocked_uses`
- `blocked_claims`
- `unmapped_blocked_uses`
- `required_caveats`
- `suppression`
- `privacy_boundary`
- `aggregate_workforce_context`
- `vbd_operating_map`
- `financial_boundary`
- `executive_readout_boundary`
- `source_refs`
- `source_provenance`
- `derived_from`
- `validation`
- `persistence_policy`
- `created_at`
- `derivation_version`

The shared helper and validator live at
[`shared/src/aiValueEngine/claimReadinessSnapshot.ts`](../../../shared/src/aiValueEngine/claimReadinessSnapshot.ts).

## 5. Claim Readiness States

Allowed `claim_readiness_state` values:

- `held_for_full_playbook_coverage`
- `ready_for_internal_claim_review`
- `blocked_for_privacy_or_suppression`
- `held_for_governance`
- `held_for_source_binding`

`ready_for_internal_claim_review` is not financial permission and not
customer-facing readiness. It only means the source-bound aggregate evidence
chain can support internal claim-review planning.

## 6. Allowed Claim Modes

Allowed `allowed_claim_modes` values:

- `internal_evidence_review`
- `caveated_internal_playbook_gap_review`
- `source_bound_business_outcome_claim_planning`
- `internal_executive_readout_planning`

Blocked modes include customer-facing financial output, ROI proof, EBITA
claims, productivity claims, causality claims, headcount reduction claims,
individual attribution, the blocked use `manager_or_team_ranking`, and people
decisioning.

## 7. Playbook Coverage Boundary

`full_playbook_coverage` remains valid only when the snapshot retains:

- Layer 1 present or partial with caveats;
- Layer 2 present;
- Layer 3 present;
- governance evidence present;
- assumption evidence present or explicitly not required;
- k-min threshold met;
- safe aggregate-only privacy posture;
- missing, held, suppressed, not-computed, or caveated evidence carried forward.

BigQuery source availability alone cannot validate as `full_playbook_coverage`.
Aggregate workforce context cannot upgrade coverage by itself.

## 8. Caveat and Block Propagation

The Claim Readiness Snapshot copies `required_caveats`, `blocked_uses`,
`blocked_claims`, `suppression`, `privacy_boundary`,
`aggregate_workforce_context`, `vbd_operating_map`, `source_refs`, and
`source_provenance` forward from the validated upstream objects.

It must keep the following blocked claims present:

- `roi_proof`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_scoring`
- `team_or_manager_ranking`
- `people_decisioning`
- `customer_facing_economic_output`

## 9. Financial and Executive Boundaries

The current builder keeps all `financial_boundary` flags false:

- `financial_translation_allowed`
- `roi_claim_allowed`
- `ebita_claim_allowed`
- `customer_facing_financial_output_allowed`

`executive_readout_boundary.customer_facing_readout_allowed` must remain false.
This contract does not create, persist, or render an executive readout snapshot.

## 10. Persistence Policy

Every Claim Readiness Snapshot must declare:

```json
{
  "persisted": false,
  "creates_migrations": false,
  "creates_prisma_schema": false,
  "creates_backend_routes": false,
  "creates_frontend_ui": false,
  "creates_ingestion_jobs": false
}
```

Persistence remains design-now/implement-later until a later governance decision
authorizes source-bound durable claim readiness state.

## 11. Examples

Validator-backed examples:

- [`examples/layer-1-only-claim-readiness-snapshot.json`](./examples/layer-1-only-claim-readiness-snapshot.json)
- [`examples/full-playbook-claim-readiness-snapshot.json`](./examples/full-playbook-claim-readiness-snapshot.json)

The Layer 1-only example remains held for full Playbook coverage. The full
Playbook example may become `ready_for_internal_claim_review`, but still keeps
financial and customer-facing output blocked.

## 12. Validation Rules

The validator enforces:

- required fields are present;
- derivation metadata points back to the Evidence Snapshot and Handoff;
- non-full coverage remains `held_for_full_playbook_coverage`;
- full coverage requires Layer 1, Layer 2, Layer 3, governance, assumptions or
  explicitly not-required assumptions, k-min, and safe privacy;
- BigQuery source availability alone cannot validate full coverage;
- blocked claims cannot be weakened;
- allowed claim modes cannot include customer-facing, financial, ROI, EBITA,
  productivity, or causality modes;
- required caveats carry missing, held, suppressed, partial, or not-computed
  evidence forward;
- financial flags remain false;
- customer-facing readout remains false;
- privacy and suppression remain fail-closed;
- persistence policy flags remain false;
- forbidden raw, person-level, HRIS, ranking, decisioning, and computed
  economic fields are rejected.

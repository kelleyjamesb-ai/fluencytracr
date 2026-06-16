# AI Value Executive Readout Snapshot Contract

Schema version: `FT_AI_VALUE_EXECUTIVE_READOUT_SNAPSHOT_2026_06`

Status: backend-only persistence promoted. Runtime builder, validator, Prisma
schema, and append-only persistence table are authorized for internal governed
state. Backend routes, frontend UI, ingestion jobs, rendered customer readouts,
exports, and customer-facing financial output remain unauthorized.

## 1. Purpose

The AI Value Executive Readout Snapshot is the immutable internal presentation
state for governed executive readout planning. Its job is to carry only the
claims, caveats, gaps, and boundaries already allowed by the upstream evidence
chain.

Core principle: an executive readout cannot make a stronger claim than the
source-bound Evidence Snapshot, Claim Readiness Handoff, and Claim Readiness
Snapshot allow.

## 2. Current Decision

Implementation is promoted for backend-only, source-bound durable state.

`docs/architecture/AI_VALUE_PERSISTENCE_DESIGN.md` classifies
`executive_readout_snapshots` as `implemented_backend_only`. This promotion
does not authorize rendered readouts, backend routes, frontend UI, customer
exports, or customer-facing financial output.

## 3. Non-goals

This design must not:

- create backend routes, frontend UI, ingestion jobs, rendered customer
  readouts, dashboard surfaces, or export flows;
- render an executive readout, HTML packet, deck, dashboard, or API response;
- compute ROI, EBITA, dollar value, time-saved value, productivity lift,
  financial impact, causal delta, or customer-facing economic output;
- store raw rows, prompts, responses, transcripts, query text, file contents,
  direct identifiers, hashed or joinable person identifiers, person-level HRIS,
  person-level productivity, or person-level telemetry;
- authorize people decisioning, individual attribution, the blocked use
  `manager_or_team_ranking`, compensation or performance inference,
  promotion/discipline inference, attrition prediction, or HRIS inference from
  AI usage.

## 4. Source Binding

Every Executive Readout Snapshot must be source-bound to:

- a validated Evidence Snapshot;
- a validated Claim Readiness Handoff;
- a validated persisted Claim Readiness Snapshot;
- the Measurement Plan id carried by those upstream objects;
- the same org, workflow, and window carried by those upstream objects;
- aggregate source refs already present in the Evidence Snapshot provenance.

Executive Readout Snapshot persistence must fail unless the referenced Claim
Readiness Snapshot has already been persisted for the same org, Measurement
Plan, Evidence Snapshot, Handoff, workflow, window, and source refs.

## 5. Minimum Future Object Shape

An Executive Readout Snapshot includes:

- `schema_version`
- `executive_readout_snapshot_id`
- `org_id`
- `measurement_plan_id`
- `evidence_snapshot_id`
- `handoff_id`
- `claim_readiness_handoff_id`
- `claim_readiness_snapshot_id`
- `workflow`
- `window`
- `readout_audience`
- `readout_state`
- `playbook_coverage`
- `coverage_status`
- `evidence_gaps`
- `required_caveats`
- `blocked_uses`
- `blocked_claims`
- `unmapped_blocked_uses`
- `allowed_sections`
- `blocked_sections`
- `financial_boundary`
- `executive_readout_boundary`
- `vbd_boundary`
- `aggregate_workforce_context_boundary`
- `suppression`
- `privacy_boundary`
- `source_refs`
- `source_provenance`
- `derived_from`
- `validation`
- `persistence_policy`
- `created_at`
- `derivation_version`

## 6. Required Carry-forward Fields

Every future readout snapshot must carry forward, without weakening:

- required caveats;
- blocked uses;
- blocked claims;
- unmapped blocked uses;
- Playbook coverage;
- coverage status;
- evidence gaps and held evidence lanes;
- financial boundary;
- executive readout boundary;
- VBD boundary as Layer 1 posture only;
- aggregate workforce context as non-decisioning context only;
- suppression posture;
- privacy posture;
- source refs and provenance.

Missing, held, suppressed, not-computed, or partial evidence must remain visible
as caveats or evidence gaps. It must not be hidden by executive summary copy.

## 7. Readout States

Allowed design states:

- `blocked_for_missing_claim_readiness_snapshot`
- `held_for_full_playbook_coverage`
- `internal_only_claim_review_ready`
- `internal_only_readout_ready`
- `blocked_for_privacy_or_suppression`
- `blocked_for_customer_facing_financial_output`

No state authorizes customer-facing financial output in the current program.

## 8. Allowed Sections

Allowed future sections are limited to bounded, source-bound presentation
containers:

- `evidence_chain_summary`
- `playbook_coverage`
- `evidence_gaps`
- `required_caveats`
- `blocked_claims`
- `source_refs`
- `suppression_and_privacy_posture`
- `vbd_context`
- `aggregate_workforce_context`
- `next_evidence_actions`

These sections may present aggregate evidence posture and internal next actions.
They must not present unsupported financial, causal, productivity, headcount,
people, or customer-facing economic claims.

## 9. Blocked Sections and Claims

The readout must block or omit:

- ROI proof;
- EBITA claims;
- causality claims;
- productivity claims;
- headcount reduction claims;
- individual attribution;
- the blocked use `manager_or_team_ranking`;
- people decisioning;
- customer-facing financial output;
- customer-facing economic output;
- person-level HRIS or productivity interpretation;
- compensation, performance, promotion, discipline, attrition, or HRIS
  inference from AI usage.

Any future narrower safe claim must be explicitly permitted by the upstream
Claim Readiness Snapshot and must still carry caveats, blocked claims, privacy,
suppression, VBD, workforce, and financial boundaries.

## 10. Financial Boundary

The future readout snapshot must copy the upstream `financial_boundary`.

If any financial flag is false upstream, the corresponding readout section must
be blocked or omitted. If customer-facing financial output is false upstream,
the readout must not show customer-facing financial output.

The current program keeps customer-facing financial output blocked.

## 11. Suppression and Privacy Boundary

Suppressed evidence must stay suppressed. Hidden values must not be exposed,
reconstructed, or summarized around.

Unsafe privacy flags block customer-facing and executive readout output,
including direct identifiers, raw content, person-level productivity,
person-level HRIS records, hashed or joinable person identifiers, the blocked
use `manager_or_team_ranking`, people decisioning, compensation/performance
inference, promotion/discipline inference, attrition prediction, and HRIS
inference from AI usage.

## 12. VBD Boundary

VBD remains Layer 1 platform telemetry posture. A future readout may use VBD to
describe aggregate AI work growth, spread, and embeddedness only when the
Evidence Snapshot and Claim Readiness Snapshot carry the same caveats.

VBD must not authorize ROI, EBITA, causality, productivity, headcount
reduction, individual attribution, the blocked use `manager_or_team_ranking`,
people decisioning, customer-facing financial output, or full Playbook coverage
by itself.

## 13. Aggregate Workforce Context Boundary

Aggregate workforce context may appear only as aggregate, cohort-safe,
customer-approved, non-decisioning context. It must not rank teams, managers,
departments, people, cohorts, or customers, and it must not authorize
productivity, people decisioning, HRIS inference, or customer-facing financial
claims.

If aggregate workforce context is missing, held, suppressed, blocked, or not
computed, the readout must preserve that state as a caveat or evidence gap.

## 14. Persistence Policy

The backend-only persistence policy is:

```json
{
  "backend_persistence_allowed": true,
  "persisted": false,
  "creates_backend_routes": false,
  "creates_frontend_ui": false,
  "creates_ingestion_jobs": false,
  "customer_facing_readout_allowed": false,
  "customer_facing_financial_output_allowed": false
}
```

`backend_persistence_allowed` authorizes append-only repository persistence of
validated, source-bound snapshots. The remaining flags stay false because this
contract still does not create public routes, UI, ingestion, rendered readouts,
customer exports, or customer-facing financial output.

## 15. Validation Requirements

Implementation must fail closed unless:

- all upstream objects validate;
- source binding matches across org, Measurement Plan, workflow, window, and
  source refs;
- all required caveats carry forward;
- all blocked claims carry forward;
- evidence gaps are explicitly represented;
- financial boundary flags are not loosened;
- customer-facing readout remains false;
- privacy and suppression posture are safe;
- VBD and aggregate workforce context remain context only;
- forbidden raw, person-level, ranking, decisioning, and computed economic
  fields are absent.

## 16. Stop Conditions

Stop instead of implementing if any work would require:

- backend routes or frontend UI in this phase;
- executive readout generation from caveated, held, suppressed, or internal-only
  evidence;
- customer-facing financial output;
- weakening required caveats, blocked claims, privacy, suppression, VBD, or
  aggregate workforce boundaries;
- deriving value claims from BigQuery source availability alone;
- deriving value claims from VBD or aggregate workforce context alone.

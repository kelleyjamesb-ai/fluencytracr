# AI Value Customer Journey Contract

Status: Phase 1 contract

Schema version: `FT_AI_VALUE_CUSTOMER_JOURNEY_2026_06`

Validator: `shared/src/aiValueEngine/customerJourney.ts`

This contract models the post-sales AI Value customer journey from aggregate AI
Fluency intake through client evidence request, safe aggregate evidence entry,
internal evidence review, and intervention retest planning. It is the first
workflow contract after
`docs/architecture/AI_VALUE_POST_SALES_WORKFLOW_CURRENT_STATE_AUDIT.md`.

This contract does not create migrations, Prisma schema changes, backend
routes, frontend UI, ingestion jobs, new persistence, claim readiness snapshot
persistence, executive readout snapshot persistence, rendered readouts, ROI,
EBITA, causality, productivity, headcount, ranking, people decisioning, or
customer-facing financial output.

## Purpose

The Customer Journey contract gives FluencyTracr a governed post-sales state
machine before customer-facing workflow surfaces exist. It lets the product be
useful when only aggregate AI Fluency and Layer 1 source availability are
available, while preserving the difference between directional evidence posture
and stronger Playbook-supported value claims.

AI Fluency baseline is aggregate context only. BigQuery source availability is
source posture only. VBD remains Layer 1 platform telemetry only. Missing Layer
2 user voice, Layer 3 system-of-record outcomes, governance evidence, and
assumption evidence must remain explicit until provided, validated, held,
rejected, or suppressed.

## Required Stages

The journey must include these stages in order:

1. `post_sales_kickoff`
2. `ai_fluency_intake`
3. `initial_signal_capture`
4. `measurement_plan_draft`
5. `evidence_gap_review`
6. `client_evidence_request`
7. `client_evidence_entry`
8. `evidence_snapshot_review`
9. `claim_readiness_review`
10. `executive_readout_preparation`
11. `intervention_retest`

Each stage must include:

- `stage_id`
- `stage_status`
- `required_inputs`
- `produced_outputs`
- `evidence_layers_touched`
- `allowed_outputs`
- `blocked_outputs`
- `required_caveats`
- `owner_role`
- `customer_visible`
- `customer_action_required`
- `created_at`
- `updated_at`

Allowed `stage_status` values are:

- `not_started`
- `in_progress`
- `blocked`
- `complete`
- `skipped`
- `held`

## Evidence Layers

`evidence_layers_touched` may reference:

- `layer_1_platform_telemetry`
- `layer_2_user_voice_empirical`
- `layer_3_business_system_outcomes`
- `governance_evidence`
- `assumption_evidence`

Touching a layer does not mean the layer is present or claim-supporting. Missing
or held evidence must stay visible in stage caveats and downstream contracts.

## Required Blocked Outputs

Every stage must block:

- `realized_roi`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `people_decisioning`
- `customer_facing_financial_output`

Early stages can produce directional posture, source availability context,
measurement planning, and evidence request planning. They cannot produce value
proof, financial output, causal output, productivity output, headcount output,
or customer-facing financial claims.

## Stage-Specific Rules

`evidence_gap_review` must explicitly preserve missing Layer 2 and missing
Layer 3 evidence as caveats. Missing evidence is not support.

`client_evidence_request` is an evidence collection artifact only. Its allowed
and produced outputs must not create claims.

`client_evidence_entry` must be aggregate-only, source-owner approved or
attested, and privacy-safe. It must block raw rows, raw prompts, raw responses,
transcripts, query text, file contents, direct identifiers, hashed or joinable
person identifiers, person-level HRIS records, and person-level productivity.

`intervention_retest` may plan aggregate before/after review. It must continue
to block causality claims unless a future governed causal design explicitly
authorizes that scope. This Phase 1 contract still blocks causality output.

## Feeds

A valid Customer Journey can feed:

- customer journey state
- measurement plan draft context
- client evidence request context
- client evidence entry context

It cannot feed:

- claim readiness snapshots
- executive readout snapshots
- customer-facing financial output

## Examples

Validator-backed examples live in:

- `examples/initial-ai-fluency-only-journey.json`
- `examples/client-evidence-phase-journey.json`


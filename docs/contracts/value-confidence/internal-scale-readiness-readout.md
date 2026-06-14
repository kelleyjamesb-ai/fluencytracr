# Internal Scale Readiness Readout

## Purpose

The Internal Scale Readiness Readout is the documentation-stage contract for
the V4 internal operating readout promoted by
[V4_CANONICAL_CONTRACT_DECISION.md](../../research/V4_CANONICAL_CONTRACT_DECISION.md).

It defines the aggregate record shape that can tell Glean value-realization
reviewers where AI use appears ready to scale, where enablement or workflow
redesign may be needed, where trust or reusable-leverage evidence is held, and
where a business-owned value investigation may be warranted.

It does not define an API, runtime schema, frontend surface, customer-facing
economic readout, Time-Saved Defensibility Range output, ROI calculation,
causal claim, prediction, productivity measurement, automated recommendation,
or ranking surface.

## Contract Status

Status: docs-only internal readout contract.

Current governing decision:

`PROMOTE_INTERNAL_READOUT_CONTRACT_HARDENING`

Also:

`HOLD_CUSTOMER_FACING_ECONOMIC_OUTPUT`

This contract may be used to harden internal readout language, examples,
templates, and review checklists. Any future API, schema, endpoint, runtime
service, frontend product surface, customer-facing economic output, or
Time-Saved Defensibility Range implementation requires a later decision that
promotes that exact scope.

## Required Inputs

An internal readout record may use only aggregate, governed inputs:

- V3 aggregate verdict metadata,
- suppression status and suppression reason,
- Velocity band,
- Depth Repertoire context,
- readout zone,
- Quality Multiplier and Reliability Factor context where aligned,
- trust classification,
- reusable leverage classification,
- support outcome context where aligned by fixed window,
- value hypothesis routing,
- required caveats and blocked claims.

All inputs must preserve existing fail-closed gates. Suppressed slices must
remain suppressed.

## Required Output Fields

The internal readout record should include:

- `schema_version`,
- `readout_type`,
- `window_id`,
- `cohort_key`,
- `suppression_bucket_key`,
- `workflow_id` or approved aggregate surface key,
- `jbtd_id`,
- `persona_id`,
- `verdict`,
- `suppression_reason`,
- `velocity_band`,
- `depth_repertoire_context`,
- `readout_zone`,
- `trust_classification`,
- `reusable_leverage_classification`,
- `quality_multiplier_context`,
- `reliability_factor_context`,
- `support_outcome_context`,
- `value_hypothesis`,
- `time_saved_gate_state`,
- `required_caveats`,
- `blocked_claims`,
- `evidence_gaps`,
- `allowed_next_action`.

The contract does not require every optional context field to be populated.
Missing, held, or suppressed evidence must be represented as an evidence gap or
null/absent context, not as a negative finding.

## Field Rules

### `schema_version`

Docs-only version label for examples and templates.

Recommended value:

`FT_INTERNAL_SCALE_READINESS_2026_05_DOCS_ONLY`

### `readout_type`

Must be:

`INTERNAL_SCALE_READINESS_READOUT`

### `cohort_key`

An aggregate cohort key. It must not contain user IDs, emails, names, employee
IDs, raw prompts, raw outputs, transcripts, raw event rows, raw ticket rows, or
raw skill names.

The cohort key alone is not sufficient to prove suppression isolation. If the
source slice used optional `jbtd_id` or `persona_id` keys, those keys must either
travel as explicit nullable fields in the readout or be encoded into
`suppression_bucket_key` exactly as the underlying suppression bucket was
evaluated.

### `suppression_bucket_key`

Required aggregate key that identifies the exact suppression bucket used before
readout generation.

The bucket must preserve the existing invariant that suppression gates apply
independently per `(workflow_id, jbtd_id, persona_id)` slice. It must not merge
multiple suppression buckets into one surfaced readout row. Acceptable forms are:

- explicit `workflow_id`, nullable `jbtd_id`, and nullable `persona_id` fields,
  plus a deterministic bucket key derived from those fields, or
- an approved aggregate surface key only when that key is the actual governed
  suppression bucket and no optional JBTD/persona slice keys were used.

If the source cannot prove the exact suppression bucket, the row must remain
`SUPPRESS` or carry evidence-gap language only.

### `workflow_id`

A governed workflow or surface key. The key may be a workflow surface,
standalone surface, or approved aggregate surface family. It must not expose
person-level, team-ranking, department-ranking, manager-ranking, customer-
ranking, or skill-ranking semantics.

### `jbtd_id`

Optional opaque aggregate slice key. When present in the source verdict path, it
must be preserved in the readout shape or encoded into `suppression_bucket_key`.
It must not introduce a built-in job taxonomy or person-level label.

### `persona_id`

Optional opaque aggregate slice key. When present in the source verdict path, it
must be preserved in the readout shape or encoded into `suppression_bucket_key`.
It must not introduce a built-in persona taxonomy, employee label, team ranking,
or manager ranking.

### `verdict`

Must preserve existing verdict posture:

- `SURFACE`
- `SUPPRESS`

Default is `SUPPRESS`.

### `suppression_reason`

May use only the existing five suppression reasons:

- `INSUFFICIENT_TIME`
- `INSUFFICIENT_VOLUME`
- `NO_CONVERGENCE`
- `BASELINE_UNSTABLE`
- `HIGH_AMBIGUITY`

This contract adds no suppression reasons.

### `velocity_band`

Aggregate adoption-energy context. It must not be interpreted as value,
productivity, performance, capability, or maturity.

### `depth_repertoire_context`

Aggregate cross-surface work-integration context. It may use the current
Depth Repertoire classifications:

- `INTEGRATED_REPERTOIRE`
- `ACTIVE_BUT_SHALLOW`
- `FOCUSED_INTEGRATION`
- `UNSTABLE_OR_INSUFFICIENT`

Depth Repertoire is caveat/context only in value-confidence artifacts. It must
not change surfacing eligibility, confidence bands, range values, economic
interpretation, or blocked claims.

### `readout_zone`

Allowed zones:

- `SCALE_CANDIDATE`
- `SHALLOW_ADOPTION`
- `FOCUSED_EXPERT_USE`
- `TRUST_EVIDENCE_GAP`
- `INSTRUMENTATION_HOLD`
- `SUPPRESSED`

Zones are aggregate action postures. They are not rankings, scores, maturity
labels, productivity labels, or performance judgments.

### `trust_classification`

Allowed trust states:

- `TRUST_EVIDENCE_AVAILABLE`
- `TRUST_ATTRIBUTION_HOLD`
- `TRUST_PARENT_ATTRIBUTION_READY`
- `TRUST_CALIBRATION_READY`
- `TRUST_NOT_AVAILABLE`

Current dogfood evidence keeps governed Trust Calibration held unless strict
parent attribution is validated.

### `reusable_leverage_classification`

Allowed reusable leverage states:

- `WORKFLOW_METADATA_HOLD`
- `SKILL_READ_EVIDENCE_AVAILABLE`
- `SKILL_READ_UNGOVERNED`
- `GOVERNED_REUSE_READY`
- `REUSE_NOT_AVAILABLE`

Skill Read Evidence and reusable leverage remain held for governed value
interpretation until identity, versioning, invocation mode, and personal/shared
/org separation are validated. Raw skill names must not appear in this readout.

### `quality_multiplier_context`

Aggregate Quality Multiplier context may be included when aligned to the same
surface, cohort, and window. It must not override suppression.

### `reliability_factor_context`

Aggregate Reliability Factor context may be included when aligned to the same
surface, cohort, and window. Latency remains corroborative only.

### `support_outcome_context`

Support context may be included only as same-window outcome context unless an
approved aggregate behavior-to-support join key exists.

Allowed current use:

`SUPPORT_CONTEXT_AVAILABLE_NOT_ATTRIBUTED`

Blocked current use:

`AI_BEHAVIOR_CAUSED_SUPPORT_OUTCOME_CHANGE`

### `value_hypothesis`

Allowed value types follow AIVM vocabulary:

- `ACCELERATION`
- `QUALITY_PREMIUM`
- `NET_NEW`
- `UNCLASSIFIED`

The hypothesis is an investigation route, not economic proof. It must include
missing evidence and required customer-owned assumptions before any stronger
interpretation.

### `time_saved_gate_state`

Allowed states:

- `RANGE_HELD_MISSING_ASSUMPTIONS`
- `RANGE_HELD_MISSING_ATTRIBUTION`
- `RANGE_HELD_NOT_CAUSAL`
- `RANGE_NOT_REQUESTED`
- `RANGE_ELIGIBILITY_RESEARCH_ONLY`

Current dogfood state is held. This contract must not emit hours, dollar
values, ROI, or range outputs.

## Decision Logic

The internal readout may route action as follows:

| Readout zone | Allowed next action | Economic posture |
| --- | --- | --- |
| `SCALE_CANDIDATE` | Review for scaling or playbook development. | Candidate value investigation only. |
| `SHALLOW_ADOPTION` | Coach, enable, or redesign workflow. | Hold economic interpretation. |
| `FOCUSED_EXPERT_USE` | Study workflow and decide whether to package or expand. | Candidate value investigation with business context only. |
| `TRUST_EVIDENCE_GAP` | Improve trust, feedback, or verification instrumentation. | Hold economic interpretation. |
| `INSTRUMENTATION_HOLD` | Repair source coverage, joins, or metadata. | No value hypothesis beyond evidence repair. |
| `SUPPRESSED` | Do not interpret. | Block economic interpretation. |

## Suppression Behavior

When `verdict` is `SUPPRESS`:

- `readout_zone` must be `SUPPRESSED`,
- `value_hypothesis` must be null or `UNCLASSIFIED`,
- `support_outcome_context` must not be used to elevate interpretation,
- `time_saved_gate_state` must not emit range values,
- optional context fields must not reconstruct suppressed values,
- `allowed_next_action` must be limited to hold or evidence repair.

## Required Caveats

Every surfaced readout should include caveats that state:

- The readout is aggregate-only.
- The readout is for internal Glean value-realization planning.
- It is not customer-facing economic output.
- It is not ROI, productivity measurement, causality, or prediction.
- It does not rank people, teams, departments, managers, customers, or skills.
- Depth Repertoire is caveat/context only for value-confidence use.
- Trust and reusable leverage holds are evidence gaps, not negative findings.
- Support outcome context is not behavior attribution unless an approved
  aggregate join key exists.
- Time-Saved range output remains held unless required assumptions and
  attribution are separately approved.

## Blocked Fields

The readout must not include:

- user IDs,
- employee IDs,
- emails,
- names,
- manager identifiers,
- raw skill names,
- raw prompts,
- raw outputs,
- transcripts,
- raw action rows,
- raw event rows,
- raw ticket text,
- row-level support records,
- hours saved,
- dollars saved,
- ROI,
- productivity lift,
- causal effect estimates,
- prediction scores,
- team, department, manager, customer, person, or skill ranks.

## Example Surfaced Record

```json
{
  "schema_version": "FT_INTERNAL_SCALE_READINESS_2026_05_DOCS_ONLY",
  "readout_type": "INTERNAL_SCALE_READINESS_READOUT",
  "window_id": "window_1",
  "cohort_key": "glean_internal_behavior_cohort",
  "workflow_id": "workflow:CHAT",
  "verdict": "SURFACE",
  "suppression_reason": null,
  "velocity_band": "HIGH",
  "depth_repertoire_context": "INTEGRATED_REPERTOIRE",
  "readout_zone": "SCALE_CANDIDATE",
  "trust_classification": "TRUST_ATTRIBUTION_HOLD",
  "reusable_leverage_classification": "SKILL_READ_EVIDENCE_AVAILABLE",
  "quality_multiplier_context": "ALIGNED_CONTEXT_AVAILABLE",
  "reliability_factor_context": "ALIGNED_CONTEXT_AVAILABLE",
  "support_outcome_context": "SUPPORT_CONTEXT_AVAILABLE_NOT_ATTRIBUTED",
  "value_hypothesis": {
    "value_type": "ACCELERATION",
    "status": "INVESTIGATION_ROUTING_ONLY",
    "missing_evidence": [
      "approved aggregate behavior-to-outcome join key",
      "customer-owned assumptions",
      "causal design"
    ]
  },
  "time_saved_gate_state": "RANGE_HELD_MISSING_ASSUMPTIONS",
  "required_caveats": [
    "Internal aggregate readout only.",
    "This routes a value investigation; it does not calculate economic value.",
    "Support context is same-window context, not behavior attribution.",
    "Depth Repertoire is caveat/context only.",
    "Time-Saved range output remains held."
  ],
  "blocked_claims": [
    "ROI",
    "productivity lift",
    "causal impact",
    "prediction",
    "team ranking",
    "department ranking",
    "individual scoring"
  ],
  "evidence_gaps": [
    "trust parent attribution",
    "governed reusable leverage identity",
    "assumption ledger"
  ],
  "allowed_next_action": "review_for_internal_scale_or_value_investigation"
}
```

## Example Held Record

```json
{
  "schema_version": "FT_INTERNAL_SCALE_READINESS_2026_05_DOCS_ONLY",
  "readout_type": "INTERNAL_SCALE_READINESS_READOUT",
  "window_id": "window_1",
  "cohort_key": "glean_internal_behavior_cohort",
  "workflow_id": "workflow:agent:workflow_named",
  "verdict": "SUPPRESS",
  "suppression_reason": "INSUFFICIENT_VOLUME",
  "velocity_band": null,
  "depth_repertoire_context": null,
  "readout_zone": "SUPPRESSED",
  "trust_classification": "TRUST_NOT_AVAILABLE",
  "reusable_leverage_classification": "WORKFLOW_METADATA_HOLD",
  "quality_multiplier_context": null,
  "reliability_factor_context": null,
  "support_outcome_context": null,
  "value_hypothesis": null,
  "time_saved_gate_state": "RANGE_NOT_REQUESTED",
  "required_caveats": [
    "Suppressed evidence cannot be interpreted.",
    "No economic, trust, reuse, or scale-readiness interpretation is allowed."
  ],
  "blocked_claims": [
    "economic interpretation",
    "support attribution",
    "reuse interpretation",
    "skill evidence interpretation"
  ],
  "evidence_gaps": [
    "insufficient volume"
  ],
  "allowed_next_action": "hold_or_repair_evidence"
}
```

## Non-Capabilities

This contract does not:

- create runtime behavior,
- create an API,
- create a schema,
- create a frontend surface,
- authorize customer-facing readouts,
- authorize economic output,
- calculate ROI,
- emit time-saved range values,
- prove causality,
- predict outcomes,
- measure productivity,
- rank people or groups,
- promote Trust Calibration,
- promote reusable leverage,
- promote Skill Read Evidence as a governed value signal.

## Next Required Decision

After this contract is reviewed, the next decision should choose one of:

- `PROMOTE_INTERNAL_READOUT_TEMPLATE_REHEARSAL`
- `HOLD_FOR_CONTRACT_REVISIONS`
- `HOLD_FOR_ADDITIONAL_FIXED_WINDOW_VALIDATION`
- `REJECT_INTERNAL_READOUT_CONTRACT`

Only the first option should allow a template rehearsal using retained
aggregate CSVs. None of these options authorize customer-facing economic output
or runtime implementation.

# AI Value Research Promotion Readiness Packet

Schema version: `FT_AI_VALUE_RESEARCH_PROMOTION_READINESS_PACKET_2026_06`

Status: contract-only readiness gate. This document does not create backend
routes, frontend UI, Prisma schema changes, migrations, repositories,
persistence writes, live Glean, BigQuery, or Sigma execution, export packages,
rendered customer readouts, model math, numeric weights, ROI, causality,
productivity, probability, or customer-facing financial output.

## Purpose

The Research Promotion Readiness Packet is the final governance gate between
the productized internal evidence spine and any later internal research-design
work.

It answers one question:

```text
Do we have enough governed, repeated, source-bound aggregate evidence to design
an internal research review without turning context into proof?
```

It does not answer whether the model is valid. It does not authorize model
training, model scoring, contribution output, probability output, finance
output, or customer-facing output.

## Decision Values

| Decision | Meaning |
| --- | --- |
| `READY_FOR_INTERNAL_RESEARCH_DESIGN` | The packet is complete enough to draft an internal research design. It is not model implementation approval. |
| `HOLD_FOR_REPEATED_ALIGNED_EVIDENCE` | Repeated milestone evidence is missing, incomplete, held, suppressed, rolling-window-only, or not yet repeatable across pilots. |
| `HOLD_FOR_SOURCE_OR_PATH_DRIFT` | Source, org, client, workflow, function, cohort, metric, lag, approval, or expectation-path identity drifted. |
| `HOLD_FOR_GOVERNANCE_REVIEW` | Legal/trust, owner approval, suppression, k-min, caveat, blocked-use, or source-review posture is incomplete. |
| `REJECT_FOR_BOUNDARY_LEAKAGE` | The packet contains raw, identifier-bearing, model-output, finance-output, productivity, causality, probability, score-like, or customer-facing material. |

## Required Inputs

The packet may carry compact refs and hashes only:

| Input | Requirement |
| --- | --- |
| `research_promotion_packet_id` | Stable internal packet id |
| `schema_version` | Must equal `FT_AI_VALUE_RESEARCH_PROMOTION_READINESS_PACKET_2026_06` |
| `created_at` | Packet creation timestamp |
| `reviewer_role` | Internal governance or operator role only |
| `decision` | One governed decision value from this contract |
| `approved_blueprint_ref` or `value_hypothesis_ref` | Required approved hypothesis reference |
| `approved_blueprint_payload_hash` | Required when approved Blueprint ref is present |
| `expectation_path_id` | Required selected path id |
| `expectation_path_version` | Required selected path version |
| `expectation_path_hash` | Required selected path hash |
| `approved_at` | Required approval timestamp |
| `approved_by_role` | Required approving role |
| `approval_state` | Must be approved, not draft/pending/system-proposed |
| `measurement_cell_snapshot_refs` | Compact backend-internal Measurement Cell snapshot refs for eligible windows |
| `series_contract_continuity_ref` | Compact Measurement Cell Series contract-output ref or recomputed continuity proof; not a persisted Series row |
| `milestone_coverage` | Day 0 / 30 / 60 / 90 / 180 / 365 coverage posture |
| `source_lane_refs` | Compact refs for Blueprint, AI Fluency, VBD/token, customer metric, and assumption/governance source lanes |
| `ai_fluency_construct_context_ref` | Compact aggregate five-factor context ref only |
| `ai_fluency_psychological_context_ref` | Optional compact aggregate attitude and behavioral-intent context-availability ref only; not evidence sufficiency |
| `observed_vbd_context_ref` | Compact aggregate velocity, breadth, and depth context ref |
| `selected_metric_movement_ref` | Compact aggregate customer metric movement ref |
| `assumption_governance_ref` | Compact assumption and governance review ref |
| `source_package_review_posture_ref` | Compact source package review posture ref |
| `data_spine_alignment_ref` | Compact Data Spine alignment ref |
| `required_caveats` | Required array of caveats |
| `blocked_uses` | Required array of blocked uses |
| `validation_summary` | Compact pass/hold/reject summary only |

The packet must not carry full source packages, full handoff bundles, full
Measurement Cell payloads, full Series payloads, full Blueprint expectation
path registries, source package payloads, raw source context, raw rows, query
text, SQL text, prompts, responses, transcripts, files, item-level survey
answers, respondent records, row ids, span ids, user identifiers, hashed
identifiers, or joinable person identifiers.

## Readiness Gates

`READY_FOR_INTERNAL_RESEARCH_DESIGN` requires all gates below to clear.

### 1. Repeated Milestone Evidence

Required milestone coverage:

```text
Day 0 / 30 / 60 / 90 / 180 / 365
```

Each milestone must have a compact, recomputed-valid Measurement Cell snapshot
ref. Until a later named, validator-backed contract explicitly promotes an
alternative ref type with the same Day 0 / 30 / 60 / 90 / 180 / 365,
observed VBD, selected metric movement, path, suppression, source-bound, and
compact-ref gates, no equivalent sufficiency waiver is allowed. Held,
suppressed, missing, blocked, or stale windows must remain visible and force a
hold. Later ready windows cannot rescue earlier held, suppressed, missing, or
blocked windows.

Rolling 30-day operating context is not milestone evidence. It cannot feed
evidence continuity, research design readiness, finance-context investigation,
customer-facing output, exports, trend language, or improvement language.

### 2. Stable Approved Expectation Path

Every included Measurement Cell snapshot ref, or a later named
validator-backed alternative ref that clears the same gates above, must bind to
the same approved expectation path:

- `expectation_path_id`;
- `expectation_path_version`;
- `expectation_path_hash`;
- approved Blueprint payload hash;
- approved Blueprint ref or value hypothesis ref;
- approved timestamp;
- approving role;
- approval state;
- selected metric id;
- metric definition, unit, direction, and lag;
- governed value driver in `Revenue`, `Cost`, `Capacity`, `Quality`, or `Risk`.

Any path, approval, metric, lag, or driver drift must hold the packet.

### 3. Source Lane Completeness

The packet must include reviewed, compact, source-bound refs for:

- Blueprint / approved hypothesis context;
- aggregate AI Fluency construct context;
- observed VBD and token context;
- customer metric movement;
- assumption and governance context;
- Source Package Review Queue posture;
- Data Spine alignment.

Missing, held, suppressed, stale, unsafe, or misaligned source refs must hold
the packet. Source refs must be metadata only.

Aggregate AI Fluency psychological context is optional context availability
only. It may add caveats, explain missing context, or hold the packet when a
declared psychological context ref is unsafe or boundary-incomplete. It cannot
strengthen, clear, upgrade, or rescue readiness, and it cannot substitute for
observed VBD context or selected customer metric movement.

### 4. Stated And Observed Behavior Separation

AI Fluency stated behavior must remain the governed `behavior_change` construct
or a display/review view over that construct. Observed behavior must remain
telemetry-derived VBD context: velocity, breadth, and depth.

The packet may review stated and observed behavior as internal diagnostic
context only. It must not collapse them into a behavior score, evidence score,
adoption-conversion score, model feature table, or customer-facing adoption gap
readout.

### 5. Selected Metric Movement

Selected customer metric movement must be present as compact aggregate context
and bound to the same org, client, workflow, function, cohort, metric, lag,
window, approved expectation path, and source-review posture as the evidence
series.

Psychological context, AI Fluency construct context, VBD context, or token
context cannot substitute for missing, held, suppressed, or misaligned customer
metric movement.

### 6. Governance And Boundary Review

The packet must preserve:

- source owner review;
- k-min posture;
- suppression posture;
- legal/trust posture when required;
- caveats;
- blocked uses;
- false boundary policy for customer-facing output, finance output, model
  output, export, and live connector execution.

Any missing governance posture must hold the packet.

## Required Blocked Uses

Every packet must block:

- model implementation;
- numeric weights;
- contribution-model output;
- probability output;
- score-like output;
- finance output;
- ROI;
- EBITDA;
- financial attribution;
- causality proof;
- productivity measurement;
- team, manager, department, employee, or individual ranking;
- customer-facing readout;
- customer-facing export;
- rendered customer packet;
- live connector execution;
- raw data storage.

## Promotion Meaning

`READY_FOR_INTERNAL_RESEARCH_DESIGN` authorizes only this next step:

```text
Draft an internal research design using the packet's compact refs and caveats.
```

It does not authorize:

- model implementation;
- statistical model selection;
- numeric weights;
- research model inputs as durable product state;
- model outputs;
- customer-facing output;
- finance-context investigation;
- ROI, EBITDA, causality, productivity, probability, or contribution output.

The research design must still specify the research question, eligible inputs,
excluded fields, comparison design, missing-evidence behavior, suppression
behavior, output audience, blocked output language, validation checks, and
legal/trust posture before any implementation begins.

## Fail-Closed Tests Required Before Implementation

Before any executable packet validator, schema, persistence, route, UI, export,
or research-design runner exists, the promotion decision must require red/green
tests proving rejection or hold for:

- missing Day 0;
- missing Day 30 / 60 / 90 / 180 / 365 windows;
- held, suppressed, stale, or blocked windows hidden from output;
- rolling 30-day context used as milestone evidence;
- path drift;
- approval drift;
- metric drift;
- lag drift;
- value-driver drift;
- source-ref drift;
- missing value hypothesis or approved Blueprint binding;
- missing customer metric movement;
- psychological-only evidence;
- collapsed stated behavior and observed VBD behavior;
- unsafe source refs;
- raw rows;
- query text or SQL text;
- prompts, responses, transcripts, files, or raw text answers;
- item-level survey answers;
- respondent records;
- user identifiers, row ids, span ids, hashed identifiers, or joinable person
  identifiers;
- full source package payloads;
- full handoff bundles;
- full Measurement Cell or Series payloads;
- full expectation-path registries;
- ROI, EBITDA, finance-output, causality, productivity, probability,
  contribution-model, score-like, numeric-weight, customer-facing, export,
  live-connector, route, UI, schema, persistence, or model-output fields;
- JSON payload smuggling through refs, caveats, blocked uses, validation
  summaries, compact posture fields, or wrapper payloads.

## Relationship To Existing Decisions

This packet does not supersede:

- AI Value Productization Gate Decision;
- AI Value Measurement Cell Persistence Promotion Decision;
- AI Value Measurement Cell Series Persistence Promotion Decision;
- AI Value Pipeline Promotion Decision;
- AI Value Customer Projection Promotion Decision;
- AI Value Export Governance Decision.

It depends on those decisions staying narrow. Any later implementation must
cite a separate exact-scope promotion decision.

## Verification

When this contract is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.

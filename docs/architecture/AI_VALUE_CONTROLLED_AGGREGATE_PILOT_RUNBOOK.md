# AI Value Controlled Aggregate Pilot Runbook

Status: docs-only pilot runbook. This document does not create backend routes,
frontend UI, Prisma schema changes, migrations, repository methods,
persistence writes, live Glean or BigQuery execution, export packages,
rendered customer readouts, confidence math, ROI, causality, productivity,
probability, or customer-facing financial output.

Phase: `phase-ai-value-controlled-aggregate-pilot-runbook`

Decision posture: `pilot_runbook_ready__pilot_execution_not_started`

## 1. Purpose

The Productization Gate says the governed internal evidence spine is ready for
operator review, but customer productization and new Measurement Cell
persistence remain blocked. This runbook defines the controlled scrubbed
aggregate pilot that must run before any Measurement Cell persistence
promotion decision can safely move from projection to implementation.

The pilot tests one question:

```text
Can reviewed aggregate source packages move through Data Spine review,
Measurement Cell Assembly, Measurement Cell Series alignment, and downstream
review posture without implying live connectors, persistence, confidence,
finance output, ROI, causality, productivity, probability, or customer-facing
readiness?
```

## 2. Required Inputs

The pilot may start only when every input is aggregate-only, reviewed, and
source-bound.

Required input package:

| Input | Required state |
| --- | --- |
| Approved Blueprint Hypothesis | Approved, role-approved, source-bound |
| Blueprint selected expectation path | One selected path only; stable id, version, hash, approval metadata |
| Blueprint source ref | Reviewed and safe |
| AI Fluency aggregate source ref | Reviewed, aggregate-only, suppression/k-min posture preserved |
| VBD/token aggregate source ref | Reviewed, aggregate-only, no raw query/source rows |
| Customer metric source ref | Reviewed, metric-owner approved, aggregate windowed metric |
| Assumption source ref | Reviewed business/finance assumption context only |
| Governance source ref | Reviewed control/approval context only |
| Data Spine alignment envelope | Validated across org/client/workflow/function/cohort/window/metric/path |
| Source Package Review Queue posture | Data Spine review clear, not Measurement Cell proof |
| Measurement Cell Assembly candidate inputs | Candidate inputs only; validation must be recomputed during the pilot |
| Measurement Cell Series candidate milestone set | Candidate milestone windows only; alignment must be recomputed during the pilot |

## 3. Required Alignment Envelope

The pilot must preserve one governed alignment envelope through every step:

- `org_id`
- `client_id` when available
- `measurement_plan_id`
- `value_hypothesis_id` or `value_hypothesis_ref`
- `workflow_family`
- `workflow_id` when present
- `function_area`
- `cohort_key`
- baseline window
- comparison window
- `metric_id`
- metric definition/version/hash posture
- `expectation_path_id`
- `expectation_path_version`
- `expectation_path_hash`
- `approved_blueprint_payload_hash`
- approval state
- approved-at timestamp
- approved-by role
- governed driver metadata limited to `Revenue`, `Cost`, `Capacity`,
  `Quality`, or `Risk`
- lane-level source refs for Blueprint, AI Fluency, VBD/token, customer
  metric, assumption, and governance

Any missing, drifted, stale, or inapplicable field must be explicit. Silent
omission fails the pilot.

## 4. Gate Ownership And Pilot Flow

The pilot must keep gate ownership explicit:

| Gate | Owns | Does not own |
| --- | --- | --- |
| Operator Source Handoff Bundle | Compact source/context preparation across governed lanes | Source clearance, Data Spine readiness, Measurement Cell proof, durable proof |
| Data Spine review | Cross-source alignment across org/client/workflow/function/cohort/window/metric/path/source refs | Reviewed source package clearance by itself |
| Source Package Review Queue | Reviewed aggregate source clearance and feedable lane posture | Cross-source alignment by itself or Measurement Cell proof |
| Measurement Cell Assembly | Recomputed proof that Data Spine alignment and reviewed source clearance both hold for one Measurement Cell | Repairing held/missing/suppressed gates or creating persistence |
| Measurement Cell Series | Recomputed milestone continuity/alignment across validated Measurement Cells | Trend, improvement, finance, confidence, customer output, or rescue behavior |
| Evidence Snapshot / Claim Readiness boundary | Aggregate review posture and blocked-claim propagation | Value claim proof, customer readout, or finance output |

Run the pilot as an internal operator review sequence:

```text
Reviewed aggregate source package refs
-> Operator Source Handoff Bundle
-> Data Spine review
-> Source Package Review Queue
-> Measurement Cell Assembly
-> Measurement Cell Series milestone alignment
-> Evidence Snapshot / review-posture compatibility check
-> Claim Readiness / Operator Workflow boundary check
-> Productization Gate decision check
```

Ordering note: Data Spine review and Source Package Review Queue are both
required before Measurement Cell Assembly. Data Spine owns cross-source
alignment; Source Package Review Queue owns reviewed aggregate source
clearance. Measurement Cell Assembly must recompute both and must fail closed
if either gate is stale, missing, held, suppressed, drifted, or unsafe.

No copied Measurement Cell Assembly output or copied Measurement Cell Series
output can satisfy the pilot input requirement. The pilot may use candidate
inputs and candidate milestone sets only, then must recompute the governed
Measurement Cell Assembly and Series validations inside the pilot flow.

The pilot must keep each gate distinct:

- Source Package Review Queue can say `Data Spine review clear`.
- Data Spine review can feed Measurement Cell Assembly only when all alignment
  gates clear.
- Measurement Cell Assembly can emit contract output only.
- Measurement Cell Series can emit continuity/alignment review only.
- Evidence Snapshot compatibility can preserve posture only.
- Claim Readiness / Operator Workflow can remain internal review only.

## 5. Pass Criteria

The pilot passes only when all conditions are true:

- all source refs are safe;
- all source packages are reviewed and source-bound;
- all windows align;
- org/client/workflow/function/cohort keys align;
- selected expectation path identity is stable;
- value hypothesis binding is present or explicitly inapplicable;
- metric definition, unit, direction, owner approval, and lag are stable;
- held, suppressed, missing, rejected, and blocked windows remain visible;
- rolling 30-day context is quarantined as operating context only;
- blocked claims and blocked uses propagate through every output;
- no generic object payload becomes authoritative proof;
- legacy `executive_packet` output remains internal/prototype only;
- no customer-facing readout or export is produced;
- every output preserves aggregate-only posture;
- every output preserves the productization gate boundary.

## 6. Fail Conditions

The pilot fails if any condition appears:

- Source Package Review Queue is treated as Measurement Cell proof;
- Operator Source Handoff Bundle is treated as durable proof;
- Data Spine review is described as finance, ROI, or customer readiness;
- Measurement Cell Assembly output is treated as persisted product state;
- Measurement Cell Series is treated as trend, improvement, confidence,
  finance, customer, or business-impact evidence;
- rolling 30-day context is treated as milestone continuity;
- missing, held, suppressed, rejected, or blocked evidence is hidden;
- `ai_value_objects` is treated as authoritative evidence proof;
- legacy `executive_packet` output is treated as source-bound customer readout;
- `FINANCE_CONTEXT_INVESTIGATION_READY` is described as financial attribution,
  ROI proof, EBITDA impact, customer-facing economic output, or model output;
- live Glean or BigQuery execution is implied;
- a route, UI, export, migration, repository, or persistence write is added;
- any raw/person-level or unsafe content appears.

## 7. Must-Fail Verification Checklist

Pilot reviewers must record an explicit fail if any of these checks fail:

| Check | Must fail when |
| --- | --- |
| Source/ref drift | Any lane drifts on org, client, workflow, function, cohort, baseline/comparison window, metric, source ref, owner role, approval state, expectation path id, path version, or path hash |
| Stale validation | Any output trusts embedded `valid: true`, copied validation JSON, old validation timestamps, or stale handoff/package summaries instead of recomputing validation |
| Same metric / different path | The same `metric_id` is bound to a different approved expectation path, direction, lag, value driver, path version, or path hash |
| Rolling window misuse | `rolling_30_day` is used as milestone continuity, persistence-promotion evidence, finance-context evidence, Bayesian/confidence input, trend proof, or customer readout support |
| Legacy output confusion | Legacy `executive_packet`, `output/`, generated docs/decks, or prototype readouts are treated as source-bound evidence or customer-safe outputs |
| Generic object authority | `ai_value_objects.valid = true` substitutes for Source Package Review Queue, Data Spine, Measurement Cell Assembly, Measurement Cell Series, or readiness-map validation |
| Raw or identifier smuggling | Raw rows, files, SQL/query text, prompts, transcripts, ticket/file contents, span IDs, row IDs, emails, user IDs, hashed/joinable IDs, HRIS fields, or ranking fields appear directly or inside refs, caveats, labels, notes, summaries, JSONB, or compact posture fields |
| Finance/model overread | `FINANCE_CONTEXT_INVESTIGATION_READY` is treated as ROI proof, EBITDA/EBITA impact, attribution, probability, confidence percent, workforce productivity claim, or customer-facing economic output |
| Live connector overread | Scrubbed aggregate summaries are described as live Glean/BigQuery execution, connector output, raw query proof, ingestion, export package, route, UI, migration, repository write, or persistence promotion |

## 8. Unsafe Content Rejection

The pilot must fail closed on:

- raw rows;
- raw files;
- query text;
- SQL text;
- prompts;
- responses;
- transcripts;
- ticket contents;
- file contents;
- direct identifiers;
- emails;
- user IDs;
- employee IDs;
- respondent IDs;
- row IDs;
- span IDs;
- hashed or joinable person identifiers;
- HRIS fields;
- workforce productivity measurement;
- ranking fields;
- full source package payloads;
- full operator handoff bundles;
- full Blueprint expectation-path registries downstream of the approved
  Blueprint/Hypothesis payload;
- ROI fields;
- EBITDA or finance-output fields;
- causality fields;
- probability fields;
- confidence or score-like fields.

Unsafe values hidden inside caveats, refs, labels, notes, summaries,
validation payloads, source-ref payloads, JSONB blobs, or compact posture
fields must also fail closed.

## 9. Rolling Window Boundary

Rolling 30-day context is operating context only.

It must not feed:

- evidence continuity;
- finance-context investigation;
- Bayesian research planning;
- confidence research;
- customer-facing output;
- exports;
- rendered readouts;
- milestone continuity;
- persistence promotion evidence.

Only governed milestone windows can support continuity review:

- Day 0
- Day 30
- Day 60
- Day 90
- Day 180
- Day 365

## 10. Pilot Output Package

The pilot output package may contain only compact internal review artifacts:

- pilot id;
- run timestamp;
- operator role;
- input source ref summary;
- alignment envelope summary;
- pass/fail decision;
- held/missing/suppressed/blocked window summary;
- Measurement Cell Assembly validation summary;
- Measurement Cell Series alignment summary;
- blocked claims and blocked uses;
- required caveats;
- stop conditions encountered;
- recommended next decision.

The output package must not contain raw source payloads, full source packages,
full handoff bundles, full Measurement Cell payloads, customer-facing readout
sections, exports, finance output, model output, or direct identifiers.

## 11. Recommended Next Decision

After the pilot, choose one exact decision:

| Decision | Meaning |
| --- | --- |
| `PILOT_PASSED_PROMOTION_REVIEW_READY` | Proceed to Measurement Cell persistence promotion review |
| `PILOT_HELD_FOR_SOURCE_ALIGNMENT` | Fix source/ref/window/path/metric drift before promotion |
| `PILOT_HELD_FOR_LEGACY_READOUT_ISOLATION` | Isolate old readout/generic object risk before promotion |
| `PILOT_HELD_FOR_SUPPRESSION_OR_MISSING_EVIDENCE` | Evidence gaps must remain visible before promotion |
| `PILOT_REJECTED_FOR_BOUNDARY_LEAKAGE` | Unsafe output, raw content, or overclaiming appeared |

The pilot itself cannot promote persistence. It can only provide evidence for a
separate Measurement Cell persistence promotion decision.

## 12. Verification

When this runbook is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.

# Value Realization Contracts

FluencyTracr is the behavioral evidence layer for Glean value realization. It
starts from the time-saved pipeline gap: roughly 64% of chat runs have no
quality signal today. These contracts define the evidence services that qualify
raw acceleration before it becomes a customer-facing value claim.

Each contract preserves the same posture:

- Aggregate workflow evidence only.
- No individual attribution, ranking, or productivity scoring.
- Fail-closed `SURFACE` / `SUPPRESS` disclosure.
- AIVM vocabulary at the aggregate verdict layer: `value_type` and
  `evidence_grade`, preserved by value-realization services when they consume
  verdict metadata.
- No ROI computation, statistical-significance claim, or hidden causal proof.

## Contract Map

| Contract | Canonical doc | Role in the value pipeline |
| --- | --- | --- |
| Quality Multiplier | [quality-multiplier.md](./quality-multiplier.md) | Discounts, preserves, or amplifies time-saved estimates when observed aggregate workflow quality supports it. |
| Causal Delta | [../../contracts/causal-delta.md](../../contracts/causal-delta.md) | Compares pre/post aggregate workflow patterns around a rollout or change moment without claiming statistical causality. |
| Reliability Factor | [reliability-factor.md](./reliability-factor.md) and [../../contracts/reliability-factor.md](../../contracts/reliability-factor.md) | Qualifies whether surfaced evidence looks operationally dependable based on verification, recovery, abandonment, and friction-loop behavior. |
| Outcome Evidence | [outcome-evidence.md](./outcome-evidence.md) | Stores and replays customer-attested aggregate systems-of-record metrics next to unchanged workflow verdicts. |
| AI Work Evidence | [../../concepts/AI_WORK_EVIDENCE.md](../../concepts/AI_WORK_EVIDENCE.md) | Defines the org-agnostic core layer for surfaces, workflows, approved cohorts, interventions, trust evidence, source coverage, outcome evidence, and value hypotheses; source adapters such as Glean map into this core. |
| AI Work Evidence Pilot Package | [AI_WORK_EVIDENCE_PILOT_PACKAGE.md](./AI_WORK_EVIDENCE_PILOT_PACKAGE.md) | Provides source-neutral pilot templates, synthetic readout shape, Glean adapter mapping, live readiness criteria, and stop conditions for commercialization conversations. |
| Velocity Index | [../../contracts/velocity-index.md](../../contracts/velocity-index.md) | Adds V2 aggregate velocity context through frequency, engagement, and breadth distributions, surfaced only after fail-closed gates clear. |
| V3 Production Ingest | [V3_INGEST.md](./V3_INGEST.md) | Replaces manual CSV dogfood with customer-side aggregate transformation, governed calibration references, and immutable verdict replay. |
| V4 Value Confidence | [V4_VALUE_CONFIDENCE.md](./V4_VALUE_CONFIDENCE.md) and [../../contracts/value-confidence/README.md](../../contracts/value-confidence/README.md) | Composes V3 verdicts, Velocity, Depth, quality, reliability, trust calibration, and outcome evidence into executive economic decision artifacts. |
| Depth | [../../concepts/DEPTH.md](../../concepts/DEPTH.md) and [../../contracts/depth/README.md](../../contracts/depth/README.md) | Adds a V4 aggregate cross-surface work-integration primitive alongside Velocity. |
| Depth Repertoire | [../../contracts/depth/depth-repertoire.md](../../contracts/depth/depth-repertoire.md) | Hardens the aggregate surface-repertoire x repeat-use sub-contract; approved only as caveat/context, not an economic input. |
| Delegation Depth | [../../concepts/DELEGATION_DEPTH.md](../../concepts/DELEGATION_DEPTH.md) | Adds a V4 Depth subdimension for aggregate retrieval, transformation, and delegation surface mix. |
| AI Scale Readiness Portfolio | [../../concepts/AI_SCALE_READINESS_PORTFOLIO.md](../../concepts/AI_SCALE_READINESS_PORTFOLIO.md) and [../../contracts/value-confidence/scale-readiness-portfolio.md](../../contracts/value-confidence/scale-readiness-portfolio.md) | Defines aggregate action postures for scale, enablement, workflow redesign, trust calibration, adoption expansion, or hold. |
| Internal Scale Readiness Readout | [../../contracts/value-confidence/internal-scale-readiness-readout.md](../../contracts/value-confidence/internal-scale-readiness-readout.md) | Hardens the docs-only internal record shape promoted by the V4 canonical contract decision. |
| Organizational Segmentation | [../../concepts/ORG_SEGMENTATION.md](../../concepts/ORG_SEGMENTATION.md) | Defines aggregate-only cohort context for intervention planning, with HR and directory joins kept inside the customer or Glean boundary. |
| Economic Impact Bridge | [../../concepts/ECONOMIC_IMPACT_BRIDGE.md](../../concepts/ECONOMIC_IMPACT_BRIDGE.md) | Maps readiness patterns to customer-owned value investigations without calculating ROI or proving causality. |
| Work Mode Taxonomy | [../../concepts/WORK_MODES.md](../../concepts/WORK_MODES.md) | Maps governed surfaces into durable AI work patterns and evidence roles for taxonomy-aware calibration. |

## How To Read The Set

Quality Multiplier answers whether the time-saved estimate should be adjusted
for observed workflow quality. Causal Delta answers whether the aggregate
pattern moved after a known change. Reliability Factor answers whether the
surfaced signal is dependable enough to use carefully. Outcome Evidence stores
external aggregate metrics beside verdicts without computing correlation,
causation, or dollarized ROI.

Together, they let AIOMs, value-realization PMs, and CIOs separate raw usage or
time saved from defensible value realization. Velocity Index adds a governed V2
behavioral-distribution layer for teams that need adoption depth context without
person-level reporting.

AI Work Evidence is the source-neutral layer that keeps those primitives from
becoming Glean-only. Glean dogfood and Value Evidence artifacts are adapter
examples; future source adapters should map their local telemetry, source
coverage, and claim language into the same aggregate core without inheriting
Glean-specific ontology as universal product behavior.
The pilot package turns that layer into docs-only intake templates, synthetic
readout examples, and live-readiness stop conditions.

V4 does not replace existing V3 ingest or value-realization primitives. It
composes them into executive economic decision artifacts: Time-Saved
Defensibility Range, AI Value Leakage Map, AI Scale Readiness Portfolio, and
Trust Calibration Index. V4 remains aggregate-only, caveated, and fail-closed.

## Conceptual Stack

1. AI Work Evidence defines source-neutral surfaces, workflows, approved
   cohorts, interventions, source coverage, trust evidence, outcome evidence,
   and value hypotheses.
2. V3 aggregate verdicts establish whether evidence may surface and, on
   `SURFACE`, may forward the governed aggregate distribution to downstream
   consumers for re-checking.
3. Velocity measures adoption energy.
4. Depth measures cross-surface work integration through surface repertoire and
   repeated meaningful use, then qualifies interpretation with
   higher-confidence signals.
5. Delegation Depth refines Depth as a research-promoted concept for aggregate
   retrieval, transformation, and delegation surface mix.
6. Work Mode Taxonomy maps governed surfaces into AI work patterns so taxonomy-aware calibration can compare like with like.
7. Quality Multiplier and Reliability Factor qualify evidence quality and
   dependability. Quality Multiplier can consume a V3
   `forwarded_distribution` after re-checking aggregate gates and tagging the
   result as `QUALITY_PREMIUM` / `CALIBRATED`.
8. Outcome Evidence may add customer-attested aggregate context without proving causality.
9. V4 Value Confidence composes those inputs into bounded executive readouts.

## Research-Only Signal Discovery

The V4 signal discovery probe pack is research-only and does not change
production V4 behavior. Candidate behavioral signals must pass the methodology
gate in [Signal Promotion Criteria](../../research/SIGNAL_PROMOTION_CRITERIA.md)
before they can become concept docs, contracts, schemas, APIs, or implementation
work.

- [Signal Promotion Criteria](../../research/SIGNAL_PROMOTION_CRITERIA.md)
- [V4 Signal Discovery Probes](../../research/V4_SIGNAL_DISCOVERY_PROBES.md)
- [Depth Repertoire Diagnostic](../../../sql/dogfood/depth_repertoire_diagnostic.sql)
- [V4 Depth Repertoire Stability Readout](../../research/V4_DEPTH_REPERTOIRE_STABILITY_READOUT.md)
- [V4 Depth Repertoire Value Confidence Review](../../research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_REVIEW.md)
- [V4 Depth Repertoire Value Confidence Calibration Plan](../../research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_PLAN.md)
- [V4 Depth Repertoire Value Confidence Calibration Decision](../../research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md)
- [V4 Value Confidence Caveat Propagation Runbook](../../research/V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md)
- [V4 TSDR Caveat Propagation Decision](../../research/V4_TSDR_CAVEAT_PROPAGATION_DECISION.md)
- [V4 AI Value Leakage Map Caveat Propagation Decision](../../research/V4_VALUE_LEAKAGE_CAVEAT_PROPAGATION_DECISION.md)
- [V4 Signal Validation Gate](../../research/V4_SIGNAL_VALIDATION_GATE.md)
- [V4 Signal Validation Runbook](../../research/V4_SIGNAL_VALIDATION_RUNBOOK.md)
- [V4 Signal Validation Readout Template](../../research/V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md)

## V4 Signal Validation Status

V4 signal validation is dogfood-only. It is a governance step before any
candidate signal can feed a productized V4 API, schema, contract, or
customer-facing readout.

Promoted signals may later feed V4 Value Confidence after a separate
productization PR and governance review. Held signals remain research-only.
Rejected signals must not be used in product readouts unless governance reopens
them.

## V4 Depth Readout Status

The V4 Depth Readout Engine is dogfood-only. It can compose aggregate Velocity,
Delegation Depth, and refinement diagnostics into local candidate zones for
research review, but it does not change production V4 behavior.

- [V4 Depth Readout Runbook](../../research/V4_DEPTH_READOUT_RUNBOOK.md)
- [V4 Depth Stability Decision](../../research/V4_DEPTH_STABILITY_DECISION.md)
- [V4 Depth Repertoire Stability Readout](../../research/V4_DEPTH_REPERTOIRE_STABILITY_READOUT.md)

Reusable Workflow Propagation and Named Workflow Leverage remain `HOLD` pending
metadata observability. V4 economic readouts remain blocked until Depth readout
stability is demonstrated across windows or cohorts and the stability decision
promotes contract hardening.

Depth Repertoire is promoted for contract hardening only. The value-confidence
calibration decision records `PROMOTE_CAVEAT_ONLY`, so it may appear only as
aggregate caveat/context in V4 value-confidence artifacts. It must not modify
confidence bands, surfacing eligibility, Time-Saved Defensibility Range, ROI
language, causal claims, prediction claims, or any customer-facing economic
number. Internal Glean dogfood values are research observations only and must
not be used as customer benchmarks, production defaults, product thresholds, or
V4 economic inputs.

Before any V4 artifact moves beyond caveat-only use, it must pass the
[V4 Value Confidence Caveat Propagation Runbook](../../research/V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md).
Passing caveat propagation does not authorize economic dependency; it only
proves that caveats travel without becoming hidden behavior.

The [V4 TSDR Caveat Propagation Decision](../../research/V4_TSDR_CAVEAT_PROPAGATION_DECISION.md)
records `PASS_CAVEAT_PROPAGATION` for caveat/context behavior. That pass keeps
TSDR in documentation-stage contract hardening only; it does not authorize
runtime implementation, schemas, endpoints, range adjustment, confidence-band
adjustment, surfacing eligibility changes, or Depth Repertoire as an economic
dependency.

The [V4 AI Value Leakage Map Caveat Propagation Decision](../../research/V4_VALUE_LEAKAGE_CAVEAT_PROPAGATION_DECISION.md)
records `PASS_CAVEAT_PROPAGATION` for caveat/context behavior. That pass keeps
the leakage map in documentation-stage contract hardening only; it does not
authorize runtime implementation, schemas, endpoints, leakage severity
adjustment, value-at-risk adjustment, surfacing eligibility changes, or Depth
Repertoire as an economic dependency.

## V4 Scale Readiness To Economic Value Status

The current V4 dogfood phase is closed for internal readout scope. The promoted
boundary is internal AI Scale Readiness readout shape with Depth Repertoire
context and Economic Impact Bridge investigation-routing language only:

- [AI Scale Readiness Portfolio](../../concepts/AI_SCALE_READINESS_PORTFOLIO.md)
- [Organizational Segmentation](../../concepts/ORG_SEGMENTATION.md)
- [Economic Impact Bridge](../../concepts/ECONOMIC_IMPACT_BRIDGE.md)
- [V4 Scale Readiness caveat propagation decision](../../research/V4_SCALE_READINESS_CAVEAT_PROPAGATION_DECISION.md)
- [V4 Trust Calibration caveat propagation decision](../../research/V4_TRUST_CALIBRATION_CAVEAT_PROPAGATION_DECISION.md)
- [V4 Glean dogfood scale readiness readout](../../research/V4_GLEAN_DOGFOOD_SCALE_READINESS_READOUT.md)
- [V4 full dogfood rehearsal readout](../../research/V4_FULL_DOGFOOD_REHEARSAL_READOUT.md)
- [V4 behavior cohort classification readout](../../research/V4_BEHAVIOR_COHORT_CLASSIFICATION_READOUT.md)
- [V4 data analysis closeout](../../research/V4_DATA_ANALYSIS_CLOSEOUT.md)
- [V4 Glean dogfood decision](../../research/V4_GLEAN_DOGFOOD_DECISION.md)
- [V4 closeout decision](../../research/V4_CLOSEOUT_DECISION.md)
- [V4 canonical contract decision](../../research/V4_CANONICAL_CONTRACT_DECISION.md)
- [Internal Scale Readiness Readout contract](../../contracts/value-confidence/internal-scale-readiness-readout.md)
- [V4 internal readout runbook](../../research/V4_INTERNAL_READOUT_RUNBOOK.md)
- [V4 internal readout rehearsal](../../research/V4_INTERNAL_READOUT_REHEARSAL.md)
- [V4 Trust Attribution method](../../research/V4_TRUST_ATTRIBUTION_METHOD.md)
- [V4 Trust Attribution test readout](../../research/V4_TRUST_ATTRIBUTION_TEST_READOUT.md)
- [V4 Trust and Cohort classification plan](../../research/V4_TRUST_AND_COHORT_CLASSIFICATION_PLAN.md)

Current decision: `PROMOTE_INTERNAL_SCALE_READINESS_READOUT`.

Canonical contract closeout promotes internal readout contract hardening only.
It does not authorize economic APIs, Time-Saved Defensibility Range output,
ROI, productivity claims, causal claims, prediction, or ranking unless a later
decision promotes that exact scope.

Trust Calibration, Reusable Leverage, Skill Read Evidence as a governed signal,
customer-facing economic output, APIs, frontend surfaces, Time-Saved
Defensibility Range productization, Organizational Segmentation runtime support,
and Economic Impact Bridge runtime support remain held or blocked until a later
decision promotes the exact scope.

## Running Multi-Surface Dogfood

1. Export BigQuery surface aggregates to CSV with the columns shown in [`examples/dogfood/example_multi_surface_input.csv`](../../../examples/dogfood/example_multi_surface_input.csv).
2. Run `python3 scripts/dogfood/run_multi_surface.py --input <csv>`.
3. Open `dogfood-output/READOUT.md`.
4. Review per-surface `SURFACE` / `SUPPRESS`, AIVM tags, Reliability Factor, and Quality Multiplier.
5. Use the weighted headline as a read-only summary; each surface is evaluated independently first.

## Running Velocity-Aware Dogfood

1. Export taxonomy-aware velocity distributions with [`sql/dogfood/velocity_diagnostic.sql`](../../../sql/dogfood/velocity_diagnostic.sql).
2. Keep workflow surfaces as `workflow:<surface>` and standalone surfaces as `standalone:<surface>`.
3. Run `python3 scripts/dogfood/run_multi_surface.py --input <surface-csv> --velocity-input <velocity-csv>`.
   Set `BACKEND_URL=http://localhost:4000` when you want the driver to exercise the live V2 ingest, Velocity Index, and velocity-aware Quality Multiplier endpoints.
4. Review the overall velocity-adjusted Quality Multiplier and the workflow vs standalone category split.
5. Treat the velocity section as aggregate context only; each surface still clears or suppresses independently.

The CSV files are the current developer dogfood adapter. They should be replaced
by a direct aggregate feed when this moves toward real-time internal data, using
the same aggregate-only fields and suppression posture.

## Running Taxonomy-Aware QM/RF Calibration

Use [`sql/dogfood/taxonomy_qm_rf_diagnostic.sql`](../../../sql/dogfood/taxonomy_qm_rf_diagnostic.sql)
when the calibration question is whether Quality Multiplier and Reliability
Factor tell the same story after they adopt the same surface taxonomy as
Velocity and Depth.

The diagnostic emits aggregate rows only:

- governed `workflow_id`,
- `surface_category`,
- `work_mode`,
- `real_cohort_size`,
- `distinct_users`,
- completion, error, abandonment, recovery, verification, and latency fields,
- metric source notes indicating whether the row comes from workflow status or
  observed-event proxy logic.

Standalone surfaces are included so Search, Autocomplete, MCP, AI Summary, and
eligible Glean Bot Activity can be calibrated instead of appearing only as
Velocity context. The output is dogfood/research-only until a later calibration
decision promotes a specific use.

### Agent Sub-Surface Composition

When AGENT sub-surfaces are present, the consolidated readout includes:

```markdown
## AGENT sub-surface composition

Legacy AGENT derived cohort: 100
Legacy AGENT derived velocity-adjusted Quality Multiplier: 1.495

| sub-surface | runs | AGENT mix | velocity_adjusted_QM |
| --- | ---: | ---: | ---: |
| autonomous | 60 | 60% | 1.495 |
| workflow_named | 30 | 30% | 1.495 |
| ephemeral | 10 | 10% | 1.495 |
```

The three sub-surfaces are evaluated independently before the legacy AGENT
summary is derived.

## Complementary Stated-Evidence Layer

The AI Fluency Instrument remains useful as stated evidence: what people say
about their adoption, confidence, and practice. It should be paired with these
contracts when teams want to compare stated evidence with observed aggregate
workflow behavior. It is complementary to the value-realization evidence layer,
not the lead narrative for this repository.

# AI Value Controlled Pilot Evidence Package

Validator/runner: `scripts/run_ai_value_controlled_pilot_evidence_package.mjs`

Schema version: `FT_AI_VALUE_CONTROLLED_PILOT_EVIDENCE_PACKAGE_2026_06`

## Purpose

The Controlled Pilot Evidence Package is the executable wrapper over the saved
scrubbed aggregate fixture path.

It answers one productization question:

```text
Can the reviewed aggregate fixture flow through Controlled Aggregate Fixture
Review and Controlled Measurement Cell Assembly into compact promotion-review
evidence without adding persistence, live connectors, customer output, finance
claims, or model math?
```

It is not a new Measurement Cell model and it is not a persistence layer.

## Executed Flow

The runner composes existing gates:

```text
Saved scrubbed aggregate fixture
-> Controlled Aggregate Fixture Review
-> Controlled Measurement Cell Assembly
-> compact pilot evidence package
-> Measurement Cell snapshot promotion-review record
-> explicit Series persistence hold
```

The default run demonstrates a single governed milestone Measurement Cell flow
through the controlled fixture path.

The repeated run generates controlled milestone variants for:

```text
Day 0 / 30 / 60 / 90 / 180 / 365
```

It then routes the private Measurement Cell Assembly outputs through the
existing Measurement Cell Series contract and emits only compact continuity and
alignment evidence. Day 0 is required as the baseline anchor. A 30 / 60 / 90 /
180 / 365 package without Day 0 must remain held.

## Pass Decision

A passed package may emit:

```text
PILOT_PASSED_PROMOTION_REVIEW_READY
MEASUREMENT_CELL_SNAPSHOT_PROMOTION_REVIEW_READY
RECOMMEND_REVISIT_MEASUREMENT_CELL_PERSISTENCE_PROMOTION_DECISION
```

This means the fixture produced promotion-review evidence for a later separate
Measurement Cell persistence decision.

It does not mean:

- `PROMOTE_MEASUREMENT_CELL_SNAPSHOTS`
- Measurement Cell persistence ready
- customer product ready
- finance ready
- confidence model ready
- ROI ready

## Output Shape

The compact output may include:

- pilot id and fixture id;
- pilot decision;
- aggregate review state;
- Measurement Cell assembly state;
- Measurement Cell reference;
- source package count;
- selected metric id;
- selected expectation path id;
- reviewed source-ref hash;
- reviewed aggregate-context hash;
- reviewed Blueprint expectation hash;
- Measurement Cell snapshot promotion-review record;
- Series persistence boundary;
- repeated milestone status counts;
- observed and missing milestone days;
- compact Measurement Cell Assembly run refs;
- blocked uses;
- required caveats.

The output must not include:

- full Measurement Plan payloads;
- full Data Spine payloads;
- full Source Package Review Queue output;
- full source packages;
- full Operator Source Handoff bundles;
- full Measurement Cell payloads;
- Measurement Cell Series payloads;
- raw rows;
- query text or SQL text;
- prompts, responses, transcripts, or file contents;
- identifiers, row ids, span ids, or joinable person identifiers;
- ROI, EBITDA, finance-output, causality, productivity, probability,
  confidence, or score-like fields.

## Fail-Closed Decisions

The package maps failures to the controlled pilot runbook decisions:

| Decision | Meaning |
| --- | --- |
| `PILOT_PASSED_PROMOTION_REVIEW_READY` | The saved aggregate fixture passed review and Measurement Cell assembly; use as evidence for a later promotion decision. |
| `PILOT_HELD_FOR_SOURCE_ALIGNMENT` | Source refs, hashes, path binding, metrics, lags, approvals, or alignment drifted. |
| `PILOT_HELD_FOR_LEGACY_READOUT_ISOLATION` | Legacy output confusion must be isolated before promotion review. |
| `PILOT_HELD_FOR_SUPPRESSION_OR_MISSING_EVIDENCE` | Missing, held, suppressed, or unknown evidence remains visible. |
| `PILOT_REJECTED_FOR_BOUNDARY_LEAKAGE` | Unsafe raw, identifier, live connector, finance, confidence, probability, productivity, or customer-output leakage appeared. |

## Series Boundary

The package must always keep Series persistence held.

Single-window package:

```text
HOLD_FOR_REPEATED_MILESTONE_EVIDENCE
```

Repeated milestone package, when Day 0 / 30 / 60 / 90 / 180 / 365 validates:

```text
HOLD_SERIES_PERSISTENCE_FOR_SEPARATE_PROMOTION_DECISION
```

This means Series continuity and alignment evidence is available for internal
review. It still cannot promote durable `measurement_cell_series_snapshots`,
Evidence Continuity persistence, finance-context investigation, Bayesian
research planning, confidence research, exports, or customer-facing output.

Rolling 30-day windows remain operating context only and cannot satisfy
evidence continuity.

## Non-Authorization

This contract does not authorize:

- Prisma schemas or migrations;
- repositories;
- persistence writes;
- backend routes;
- frontend UI;
- output-file writes;
- live BigQuery, Sigma, Glean, or customer connector execution;
- Measurement Cell snapshots;
- Measurement Cell Series snapshots;
- Evidence Continuity snapshots;
- customer-facing readouts or exports;
- confidence math;
- probability output;
- ROI, EBITDA, causality, productivity, financial attribution, or
  customer-facing financial output.

## Validation

Run:

```bash
npm run test:ai-value-controlled-pilot-evidence-package
```

Executable sample:

```bash
npm run run:ai-value-controlled-pilot-evidence-package
npm run run:ai-value-controlled-repeated-pilot-evidence-package
```

Recommended adjacent checks:

```bash
npm run test:ai-value-controlled-aggregate-fixture-review
npm run test:ai-value-controlled-measurement-cell-assembly
npm run test:ai-value-measurement-cell-series
```

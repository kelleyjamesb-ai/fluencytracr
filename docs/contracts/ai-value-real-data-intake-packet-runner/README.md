# AI Value Real Data Intake Packet Runner Contract

Schema version: `FT_AI_VALUE_REAL_DATA_INTAKE_PACKET_RUN_2026_06`

Validator: `shared/src/aiValueEngine/realDataIntakePacketRunner.ts`

## Purpose

The Real Data Intake Packet Runner is the contract-only assembly boundary for
the next productization slice of Value Hypothesis Readiness.

It accepts already-parsed, aggregate-safe, source-bound inputs and checks
whether they can move into the governed evidence spine:

```text
Data Spine Readiness
-> Pilot Intake Runner
-> Evidence Collection Assembly
-> draft Evidence Snapshot
-> non-persisted Claim Readiness Handoff
-> Measurement Cell preparation
-> Measurement Cell Assembly Runner
```

It exists to move the product beyond synthetic-only fixtures without pretending
that live document parsing, BigQuery querying, persistence, backend routes, or
UI upload flows are productized.

## Supported Source Path

The runner composes these existing architecture pieces:

- Data Spine Readiness for source alignment across Blueprint, AI Fluency,
  VBD/token, customer metric, assumption, and governance lanes.
- Measurement Plan validation for the selected workflow, function, metric, and
  windows.
- Scrubbed Glean Client Export conversion for aggregate source summaries.
- Pilot Intake Runner output for evidence collection and handoff preparation.

The runner may prepare Measurement Cell assembly only when the Data Spine is
aligned, approved, clear, aggregate-only, and not held. The downstream
Measurement Cell Assembly Runner must still bind the output back to the same
Measurement Plan, Data Spine, source refs, and selected customer metric before
packet preparation.

## Representable In Contract Today

Representable in the shared engine today:

- parsed Blueprint objects can be validated after an upstream parser produces
  structured aggregate-safe output;
- aggregate AI Fluency dashboard exports can be represented through the
  AI Fluency intake bridge and Data Spine source lane;
- scrubbed Glean/BigQuery VBD and token context can enter as aggregate export
  summaries;
- customer metrics can enter as aggregate export metadata or manual aggregate
  entries after owner approval;
- Measurement Cell and Value Hypothesis Readiness packet gates are deterministic
  and fail closed.

The `examples/` directory includes adversarial rehearsal fixtures for messy
client-like intake gaps. They are expectation specs for validator tests, not
customer evidence and not finance-ready examples.

Not productized in this runner:

- PDF, PPT, DOC, Google Slides, Google Docs, or spreadsheet parsing;
- live BigQuery query execution;
- raw customer export parsing;
- backend routes, persistence, schemas, migrations, or UI.

## Inputs

Required inputs:

- `dataSpineReadiness`
- `measurementPlan`
- `scrubbedGleanExports`

Optional inputs:

- `runId`
- `generatedAt`

All inputs must be aggregate-safe structured objects. The runner does not store
or retain raw rows, prompts, responses, transcripts, query text, SQL text, file
contents, user identifiers, employee identifiers, or person-level metrics.

## Decisions

- `READY_FOR_MEASUREMENT_CELL_ASSEMBLY`: source spine, plan, exports, evidence
  assembly, draft snapshot, and handoff are valid enough to prepare a
  Measurement Cell.
- `HELD_FOR_DATA_SPINE`: at least one source lane is missing, pending approval,
  held, suppressed, or not aligned, so the runner does not assemble evidence.
- `HELD_FOR_EVIDENCE_INPUTS`: the source spine is ready but one or more scrubbed
  exports cannot safely produce the downstream evidence objects.
- `BLOCKED`: the Data Spine, Measurement Plan, or binding keys are invalid or
  misaligned.

Held packets can be structurally valid while still refusing to feed the next
stage. Blocked or misaligned packets fail validation.

## Hard Boundaries

The runner does not:

- parse uploaded Blueprint documents;
- import AI Fluency dashboard rows by itself;
- run BigQuery;
- store raw source data;
- persist objects;
- create migrations or Prisma schemas;
- create backend routes;
- create frontend UI;
- create ingestion jobs;
- prepare a Value Hypothesis Readiness packet directly;
- produce customer-facing financial output.

The runner must never emit ROI proof, EBITA or EBITDA claims, financial
attribution, causality claims, productivity claims, headcount reduction claims,
individual attribution, manager/team ranking, people decisioning, confidence
percentages, probability outputs, or customer-facing prediction.

## Finance Context Boundary

A valid `READY_FOR_MEASUREMENT_CELL_ASSEMBLY` run is still not
finance-context investigation readiness. Finance-context readiness requires a
separate validated Measurement Cell and the downstream Value Hypothesis
Readiness packet gate.

This runner is an evidence intake and alignment bridge. It is not ROI proof, a
confidence model, financial attribution, or customer-facing economic output.

## Validation

Run:

```bash
npm run test:ai-value-real-data-intake-packet-runner
```

Recommended adjacent checks:

```bash
npm run test:ai-value-data-spine-readiness
npm run test:ai-value-pilot-intake-runner
npm run test:ai-value-measurement-cell
npm run test:ai-value-value-hypothesis-readiness-packet-runner
```

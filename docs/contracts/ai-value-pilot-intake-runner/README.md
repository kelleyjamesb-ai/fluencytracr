# AI Value Pilot Intake Runner Contract

## Purpose

The AI Value Pilot Intake Runner is a deterministic, non-persisted bridge from
customer-approved scrubbed Glean aggregate export summaries into the internal
AI Value evidence chain.

It exists to test whether a pilot packet can move through:

1. Scrubbed Glean client export conversion.
2. Client Evidence Entry and Source Package normalization.
3. Evidence Collection Assembly.
4. Draft Evidence Snapshot validation.
5. Non-persisted Claim Readiness Handoff validation.

## Inputs

The runner accepts only:

- a validated AI Value Measurement Plan
- an array of scrubbed aggregate Glean client export summaries
- optional IDs for the intake run, assembly, draft Evidence Snapshot, handoff,
  and generated timestamp

The scrubbed export summaries must remain aggregate-only and must not contain raw
rows, prompts, responses, transcripts, query text, file contents, direct
identifiers, hashed or joinable person identifiers, person-level productivity,
HRIS records, comparative manager/team outputs, people decisioning, ROI, EBITA,
causality, or customer-facing financial output.

## Outputs

A valid run may include:

- conversion results
- normalized Client Evidence Entries
- normalized Source Packages
- a non-persisted Evidence Collection Assembly
- a draft Evidence Snapshot input
- a non-persisted Claim Readiness Handoff

The runner carries source references only. It does not store raw rows or raw
source content.

## Hard Boundaries

The runner does not:

- persist snapshots or handoffs
- create migrations
- create Prisma schema changes
- create backend routes
- create frontend UI
- create ingestion jobs
- create Claim Readiness Snapshots
- create Executive Readout Snapshots
- create reportability readiness output
- create customer-facing financial or economic output
- compute ROI, EBITA, productivity, causality, headcount reduction, attribution,
  comparative manager/team outputs, or people decisioning outputs

Full Playbook evidence may allow the downstream Claim Readiness Handoff to mark
internal ROI scenario review as eligible, but this runner does not build,
persist, expose, or customer-face an ROI scenario.

## Fail-Closed Rules

The runner fails before assembly or handoff when:

- the Measurement Plan is invalid
- any scrubbed export conversion is invalid
- any conversion does not produce a Source Package for evidence collection
- duplicate Source Package types are provided
- source package org, window, or aggregate grain conflicts with the plan
- unsupported downstream fields are supplied to the runner input
- unsafe privacy, raw content, identifier, workforce, suppression, or financial
  flags are present

Layer 1 telemetry, BigQuery source availability, VBD context, and aggregate
workforce context cannot upgrade Playbook coverage by themselves. Missing Layer
2, Layer 3, governance, and assumption evidence must remain explicit as caveats.

## Validation

Run:

```bash
npm run test:ai-value-pilot-intake-runner
```

Related checks:

```bash
npm run test:ai-value-scrubbed-glean-export-converter
npm run test:ai-value-evidence-collection-assembler
npm run test:ai-value-claim-readiness-handoff
```

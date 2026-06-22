# Assumption / Governance Operator Source Handoff

Schema version: `FT_AI_VALUE_ASSUMPTION_GOVERNANCE_OPERATOR_SOURCE_HANDOFF_2026_06`

Validator: `shared/src/aiValueEngine/assumptionGovernanceOperatorSourceHandoff.ts`

## Purpose

The Assumption / Governance Operator Source Handoff normalizes approved
aggregate assumption or governance source posture into the existing Operator
Intake Adapter source shape.

It prepares:

- `operator_source` for either the Data Spine `assumption` lane or
  `governance` lane;
- `assumption_context` or `governance_context` as internal source-review
  context only; and
- `source_package_reference` for package alignment.

## Flow

```text
Approved aggregate assumption or governance source posture
-> Assumption / Governance Operator Source Handoff
-> Operator Intake Adapter
-> Source Package Review Queue
-> Measurement Cell Assembly
```

## Source Package Reference

`source_package_reference` is an alignment hint only. It does not certify
Source Package Review Queue clearance, source review clearance, evidence
feedability, Measurement Cell readiness, finance-context readiness, confidence
model readiness, or customer-facing readiness.

| Lane | Source Package type | Reference key |
| --- | --- | --- |
| `assumption` | `assumption_approval_export` | `assumption_approval_export_id` |
| `governance` | `governance_control_export` | `governance_control_export_id` |

Only Source Package Review Queue can determine whether the matching Source
Package is valid, feedable, aligned, and clear for the lane.

## Feed Rules

The handoff can be `READY_FOR_OPERATOR_INTAKE` only when the lane source is:

- present;
- owner-role tagged;
- owner-approved;
- clear;
- aggregate-only;
- source-bound; and
- aligned to the same org, client, workflow, function, cohort, and windows.

Held, submitted, rejected, suppressed, missing, unapproved, not-clear, unsafe,
or non-aggregate source posture remains non-feedable. Held or blocked handoffs
may be structurally valid, but all feeds remain false and consumers must check
`decision` plus `feeds`, not `valid` alone.

## Boundaries

Assumption handoff means assumption context is owner-reviewed for internal
evidence review only. It is not ROI approval, finance approval, confidence
approval, formula approval, or economic-output approval.

Governance handoff means governance evidence is available and source-bound. It
cannot override suppression, privacy boundaries, Data Spine, Source Package
Review Queue, Measurement Cell Assembly, Value Hypothesis Readiness, or future
confidence-model gates.

The handoff does not:

- run BigQuery or Glean queries;
- parse uploaded files;
- ingest raw rows, query text, prompts, responses, transcripts, or file
  contents;
- persist data;
- create migrations, Prisma schemas, backend routes, frontend UI, or ingestion
  jobs;
- certify Source Package Review Queue clearance;
- feed Measurement Cell directly;
- feed finance-context investigation;
- feed confidence modeling;
- calculate ROI, EBITA, EBITDA, causality, productivity, financial
  attribution, confidence percentages, or probabilities;
- create customer-facing financial output; or
- include individual, manager, team, department, or person-level data.

## Validation

Run:

```bash
npm run test:ai-value-assumption-governance-operator-source-handoff
```

Recommended adjacent checks:

```bash
npm run test:ai-value-source-package-review-queue
npm run test:ai-value-operator-intake-adapter
npm run test:ai-value-measurement-cell-assembly-runner
```

# AI Value Hypothesis Readiness Packet Runner

## Purpose

The Value Hypothesis Readiness Packet Runner assembles one internal packet from
validated planning and evidence objects. It wraps the governed Value Hypothesis
Readiness builder and adds review labels, missing evidence, source refs,
caveats, blocked claims, blocked uses, and next actions.

It is not a formula engine, confidence model, finance-readiness runtime, UI,
route, persistence path, schema, customer-facing readout, ROI calculator,
causality engine, productivity system, or financial-output generator.

## Inputs

The runner accepts only:

- a validated Measurement Plan,
- a validated Claim Readiness Snapshot,
- optional selected metric movement context,
- optional ROI Bot context as scenario context only,
- optional packet ids and timestamps.

Selected metric movement must align to the measurement plan metric, source ref,
and baseline/comparison windows. ROI Bot context cannot upgrade readiness by
itself.

## Optional Measurement Cell Alignment Gate

Measurement Cell alignment is optional. When a Measurement Cell is provided, the
runner applies it as a fail-closed alignment gate before deriving selected metric
movement. The runner may derive selected metric movement only when the cell is
valid, aligned to the selected Measurement Plan metric and windows, and is not
held or suppressed.

Held, suppressed, invalid, or misaligned cells do not upgrade readiness or fill
evidence gaps. They are recorded as missing evidence for the selected metric
movement lane.

## Review Labels

The packet may use these internal labels:

- `Glean review`
- `Business-owner review`
- `Finance-context review`
- `Retest decision`
- `Hold`

`Glean review` means internal evidence review. It does not mean Glean approved
an economic claim. The packet rejects `AIOM review`, `Glean-approved`,
`Glean-validated`, `finance-approved`, `customer-ready`, and similar language.

## Outputs

The packet carries:

- `readiness`,
- `readiness_state`,
- `contribution_evidence_tier`,
- `missing_evidence`,
- `allowed_next_actions`,
- `required_caveats`,
- `blocked_claims`,
- `blocked_uses`,
- `review_boundaries`,
- `source_refs`,
- `source_provenance`,
- false persistence and runtime flags.

`customer_facing_output_allowed`, `financial_output_allowed`,
`roi_proof_allowed`, `causality_claim_allowed`, `productivity_claim_allowed`,
`ebita_claim_allowed`, and ranking flags must remain false.

## Explicitly Blocked

The runner rejects:

- confidence percentages,
- AI contribution confidence,
- attribution probability,
- ROI values,
- EBITA or EBITDA impact values,
- dollarized values,
- hours saved,
- productivity lift,
- causal effect,
- formulas, weights, coefficients, thresholds, or new suppression reasons,
- raw prompts, outputs, transcripts, query text, SQL text, files, raw rows,
- user ids, employee ids, emails, HRIS records, hashed or joinable identifiers,
- manager, team, or person-level ranking fields,
- persistence, routes, frontend UI, schemas, migrations, or ingestion jobs.

## Validation

Run:

```bash
npm run test:ai-value-value-hypothesis-readiness-packet-runner
```

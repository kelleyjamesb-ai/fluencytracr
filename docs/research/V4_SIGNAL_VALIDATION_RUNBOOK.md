# V4 Signal Validation Runbook

## Purpose

This runbook describes how to execute a dogfood validation pass for V4 candidate
signals before any productization work begins.

Use it with:

- [V4_SIGNAL_VALIDATION_GATE.md](./V4_SIGNAL_VALIDATION_GATE.md)
- [V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md](./V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md)
- [SIGNAL_PROMOTION_CRITERIA.md](./SIGNAL_PROMOTION_CRITERIA.md)
- [V4_SIGNAL_DISCOVERY_PROBES.md](./V4_SIGNAL_DISCOVERY_PROBES.md)

## Scope

This is dogfood validation only. It does not create product APIs, schemas,
contracts, customer-facing readouts, SQL, scripts, tests, migrations, or
frontend surfaces.

## Candidate Signals

Validate only the current V4 candidates:

- Depth,
- Delegation Depth,
- Reusable Workflow Propagation,
- Rapid Refinement,
- Velocity x Depth Zone.

New candidates require an updated research plan before they enter this runbook.

## Inputs

Before starting, identify:

- candidate signal,
- source query or diagnostic output,
- source table or export,
- cohort definition,
- fixed windows or comparable cohorts,
- eligible surfaces,
- known taxonomy exclusions,
- value-realization decision the signal might support.

Do not include raw prompts, raw outputs, transcripts, person-level rows, direct
identifiers, or raw event extracts in the readout artifact.

## Step 1: Confirm Governance Eligibility

Confirm the candidate does not require:

- new canonical events,
- new suppression reasons,
- tunable thresholds,
- admin overrides,
- person-level output,
- team or manager comparisons,
- productivity measurement,
- ROI calculation,
- causal proof,
- prediction output.

If any item is required, stop and mark the candidate `REJECT` or send it back to
governance before analysis.

## Step 2: Select Comparable Windows Or Cohorts

Choose multiple comparable windows or cohorts.

One 60-day diagnostic window is insufficient for product promotion. Use at
least three fixed windows or comparable cohorts unless the run is explicitly
marked exploratory and cannot result in `PROMOTE`.

Record:

- window start and end dates,
- cohort definition,
- table or export source,
- taxonomy version,
- known instrumentation changes.

## Step 3: Run Existing Diagnostics

Use existing dogfood diagnostics or already-approved analysis outputs. This
runbook does not add new SQL or scripts.

For candidate signals from the discovery pack, run the relevant existing probe
against each fixed window or cohort and preserve aggregate outputs only.

## Step 4: Check Distribution Shape

Document aggregate shape:

- p50,
- p90,
- p99,
- spread ratios where useful,
- share metrics where useful,
- surfaced/suppressed counts,
- notable surface or workflow-family variance.

State what the distribution can and cannot prove. Heavy-tail variance is
evidence of possible signal, not proof of signal.

## Step 5: Check Multi-Window Stability

Compare shape and interpretation across windows or cohorts.

Classify stability as:

- `stable`,
- `directionally_stable`,
- `unstable`,
- `inconclusive`.

Document whether changes appear behavioral, taxonomic, instrumentation-driven,
or unexplained.

## Step 6: Check Coverage

Document coverage:

- cohort size,
- eligible event counts,
- included surfaces,
- excluded surfaces,
- unmapped surfaces,
- ambiguous attribution,
- suppressed windows or slices.

Coverage gaps should usually produce `HOLD`, not promotion.

## Step 7: Check Relationship To Velocity

State whether the candidate is independent of, complementary to, dependent on,
or confounded by Velocity.

Keep Velocity dimensions separate:

- frequency,
- engagement,
- breadth.

Do not collapse Velocity and the candidate into a score.

## Step 8: Check Value-Realization Relationship

Name the specific decision the candidate supports. Examples:

- scale,
- harvest,
- coach,
- redesign,
- govern,
- suppress,
- mapping improvement,
- transformer enhancement.

State whether the candidate can inform Quality Multiplier, Reliability Factor,
Causal Delta, Outcome Evidence interpretation, Time-Saved Defensibility Range,
AI Value Leakage Map, AI Scale Readiness Portfolio, or Trust Calibration Index.

## Step 9: Complete Safety Review

Confirm the candidate remains:

- aggregate-only,
- fail-closed,
- taxonomy-aligned,
- non-causal by default,
- non-predictive unless separately validated,
- free of ranking, scoring, productivity, ROI, and employee-evaluation claims.

If safety review fails, mark `REJECT`.

## Step 10: Decide Outcome

Use one outcome:

- `PROMOTE`: eligible for later productization, not automatically productized.
- `HOLD`: research-only.
- `REJECT`: must not be used in product readouts unless governance reopens it.

Do not choose `PROMOTE` when any required evidence is missing.

## Step 11: Write The Readout Artifact

Complete
[V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md](./V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md).

The readout is the durable artifact. Do not rely on chat-only conclusions.

## Completion Checklist

- [ ] Multiple comparable windows or cohorts documented.
- [ ] Distribution shape documented.
- [ ] Multi-window stability classified.
- [ ] Coverage documented.
- [ ] Velocity relationship documented.
- [ ] Value-realization relationship documented.
- [ ] Governance safety review completed.
- [ ] Decision outcome selected.
- [ ] Readout artifact written.
- [ ] No product code, schema, API, SQL, migration, test, or frontend surface added.

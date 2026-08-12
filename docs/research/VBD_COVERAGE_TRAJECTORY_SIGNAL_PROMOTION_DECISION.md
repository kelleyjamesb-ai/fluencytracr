# VBD Coverage Trajectory Signal Promotion Decision

Decision date: `2026-08-12`

Decision: `PROMOTE_TO_CONCEPT_DOC`

Promotion scope: `DOCS_ONLY_DERIVED_AGGREGATE_RATIOS`

Authority effect: `NONE`

## Candidate Signals

This decision reviews only these deterministic family-funnel ratios:

- Adoption Reach: `Active / Eligible`;
- Persistence: `Embedded / Active`; and
- Embedded Adoption Coverage: `Embedded / Eligible`, algebraically equal to
  Adoption Reach multiplied by Persistence before rounding when `Active > 0`.

Net Coverage Velocity is an adjacent, actual-day-normalized change in Coverage,
not an additional independent behavioral signal.

## Six-Criterion Decision

| Criterion | Evidence | Decision |
| --- | --- | --- |
| Behavioral face validity | Eligible, Active, and Embedded are prospectively governed aggregate family states. The ratios describe appearance and recurrence without inferring intent, skill, maturity, productivity, or value. | `PASS` |
| Alignment with governed taxonomy | The ratios are derived from the approved family-state records and add no canonical event, suppression reason, threshold, or ambiguous Breadth/Depth meaning. | `PASS` |
| Meaningful distribution variance | The deterministic synthetic fixture design spans primary, behavior-pathway-null, omitted-confounder, and high-capability-error cells across fixed panels and checkpoints, exercising distinct aggregate family-state trajectories. This supports methodology-shape review only, not empirical customer prevalence. | `PASS_DOCS_ONLY` |
| Stability across windows or cohorts | The definitions are invariant across the fixed 18-checkpoint panel design, stable Eligible universes, exact recurrence windows, deterministic regeneration, and component-keyed replicated seeds. Incomparable source, registry, cadence, or policy revisions break the path rather than being normalized. | `PASS_DOCS_ONLY` |
| Support for a specific executive or product decision | Adoption Reach distinguishes whether expected work appears; Persistence distinguishes whether appeared work recurs. Together they support a bounded decision between adoption expansion and recurrence/workflow-design investigation. | `PASS` |
| Aggregate-safe surfacing without misuse | Inputs and outputs are aggregate family counts and ratios. Independent slice gates, minimum cohort rules, stable family allocation, and prohibited ranking/individual attribution remain mandatory. | `PASS` |

## Promotion Decision

Promote Adoption Reach, Persistence, Embedded Adoption Coverage, and their
exact arithmetic definitions to the docs-only VBD Coverage Trajectory concept.
The promotion covers terminology and methodology shape only.

It does not promote a runtime signal, schema, API, endpoint, UI, customer
output, confidence claim, causal claim, productivity claim, ROI, prediction,
ranking, real-data admission, or Bayesian model result. The replicated V4 study
has not run, and the model decision remains `HOLD_FOR_MODEL_REPAIR`.

`Eligible > 0` is required before computing Adoption Reach or Coverage.
`Active > 0` is required before computing Persistence. Undefined ratios remain
unavailable and must not be coerced to zero.

## Evidence Boundary

The repository contains deterministic synthetic generators, preparation,
full-model bridge tests, and sampler-free V4 validation scaffolding. Those
artifacts test structural behavior and deterministic regeneration. They do not
establish empirical customer distributions, model recovery, calibration,
predictive superiority, or production readiness.

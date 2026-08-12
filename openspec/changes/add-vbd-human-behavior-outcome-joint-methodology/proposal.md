# Change: Add VBD Human-Behavior And Outcome Joint Methodology

## Why

FluencyTracr needs a defensible way to represent the human side of AI value.
The current repository can separately describe aggregate stated capability,
aggregate AI work evidence, and customer-owned outcome movement, but the newer
VBD Coverage Trajectory has no approved method for entering a joint outcome
analysis. The existing frequency, engagement, and Breadth Bayesian trajectory
has a different estimand and cannot be relabeled for this purpose.

## Approval

James Kelley approved methodology steps 1 through 4 on 2026-08-11:

1. approve the methodology direction;
2. reconcile repository governance;
3. specify the aggregate data contract; and
4. design the joint Bayesian methodology.

This approval is documentation-only. It does not approve implementation,
model execution, evidence generation, schemas, APIs, UI, persistence, real
data, or customer output.

## What Changes

- Define VBD family-state evidence as the observed aggregate human-behavior
  pathway between stated capability and a customer-owned outcome.
- Keep stated capability, observed behavior, and outcome evidence separately
  measured while allowing a future joint model to propagate uncertainty.
- Define immutable aggregate checkpoint and transition records for Eligible,
  Active, Embedded, retained, newly embedded, lapsed, and remaining
  nonembedded family counts.
- Define the exact cross-lane alignment and pre-outcome freeze receipts.
- Define a future Bayesian family-state transition component, capability
  measurement component, and continuous-normal outcome component.
- Permit a predeclared, temporally ordered capability-to-behavior association
  inside the family-state component without treating it as causal.
- Define internal associative, moderation, and incremental predictive
  estimands without calling them causal impact or variance caused by AI.
- Preserve the legacy frequency, engagement, and Breadth Bayesian trajectory as
  versioned held research with a different likelihood and estimand.
- Record steps 5 through 8 as a separately proposed synthetic implementation,
  validation, and integration-decision sequence.

## Governance Reconciliation

- No new canonical event or suppression reason.
- No individual, manager, team, department, or function output.
- No cross-slice rescue, imputation of held evidence, or complementary
  differencing.
- Function drilldowns remain held.
- Depth Repertoire remains caveat or context only and cannot enter the model.
- Missing or misaligned evidence fails closed.
- Default interpretation is noncausal.
- No customer-facing probability, attribution confidence, productivity, ROI,
  economic output, or percent-impact statement.

## Relationship To Pending Changes

This change does not modify or complete
`add-vbd-trajectory-calibration-contract`. That change governs separate
frequency, engagement, and Breadth trajectory research and remains held for its
own numerical and evidence gates.

This change also does not modify or complete
`harden-hypothesis-metric-longitudinal-admission`. It reuses that change's
single-estimand, pre-outcome freeze, exact-slice, evidence-role, and claim-cap
principles. Current model eligibility remains limited to the proved synthetic
continuous-normal family.

The exact-slice and comparison privacy changes remain authoritative for their
own outcome-evidence admission boundaries. This proposal adds no runtime path
around them.

## Impact

- New docs-only capability:
  `vbd-human-behavior-outcome-joint-methodology`.
- Updated concept:
  `docs/concepts/VBD_COVERAGE_TRAJECTORY.md`.
- New contract:
  `docs/contracts/ai-value-vbd-human-behavior-outcome-joint-methodology/README.md`.
- Updated repository overview: `README.md`.
- Affected code: none.

## Not Authorized

- Aggregate runtime schemas or validators.
- Synthetic fixtures or data generation.
- Bayesian implementation, fitting, sampling, or posterior artifacts.
- Production or customer data.
- APIs, routes, services, persistence, exports, UI, or deployment.
- Causal, ROI, productivity, ranking, or customer-facing confidence claims.

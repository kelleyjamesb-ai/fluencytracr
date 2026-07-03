# Add Bayesian Inference Proof Harness (Methodology First)

## Why

The confidence-engine workspace (change `add-confidence-engine-workspace`,
merged via PR #391) is a validated lock: sixteen governed gates that all
hold by default around a statistical capability that has never been built.
The implemented math they guard is a placeholder — a closed-form
Normal-Normal update against an arbitrary `N(0,1)` prior, with all seven
required diagnostics recorded as `false` flags. An external methodology
review (2026-07-03) and the repo's own contracts agree on the gap: the
spine demands convergence diagnostics, posterior predictive checks, prior
sensitivity, pre-period trend checks, and calibration before any
interpretation, and none of them exist as computed values.

Enterprise context sharpens the need. Glean's time-saved pipeline covers
~87% of sessions but assigns only 30% credit to the ~64% of chat runs with
no quality signal — the single largest uncertainty in current value
claims. Customer skepticism is documented (Wiz pilot down-scoped on "ROI
measurement failure"; ~20% churn attributed mostly to weak perceived ROI),
and the internal Value Playbook already enforces an anti-overclaim
standard (telemetry over self-report; the METR 40-percentage-point
perception gap; a conservative 25% recapture assumption). Applied
Science's FY27Q2 roadmap explicitly wants causal inference to become "a
reusable team asset, not a bottlenecked skill." There is no PyMC/Stan/
NumPyro precedent anywhere in internal code — this is greenfield, with no
conflicting standard.

## What Changes

This change delivers the methodology and its proof, in two bounded slices
(separate PRs), before any real data or customer-facing output:

1. **Slice 1 — Inference methodology contract (this proposal's first
   deliverable).** A written, reviewable methodology specification and
   docs contract defining: the hierarchical Bayesian
   difference-in-differences model family and its estimand; the
   Python/TypeScript boundary (Python owns statistics, TypeScript owns
   governance; artifacts cross as JSON validated by the existing
   confidence-engine gates); the seven diagnostics as computed
   requirements with explicit numeric gates; the synthetic-first proof
   obligation; the comparison-cohort rule ("no credible comparison
   cohort, no causal number — evidence-tier label only"); milestone
   peeking control aligned to the internal A/B testing playbook;
   empirically justified weakly-informative priors with mandatory
   sensitivity reporting; aggregate-only floors; and claim language
   aligned to the Glean Value Playbook's telemetry-first,
   recapture-separated standard. No engine code in this slice.
2. **Slice 2 — Python proof harness (separate PR, after slice 1
   review).** A pinned Python inference environment (PyMC + ArviZ) and an
   internal-only proof harness that fits the specified hierarchical DiD on
   synthetic data with injected known effects, computes every diagnostic
   as a real value, verifies known-effect recovery and calibration
   coverage against the numeric gates, and emits artifacts shaped for and
   validated by the existing TypeScript confidence-engine gates. The
   harness never touches customer or production data.

The `ConfidenceModel` contract module gains internal-only representation
fields for threshold probability and expected loss (types + Zod only,
additive, `customer_output_authorized` pinned false); exposing any
probability language to customers remains blocked pending a separate
explicit human promotion decision.

## What Does Not Change

- The confidence-engine spine, its schema versions, hashes, golden chain,
  state tokens, and hold-by-default semantics are untouched. The
  placeholder Normal-Normal runtime remains byte-stable as the governed
  decision record; the harness is a parallel proof, not a replacement.
- No customer-facing output, no confidence percentages, no probability
  language, no ROI computation, no causality claims, no routes, UI,
  schemas, persistence, exports, or live connector execution.
- No real customer data enters the harness. Real-observation execution,
  Series snapshot persistence, and any output promotion are separate
  later changes behind their own gates.

## Impact

- Affected specs: `confidence-inference-methodology` (new capability).
- Affected code (slice 2 only): new `inference/` Python package with its
  own pinned environment; additive types in
  `packages/confidence-engine/src/confidenceModel.ts`; new statistical
  correctness tests (synthetic-effect recovery, calibration coverage) —
  a test class the repo currently lacks.
- Review audience (from enterprise research): methodology — Paul Li,
  Karthik Rajkumar, Onder Polat (Data Science / Applied Science); value
  governance — the Value Realization Pod (Varun Tilva, Brendan Reece,
  Ross Fasman, Logan Moore); interfaces — Justin Swadling (ROIbot),
  Miribel Wu (Agent ROI). Decision owner: James Kelley.

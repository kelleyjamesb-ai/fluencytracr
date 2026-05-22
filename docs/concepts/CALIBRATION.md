# Calibration Governance

## 1. Purpose

This document defines how calibration baselines are governed as a future V3 primitive for FluencyTracr. It establishes the governance model before any production recalibration workflow, customer-facing baseline selector, or automated update process exists. Calibration is load-bearing because Velocity Index outputs depend on reference populations: if the reference point can drift silently, the verdict can become a hidden tuning mechanism. V3 calibration may only advance if it preserves the nine invariants and the distinction between governed reference data and tunable thresholds.

## 2. The Calibration vs Threshold Distinction

Calibration baselines are versioned reference points. Thresholds are tunable knobs.

That distinction is critical. Invariant 3 prohibits tunable thresholds because an admin-adjustable threshold can change whether a cohort surfaces, suppresses, looks strong, or looks weak without changing the underlying evidence. A threshold is a decision boundary. If it can be moved casually, the governance posture collapses.

A calibration baseline is different. It is a named reference population used to interpret aggregate distributions. For Velocity, the current reference is the scio-prod 60-day baseline committed in `calibration/velocity_baselines.json`. Customer cohorts are compared to that reference so their frequency, engagement, and breadth can be expressed relative to an observed-fluency-saturated population.

Calibration updates are allowed only through deliberate governance. They are not admin overrides, not customer-specific tuning, and not a way to make a result more favorable. Updating calibration produces a new immutable version. It does not rewrite history and does not change prior verdicts silently.

This distinction is load-bearing: calibration is governed context; thresholds are prohibited knobs.

## 3. Versioning Model

Calibration baselines are immutable once shipped. A baseline has a stable `calibration_id`, such as `scio-prod-60d-2026-05`, and that identifier is attached to every output that uses it.

Updates produce a new baseline version. The old baseline remains available for historical replay and explanation. Customer cohorts are scored against a specific named version, not against "latest" by implication. If a customer report says it used `scio-prod-60d-2026-05`, that report must remain interpretable even after a future baseline is introduced.

The version record should preserve the source population, window length, snapshot date, distribution values, and rationale for use. It should also identify whether the baseline is global, industry-specific, maturity-specific, or experimental.

History is part of the contract. Calibration drift may be studied, but past verdicts are not retroactively reinterpreted without an explicit replay decision.

## 4. Update Process

Calibration updates should mirror the invariant-change seriousness in `AGENTS.md`.

A proposed update must include the candidate reference population, observation window, cohort size, surface coverage, distribution summary, reason for update, and expected impact on representative customer cohorts. It must also explain why the update is calibration governance rather than threshold tuning.

Review must include the repository owner and at least one governance reviewer familiar with the nine invariants. The review should check that the proposed baseline does not introduce individual scoring, bypass suppression gates, create customer-specific favorable treatment, or change canonical event or suppression sets.

Transition should be explicit. A new baseline can become the default for future reports only after the versioned artifact is committed, documented, reviewed, and covered by tests or harness fixtures. Existing outputs keep their original `calibration_id`. Replays must state both the old and new baseline IDs.

## 5. Multiple Calibration Cohorts

This section is forward-looking and does not commit FluencyTracr to a specific implementation.

The framework may eventually support multiple calibration cohorts. Different industries, deployment maturities, product packages, or AI-product exposure levels may need different reference populations. A newly launched customer should not necessarily be compared to the same baseline as a saturated internal dogfood cohort.

Multiple baselines do not weaken the governance model if selection is deliberate. The applicable baseline must be chosen per cohort through documented criteria, not by trial-and-error to improve a result. The chosen `calibration_id` must appear in the output so consumers can understand what reference point was used.

Baseline selection is interpretation context. It is not a suppression override.

## 6. Customer Cohort Scoring

Customer velocity is reported as a fraction of the calibration percentile.

For example, if a customer cohort has `frequency_p50 = 14` and the calibration baseline has `frequency_p50 = 71`, the frequency dimension reports:

`frequency_index = 14 / 71 = 0.20`

The same pattern applies to engagement and breadth. Each dimension is computed independently, bounded according to the Velocity Index contract, and combined into a bounded composite when applicable. The output is relative to a named calibration version, never an absolute score.

This means a value of `0.20` says "this cohort's median frequency is 20% of the selected calibration reference." It does not say the cohort is 20% good, 20% mature, or 20% productive. It is an aggregate-relative observation.

## 7. What Calibration Is Not

Calibration is NOT a productivity benchmark.

Calibration is NOT a "good vs bad" judgment.

Calibration is NOT a tunable parameter.

Calibration is NOT a way to make any specific customer look bad.

Calibration is NOT a leaderboard.

Any use of calibration to rank customers, pressure teams, or imply universal moral meaning from a relative distribution is out of scope. The baseline is a reference point, not a verdict on worth.

## 8. Governance Invariants Preserved

Calibration governance preserves all nine invariants:

1. **Canonical event set unchanged.** Calibration does not add observation events. It interprets aggregate distributions emitted by the existing V1 and V2 model.
2. **No new suppression reasons.** Calibration updates do not create new suppression reasons.
3. **No tunable thresholds.** Calibration versions are governed artifacts, not movable decision boundaries. Updating a baseline requires review, versioning, documentation, and historical preservation.
4. **No admin overrides.** No admin can switch calibration to force a SURFACE result or hide a SUPPRESS result.
5. **No individual scoring.** Calibration compares cohort distributions only. It never introduces person-level outputs.
6. **Default verdict is SUPPRESS.** Calibration cannot rescue a cohort that fails volume, time, convergence, baseline, or ambiguity gates.
7. **Latency is corroborative only.** Calibration may contextualize velocity dimensions, not turn latency into a trigger.
8. **Assurance Harness stays green.** Any implementation must preserve assurance checks and add calibration-specific coverage.
9. **Per-slice independence.** Each workflow, JBTD, persona, surface, and window uses its declared calibration reference independently. Aggregation cannot rescue a small slice.

The critical distinction is that a governed baseline can change the reference used for interpretation, but it cannot become a hidden control for surfacing decisions.

## 9. Open Questions

These questions are deliberately open and must be resolved before V3 implementation:

- When should the scio-prod baseline be re-snapshotted?
- Are industry-specific baselines needed at customer launch, or should they wait until enough aggregate customer history exists?
- How should calibration drift over time be detected and reported?
- Should baseline updates require a minimum observation window longer than customer scoring windows?
- How should customer reports explain comparisons across two different calibration versions?
- What metadata is required to mark a baseline as experimental, default, deprecated, or retired?

These are governance decisions, not permission to introduce tunable thresholds.

## 10. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The calibration-as-versioned-baseline governance pattern is credited to James Kelley. The key insight is that calibration can make Velocity transferable across cohorts only if baselines are immutable, named, reviewed, and clearly distinguished from prohibited tunable thresholds.

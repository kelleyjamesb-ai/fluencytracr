# V4 Behavior Feature Backlog

## Purpose

This document completes Workstream 2 from
[V4 Next Sprint Plan](./V4_NEXT_SPRINT_PLAN.md).

It defines the derived aggregate behavior features that can strengthen the V4
internal readout without changing the canonical event set. These features are
research and readout-design candidates only unless a later promotion decision
explicitly authorizes narrower contract work.

This backlog does not authorize runtime implementation, APIs, schemas,
customer-facing economic readouts, dollarized modeling, prediction,
causality, individual attribution, rankings, productivity measurement, new
canonical events, or new suppression reasons.

## Feature Priorities

| Feature | Source evidence | Candidate method | Output shape | Sprint decision |
| --- | --- | --- | --- | --- |
| Sequence funnel | Aggregate canonical event presence, governed surfaces, and eligible workflow/window keys. | Aggregate transition counts between observed stages such as activity, verification, recovery, reuse, and completion. | Small-cell-safe funnel rates or stage bands by aggregate key. | Design only unless a later narrow SQL export is approved. |
| Return pattern | Repeated aggregate activity across fixed 60-day windows. | Cohort retention or survival-style aggregate curves. | Returning-use band, window-to-window persistence, or decay caveat. | Research design. |
| Friction loop | Velocity, abandonment, recovery, held trust, and reliability context aligned to the same aggregate key. | Rule-based cross-tab of high activity with friction or recovery signals. | Caveat tag that distinguishes busy use from integrated work. | Include in readout language. |
| Cross-surface concentration | Governed surface buckets and Depth Repertoire context. | Concentration or entropy-style measure over surface buckets. | Concentrated, mixed, or broad-repertoire context band. | Research design. |
| Stability band | Three fixed 60-day-compliant windows. | Band movement, variance, or transition matrix across windows. | Stable, improving, declining, or unstable context. | Include in zone criteria. |
| Attribution quality | Strict parent joins, session joins, aliasing, no-parent, and held trust classifications. | Aggregate attribution-rate profile. | Trust-ready, attribution-hold, no-parent-heavy, or held context. | Include as a gate. |

## Feature Notes

### Sequence Funnel

The sequence funnel answers whether activity reaches later governed behavior:
verification, recovery, reuse, and completion. It should use aggregate
transition counts only. It must not expose raw sessions, prompts, actions,
transcripts, user identifiers, or rare paths that could reconstruct low-count
behavior.

Promotion gate: only after a narrow aggregate export proves stage definitions
are stable across fixed windows and each stage maps back to existing canonical
events or governed surface context.

### Return Pattern

The return pattern answers whether behavior persists after first successful
use. Retention or survival-style curves are acceptable as research methods if
they remain aggregate-only and are not presented as predictions.

Promotion gate: only after the output can be explained as persistence context,
not forecasted future adoption or economic value.

### Friction Loop

The friction loop answers whether visible activity is paired with abandonment,
recovery churn, weak verification, held trust, or low reliability. This is the
most immediately useful feature for the readout because it prevents high usage
from being mistaken for durable work integration.

Promotion gate: already suitable for readout language as a caveat, provided it
does not change surfacing eligibility, confidence bands, or economic posture.

### Cross-Surface Concentration

Cross-surface concentration answers whether behavior depends on one governed
surface or appears across a broader work repertoire. Entropy or concentration
methods are acceptable for research because they are interpretable, but the
readout must avoid universal thresholds or customer benchmarks.

Promotion gate: only after the measure is stable enough to explain, and only as
aggregate context for Depth Repertoire.

### Stability Band

The stability band prevents one-window promotion. It should summarize whether
an aggregate pattern remains in the same band, improves, declines, or becomes
unstable across the three fixed windows.

Promotion gate: suitable for zone criteria because it is based on already
approved fixed-window evidence. It must not become a prediction claim.

### Attribution Quality

Attribution quality keeps trust evidence from overclaiming. It should separate
strict parent joins, session joins, aliased joins, no-parent signals, and held
signals before any trust-related interpretation is allowed.

Promotion gate: suitable as a gate. Held or noisy attribution must block trust
interpretation instead of being treated as negative quality evidence.

## Deferred Methods

The following remain deferred until the aggregate rule-based readout is stable
and a customer-owned outcome variable exists:

- regression models,
- logistic prediction,
- causal inference,
- dollarized value modeling,
- org metadata segmentation,
- automated economic recommendation.

These methods may return later as research designs, but only with held-out
validation, leakage controls, false-positive and false-negative analysis, and
governance review.

## Interpretable Math To Consider

Preferred research math is simple enough for value-realization reviewers to
audit:

- transition matrices for zone movement across fixed windows,
- aggregate sequence funnels,
- retention or survival-style curves for repeated aggregate behavior,
- concentration or entropy over governed surface buckets,
- variance or band movement across 60-day windows,
- attribution-rate profiles for trust evidence,
- backtesting or holdout design before any forecasting claim,
- Bayesian or hierarchical smoothing only as internal sparse-cohort analysis,
  never as a public score.

## Promotion Criteria

A feature can move from backlog to internal readout only if it:

- remains aggregate-only,
- uses existing canonical events or already governed context,
- passes small-cell and suppression protections,
- explains a concrete next action,
- can be reproduced across fixed windows,
- keeps held states fail-closed,
- avoids dollars, causality, prediction, productivity, rankings, and
  individual attribution,
- names its missing evidence and caveats.

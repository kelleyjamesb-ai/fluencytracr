# Design: VBD Trajectory-Model Calibration

## Context

The proved historical outcome model consumes one scalar `velocity_exposure`
and one scalar `breadth_exposure`. Those values are synthetic placeholders, not
an admitted behavioral measurement model. Two existing product representations
cannot safely fill that gap:

- `velocity_index` is the average of frequency, engagement, and breadth, so it
  overlaps a separate Breadth term; and
- legacy VBD intake accepts 0-100 Velocity, Breadth, and Depth values and then
  computes fixed-weight aggregates without uncertainty suitable for a
  likelihood.

The first VBD calibration must start from non-overlapping canonical aggregate
evidence rather than laundering either representation into model input.

## Goals And Non-Goals

Goals:

- freeze exact aggregate behavioral estimands and units;
- estimate noisy longitudinal behavior trajectories without a composite VBD
  score;
- calibrate interval coverage, null behavior, aggregate floors, definition
  drift, and negative controls on synthetic evidence; and
- bind plan, input, fit, diagnostics, study, artifact, and independent review
  through immutable hashes.

Non-goals:

- implementing or executing the trajectory engine in this proposal;
- using real, customer, production, live, or respondent-level data;
- treating Depth as a coefficient, latent factor, score, or eligibility input;
- directly feeding the accepted outcome model;
- producing confidence/probability, causal, ROI, productivity, finance,
  ranking, customer, route, UI, persistence, connector, or export output; and
- changing canonical events, suppression reasons, product thresholds, DiD, or
  promotion state.

## Decisions

### Non-Overlapping Behavioral Lanes

The model has three active likelihood lanes:

1. `frequency`: p50 runs per active day from
   `USER_FREQUENCY_OBSERVED`, transformed as `log1p(p50)`;
2. `engagement`: p50 active days divided by the exact eligible-day
   count from `USER_ENGAGEMENT_OBSERVED`, transformed as
   `asin(sqrt(p50 / eligible_day_count))`; and
3. `breadth`: p50 distinct governed surfaces divided by the exact eligible
   surface count from `USER_BREADTH_OBSERVED`, transformed as
   `asin(sqrt(p50 / eligible_surface_count))`.

The three primitives are not averaged, multiplied, projected into a latent
summary, or collapsed into one coefficient. This proof does not redefine or
estimate canonical Velocity, which continues to include frequency, engagement,
and breadth under its separate product contract. The p10, p50, p90, and p99 source
distribution must use the frozen Hyndman-Fan type-7 algorithm, remain ordered
and hash-bound, and satisfy exact denominator bounds. This first likelihood
uses only the declared p50 statistic and its known transformed-scale aggregate
standard error.

The source binds an immutable eligible cohort and one common active-member set
for all three lanes in each window; inactive members are not assigned a
frequency value. The direct-aggregate numerical DGP holds cohort commitment and
`k` fixed without instantiating member rows; only the process-local bootstrap
fixture has synthetic member slots. Future real aggregate evidence would require a separate admission
decision for composition plus the fixed 2,000-resample synchronized type-7
bootstrap covariance contract, with a source-private pre-bootstrap root, a
keyed aggregate receipt, and uncertainty/final bundle roots so the seed graph
cannot be circular or leak member-derived commitments. The
numerical DGP emits separately labeled known-aggregate uncertainty; integer-
valid active-day/surface fixtures test bootstrap conformance without entering
model inputs or evidence. The current endpoint and approximate/nearest-index
adapter percentiles are not admitted by this proposal.

The model must not consume clamped sub-index values, `velocity_index`, a
source-supplied Velocity score, `overall_vbd_score`, `integration_score`, a VBD
quadrant, or a weighted VBD composite. This also prevents Breadth from entering
both Velocity and Breadth lanes.

### Source And Panel Identity

Every active lane must map one-to-one to the same canonical
`(workflow_id, jbtd_id, persona_id)` aggregate tuple and ordered window. Each
window binds event/schema version, statistic, units, cohort size, exact window,
source ref/hash, uncertainty derivation ref/hash, gate receipt, run/active-day
definition, eligible-day definition, surface taxonomy, and eligible surface
set. All three lanes must have equal tuple, window, cohort, and plan identity.
Active-member count `k` must equal `cohort_size`. The existing `k>=5` aggregate
schema floor and `k>=10` series/read-path evidence floor remain unchanged.

The panel is balanced and ordered with 12 pre-period and 6 post-period windows
and 6 or 12 panel groups. No missing, suppressed, stale, imputed, duplicate,
off-plan, or cross-slice-rescued window can enter a fit. Transformation location
and sample scale are pooled over the exact pre-period panel only and are hash-
bound. Panel groups must be disjoint; nested, overlapping, complementary, or
differenceable slices and any pooling-based suppression rescue are prohibited.
Hashes prove consistency, not source authenticity or real-data clearance.
The synthetic schedule uses exact UTC half-open, non-overlapping 60-day windows
from a fixed epoch, with no trajectory lag and `w15..w17` as terminal windows.

### Depth Remains Context Only

Depth may appear only as a non-numeric aggregate context reference with an
immutable definition version, source ref/hash, suppression posture, review
state, and required caveats. No Depth value, band, candidate, component,
interaction, prior, likelihood term, trajectory, threshold, eligibility rule,
or numerical artifact field is permitted.

Depth context is optional. Missing, suppressed, stale, unreviewed, or hash-
invalid Depth context is recorded as unavailable and cannot alter trajectory
acceptance, parent completion, or a primitive-lane fit. Attempted numerical or
eligibility use rejects before fitting.

### Statistical Model And Estimands

For each active lane `d` in `{frequency, engagement,
breadth}`, panel group `c`, and window `t`, the planned first model is:

```text
x_star[d,c,t] ~ Normal(mu[d,c,t], se_star[d,c,t]^2)
mu[d,c,t] = alpha[d] + u[d,c] + beta[d] * tau[t] + r[d,c,t]
u_raw[d,c] ~ Normal(0, sigma_u[d]^2)
u[d,c] = u_raw[d,c] - mean_c(u_raw[d,c])
r[d,c,0] ~ Normal(0, sigma_r[d]^2 / (1 - rho[d]^2))
r[d,c,t] = rho[d] * r[d,c,t-1] + eta[d,c,t]
eta[d,c,t] ~ Normal(0, sigma_r[d]^2)
```

Each lane is fit as an independent univariate Gaussian state-space block. The
model uses pooled pre-period-only standardization and time encoding, zero-sum
panel-group effects, the known aggregate standard errors exactly, stationary
AR(1) initialization, `alpha,beta ~ Normal(0,1)`, `sigma_u,sigma_r ~
HalfNormal(1)`, and `rho ~ Uniform(-0.95,0.95)`. It adds no free observation-
noise term and shares no coefficient, state, or scale across lanes.

Time encoding uses the twelve unique pre-period indexes once, then broadcasts
the result to panel groups. The latent-level contrast is recovered by exact
conditional Gaussian fixed-interval smoothing at every hyperparameter support;
it is not the existing fixed-coefficient movement contrast. Deterministic
intervals use the frozen 8,192-point outer integration and a 16-point
Gauss-Hermite conditional-Normal support, followed by `weighted_quantile_v1`.
The NUTS reference samples the matching scalar conditional latent contrast at
each retained draw.

The lane estimand is the direction-adjusted difference between the mean latent
level over the final three predeclared evaluation windows and the mean latent
level over all twelve pre-period windows, in that lane's pre-period standard
deviation units. It is an observed-path smoothing contrast. It is not a causal
effect, forecast, historical counterfactual, productivity measure, score, or
business-outcome estimate. The plan freezes one ordered three-lane direction
vector, and every lane binds its component, before truth is generated. The trajectory model selects no lag and uses fixed-interval
smoothing conditional on exactly `w00..w17`; no window after `w17` may enter.

### Downstream Integration Is Not Implied

The current outcome-model proof has one scalar Velocity term and one scalar
Breadth term. This contract has three active non-overlapping lanes. Therefore a
passing VBD trajectory proof cannot be wired into that outcome model by alias,
averaging, selecting one Velocity component after seeing results, or treating
one component as context.

The default future integration path is to predeclare three lagged outcome-model
terms and rerun every affected concordance, calibration, null, lag, shock, and
negative-control gate. Any alternative scalar compression requires its own
approved derivation and synthetic proof. Neither path is authorized here.

### Synthetic Proof Sequence

Only a separate post-proposal implementation decision may start this sequence.
Proposal acceptance alone is insufficient. Implementation then requires five
separately reviewable stages:

1. strict types, generator, deterministic primary engine, full planner,
   resumable combiner/recomputation machinery, canary receipts, internal
   artifact, bridge, and smoke/HOLD controls; then commit candidate `S`, obtain
   exact-commit CODE/BUG/ADVERSARIAL/statistical-methodology GO, and create the
   manifest-only freeze child `F` before concordance or any canary;
2. PyMC NUTS concordance for five fixed seeds in each of six effect/group
   cells, exact PPC statistics, and fresh recomputation of all 90 deterministic
   lane fits;
3. a resumable full deterministic study with 1,200 primary, 360 targeted, 360
   drift, 12 floor, and 68 fixed negative-control cases plus a separate fresh
   recomputation of all 2,000, preceded by four exact full-setting canaries;
4. commit the full summary artifact and byte-derived compact summary, then
   obtain exact-byte CODE, BUG, ADVERSARIAL, and statistical-methodology GO
   decisions; and
5. create and commit the separate self-hashed acceptance record binding those
   evidence hashes and completed reviews, then obtain explicit human acceptance
   of that exact record.

Pre-freeze development smoke uses only the disjoint
`2_055_900_000..2_055_900_999` namespace, computes no aggregate acceptance
gate, and always HOLDS. It may expose mechanical defects only; it cannot change
the frozen statistical contract or enter later evidence.

The direct-aggregate generator is reproducible under
`Generator(PCG64DXSM(seed))` with one frozen draw sequence and lower-Cholesky
row-vector convention. NUTS PPC replicates draw a fresh conditional smoothed
AR path plus new known-SE observation error for every retained draw; they do
not draw a new unconditional AR path. The source-bootstrap conformance fixture
has a frozen private-root/seed/covariance/SE oracle recorded in the contract.

The six primary cells are effects `{0, 0.2, 0.5}` pre-period SD by panel-group
counts `{6, 12}`, with aggregate Measurement Cell `k=16`. Every cell reports
80% interval coverage separately for all three active lanes and must remain in
the existing compiled `74-86%` calibration band. Across each null replication,
the familywise internal false-movement flag is true if any lane in that
scenario's frozen zero-truth set has a direction-adjusted 99% lower endpoint
strictly greater than zero; its worst-cell rate must be at most `5%`. Nonzero
lanes also pass the per-cell bias/sign predicate in the contract. This is synthetic
validation logic only, not a product or customer threshold.

The primary DGP, inverse transforms, scenario truth vectors, exact seed
namespaces, 360-slot targeted matrix, 360-slot replicated drift matrix, and
exact hash/interface roots are frozen normatively in the contract. Lane
acceptance is conjunctive; averages cannot rescue failures.

Floor controls cover `k=4`, `k=5`, `k=8`, `k=10`, `k=12`, and `k=16`. Only
`k=4` rejects under the existing aggregate minimum. `k=5` and `k=8` are valid
internal-only controls but ineligible below the inherited `k>=10` series/read-
path evidence floor; `k=10`, `k=12`, and `k=16` pass that floor. All are numerical controls,
while `k=16` remains primary-study provenance rather than a new runtime
threshold.

Required targeted controls include single-lane movement, correlated lanes,
temporary spikes, common availability shock, zero
pre-period variance, ceiling/saturation, weak history, missing or suppressed
windows, definition/denominator/taxonomy drift, legacy composite input,
Breadth-in-Velocity duplication, Depth-in-likelihood, post-period
standardization, look-ahead leakage, target/outcome/Fluency contamination,
hash drift, missing/permuted/diagonal-mismatched/non-PSD covariance, unsafe or
person-level fields, real/live/customer/production flags, partial studies,
duplicates, off-plan slots, runner errors, and output authorization attempts.

## Risks And Mitigations

- **Outcome-interface mismatch:** keep integration blocked and require renewed
  validation for the exact three-lane interface.
- **Quantile uncertainty unavailable:** require finite positive transformed-
  scale aggregate SE and derivation provenance; current endpoint output alone
  is insufficient.
- **Taxonomy or denominator drift:** bind eligible-day and eligible-surface
  definitions per window; drift HOLDS before fitting.
- **Cross-lane dependence:** fit marginal lanes separately, calibrate
  familywise null behavior under correlated synthetic data, and forbid joint or
  composite interpretation; later outcome integration must use a joint
  likelihood or hash-bound uncertainty/covariance propagation, never posterior-
  mean plug-in or implicit zero covariance.
- **Proof self-authorization:** generated artifacts keep completion and
  authorization false; only exact-byte reviews followed by a separate self-
  hashed acceptance record and explicit human acceptance of that record can
  close the synthetic evidence gate.

## Rollback

This slice is documentation-only. Reverting the proposal and contract restores
the previous documentation-only future-module state without changing runtime
behavior or accepted evidence.

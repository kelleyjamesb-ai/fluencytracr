## ADDED Requirements

### Requirement: Non-Overlapping VBD Trajectory Measurement Boundary

The future `bayesian_vbd_behavioral_trajectory_model` SHALL model three separate
primitive trajectory lanes: `frequency`, `engagement`, and `breadth`. It SHALL
NOT redefine or estimate canonical Velocity, whose separate product contract
continues to include frequency, engagement, and breadth. It SHALL NOT collapse
the three primitive lanes into a scalar, latent factor, fixed-weight aggregate,
index, quadrant, or composite.

`frequency` SHALL bind the p50 statistic from
`USER_FREQUENCY_OBSERVED` in runs per active day and transform it with
`log1p`. `engagement` SHALL bind the p50 statistic from
`USER_ENGAGEMENT_OBSERVED`, divide it by an exact hash-bound eligible-day
count, and transform it with `asin(sqrt(proportion))`. `breadth` SHALL bind the
p50 statistic from `USER_BREADTH_OBSERVED`, divide it by an exact hash-bound
eligible-surface count under one immutable surface taxonomy, and transform it
with `asin(sqrt(proportion))`.

Every lane SHALL require finite positive transformed-scale aggregate standard
error and immutable uncertainty-derivation provenance. Every future source-
derived p10/p50/p90/p99 distribution SHALL use the Hyndman-Fan type-7 linear-
interpolation algorithm inside the source privacy boundary and SHALL remain
ordered and hash-bound. The separately labeled direct-aggregate synthetic DGP
SHALL NOT satisfy or claim this future source gate. Frequency p50 SHALL be
finite and nonnegative. For this Gaussian
likelihood, Engagement and Breadth p50 SHALL satisfy
`0 < p50 < exact_denominator` with a positive immutable denominator; zero or
ceiling p50 SHALL HOLD before fit as a nonregular transformed-uncertainty
boundary. The current
`velocity_index`, clamped sub-index values, source-supplied Velocity scores,
`overall_vbd_score`, `integration_score`, VBD quadrants, and weighted VBD
composites SHALL be inadmissible model inputs.

For future source-derived evidence, every frequency percentile SHALL be finite
and nonnegative, every Engagement percentile SHALL be finite in
`[0,eligible_day_count]`, and every Breadth percentile SHALL be finite in
`[0,eligible_surface_count]`. Source-local active days and distinct surfaces
SHALL be integer counts, and frequency SHALL equal a positive integer run count
divided by a positive integer active-day count. Strict tests SHALL mutate each
percentile independently outside its domain; source-domain validation SHALL
precede ordering, transforms, and likelihood checks.

The source SHALL bind one immutable eligible-cohort manifest and one source-
local active-member set per window. Frequency SHALL preserve canonical runs-
per-active-day semantics and SHALL NOT assign zero to inactive eligible
members. The same window-active set SHALL supply all three lanes; missing
telemetry, lane-specific active sets, and post-period cohort repair SHALL be
inadmissible. Active-member count `k` SHALL equal emitted `cohort_size` in all
three lanes for that window. The direct-aggregate numerical DGP SHALL keep one
cohort commitment and `k` across all 18 windows without instantiating member
rows; only the source-bootstrap fixture SHALL use process-local synthetic
slots. Real changing-composition, discrete-lattice, or adoption-prevalence
interpretation SHALL require a separate admission decision.

A future real aggregate package SHALL require
`source_side_synchronized_type7_bootstrap_v1`: exactly 2,000 shared with-
replacement source-boundary resamples, transformed type-7 p50 vectors, and the
`ddof=1` 3x3 covariance. The emitted aggregate covariance SHALL be finite,
symmetric, positive semidefinite, canonically lane-ordered, and have diagonals
equal to emitted lane-SE squares. Missing, permuted, diagonal-mismatched, or
non-PSD covariance SHALL reject. Member slots, resamples, join keys, and rows
SHALL NOT leave the source boundary. The current canonical endpoint without
this uncertainty package SHALL remain insufficient, and this proposal SHALL
NOT authorize real-source use.

No caller tolerance SHALL be accepted. For
`s=max(1,max(abs(covariance)))`, symmetry and diagonal/SE-square error SHALL
each be `<=1e-12*s`, and pinned-runtime `eigvalsh` minimum SHALL be
`>=-1e-10*s`, all before symmetrization or repair. These SHALL be compiled
internal numerical tolerances only.

Source-local active-member slots SHALL use non-emitted HMAC-SHA256 digest order
under a source-held window secret. A private
`prebootstrap_bundle_content_root` SHALL
commit to ordered source-local lane values plus cohort, active-set, window,
denominator, taxonomy, and definition hashes while excluding every bootstrap
input derived from that root and every uncertainty/final-child/final-bundle
output. It SHALL never leave the source boundary. Bootstrap indices SHALL use pinned NumPy
`Generator(PCG64DXSM(seed)).integers(0,k,size=(2000,k),endpoint=False,
dtype=uint64)`, where seed is the 52-bit integer in the first 13 hex characters
of `sha256(prebootstrap_bundle_content_root|vbd-bootstrap-v1)`, and SHALL reuse
the same index matrix across all lanes. A tuple/window-specific, never-reused
source secret SHALL produce an opaque
`HMAC-SHA256(aggregate_output_hash|vbd-receipt-v1)` receipt. A source-private
audit record MAY link that receipt to the private root and seed but SHALL never
leave the boundary. The
joint uncertainty root SHALL bind only that receipt, algorithm, runtime, count,
lane order, covariance, and SEs; final lane-child roots SHALL bind that
uncertainty root; and only then SHALL the final bundle root bind the receipt,
ordered lane children, and joint uncertainty root. No emitted field SHALL
expose/include the private root, and no hash SHALL depend on itself or a
descendant.

`aggregate_output_hash` SHALL be SHA-256 canonical JSON over ordered aggregate
distributions, denominators, definition hashes, cohort/window/active-set
commitments, observed/missing counts, algorithm/runtime ids, canonical lane
order, covariance, and marginal SEs, excluding the private root, receipt, and
descendant roots.

The bootstrap SHALL remain source-owner-side and external to FluencyTracr.
FluencyTracr SHALL NOT receive or persist real/source-derived member keys,
digests, slots, or rows, and this change SHALL authorize no connector. Only an aggregate package may be
considered by a separate later real-source admission decision.

#### Scenario: Canonical primitive lanes are admitted to synthetic preparation

- **GIVEN** frequency, engagement, and Breadth distributions bind the same
  approved aggregate tuple and window, exact definitions, finite positive
  transformed-scale uncertainty, and immutable source hashes
- **WHEN** the future synthetic trajectory preparer validates the evidence
- **THEN** the three non-overlapping p50 lanes may proceed to pre-period-only
  standardization
- **AND** no scalar Velocity or VBD score is created

#### Scenario: Composite Velocity and separate Breadth are rejected

- **GIVEN** a candidate uses `velocity_index` or another value that already
  contains Breadth beside a separate Breadth lane
- **WHEN** the future trajectory boundary validates the candidate
- **THEN** it rejects before fitting
- **AND** reweighting, aliasing, or source-supplied score metadata cannot
  rescue the candidate

### Requirement: VBD Panel, Source, And Depth Context Binding

Every active lane SHALL map one-to-one to the same canonical
`(workflow_id, jbtd_id, persona_id)` aggregate tuple and ordered window. The
future proof SHALL require 12 pre-period windows, 6 post-period windows, and 6
or 12 panel groups; exact event/schema version, statistic, units, cohort size,
window, source ref/hash, uncertainty derivation ref/hash, gate receipt,
run/active-day definition, eligible-day definition, surface taxonomy, eligible
surface set, plan, and pre-period transformation SHALL be immutable and
hash-bound.

Each plan SHALL own one ordered direction vector in
`(frequency,engagement,breadth)` order. Every lane child SHALL bind that shared
vector root and its matching component rather than requiring equal scalar
directions. Primary SHALL use `(+1,+1,+1)` and composition rotation SHALL use
`(+1,-1,+1)`.

Every lane/window SHALL require `cohort_size == k`. The inherited aggregate
schema floor SHALL remain `k>=5`, and the existing series/read-path evidence
floor SHALL remain `k>=10`; this contract SHALL change neither constant and
SHALL authorize no display.

The synthetic schedule SHALL use UTC half-open non-overlapping 60-day windows
`w_t=[2000-01-01T00:00:00Z + 60*t days, 2000-01-01T00:00:00Z + 60*(t+1)
days)` for `t={0,...,17}`. It SHALL use exact eligible-day count 60, pre-period
`w00..w11`, post-period `w12..w17`, terminal windows `w15..w17`, no trajectory
lag, and one distinct source-content hash/cutoff per lane/window. Overlap, gaps,
shifted endpoints, unequal cadence, duplicate content aliases, covering-window
substitution, or lag/future leakage SHALL HOLD.

Missing, suppressed, stale, imputed, duplicate, off-plan, definition-drifted,
or cross-slice-rescued windows SHALL reject or HOLD before fitting. All
transformation location and sample scale SHALL be pooled over the exact panel-
group cells in the twelve pre-period windows only, with `ddof=1`. The
transformed standard error SHALL use that same scale.

Panel groups SHALL be disjoint under a hash-bound partition attestation.
Nested, overlapping, complementary, or differenceable slices SHALL be
inadmissible, and no broader group, neighboring window, partial pooling,
subtraction, or differencing SHALL reconstruct or rescue a held slice. Hashes
SHALL be treated as consistency evidence, not source authenticity, privacy
clearance, or real-data admission.

Depth MAY remain a non-numeric aggregate context reference with immutable
definition, source, review, suppression, and caveat bindings. No Depth value,
component, band, candidate, interaction, prior, likelihood term, trajectory,
threshold, eligibility rule, or numerical artifact field SHALL be permitted.
Missing, suppressed, stale, unreviewed, or invalid Depth context SHALL be
recorded only as unavailable context and SHALL NOT alter trajectory acceptance,
parent completion, or any primitive-lane fit. Attempted numerical or
eligibility use SHALL reject before fitting.

#### Scenario: Fully aligned panel enters a synthetic fit

- **GIVEN** all three active lanes have exact tuple, window, cohort, source,
  definition, uncertainty, plan, and gate alignment across a complete ordered
  panel
- **WHEN** the future preparer builds the model input
- **THEN** it may produce three per-lane prepared-input hashes under one shared
  ordered-panel and joint-uncertainty root
- **AND** no post-period evidence contributes to standardization

#### Scenario: Active count and emitted cohort size disagree

- **GIVEN** any lane/window declares `cohort_size` unequal to its active-member
  count `k`
- **WHEN** the future preparer validates aggregate floors and panel alignment
- **THEN** it rejects before fitting
- **AND** another lane, group, or broader cohort cannot repair the mismatch

#### Scenario: Depth is promoted into the likelihood

- **GIVEN** a candidate includes a numeric Depth value, coefficient,
  interaction, state, prior, eligibility field, or composite contribution
- **WHEN** the future boundary validates the candidate
- **THEN** it rejects before fitting
- **AND** Depth remains context-only under its existing caveat authority

#### Scenario: Depth context is unavailable

- **GIVEN** otherwise valid trajectory evidence has no surfaced Depth context
- **WHEN** the future boundary records context posture
- **THEN** it records Depth context as unavailable without changing any
  numerical input, fit, diagnostic, or acceptance field
- **AND** the absence cannot strengthen or weaken parent task completion

### Requirement: VBD Gaussian State-Space Specification And Estimands

The future proof SHALL fit one independent univariate Gaussian state-space
block for each active lane. For lane `d`, panel group `c`, and window `t`, the
specification SHALL be:

```text
x_star[d,c,t] ~ Normal(mu[d,c,t], se_star[d,c,t]^2)
mu[d,c,t] = alpha[d] + u[d,c] + beta[d] * tau[t] + r[d,c,t]
u_raw[d,c] ~ Normal(0, sigma_u[d]^2)
u[d,c] = u_raw[d,c] - mean_c(u_raw[d,c])
r[d,c,0] ~ Normal(0, sigma_r[d]^2 / (1 - rho[d]^2))
r[d,c,t] = rho[d] * r[d,c,t-1] + eta[d,c,t]
eta[d,c,t] ~ Normal(0, sigma_r[d]^2)
```

`tau[t]` SHALL standardize ordered `t in {0,...,17}` with the mean and sample
standard deviation of the twelve unique pre-period values `{0,...,11}` only,
then broadcast that vector to panel groups; repeated group rows SHALL NOT enter
the time-scale calculation. The proof SHALL use known
aggregate standard errors exactly as likelihood standard deviations, pooled
pre-period-only standardization, zero-sum panel-group effects, stationary AR(1)
initialization, `alpha,beta ~ Normal(0,1)`, `sigma_u,sigma_r ~ HalfNormal(1)`,
`rho ~ Uniform(-0.95,0.95)`, and no additional observation scale. It SHALL share
no coefficient, state, or scale across lanes.

Each lane's estimand SHALL be the direction-adjusted difference between the
mean latent level over the final three predeclared evaluation windows and the
mean latent level over all twelve pre-period windows, in pre-period standard
deviation units. The estimand SHALL be labeled as an internal observed-path
smoothing contrast, not a causal effect, forecast, counterfactual,
productivity measure, score, or business-outcome estimate.

At every deterministic hyperparameter support, the proof SHALL analytically
condition the Gaussian coefficient/group vector and AR(1) states and compute
the exact conditional Normal mean and variance of that latent-level contrast
using the `K`, `R`, `B=K+R`, `H`, and contrast-vector equations frozen in the
contract. The deterministic engine SHALL expand that conditional Normal with
the frozen 16-point Gauss-Hermite `normal_quadrature_v1` beneath the accepted
8,192-point outer integration and SHALL compute 80% and 99% endpoints with
`weighted_quantile_v1`. The NUTS engine SHALL sample the matching conditional
scalar at every retained draw. Neither engine SHALL emit a latent path.

Each plan SHALL freeze one ordered three-lane direction vector with components
in `{+1,-1}` before generated truth or post-period evidence is inspected. With
`C` groups, each lane's exact raw contrast SHALL
equal `sum(c,t=15..17,mu)/(3*C) - sum(c,t=0..11,mu)/(12*C)` with equal group and
window weights, then multiply by the matching direction-vector component. The posterior SHALL use
fixed-interval smoothing conditional on exactly `w00..w17`, no later window,
and no forecast. The trajectory model SHALL select no lag. Downstream lags
belong to a separate predeclared integration plan.

#### Scenario: Separate trajectories are estimated

- **GIVEN** a complete valid synthetic panel with known aggregate uncertainty
- **WHEN** the future trajectory engine fits all active lanes
- **THEN** it computes three separate terminal movement summaries and
  diagnostics
- **AND** it emits no joint VBD score, joint coefficient, or customer output

#### Scenario: One lane is substituted for another

- **GIVEN** a candidate aliases frequency as engagement, Breadth as Velocity,
  AI Fluency as observed behavior, or a customer outcome as a trajectory lane
- **WHEN** the future preparer validates lane identity
- **THEN** it rejects before fitting
- **AND** hash recomputation cannot legitimize the semantic substitution

### Requirement: VBD Internal Interfaces And Hierarchical Hash Binding

The future implementation SHALL define strict internal records equivalent to
`TrajectoryObservationBundle`, `PrimitiveTrajectoryObservation`,
`TrajectoryPreparedInput`, and `TrajectoryFitSummary`. The bundle SHALL own all
three lane observations, exact
`covariance_lane_order=(frequency,engagement,breadth)`, and their synchronized
3x3 covariance for one
tuple/window. A future `OutcomeTrajectoryInput` SHALL remain
unauthorized until a separate integration proposal defines all three lagged
lanes and cross-lane uncertainty propagation.

The implementation SHALL bind one observation root per active lane; one opaque
keyed source receipt and one final bundle-source-content root per tuple/window; one shared
ordered-panel root; a cohort-partition/non-overlap root; three lane-specific
transform roots each binding the raw transform and that lane's fitted pre-
period mean, scale, and SE scaling; one joint uncertainty/covariance root with
bound marginal-SE children; one model/prior/
time root; one optional non-numeric Depth-context root; one study-plan/seed
root; per-lane prepared-input and fit-summary roots; and execution/checkpoint/
recomputation/artifact roots. A review root SHALL be created only later in the
separate acceptance record and SHALL NOT be a generated-artifact or pre-run
child. The implementation SHALL NOT collapse these into an opaque
`vbd_source_hash`.

Every ordinary hash SHALL be exact lowercase SHA-256 hex and the source receipt
SHALL be exact HMAC-SHA256 hex. Existing workflow/JBTD/persona ids SHALL use
their canonical event-schema encodings and exact frozen aggregate-slice-
manifest membership. Every other ref SHALL use its field-appropriate namespace
from `source:`, `definition:`, `cohort:`, `plan:`, `gate:`, `review:`,
`depth-context:`, `caveat:`, or `runtime:`, with suffix
`[a-z][a-z0-9._/-]{0,95}`, and SHALL exactly match an immutable
`reference_manifest` entry binding role, aggregate posture, owner role, source
definition, and blocked uses. Unknown, cross-role, caller-created, encoded, or
rehashed refs SHALL reject.

Depth SHALL allow only `depth-context:a`, `depth-context:b`, or
`depth-context:unavailable`; numeric/band/level/score/encoded Depth SHALL
reject. Manifest values SHALL reject whitespace, `@`, query/fragment text,
names, emails, person/customer/member/respondent identifiers, base64/hex-
encoded payloads, raw content, secrets, and joinable member digests. Strict
tests SHALL accept allowlisted canonical uppercase workflow ids while rejecting
unknown namespaces, encoded identities, and numeric Depth refs. Syntax alone
SHALL NOT establish privacy or admission.

Hashes SHALL detect drift and inconsistency only. They SHALL NOT self-certify
source authenticity, reviewer ownership, privacy clearance, or real-data
admission. Independent marginal trajectory fits SHALL NOT imply zero cross-
lane covariance or permit fitted means to enter another likelihood as error-
free exposures. Future integration SHALL require either one approved joint
likelihood or hash-bound quadrature/draw propagation that preserves lane/window
uncertainty and cross-lane covariance. Posterior-mean plug-in, missing
covariance, or stage-one/stage-two hash mismatch SHALL HOLD.

#### Scenario: Hierarchical bindings are complete

- **GIVEN** a valid synthetic panel, preparation, fit, and study result
- **WHEN** the future bridge recomputes every required root
- **THEN** every child is reachable from the correct semantic parent and every
  declared root matches
- **AND** no hash claims source admission, authenticity, review, or promotion

#### Scenario: Marginal summaries are treated as error-free joint input

- **GIVEN** a caller drops lane uncertainty or assumes zero cross-lane
  covariance when preparing a downstream outcome model
- **WHEN** future integration governance validates the candidate
- **THEN** integration HOLDS
- **AND** trajectory calibration status remains separate from integration
- **AND** a controlled integration test must prove larger exposure uncertainty
  widens downstream uncertainty before that route can be approved

### Requirement: VBD Synthetic Calibration And Concordance Plan

The future implementation SHALL provide a reduced smoke mode and a full fixed
proof. Smoke, partial, malformed, duplicate, off-plan, mixed-provenance,
hash-invalid, runner-error, or hard-diagnostic evidence SHALL HOLD and SHALL
NOT complete parent task `5.6`.

Pre-freeze development smoke SHALL use only seeds
`2_055_900_000..2_055_900_999`, SHALL carry no acceptance slot key, SHALL
compute no aggregate acceptance gate, and SHALL remain permanently
`HOLD(smoke_mode_nonacceptance)`. It MAY repair mechanics but SHALL NOT alter
the model, DGP, priors, cells, thresholds, or acceptance seeds. Any pre-freeze
acceptance-plan seed, truth, canary, or result SHALL invalidate the full study.

Before any acceptance canary result, a clean source commit `S` SHALL contain the
implementation, contract, lockfile, plan, seeds, and runtime builder without
execution output. CODE, BUG, and ADVERSARIAL reviewers SHALL return GO against
exact `S`, together with statistical-methodology GO; a source change SHALL
require a new commit and all reviews. A create-once sanitized freeze manifest
SHALL bind `S`, its tree, every in-scope file hash, those implementation-review
refs, pre-run roots, and allowed commands without a result. Freeze commit `F`
SHALL have `S` as its sole parent and differ only by that manifest. Every
execution SHALL run from a clean exact `F`, bind its manifest hash, and the
evidence commit SHALL descend from `F`. Review SHALL verify this ancestry and
one-file diff. Any post-canary amend, rebase, replacement, or frozen-identity
change SHALL invalidate all results and require a new full freeze and rerun.
Pre-execution implementation review SHALL NOT satisfy later exact-byte evidence
review.

The runner SHALL accept only a compiled slot key, regenerate the complete
synthetic observation bundle internally from the bound generator/scenario/
seed/plan/implementation, and require exact equality immediately before fit.
Arbitrary packages, external dataset paths, rehydrated inputs, fixture-oracle
fields, and self-declared synthetic flags SHALL reject. Truth sidecars SHALL
remain generator-owned and outside prepared input.

The primary DGP SHALL use `alpha=0`, `beta=0.05`, `sigma_u=0.18`, `rho=0.45`,
`sigma_r=0.10`, `known_se(k)=0.08*sqrt(16/k)`, and cross-lane group/innovation
equicorrelation `0.35` plus observation-error equicorrelation `0.25` on the
generator working scale. Observation covariance SHALL equal
`diag(known_se)*R_observation*diag(known_se)`. Group effects SHALL
be centered to exact zero sum and AR(1) states SHALL use the stationary initial
distribution. The generator SHALL (1) create base latent paths and observation
noise, (2) calculate pooled pre-period mean and `ddof=1` scale from noisy
working-scale observations, (3) apply that transform to observations, latent
paths, and full observation covariance, (4) add the sustained post shift to transformed latent and
observed levels so terminal truth equals the requested effect, and (5) map
prepared observations through the inverse source transform while multiplying
prepared covariance by lane scales on both axes. Preparation SHALL
recover exact mean-zero/unit-SD pre observations and the same transformed SE;
the truth sidecar SHALL NOT enter model input.

The generator SHALL use transformed-scale offset/scale `(2.5,0.25)` for
frequency, `(0.8,0.12)` for engagement, and `(0.6,0.12)` for Breadth, with the
inverse formulas `expm1(offset+scale*x_star)` for frequency and
`denominator*sin(offset+scale*x_star)^2` for engagement/Breadth. Its primary
denominator manifest SHALL bind 60 half-open eligible dates and 12 synthetic
surfaces. Invalid inverse-transform domains SHALL be runner errors and SHALL
NOT be clipped.

The numerical generator SHALL emit direct aggregate packages under
`synthetic_known_aggregate_uncertainty_v1` and SHALL NOT fabricate canonical
member rows or claim source-bootstrap clearance. Context quantiles SHALL use
standardized offsets `delta={p10:-.20,p50:0,p90:+.20,p99:+.30}` under exact
`z_q=offset[d]+scale[d]*(x_star[d,c,t]+delta[q])`, followed by the same lane
inverse. Quantile deltas SHALL therefore be multiplied by lane scale.
Frequency SHALL
remain nonnegative and Engagement/Breadth angles SHALL
remain strictly inside `(0,pi/2)`; violations SHALL be runner errors.

The numerical DGP SHALL use `Generator(PCG64DXSM(seed))`, float64 arrays, the
exact four-call group/initial-state/innovation/observation-error sequence,
canonical `(panel_group,time,lane)` ordering, and lower-Cholesky row-vector
factorization frozen in the contract. A different bit generator, call order,
factor orientation, array ordering, or substream SHALL be source drift.

Source-bootstrap conformance SHALL separately use the exact process-local
`k=16` fixture frozen in the contract. Engagement active-day and Breadth
distinct-surface members SHALL be integer canonical counts, and frequency
ratios SHALL derive from paired positive integer run/active-day counts. Their
type-7 p50s SHALL be `8.5`, `15`, and `3.5`. The wrong nearest-index mutation
SHALL use zero-based `floor((n-1)*p+.5)` without interpolation and yield `9`,
`16`, and `4`. Quantile-
algorithm drift SHALL bind that changed result and reject before fit. Fixture
rows SHALL never enter a numerical slot, prepared input, checkpoint, artifact,
or committed evidence.

The bootstrap fixture SHALL also match the frozen private-root, 52-bit seed,
transformed 3x3 covariance, marginal standard errors, and canonical oracle hash
recorded in the contract. A self-consistent implementation that matches only
the three medians SHALL NOT satisfy conformance.

The full proof SHALL first run PyMC NUTS concordance for five fixed seeds in
each cell of effects `{0, 0.2, 0.5}` pre-period SD by panel-group counts
`{6, 12}`. Cell order SHALL be lexicographic over those listed sets, with group
ordinal `6->0`, `12->1`, and
concordance seed SHALL equal
`2_056_000_000 + 10*cell_ordinal + seed_index` for `seed_index={0,...,4}`.
That bundle seed SHALL generate correlated data. For lane ordinals
`frequency=0`, `engagement=1`, `breadth=2`, explicit NUTS chain seed SHALL be
`2_056_020_000+1_000*cell_ordinal+100*seed_index+10*lane_ordinal+
chain_index` for chain indexes `0..3`; implicit or cross-bundle/lane/chain seed
reuse SHALL reject.
NUTS SHALL use four chains, 1,000 retained draws and 2,000 tuning draws per
chain, `target_accept=.99`, and `max_treedepth=15`.
Mean differences SHALL be `<=0.15` reference SD, interval endpoint differences
`<=0.20` reference SD, and SD ratios within `[0.85,1.15]`. R-hat SHALL be
`<=1.01`, bulk/tail ESS `>=400`, divergences and treedepth saturation zero,
BFMI `>=0.3`, MCSE/SD `<=0.1`, and PPC p-values within `[0.05,0.95]`.

Every lane SHALL use the five exact `vbd_trajectory_ppc_v1` statistics defined
in the contract: pre/post mean movement, `ddof=1` between-group variance, mean
`ddof=1` within-group variance, maximum absolute global-mean deviation, and the
specified pooled lag-one centered ratio. One replicate per retained draw SHALL
use stable chain-major/draw-major order and
`ppc_seed=2_106_000_000+1_000*cell_ordinal+100*seed_index+
10*lane_ordinal`. Each one-sided upper-tail p-value SHALL
equal `count(T_rep>=T_observed)/4000`, ties included with no smoothing. Its
inclusive gate SHALL be `[.05,.95]`; formula, seed, order, or sidedness drift
SHALL HOLD.

Each replicate SHALL draw a fresh conditional smoothed AR(1) path followed by
new known-SE observation error under `Generator(PCG64DXSM(ppc_seed))`; it SHALL
NOT reuse a stored path or draw a new unconditional AR path. Predictive 80%
endpoints SHALL use `weighted_quantile_v1` with equal chain-major/draw-major
weights.

The concordance universe SHALL be 30 bundle executions, each with three nested
primary deterministic, three nested NUTS, and three separately regenerated
fresh deterministic lane fits, for 90 primary deterministic, 90 NUTS, and 90
fresh deterministic records. Fresh deterministic processes SHALL refuse every
primary result/artifact/checkpoint, carry distinct attestations, and match
prepared-input and semantic-result hashes exactly. Bundle and nested-fit counts
SHALL remain distinct.

After concordance and before any full chunk, canaries SHALL run exact slots
`primary/(0,6,0)`, `primary/(.5,12,199)`,
`targeted/(composition_rotation,6,0)`, and
`targeted/(correlated_null,12,29)` in that order. Each SHALL have its planned
row state and no hard/runner failure, SHALL compute no aggregate gate, and SHALL
emit only a sanitized receipt. Unexpected failure SHALL stop execution and any
fix SHALL require a new freeze, concordance, and canary set. Canaries SHALL be
outside all denominators and SHALL NOT substitute for later original or
recomputation slots.

The proof SHALL then run exactly 200 deterministic primary replications in each
of the six cells at aggregate Measurement Cell `k=16`, for 1,200 primary slots.
Primary seed SHALL equal
`2_056_100_000 + 1_000*cell_ordinal + replication_index` for
`replication_index={0,...,199}`.

The fixed targeted matrix SHALL contain
`frequency_only=(+0.5,0,0)`, `engagement_only=(0,+0.5,0)`,
`breadth_only=(0,0,+0.5)`, `correlated_null=(0,0,0)` with group, innovation,
and observation-error equicorrelation `0.8`,
`composition_rotation=(+0.5,-0.5,0)`, and `temporary_pulse` with `+0.5` in all
lanes for only the first three post windows and terminal truth `(0,0,0)`. Each
scenario SHALL run at `{6,12}` groups for 30 seeds, for 360 targeted slots.
Targeted seed SHALL equal `2_056_200_000 + 1_000*scenario_ordinal +
100*group_ordinal + replication_index`.

Truth vectors SHALL be ordered `(frequency, engagement,
breadth)`. Direction SHALL be `+1` for positive/zero entries and `-1` for the
negative engagement entry in `composition_rotation`.
After empirical pre-period normalization, every lane/scenario SHALL solve its
additive post-window pattern so realized latent terminal contrast equals the
declared truth exactly, including zero-truth lanes and the temporary pulse
after base trend/group/AR states are present.

For normalized base terminal contrast `b[d]`, sustained target `q[d]` SHALL add
`q[d]-b[d]` to all six post windows. Temporary pulse SHALL add `-b[d]` to all
post windows and then `+0.5` only to `w12..w14`, leaving terminal truth zero.

The fixed drift matrix SHALL contain `quantile_algorithm_drift`,
`run_definition_drift`, `active_membership_commitment_drift` changing the post-
period opaque active-set commitment from `active-set-a` to `active-set-b` at
fixed `k==cohort_size` without member rows, `eligible_day_denominator_drift` from
60 to 61, `surface_taxonomy_drift` from 12 to 13 surfaces, and
`understated_uncertainty` with reported SE one-half true SE and reported
covariance one-quarter true covariance. Each SHALL run at `{6,12}` groups for
30 seeds, for 360 drift slots. Drift seed SHALL equal
`2_056_250_000 + 1_000*drift_ordinal + 100*group_ordinal + replication_index`.
Every drift slot SHALL otherwise freeze `k=16`, primary DGP truth
`(+.5,+.5,+.5)`, directions `(+1,+1,+1)`, and a sustained six-post-window
pattern in its compiled key. No caller/default value SHALL fill these fields.
Quantile drift SHALL additionally bind the fixed conformance fixture's wrong-
algorithm result.
The first five scenarios SHALL reject before fit in all 60 slots each. The
understated-uncertainty scenario SHALL retain every planned result row and
produce scenario HOLD because at least one lane/group 80% coverage rate is below `74%`; otherwise
the control fails. Invariant primary movement SHALL NOT be mislabeled as drift.

All 1,920 primary/targeted/drift slots, including structural rejections, SHALL
be freshly recomputed in a separately identified phase. Combine SHALL require exact key-set equality,
canonical ordering, and byte-matched results under one clean source, runtime,
native-library, single-thread, lockfile, implementation, and plan identity.
Missing, extra, duplicate, reordered, off-plan, stale, symlinked, copied-across-
phase, or runner-error rows SHALL remain failures in the denominator and SHALL
HOLD the full study.

Every original and recomputation case SHALL run in a new process with a process-
local OS-entropy token, distinct phase token, process/start identity, executable
hash, and interpreter/native-library identity. Phase tokens, process tokens,
checkpoint roots, and create-once manifests SHALL be disjoint. Recompute SHALL
read only immutable plan/runtime/generator inputs, SHALL refuse every primary
result/artifact/checkpoint, and SHALL regenerate before computation. Each
attestation SHALL bind its own process/phase token, prepared-input hash,
semantic-result hash, executable/runtime roots, and freeze commit. Publication
SHALL recompute those hashes and require distinct fresh-execution attestations
and byte-equal semantic results.

All interval gates SHALL use `weighted_quantile_v1`: require finite values and
weights, unique stable support indices, nonnegative weights, and finite strictly
positive total weight; remove zero-weight supports and reject if none remains;
sort retained supports by movement value and stable support index; normalize
weights; place support `i` at midpoint CDF
`cumulative_weight_before_i+weight_i/2`; use endpoint values outside the
midpoint range and linear interpolation inside. Deterministic supports use
their weights and NUTS draws use equal weights in chain-major/draw-major order.
The 80% equal-tail interval SHALL be `[Q(.10),Q(.90)]` and the 99% equal-tail
interval `[Q(.005),Q(.995)]`. Coverage SHALL include endpoints. On the
direction-adjusted scale, null false movement SHALL require 99% lower endpoint
strictly greater than zero.

Every primary lane/cell observed 80% coverage rate SHALL remain in the compiled
`74-86%` band. Each of the 36 targeted cells with `N=30` SHALL report its point
rate and a two-sided exact Clopper-Pearson interval using
`alpha_cell=.05/36`: lower zero for `x=0` else
`BetaPPF(alpha_cell/2,x,N-x+1)`, upper one for `x=N` else
`BetaPPF(1-alpha_cell/2,x+1,N-x)`, under pinned `scipy.stats.beta.ppf`. Every
targeted interval SHALL intersect `[.74,.86]`; point rates SHALL NOT be forced
into the band, and cells SHALL NOT pool or rescue one another. Structural drift
rejections SHALL have no coverage gate. Understated uncertainty SHALL
separately require at least one lane/group point rate below `.74` and HOLD. In each null replication, a
familywise internal false-movement flag SHALL be true when any lane in the
scenario's frozen zero-truth set has a direction-adjusted 99% internal lower
endpoint strictly greater than zero. The worst null cell SHALL remain at or below the compiled `5%`
maximum. These SHALL be internal synthetic validation constants only and SHALL
NOT become runtime-configurable product or customer thresholds.

For every nonzero-truth primary or targeted lane, absolute aggregate posterior-
mean bias SHALL be computed separately per `(scenario,panel_group_count,lane)`
as `abs(sum(posterior_mean_j-truth_j)/N)`, with `N=200` primary or `N=30`
targeted. It SHALL be at most `0.10` pre-period SD and that cell's mean estimate
SHALL have the truth sign. Cross-lane, cross-scenario, or cross-group pooling
SHALL be forbidden.

Each lane SHALL pass independently. Single-lane and composition-rotation
scenarios SHALL recover the declared lane truths, while null lanes, the
correlated null, and temporary-pulse terminal result SHALL obey the same
familywise `<=5%` rule. Averaging SHALL NOT rescue a failed lane.

The null-truth sets SHALL be all lanes for primary effect `0`, the two unmoved
lanes for each single-lane scenario, all lanes for `correlated_null`, Breadth
only for `composition_rotation`, and all lanes for the temporary-pulse terminal
estimand.

The proof SHALL include floor controls at `k={4,5,8,10,12,16}` crossed with both
panel-group counts. Floor seed SHALL equal
`2_056_300_000 + 10*k_ordinal + group_ordinal`. The ordinal maps SHALL be
`k={4:0,5:1,8:2,10:3,12:4,16:5}` and
`panel_group_count={6:0,12:1}`. Every floor control SHALL require
`cohort_size==k` and use invariant primary DGP truth
`(+0.5,+0.5,+0.5)`, directions `(+1,+1,+1)`, and no other mutation. Only
`k=4` SHALL reject under
the existing aggregate minimum. `k={5,8,10,12,16}` MAY run as numerical
controls, but `k={5,8}` SHALL remain valid internal-only and validation-
ineligible below the inherited `k>=10` series/read-path evidence floor. That
expected state SHALL NOT HOLD the full study. `k={10,12,16}` SHALL pass that
floor, and `k=16` SHALL remain primary-study provenance rather than a new
runtime admission threshold.

The exact ordered negative controls SHALL be
`common_availability_shock`, `depth_context_perturbation`, `weak_history`,
`zero_pre_period_variance`, `engagement_ceiling`, `breadth_ceiling`,
`missing_window`, `suppressed_window`, `stale_window`, `imputed_window`,
`duplicate_window`, `off_plan_window`, `legacy_composite_input`,
`breadth_duplicated_in_velocity`, `numeric_depth_dependency`,
`post_period_standardization`, `lookahead_window`,
`lane_window_misalignment`, `blueprint_target_contamination`,
`outcome_contamination`, `fluency_contamination`, `semantic_hash_drift`,
`copied_recompute`, `direct_identifier`, `raw_content`, `real_data_flags`,
`runner_error`, `partial_study`, `self_completion`,
`unsafe_output_flags`, `missing_joint_covariance`,
`permuted_covariance_lane_order`, `covariance_diagonal_mismatch`, and
`non_psd_covariance`, in exactly that ordinal order.

The common-shock control SHALL retain valid internal noncausal trajectory state
with every output flag false. The Depth-context perturbation SHALL retain
identical prepared inputs/fits and terminal truth zero. Weak/missing/suppressed/
stale/imputed/duplicate/composite/duplication/Depth/standardization/lookahead/
misalignment/contamination/identifier/raw/real controls SHALL reject or HOLD at
the exact stage and fixed mutation defined by the contract. Semantic hash drift,
copied recompute, runner error, and partial study SHALL HOLD the full study.
Self-completion and unsafe outputs SHALL reject the artifact.
The final four controls SHALL independently remove covariance, permute its lane
order, mismatch one SE against its diagonal, and inject the exact non-PSD
matrix frozen in the contract; each SHALL reject before fit.

Ceiling controls SHALL mutate a valid generated package after generation to
the exact ordered distributions `{59,60,60,60}` for Engagement or
`{11,12,12,12}` for Breadth across pre windows, rehash all semantic ancestors,
skip inverse/context regeneration, and reject at the p50-domain gate. Covariance
controls SHALL likewise start from valid base covariance `C`: missing removes
the field; lane-order sets `(breadth,engagement,frequency)` without changing
canonical lane children; diagonal mismatch sets frequency SE to
`1.1*sqrt(C[0,0])`; and non-PSD sets `D @ R_bad @ D` with
`D=diag(base_SE)` and `R_bad=[[1,.9,.9],[.9,1,-.9],[.9,-.9,1]]`. Every changed
semantic root SHALL be recomputed. Required-field, lane-order, diagonal, and PSD
validation SHALL occur in that order after the p50-domain gate. Any other
failure stage or runner error SHALL fail the control.

Every negative control SHALL run once at each group count, for 68 slots, using
`2_056_400_000 + 10*control_ordinal + group_ordinal` for ordinals `0..33`.
All twelve floor and 68 negative controls SHALL be freshly rerun. With the
1,920 primary/targeted/drift slots, the exact complete non-NUTS evidence set
SHALL contain 2,000 original cases plus 2,000 recomputations, and every expected
result SHALL be conjunctive.

#### Scenario: Full synthetic proof is numerically complete

- **GIVEN** exact concordance, all 2,000 replicated/floor/control cases, all
  2,000 fresh recomputations, and no hard failure or wrong expected result
- **WHEN** the future combiner validates exact plan and provenance equality
- **THEN** it may emit a summary-only internal synthetic non-authorizing
  artifact
- **AND** the generated artifact keeps independent acceptance and parent task
  completion false

#### Scenario: Null study exceeds the familywise gate

- **GIVEN** any null cell has more than `5%` replications with a false movement
  flag in at least one active lane
- **WHEN** the full study is combined
- **THEN** the study HOLDS and names the null gate
- **AND** no lane or passing non-null cell can rescue the artifact

### Requirement: VBD Proof Completion And Separate Integration Boundary

The future generated artifact SHALL remain synthetic-only, aggregate-only,
internal, noncausal, summary-only, and nonauthorizing. It SHALL bind immutable
semantic hash roots for plan, implementation, runtime/native libraries,
lockfile, freeze ancestry/receipt, per-lane observations, panel/partition,
transforms, uncertainty, preparation, fit, diagnostics, slot results,
recomputation, controls, and artifact-byte roots. It SHALL NOT bind or predict
later review decisions. It SHALL NOT
contain raw posterior draws, latent paths, input arrays, respondent rows,
person-level fields, direct identifiers, raw events, prompts, outputs,
transcripts, or unsafe source detail.

Acceptance SHALL occur in strict order: commit the full summary artifact and
byte-derived compact summary; obtain exact-byte CODE, BUG, ADVERSARIAL, and
statistical-methodology GO decisions; create and commit a separate self-hashed
acceptance record binding those evidence hashes and completed reviews without
altering either evidence file; then obtain explicit human acceptance of the
exact acceptance-record bytes. Parent task `5.6` SHALL remain incomplete until
the implementation, full proof, fresh recomputation, independent reviews,
acceptance record, and bounded human acceptance are all separately verified.
The current scalar
`velocity_exposure` interface SHALL NOT accept a three-lane result through
aliasing or post-result compression. Integration reconciliation and renewed
outcome-model proof SHALL remain a separate blocker before dogfood execution,
not part of task `5.6`.

That integration change SHALL also reconcile the legacy outcome HOLD on
missing Depth context: omitted, suppressed, or changed non-numeric Depth
context SHALL leave numerical inputs, fit, diagnostics, and eligibility
identical, while every numerical Depth dependency SHALL still reject.

The exact evidence universe SHALL be 30 concordance bundle executions with 90
nested NUTS, 90 nested primary deterministic, and 90 nested fresh-deterministic-
recomputation lane fits, plus 2,000 original deterministic cases and 2,000
fresh deterministic recomputations, for 4,030 top-level bundle/case records,
plus four canary records and 270 nested concordance fit records: 4,034 top-level
records in total. Process attestations SHALL be bound children rather than
extra slots. The reviewed evidence commit SHALL contain one full summary artifact and one byte-
derived compact summary; a later acceptance commit SHALL contain one separate
self-hashed acceptance record. No other execution or document SHALL be silently
included or substituted.

The contract SHALL NOT authorize real/live/customer/production data,
confidence or probability output, routes, UI, persistence, connectors,
exports, customer readouts, ROI, finance, causality, productivity, ranking,
new canonical events, new suppression reasons, tunable product thresholds,
DiD work, or promotion.

#### Scenario: Passing artifact attempts to complete its own proof

- **GIVEN** a generated artifact has passing numerical summaries but sets
  independent acceptance, parent completion, promotion, execution, or output
  authorization true
- **WHEN** the future bridge validates it
- **THEN** the artifact rejects
- **AND** only exact-byte reviews followed by a separate self-hashed acceptance
  record and explicit human acceptance of that record may record bounded
  synthetic proof completion after full evidence exists

#### Scenario: Passing trajectories are compressed for the outcome model

- **GIVEN** a future caller averages, selects, aliases, or otherwise compresses
  frequency and engagement after observing results to satisfy the current
  scalar Velocity interface
- **WHEN** integration governance validates the binding
- **THEN** integration HOLDS
- **AND** the exact outcome-model interface and affected proof gates require a
  separate approved change

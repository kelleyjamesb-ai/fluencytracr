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

No caller tolerance SHALL be accepted. Raw generated covariance SHALL be
validated before canonicalization and the canonical covariance/SE package SHALL
be revalidated. Raw covariance SHALL be an exact native 3x3 NumPy binary64
array; coercible alternate dtypes or array subclasses SHALL reject before
conversion. For
`s=max(max(abs(covariance)),max(abs(se^2)))`, `s` SHALL be finite and positive,
symmetry and diagonal/SE-square error divided by `s` SHALL each be `<=1e-12`,
and pinned-runtime `eigvalsh(covariance/s)` minimum SHALL be `>=-1e-10`, all
before symmetrization or repair. These SHALL be compiled
internal numerical tolerances only. Each canonical SE SHALL additionally equal
the exact canonicalization of the square root of its matching canonical
covariance diagonal.

Every hash-bound synthetic or source-bootstrap-oracle distribution percentile,
transformed p50, transformed marginal standard error, and covariance element
SHALL use the compiled
`python_binary64_format_13_significant_digits_v1` boundary before evidence
hashing and preparation: Python binary64 general formatting with `.13g`, parsed
back to binary64, with negative zero normalized to `0.0`. Generation and
regeneration SHALL apply the identical operation, and noncanonical evidence
SHALL reject even after coordinated rehashing. The canonical transformed p50
and standard error SHALL be the admitted model inputs; preparation and model
calculation SHALL apply no further canonicalization. Prepared, fit, diagnostic,
and result hashes SHALL remain bound to the exact platform/native runtime and
SHALL NOT claim cross-platform numeric identity. Canonical evidence hashes SHALL
commit canonical values rather than raw floating intermediates; raw provenance
SHALL remain separately bound by source-private or synthetic implementation/
seed/runtime identities. The precision SHALL NOT be configurable or interpreted
as a product threshold, caller tolerance, or authorization to repair invalid
evidence.
Canonical evidence numerics SHALL retain native float representation; integer,
Boolean, float-subclass, and negative-zero alternatives SHALL reject even when
value equality and dependent hashes would otherwise reconcile.

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
contract. Beneath the unchanged accepted 8,192-point outer integration, the
repaired deterministic engine SHALL evaluate the conditional-Normal mixture
directly under `conditional_normal_mixture_quantile_v2`. It SHALL generate all
8,192 Sobol nodes, preserve their zero-based original ordinals, evaluate every
node, and keep each finite binary64 log weight with its matching conditional
moments. In original ordinal order it SHALL apply pinned
`scipy.special.logsumexp` to every finite log weight and `numpy.exp` to each
log-normalized candidate. It SHALL retain exactly candidates whose normalized
binary64 weights are finite and strictly greater than zero, preserve their
relative original ordinal order in a native `numpy.float64` vector, compute
`retained_sum` with exactly
`float(numpy.sum(retained_candidates,dtype=numpy.float64))`, require a finite
strictly positive sum, and compute final weights with exactly
`numpy.asarray(retained_candidates/retained_sum,dtype=numpy.float64)`. It SHALL
compute ESS as
`float(1.0/numpy.sum(final_weights**2,dtype=numpy.float64))` and maximum weight
as `float(numpy.max(final_weights))`, then apply the unchanged retained-count
`>=4096`, ESS `>=256`, and maximum-normalized-weight `<=.05` gates. It SHALL NOT
apply a floor, epsilon, tolerance, clipping, replacement, merged component,
alternate point, different reduction/reordering, or exclusion of a represented
positive weight.

The integration diagnostics, fit semantic hash, and fresh recomputation SHALL
bind `generated_point_count=8192`, `finite_log_weight_count`,
`retained_weight_count`, commitments to the retained and excluded ascending
zero-based original ordinal lists, and one retention-record hash over those
fields. Each ordinal commitment SHALL be `sha256_json` of
`{"algorithm":"vbd_outer_weight_ordinals_v1","ordinals":[...]}`. The retained
and excluded lists SHALL be disjoint, duplicate-free, in range, and an exact
partition of `0..8191`. It SHALL require
`len(retained_ordinals)==retained_weight_count`,
`len(excluded_ordinals)==generated_point_count-retained_weight_count`, and
`retained_weight_count<=finite_log_weight_count<=generated_point_count`. The
retention-record hash SHALL be `sha256_json` of exactly this object with no
additional keys and with placeholders replaced by the fit's exact integer and
lowercase-SHA-256 values:

```json
{
  "algorithm": "binary64_representable_normalized_weight_retention_v1",
  "excluded_sobol_ordinal_commitment": "<lowercase-sha256>",
  "finite_log_weight_count": 0,
  "generated_point_count": 8192,
  "retained_sobol_ordinal_commitment": "<lowercase-sha256>",
  "retained_weight_count": 0
}
```

`outer_weight_retention_hash` itself SHALL NOT enter that preimage. Neither
ordinal list nor any weight/support value SHALL be emitted. Missing, stale,
malformed, forged, inconsistent, or recomputation-mismatched retention evidence
SHALL HOLD.

With the resulting retained positive weights it SHALL compute exact mixture
moments and evaluate
`F(x)=sum_i w_i*Phi((x-m_i)/s_i)`. For each
`p in {.005,.10,.90,.995}`, initial bounds SHALL be the outward `nextafter`
values around the minimum and maximum component quantiles
`m_i+s_i*ndtri(p)`. The bracket SHALL satisfy `F(lower)<=p<=F(upper)`. Exactly
64 binary64 bisection iterations SHALL move `upper` when `F(mid)>=p` and
`lower` otherwise; the returned endpoint SHALL be the final upper bound.
Pinned SciPy `ndtr` and `ndtri` SHALL be used. Empty support, nonfinite input,
nonpositive variance, a caller-supplied nonpositive/nonfinite weight,
nonpositive/nonfinite retained total weight, failed bracketing, or a nonfinite
result SHALL HOLD. The outer integrator SHALL remove its own unrepresented
binary64 zeros before calling the mixture helper. No fallback, caller
tolerance, adaptive iteration count, method switch, or support reordering is
permitted.

The standard-Normal endpoint oracle SHALL exactly equal binary64 hex values
`(-0x1.49b4c64d69160p+1,-0x1.4813c36e26d32p+0,
0x1.4813c36e26d33p+0,0x1.49b4c64d69160p+1)` in probability order. The
unequal-mixture oracle with weights `(0.35,0.65)`, means `(-0.4,0.7)`, and SDs
`(0.6,1.1)` SHALL exactly equal mean `0x1.428f5c28f5c28p-2`, SD
`0x1.17007814169ffp+0`, and endpoint hex values
`(-0x1.070d647d89159p+1,-0x1.f4c4b60ce6076p-1,
0x1.d2857797c387dp+0,0x1.aec938ed2fe2fp+1)`. The retired 16-point
Gauss-Hermite support SHALL NOT enter a repaired VBD fit. The NUTS engine SHALL
sample the matching conditional scalar at every retained draw. Neither engine
SHALL emit a latent path.

Each plan SHALL freeze one ordered three-lane direction vector with components
in `{+1,-1}` before generated truth or post-period evidence is inspected. With
`C` groups, each lane's exact raw contrast SHALL
equal `sum(c,t=15..17,mu)/(3*C) - sum(c,t=0..11,mu)/(12*C)` with equal group and
window weights, then multiply by the matching direction-vector component. The posterior SHALL use
fixed-interval smoothing conditional on exactly `w00..w17`, no later window,
and no forecast. The trajectory model SHALL select no lag. Downstream lags
belong to a separate predeclared integration plan.

#### Scenario: Conditional-Normal tails are recovered without discretization

- **GIVEN** the standard-Normal and unequal-mixture conformance oracles
- **WHEN** the repaired deterministic engine computes all 80% and 99% endpoints
- **THEN** every binary64 moment and endpoint matches exactly
- **AND** selecting `normal_quadrature_v1` or any caller-provided method HOLDS

#### Scenario: Binary64 underflow is handled without a numerical floor

- **GIVEN** all 8,192 planned Sobol nodes are generated and every finite log
  weight is normalized in original ordinal order
- **AND** binary64 represents one or more mathematically positive normalized
  tail weights as positive zero
- **WHEN** the deterministic engine constructs its mixture
- **THEN** it retains and renormalizes exactly the finite strictly positive
  represented weights in their original relative order
- **AND** it applies the unchanged retained-count, ESS, and maximum-weight gates
- **AND** it binds all required counts and ordinal commitments without a floor,
  tolerance, point substitution, seed change, or support reordering

#### Scenario: Representability evidence is incomplete or forged

- **GIVEN** a deterministic fit omits or alters a count, ordinal commitment, or
  retention-record hash, or a fresh recomputation derives different values
- **WHEN** the fit or study is validated
- **THEN** it HOLDS even when its posterior summaries otherwise match
- **AND** caller-supplied zero, negative, or nonfinite mixture weights still
  HOLD at the generic helper boundary

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

Before replacement candidate `S`, the precision repair SHALL run two
permanently non-admissible full-setting development bundles. Ordinal `0` SHALL
use effect `0`, six groups, and bundle seed `2_055_900_100`; ordinal `1` SHALL
use effect `0.5`, twelve groups, and bundle seed `2_055_900_101`. Chain seeds
SHALL be `2_055_900_200+20*ordinal+4*lane_ordinal+chain_index`; PPC seeds SHALL
be `2_055_900_300+10*ordinal+lane_ordinal`. Every lane SHALL run the repaired
full settings in ordinal/lane order, remain
`HOLD(precision_canary_nonacceptance)`, emit no evidence, and stay outside all
acceptance counts. Each bundle SHALL finish inside the amended compiled
7,200-second primary bundle-child timeout, replacing the held implementation's
600-second child timeout, and clear all otherwise applicable sampler, PPC, and
cross-engine checks before candidate `S`. Failure SHALL block `S` and SHALL NOT
trigger a retry, setting change, seed change, or adaptive extension under this
amendment.

The validated ordinal-`0` precision canary run from source commit
`c7014906918b3be4e40e0c312421383c66f2960a` SHALL remain permanent HOLD because
its only reported otherwise-applicable failing category was `mcse`. Failure-
record commit `afda2e6f2ce2645e35cb3b315a7c4c249b245993` SHALL remain the
immutable status anchor. No later path may retry, resume, extend,
reconstruct, relabel, or clear that canary, and ordinal `1`, task `2.6`,
replacement candidate `S`, concordance, and evidence SHALL remain blocked.

One separate `vbd_precision_design_diagnostic_v1` MAY be specified only for a
later separately authorized implementation and execution. It SHALL use effect
`0`, six groups, `k=16`, generator seed `2_055_900_400`, and chain seeds
`2_055_900_500+4*lane_ordinal+chain_index` for the existing lane and chain
ordinals. Those thirteen seeds SHALL be reserved exclusively for this
diagnostic identity, and every other smoke, canary, concordance, or study plan
SHALL reject them. It SHALL use the unchanged generator, likelihood, priors, estimand,
centered parameterization, four chains, 20,000 retained draws, 5,000 tuning
draws, `target_accept=.999`, `max_treedepth=15`, `jitter+adapt_full`,
`cores=1`, `blas_cores=1`, and 7,200-second bundle-child timeout. It SHALL run
all three lanes in canonical order, SHALL NOT run PPC or deterministic
concordance, and SHALL record those checks as `NOT_RUN`, never passing.

For every required parameter in canonical order, the diagnostic SHALL retain
the five separately named MCSE/posterior-SD ratios at exact retained-draw
prefixes 5,000, 10,000, and 20,000 per chain; R-hat and bulk/tail ESS at each
prefix; 0.5% and 99.5% quantile ESS at each prefix; and four chain-indexed 0.5%
and 99.5% endpoint offsets from the pooled endpoint, each divided by the pooled
posterior SD at that prefix. Each prefix SHALL use the first exact retained
draws from every chain without thinning, reordering, chain dropping, tuning
draws, or offset selection; every ratio SHALL use that prefix's independently
recomputed pooled posterior SD. For this six-group case, exact parameter order
SHALL be `alpha`, `beta`, `sigma_u`, `u[0]`, `u[1]`, `u[2]`, `u[3]`, `u[4]`,
`u[5]`, `sigma_r`, `rho`, `trajectory_movement`, yielding exactly 12 parameter
rows per lane/prefix and 108 total. The complete matrix SHALL be emitted whether a
coordinate passes or fails. The record SHALL derive the complete full-prefix
set of ratios strictly greater than `0.10` and the unique worst coordinate by
stable lane, parameter, and endpoint order. It SHALL retain lane-level
divergence and treedepth-saturation counts, BFMI values, exact non-MCSE sampler
failure-category names, and every immutable source/runtime/lockfile/model/
input/seed/attempt/result binding required by the contract.

The diagnostic SHALL retain no absolute MCSE, posterior SD, posterior mean,
interval endpoint, latent state, draw, PPC value, deterministic result,
synthetic panel array, path, acceptance slot, or evidence count. It SHALL be
create-once and permanently `HOLD(mcse_design_diagnostic_nonacceptance)` with
exact `state=HOLD`,
`hold_reasons=["mcse_design_diagnostic_nonacceptance"]`, zero evidence
eligibility, and zero acceptance-count effect. Its no-extra-key `record_hash`
SHALL equal `sha256_json` over the exact validated record with only
`record_hash` removed. A launch anchor
SHALL be created before the child starts; timeout, crash, malformed output,
binding failure, or write failure SHALL consume the authorization and SHALL NOT
permit retry, continuation, or replacement under the same amendment.

Before future execution, a reviewed clean implementation commit `D` SHALL
receive exact CODE, BUG, ADVERSARIAL, and statistical-methodology GO. A sole-
child authorization commit `A` SHALL differ only by one sanitized manifest
binding `D`, its tree, those four unique GO references, runtime, lockfile,
model, plan, exclusive seeds, standalone bootstrap, exact command, and one
absolute canonical workspace plus external attempt-claim root. Four-role
review SHALL verify the one-file `D..A` diff, and a human SHALL separately
authorize execution against exact `A`. Workspace and claim-root identities
SHALL be fixed absolute paths predeclared in the `A` manifest, SHALL NOT depend
on the future `A` commit hash, SHALL NOT be caller inputs, and SHALL be
identical from every checkout. The later human record and external claim SHALL
bind both paths to exact `A`. The bootstrap SHALL atomically create the workspace-independent
claim before sampling and bind the human execution-authorization hash. Any
second invocation for `A`, including from another empty workspace, SHALL reject
before sampling. The sanitized result SHALL bind `A`, its manifest, the human
authorization hash, all four review references, the canonical workspace, and
the external claim.

The human execution decision SHALL be a create-once, no-extra-key record at
the exact path bound by the `A` manifest. Its exact keys SHALL bind schema,
exact `A`, manifest, scope, decision reference/text hash/timestamp, integer
one-launch maximum, workspace, external claim root, command, and authorization
hash. Its hash SHALL be derived from the exact record with only its hash field
removed. Mutation, replacement, a second record, or another path SHALL reject
before sampling.

The public command SHALL execute a manifest-hash-bound standalone standard-
library bootstrap directly under isolated `-I -S -B`; `-m`, repository
`PYTHONPATH`, checkout imports, and unverified site-package imports SHALL be
forbidden. The bootstrap SHALL verify its own bytes, `A`, and reviewed `D` Git
blobs before installing the existing deny-by-default frozen-source loader.
Freeze,
concordance, study, recomputation, artifact, and acceptance validators SHALL
reject this schema categorically even when it is internally valid and rehashed.
Its result MAY inform only a later separately reviewed prospective precision-
design amendment and SHALL NOT satisfy task `2.6` or authorize a sampler
change. `mcse_design_diagnostic_nonacceptance` SHALL remain an internal
inference-development state and SHALL NOT become a canonical suppression
reason or customer-facing output.

#### Scenario: A precision canary is offered as evidence

- **GIVEN** a complete passing diagnostic record from either precision canary
- **WHEN** freeze, concordance, combination, or acceptance validates it
- **THEN** it remains HOLD and is excluded from every count and denominator
- **AND** rehashing cannot remove `precision_canary_nonacceptance`

#### Scenario: The MCSE diagnostic is used to clear the failed canary

- **GIVEN** a complete, hash-valid `vbd_precision_design_diagnostic_v1` record
- **WHEN** any canary, freeze, concordance, study, artifact, or acceptance path
  validates it
- **THEN** the record remains `HOLD(mcse_design_diagnostic_nonacceptance)` and
  is rejected from every proof count, denominator, and gate
- **AND** neither a passing coordinate nor a self-consistent rehash can clear
  canary ordinal `0`, run ordinal `1`, or complete task `2.6`

#### Scenario: The one-shot diagnostic is repeated after a failed launch

- **GIVEN** the diagnostic launch anchor exists, including after timeout,
  crash, malformed output, binding failure, or write failure
- **WHEN** a caller retries, resumes, extends, replaces, or reuses any seed or
  checkpoint under this amendment
- **THEN** validation rejects before sampling
- **AND** a later diagnostic or precision design requires a new docs/OpenSpec
  amendment and separate authorization

#### Scenario: A second workspace is used to bypass the diagnostic claim

- **GIVEN** exact authorization commit `A` has an external attempt claim
- **WHEN** the command is invoked from another checkout, directory, workspace,
  authorization record, or output path
- **THEN** the `A` manifest supplies the same canonical workspace and external
  claim root
- **AND** validation rejects before any generator or sampler work

The authorized `vbd_precision_design_diagnostic_v1` launch SHALL remain a
consumed permanent uninterpretable HOLD. Its exact implementation commit SHALL
be `50636e6721bf6b8e8e9269106a218527a159a94e`; authorization commit SHALL be
`7e4f5f00f6d826ccd771b2553350608bedb0f0e0`; human execution-authorization hash
SHALL be
`1c8d781a6835a338b7e69a0d8d4de7d8d61b57f28db7364adee6d475d9d17c64`;
external claim hash SHALL be
`f9a512969703833b73e27f902bc79f78d5dfd50504f49ea1d431e335006a89fc`;
and input-binding hash SHALL be
`3726b313662d6de51fe1252f9212664bda664e628343d0ac5d747f5763eb7a43`.
The launch SHALL NOT be described as a failed MCSE result because no sanitized
parameter row, staged output, or final diagnostic record survived projection.
It supports no conclusion about MCSE, ESS, R-hat, BFMI, mixing, or tail
precision.
No later implementation may retry, resume, continue, reconstruct, reinterpret,
delete, replace, or reuse its commit, authorization, claim, binding, workspace,
seed, or output identity.

One separate `vbd_precision_design_diagnostic_v2` MAY be specified only after a
later separately authorized implementation and execution. It SHALL use the same
effect `0`, six groups, `k=16`, generator, likelihood, priors, estimand,
centered parameterization, three canonical lanes, required parameters, prefix
definitions, sanitized matrix, NUTS settings, 7,200-second timeout, permanent
HOLD state, proof-path exclusion, and `<=0.10` MCSE gate defined for V1. It
SHALL NOT run PPC or deterministic concordance. It SHALL use newly reserved
generator seed `2_055_900_600` and chain seeds
`2_055_900_700+4*lane_ordinal+chain_index`, yielding exactly
`2_055_900_700..711`. These thirteen seeds SHALL be exclusive to the V2
identity; every generic smoke, precision canary, V1 diagnostic, concordance,
study, recomputation, artifact, and acceptance path SHALL reject them.

Before any V2 projection, the projector SHALL require order-insensitive exact
string-key-set equality between posterior data-variable names and
`{alpha,beta,trajectory_movement,sigma_u,u,sigma_r,rho}`. Missing or extra
variables, non-string or coerced keys, and malformed variables SHALL reject.
After exact-set validation, the projector SHALL access every posterior and
ArviZ diagnostic variable by its canonical name and SHALL emit the unchanged
flattened parameter order `alpha`, `beta`, `sigma_u`, `u[0]`, `u[1]`, `u[2]`,
`u[3]`, `u[4]`, `u[5]`, `sigma_r`, `rho`, `trajectory_movement`. PyMC storage
order, mapping insertion order, and DataTree traversal order SHALL NOT affect
emitted row identity or order. All existing dimension, coordinate-label,
cardinality, finite-value, and no-extra-key checks SHALL remain conjunctive.

Before implementation `D2` is reviewable, a sampler-free full-shape conformance
fixture SHALL construct the production PyMC model and route deterministic test
arrays through the production PyMC/DataTree/ArviZ identity and projector entry
point. It SHALL use PyMC's natural posterior storage order
`alpha,beta,trajectory_movement,sigma_u,u,sigma_r,rho`, exactly four chains,
exactly 20,000 retained-draw positions, and exactly six ordered `u` coordinates.
It SHALL exercise every 5,000/10,000/20,000 prefix and prove that canonical
output rows and hashes equal those from identical values presented in canonical
storage order, without invoking a sampler. A manually reordered fake trace,
reduced chain/draw shape, omitted variable, or bypass of the production
conversion boundary SHALL NOT satisfy the fixture. No fixture array or derived
estimate may enter a diagnostic result or committed evidence.

V2 SHALL write an observational checkpoint chain under a new fixed external
checkpoint root bound by authorization `A2`. The exact phase/lane sequence SHALL
be:

1. ordinal `0`, `claim_created`, lane `null`;
2. ordinal `1`, `input_bound`, lane `null`;
3. ordinals `2..4`, `lane_sampling_started`, `lane_sampling_completed`, and
   `lane_projection_completed` for lane `frequency`;
4. ordinals `5..7`, the same three phases for lane `engagement`;
5. ordinals `8..10`, the same three phases for lane `breadth`; and
6. ordinal `11`, `result_ready_for_publication`, lane `null`.

The exact checkpoint filename allowlist SHALL be:

1. `checkpoint-00-claim_created-global.json`;
2. `checkpoint-01-input_bound-global.json`;
3. `checkpoint-02-lane_sampling_started-frequency.json`;
4. `checkpoint-03-lane_sampling_completed-frequency.json`;
5. `checkpoint-04-lane_projection_completed-frequency.json`;
6. `checkpoint-05-lane_sampling_started-engagement.json`;
7. `checkpoint-06-lane_sampling_completed-engagement.json`;
8. `checkpoint-07-lane_projection_completed-engagement.json`;
9. `checkpoint-08-lane_sampling_started-breadth.json`;
10. `checkpoint-09-lane_sampling_completed-breadth.json`;
11. `checkpoint-10-lane_projection_completed-breadth.json`; and
12. `checkpoint-11-result_ready_for_publication-global.json`.

Each no-extra-key checkpoint SHALL contain exactly `schema`,
`diagnostic_identity`, `implementation_commit`, `authorization_commit`,
`authorization_manifest_hash`, `human_execution_authorization_hash`,
`attempt_claim_hash`, `input_binding_hash`, `ordinal`, `phase`, `lane`,
`predecessor_checkpoint_hash`, `created_at_utc`, and `checkpoint_hash`.
`schema` SHALL equal `vbd_precision_design_diagnostic_checkpoint_v2`;
`diagnostic_identity` SHALL equal `vbd_precision_design_diagnostic_v2`;
identity hashes SHALL match `D2`, `A2`, and their admitted records;
`input_binding_hash` SHALL be `null` only at ordinal `0` and SHALL equal the
exact admitted V2 input-binding hash at ordinals `1..11`;
`predecessor_checkpoint_hash` SHALL be `null` only at ordinal `0` and otherwise
equal the preceding checkpoint hash; and `checkpoint_hash` SHALL equal
`sha256_json` over the exact validated record with only `checkpoint_hash`
removed. Every checkpoint SHALL be atomically create-once and immutable.

Before each create-once write, strict whole-root enumeration SHALL equal exactly
the already-written allowlist prefix and no other directory entry. After
ordinal `11`, strict whole-root enumeration SHALL equal all twelve allowlisted
filenames exactly; unknown, missing, duplicate, aliased, non-regular, or off-
plan entries SHALL reject. The checkpoint writer SHALL accept only the exact
filename and phase/lane pair at the next ordinal. Checkpoints SHALL contain no draws, absolute or relative estimates,
diagnostic values, messages, exception text, tracebacks, filesystem paths,
panel values, source rows, unsafe data, or caller-defined fields. The bootstrap,
runner, and child SHALL NOT read any checkpoint to select work, skip a phase,
resume, retry, continue, reconstruct, or reuse a seed. Checkpoint presence SHALL
never create launch authority. Missing, extra, malformed, duplicated, replaced,
or reordered checkpoints SHALL leave the already consumed launch
uninterpretable HOLD; deletion or repair SHALL NOT permit another launch. A V2
result SHALL be published atomically only after
`result_ready_for_publication` is durably created and SHALL bind that complete
ordinal-`0..11` terminal checkpoint hash as provenance only. Both the final
result and complete checkpoint root SHALL be required for internal diagnostic
validity. A checkpoint SHALL NOT supply, reconstruct, or alter a statistical
result field, and neither that binding nor a complete checkpoint chain can
satisfy a canary, proof, acceptance, or task-`2.6` gate.

Future V2 implementation SHALL require a clean commit `D2` with exact CODE,
BUG, ADVERSARIAL, and statistical-methodology GO. A sole-child manifest-only
authorization commit `A2` SHALL bind `D2`, its tree, four unique GO references,
the replacement identity and seeds, runtime, lockfile, production-path fixture,
standalone bootstrap, exact command, and new fixed workspace, claim,
checkpoint, human-authorization, and result paths. Four-role review SHALL
verify the one-file `D2..A2` diff. A separate create-once human execution record
against exact `A2` SHALL precede one new launch. V1's `D`, `A`, reviews, human
authorization, claim, bindings, paths, and consumed seeds SHALL satisfy no V2
gate. V2 SHALL remain permanently
`HOLD(mcse_design_diagnostic_nonacceptance)`, SHALL contribute zero evidence,
and SHALL NOT complete task `2.6`, authorize canary ordinal `1`, or alter any
model, prior, estimand, NUTS setting, statistical threshold, acceptance seed,
or evidence gate.

The authorized `vbd_precision_design_diagnostic_v2` launch SHALL remain a
consumed permanent uninterpretable HOLD. Its exact implementation commit SHALL
be `051a919ffb7d581838e321a52676ba06bf233d71`; authorization commit SHALL be
`3646e08b5b07d2b82aef510688133273a857d795`; human execution-authorization hash
SHALL be
`52752fe99da24c77991d10d403185d9a9bdaf0610722eb7a52cf4beac27dc789`;
external claim hash SHALL be
`b1f3ed124be6a51328df5e4c38499a6742e585086f47613667c6be33e0a5d272`;
input-binding hash SHALL be
`6036f595c5c0c48f440c8193a817ff871394d7d5f9402ef9bbf93105c6d60504`;
and persisted output SHA-256 SHALL be
`3bd984074aa43ea7fa8453766a974379e34b6418eb04782fdb00d0df86d860bf`.
All three samplers, in-memory projections, and twelve checkpoints completed,
but the persisted output SHALL remain invalid because canonical JSON object
sorting conflicted with insertion-order-dependent nested-map validation and
the bootstrap did not semantically revalidate the deserialized record before
success. The launch SHALL support no MCSE, ESS, R-hat, BFMI, divergence,
mixing, or tail-precision conclusion. No later implementation may retry,
resume, continue, rewrite, reorder, reconstruct, reinterpret, delete, replace,
or reuse any V2 commit, authorization, review, claim, binding, workspace, seed,
checkpoint, output, or statistical value.

One separate `vbd_precision_design_diagnostic_v3` MAY be implemented and
executed only through later distinct gates. It SHALL preserve the complete V2
synthetic-case design and DGP, model, priors, estimand, centered
parameterization, lane and parameter definitions, prefix matrix, NUTS settings,
7,200-second timeout, permanent HOLD state, proof-path exclusion, and `<=0.10`
MCSE gate while generating a fresh V3-seeded realization. It SHALL reserve
generator seed `2_055_900_800` and chain seeds
`2_055_900_900+4*lane_ordinal+chain_index`, yielding exactly
`2_055_900_900..911`, exclusively for V3. Every V1/V2 diagnostic, generic
smoke, precision canary, concordance, study, recomputation, artifact, and
acceptance path SHALL reject those seeds, and V3 SHALL reject every V1/V2 seed
and identity. Its reviewed `A3` manifest SHALL bind new fixed workspace, claim,
checkpoint, human-authorization, and output roots that share no identity with
V1 or V2.

Those V3 paths SHALL be exactly
`/Users/jameskelley/.codex/evidence/vbd-mcse-diagnostic-v3-workspace`,
`/Users/jameskelley/.codex/evidence/vbd-mcse-diagnostic-v3-claim`,
`/Users/jameskelley/.codex/evidence/vbd-mcse-diagnostic-v3-checkpoints`, and
the direct workspace child `diagnostic.json`. After lexical normalization, the
three top-level roots SHALL be absolute, pairwise distinct, pairwise
non-ancestral, non-symlink directories, and unequal to or outside the ancestry
of every V1/V2 workspace, claim, or checkpoint root. A symlink, alternate path
identity, equality, parent/child overlap, or output outside the direct V3
workspace child SHALL reject before generation or sampling.

Every V3 JSON object SHALL be parsed with duplicate-key rejection and validated
by order-insensitive exact equality to its compiled string-key set. After
exact-set validation, values SHALL be accessed only through compiled canonical
name sequences. In particular, `mcse_to_posterior_sd_ratios` SHALL contain
exactly `mean`, `interval_80_lower`, `interval_80_upper`,
`interval_99_lower`, and `interval_99_upper`, while
`chain_endpoint_offsets` SHALL contain exactly `q005` and `q995`; insertion
order and canonical JSON sorting SHALL have no semantic role. Ordered lists
SHALL remain order-sensitive, including lanes, prefix/parameter rows,
coordinates, chain-indexed values, failure-category names, and checkpoints.
Missing, extra, duplicate, non-string, coerced, or mislabeled keys SHALL reject
even after a self-consistent rehash.

Before a V3 child may report success, it SHALL validate the complete in-memory
record and checkpoint root, write canonical create-once staged bytes, strictly
reread the staged bytes, rerun complete record reconstruction and checkpoint
validation, and require exact semantic and canonical-byte equality with the
validated in-memory record. Before publication, the manifest-bound reviewed
bootstrap SHALL independently apply complete V3 semantic and checkpoint
validation to those persisted staged bytes. After atomic publication, it SHALL
reopen the final path, require exact byte identity with the validated staged
bytes, rerun complete semantic and checkpoint validation, and only then return
zero or emit the result. Any failure SHALL produce no successful publication,
no usable diagnostic result, and no launch authority; the consumed attempt
SHALL remain permanent HOLD and SHALL NOT be retried.

V3 SHALL inherit V2's exact twelve checkpoint ordinals, phase/lane sequence,
filename allowlist, no-extra-key field set, predecessor hash chain,
input-binding rules, atomic create-once writes, strict whole-root enumeration,
regular-file/no-alias requirements, terminal-result binding, and prohibition on
checkpoint-based resume, retry, continuation, phase skipping, reconstruction,
seed reuse, or launch authority. Only the checkpoint schema and diagnostic
identity plus the bound `D3`, `A3`, human-authorization, claim, input-binding,
and V3 root hashes SHALL change to V3. Missing, extra, duplicated, replaced,
aliased, reordered, malformed, or V1/V2 checkpoint content SHALL reject both
staged and final semantic validation.

Before implementation `D3` is reviewable, sampler-free tests SHALL construct a
complete valid V3 record and checkpoint root, serialize with canonical sorted
object keys, strictly reread it, and prove identical validated semantics and
hashes for every valid nested-map insertion order. They SHALL prove rejection
for missing, extra, duplicated, or mislabeled endpoint keys, canonical but
semantically invalid staged bytes, mutation between validation and publication,
and a final value that differs from the validated staged bytes. A two-field or
otherwise partial placeholder record SHALL NOT satisfy publication coverage.
Tests SHALL also reject every partial/extra/aliased checkpoint root and every
equal, ancestral, symlinked, alternate, or V1/V2 root identity. No test
generator, posterior draw, or statistical value may enter evidence.

Sampler-free V3 full-record rehearsals SHALL be repeatable before `D3` review.
They SHALL use deterministic fixture values and temporary roots, SHALL create
no external claim or execution authorization, SHALL invoke no generator or
sampler, SHALL retain no posterior result, and SHALL remain permanently
ineligible for canary, proof, evidence, acceptance, or methodology conclusions.
The one-shot/no-retry rule SHALL begin only after exact `D3` review,
manifest-only `A3`, separate human authorization, and irreversible creation of
the manifest-bound external V3 claim. It SHALL continue to apply unchanged to
all later acceptance-plan executions.

#### Scenario: A sampler-free engineering rehearsal is repeated

- **GIVEN** a deterministic full-record V3 fixture with no generator, sampler,
  posterior result, external claim, or acceptance identity
- **WHEN** an engineer repeats serialization, readback, publication, or tamper
  checks before `D3` review
- **THEN** the rehearsal may run again and remains permanently non-evidentiary
- **AND** it cannot consume or satisfy the future one-shot V3 authorization

Future V3 implementation SHALL require a clean commit `D3` with exact CODE,
BUG, ADVERSARIAL, and statistical-methodology GO. A sole-child manifest-only
authorization commit `A3`, separately reviewed and separately authorized by a
human, SHALL be required before one V3 launch. V1/V2 review references,
authorizations, claims, roots, checkpoints, and outputs SHALL satisfy no V3
gate. V3 SHALL remain permanently
`HOLD(mcse_design_diagnostic_nonacceptance)`, SHALL contribute zero evidence,
and SHALL NOT complete task `2.6`, authorize canary ordinal `1`, create
candidate `S/F`, or alter any model, prior, estimand, sampler setting,
statistical threshold, acceptance seed, or evidence gate.

#### Scenario: Canonical JSON reorders a valid endpoint object

- **GIVEN** a complete V3 record whose nested endpoint objects have exact keys
  in any insertion order
- **WHEN** canonical serialization sorts those object members and strict
  semantic readback runs
- **THEN** validation reads values by canonical name and preserves identical
  row, lane, and record hashes
- **AND** ordered lists remain in their frozen semantic order

#### Scenario: Persisted endpoint evidence is incomplete or duplicated

- **GIVEN** canonical staged bytes with a missing, extra, duplicated, coerced,
  or mislabeled endpoint key
- **WHEN** strict JSON and V3 semantic validation run
- **THEN** validation rejects even when all remaining hashes were recomputed
- **AND** no final artifact is published

#### Scenario: Canonical staged bytes are semantically invalid

- **GIVEN** staged bytes that are valid canonical JSON but fail full record or
  checkpoint reconstruction
- **WHEN** the bootstrap prepares publication
- **THEN** it rejects before linking the final output and returns no success
- **AND** canonical byte shape cannot substitute for semantic validity

#### Scenario: Final persisted bytes differ after publication

- **GIVEN** staged bytes passed strict semantic and checkpoint validation
- **WHEN** the final path is reopened after atomic publication
- **THEN** exact byte equality and complete semantic/checkpoint validation are
  required again before success
- **AND** any difference, unreadable value, or validation failure remains HOLD

#### Scenario: Consumed V2 identity is offered to V3

- **GIVEN** any V2 commit, authorization, review, claim, input binding, root,
  seed, checkpoint, output, or rehashed statistical value
- **WHEN** V3 implementation, authorization, launch, or result validation runs
- **THEN** it rejects before generation or sampling
- **AND** V2 remains permanent uninterpretable HOLD

#### Scenario: A V3 root aliases or overlaps another root

- **GIVEN** a V3 workspace, claim, or checkpoint root that equals, contains,
  descends from, or resolves through a symlink to another V3 or V1/V2 root
- **WHEN** V3 authorization or launch validation runs
- **THEN** it rejects before generation or sampling
- **AND** path aliasing cannot create or reuse launch authority

#### Scenario: The V3 checkpoint root is incomplete or off-plan

- **GIVEN** a partial, extra, duplicated, replaced, aliased, reordered,
  malformed, or V1/V2 checkpoint entry
- **WHEN** staged or final V3 semantic validation runs
- **THEN** the exact inherited twelve-record protocol rejects
- **AND** no checkpoint can resume a launch or supply a statistical result

The completed V3 launch SHALL remain a valid, permanent, non-evidentiary
diagnostic HOLD. Its exact implementation commit SHALL be
`ba33f9dec9051a90ae8b7d211a6010c44be8464b`; authorization commit SHALL be
`590a768eb620d6385017ae585fb422083436fb20`; execution-authorization hash
SHALL be
`b662ec996264796af7efe897081e2f8bc1398eba1b344f01a21cddfa122e55c5`;
claim hash SHALL be
`478b2d085663b57e1c4fb11400cc07c3ff61c1c331a3a6e10b10a4d7dfb93437`;
input-binding hash SHALL be
`b404254b82381c82da76ae5f5749303f145b6bacd6e8def0d2bd603584d23a03`;
artifact SHA-256 SHALL be
`e043fc2f03b5c9a993db351c37f4b4acb6f2a3cbfb09f5a0165c62b6dd4f0b6b`;
record hash SHALL be
`44f2080f78eed19c21611a4f3f832b79072caadbb222d6068435a6fe89240461`;
and terminal checkpoint hash SHALL be
`e2a4721f25c5fc72490fefd9aee0f42ba3b9ebdae484fad1c484ebe5aa6d2076`.

The exact record SHALL continue to report no full-prefix MCSE ratio above
`0.10`, worst ratio `0.06254455102442738`, and post-warmup divergence
counts `21`, `2`, and `0` in frequency, engagement, and Breadth order.
R-hat, bulk/tail ESS, BFMI, and treedepth SHALL remain passing context only.
The divergence counts SHALL prevent any interpretation that the centered
geometry is gate-clear. Neither passing MCSE nor a rehash SHALL clear the V3
HOLD, the consumed precision canary, task `2.6`, or any proof stage.

The completed `vbd_group_effect_geometry_diagnostic_v1` SHALL be the sole
authorized instance of this frozen paired diagnostic. It SHALL
compare exactly two parameterization arms on the same fresh synthetic panel
within each case/lane. The centered arm SHALL retain
`u ~ ZeroSumNormal(sigma=sigma_u, shape=C)`. The non-centered arm SHALL use
`u_std ~ ZeroSumNormal(sigma=1, shape=C)` and deterministic
`u=sigma_u*u_std`. The non-centered representation SHALL preserve the induced
prior on `u`, its exact zero-sum constraint, every other prior, the
marginalized AR covariance, likelihood, estimand, and common posterior target.
It SHALL NOT change `sigma_r`, `rho`, `trajectory_movement`, the DGP,
lane definitions, or any statistical threshold.

The paired diagnostic SHALL contain exactly these aggregate-`k=16` cases:

- ordinal `0`: effect `0`, six panel groups, generator seed
  `2_055_900_920`;
- ordinal `1`: effect `0.5`, twelve panel groups, generator seed
  `2_055_900_921`.

For case ordinal `i`, lane ordinal `d`, and chain index `c`, centered
chain seed SHALL be `2_055_900_930+12*i+4*d+c`; non-centered chain seed SHALL
be `2_055_900_960+12*i+4*d+c`. The centered range SHALL therefore be
`2_055_900_930..953`, and the non-centered range SHALL be
`2_055_900_960..983`. All 50 generator and chain seeds SHALL be reserved
exclusively for this diagnostic and rejected by every V1/V2/V3, precision
canary, generic smoke, concordance, study, recomputation, and acceptance path.
No seed may be substituted, reused, or rotated.

Execution order SHALL be case ordinal, canonical lane ordinal, then exact arm
order `centered,noncentered`. Both arms SHALL use four chains, 20,000 retained
draws, 5,000 tuning draws, `target_accept=.999`,
`max_treedepth=15`, `jitter+adapt_full`, `cores=1`, and
`blas_cores=1`. One deterministic state-space reference and one fresh
deterministic recomputation SHALL be bound per case/lane before either arm is
interpreted. PPC and acceptance concordance SHALL be `NOT_RUN`, never
passing.

For each arm, the exact common posterior quantities SHALL be `alpha`, `beta`,
`sigma_u`, `u[0..C-1]`, `sigma_r`, `rho`, and
`trajectory_movement`. The non-centered arm SHALL additionally retain
sanitized sampler diagnostics for every `u_std[0..C-1]` coordinate, but
`u_std` SHALL have no deterministic-reference or product interpretation.
Both arms SHALL reconstruct common summaries in the existing canonical order
and compare independently to the same deterministic reference. Mean
differences SHALL remain `<=0.15` reference posterior SD; each lower and upper
80% and 99% endpoint difference SHALL remain `<=0.20` reference posterior SD;
and SD ratios SHALL remain within `[0.85,1.15]`.

Every non-centered parameter and common quantity SHALL pass the existing hard
sampler gates without modification: R-hat `<=1.01`, bulk/tail ESS `>=400`,
zero divergences, zero treedepth saturation, BFMI `>=0.3`, and each separately
named mean/80%-endpoint/99%-endpoint MCSE-to-posterior-SD ratio `<=0.10`.
Centered-arm diagnostics SHALL be retained as paired context and SHALL NOT be
used to weaken any non-centered gate.

The no-extra-key result classification SHALL be derived mechanically with exact
precedence. Identity, schema, provenance, source/reference bindings, complete
case/lane/arm matrix, and runner completion SHALL validate first. Any failure
at that boundary SHALL be exclusively `INVALID_HOLD`, and no other
classification SHALL be evaluated. For a complete structurally valid result:

- `REJECT_NONCENTERED_CANDIDATE` SHALL apply when any non-centered hard sampler
  gate or deterministic-reference comparison fails.
- `SUPPORTED_FOR_LATER_CONTRACT_AMENDMENT` SHALL require every non-centered hard
  sampler gate and deterministic-reference comparison to pass; every centered
  model-identity and deterministic-reference comparison and every centered
  non-divergence hard sampler gate to pass; no non-centered lane to have more
  divergences than its centered pair; and at least one centered lane with
  positive divergences to have zero in its non-centered pair.
- `INCONCLUSIVE_CENTERED_GEOMETRY_NOT_REPRODUCED` SHALL require both arms to
  pass every hard sampler and deterministic-reference gate and every centered
  fit to have zero divergences.
- Every remaining complete state, including a centered non-divergence or
  deterministic-reference failure, SHALL be `INVALID_HOLD` and support no
  methodology decision.

Every result SHALL remain permanently
`HOLD(parameterization_geometry_diagnostic_nonacceptance)`, SHALL have zero
evidence eligibility and acceptance-count effect, and SHALL be rejected by
canary, freeze, concordance, study, artifact, bridge, and acceptance
validators. This internal diagnostic label SHALL NOT become a canonical
product suppression reason. A supported result MAY authorize only a later
docs/OpenSpec proposal for the mathematically equivalent parameterization and
fresh replacement precision-canary identities. It SHALL NOT itself change
runtime code, complete task `2.6`, create `S/F`, or start concordance or
evidence.

Implementation SHALL require separate explicit human authorization after
exact-byte CODE, BUG, ADVERSARIAL, and statistical-methodology GO for this
amendment. Repeatable sampler-free model-shape, variable-set,
canonical-projection, posterior-identity, and malformed-record fixtures MAY
run before exact implementation review and SHALL remain non-evidentiary. A
completed full diagnostic is recognized only because it used a clean
implementation commit, four exact GO reviews, a sole-child manifest-only
authorization commit, a separate exact human execution record, one fixed
external launch permit and claim, and one complete launch. The reviewed
bootstrap SHALL first atomically consume and
durably sync the manifest-bound one-launch permit, then atomically create,
durably sync, and strictly revalidate the fixed external claim before it starts
any child, imports candidate generator code, generates data, or invokes a
sampler. A crash or failure after permit consumption, including claim-
establishment failure, SHALL leave the launch permanently consumed; every
second invocation SHALL reject before numerical work, and output produced
without the valid claim SHALL be unclassifiable `INVALID_HOLD`. After claim
creation, retry, resume, adaptive extension, arm omission, seed substitution,
and result-conditioned model change SHALL be forbidden.

The completed launch SHALL remain bound to implementation
`28521d0d30aa713f77484e3172c05df0838b08e6`, authorization
`709dea164cc3e0c77e5b077a9b1d90a875c11948`, manifest hash
`91f7a73a5cbfe98acb8bc708cf9547dd1f4f7b7fcb423b79dd411f22e7f1371c`,
execution-authorization hash
`da919576c0b2749b9b6dbddee8f05f67d7bd51a1f1107bc64f79dda58bffbe0b`,
claim hash
`433df470d10409a652d078c088309b3277105e6a6f347514ec9c25f4079b774b`,
input-binding hash
`84209f80ee86632a0ad7300af81395f788a2e886e33deec9c2513c6831ef360a`,
completion-receipt hash
`a242903c742f026169054bdf6fddca2d1e14d274049628f9e60d14b62dca4c12`,
artifact SHA-256
`1fda8dab47c8563af77e85dc3a2095fde49fd87c09bc83afa24cbbb1a34d6339`,
and record hash
`a25e9141d5ae0372a4d92851f5e1ddf92265829fa3ae7033ab42a863cd50c1f8`.
Strict persisted validation SHALL continue to reconstruct exactly twelve arms,
234 sampler rows, and 180 deterministic-reference comparisons.

The exact result SHALL remain `REJECT_NONCENTERED_CANDIDATE`. Case-0 Breadth
`u_std[5]` failed the unchanged 99% lower-endpoint MCSE-ratio gate with
`0.11256762551677787`; case-1 Frequency `u[2]` failed the unchanged 99% upper-
endpoint MCSE-ratio gate with `0.24197029311231413` and the unchanged 99%
upper-endpoint deterministic-reference gate with
`0.23954276555797224`. Every non-centered arm recorded zero divergences, but
divergence improvement SHALL NOT offset either failed accuracy gate. The
artifact SHALL remain permanent HOLD with zero evidence and acceptance-count
effect; task `2.6`, replacement `S/F`, concordance, calibration, and every
later proof stage SHALL remain blocked. No retry, resume, seed rotation,
adaptive extension, threshold change, or result-conditioned model change is
permitted.

#### Scenario: V3 MCSE passes while centered sampling diverges

- **GIVEN** the exact valid V3 artifact with all 180 full-prefix MCSE ratios at
  or below `0.10` and divergence counts `21/2/0`
- **WHEN** methodology readiness is evaluated
- **THEN** the passing retained-draw MCSE-ratio criterion SHALL NOT offset the
  zero-divergence failure or establish target-faithful exploration
- **AND** V3 and task `2.6` SHALL remain HOLD

#### Scenario: The non-centered arm removes a reproduced divergence

- **GIVEN** every paired record, deterministic reference, source binding, and
  gate result is complete and structurally valid, every centered
  non-divergence gate passes, and every non-centered gate passes
- **WHEN** at least one centered lane diverges and its non-centered pair has
  zero divergences without another non-centered failure
- **THEN** the result MAY be
  `SUPPORTED_FOR_LATER_CONTRACT_AMENDMENT`
- **AND** it SHALL remain non-evidentiary and shall not change runtime behavior

#### Scenario: Fresh centered cases do not reproduce the geometry

- **GIVEN** both arms pass every gate and every centered fit has zero
  divergences
- **WHEN** the paired diagnostic is classified
- **THEN** it SHALL be
  `INCONCLUSIVE_CENTERED_GEOMETRY_NOT_REPRODUCED`
- **AND** absence of a reproduced failure SHALL NOT prove noncentering is
  necessary

#### Scenario: The non-centered target or sampler gate differs

- **GIVEN** any common posterior comparison fails, any non-centered hard gate
  fails, or any arm/case/lane is missing or off-plan
- **WHEN** result classification runs
- **THEN** the candidate SHALL be rejected or invalid HOLD as predeclared
- **AND** no threshold, seed, draw count, or model component may be changed in
  response

### Requirement: VBD Group-Effect Marginalization Diagnostic Is Exact And Non-Evidentiary

The completed `vbd_group_effect_geometry_diagnostic_v1` result SHALL remain
`REJECT_NONCENTERED_CANDIDATE` and permanent
`HOLD(parameterization_geometry_diagnostic_nonacceptance)` under its exact
artifact, record, seed, authorization, and review bindings. Its zero-divergence
noncentered fits SHALL NOT offset the failed 99% endpoint MCSE and deterministic-
reference gates. It SHALL NOT be retried, extended, reweighted, rehashed,
reinterpreted, or admitted to any canary, proof, evidence, or acceptance count.

The prospective `vbd_group_effect_marginalization_diagnostic_v1` SHALL change
only the computational representation of the zero-sum group effects.
`alpha` and `beta` SHALL remain named sampled parameters with their existing
independent Normal priors. `sigma_u`, `sigma_r`, and `rho` SHALL remain
sampled under their unchanged HalfNormal, HalfNormal, and bounded Uniform
priors. NUTS posterior variables SHALL be exactly
`alpha,beta,sigma_u,sigma_r,rho`. Neither `u` nor
`trajectory_movement` SHALL be sampled, stored as a posterior pseudo-draw, or
replaced by a conditional mean. Full collapse of `alpha` or `beta`,
noncentering, partial pooling drift, prior duplication, or any other model
change SHALL reject.

Let `B` be the exact prepared `C x (C-1)` Helmert basis,
`P=B B'=I-11'/C`, `Z` the group-incidence matrix, `A=Z B`,
`F=[1,tau]`, `gamma=(alpha,beta)`, `K` the existing block-diagonal
stationary AR(1) covariance, `D=diag(known_se^2)`, `R=K+D`, and
`e=y-F gamma`. For each sampled `sigma_u`, the implementation SHALL define
`U=sigma_u A`, `W=I+U'R^-1 U`, and `V=R+U U'`, and SHALL evaluate exactly

```text
log p(y | gamma,sigma_u,sigma_r,rho) =
  -0.5 * (n*log(2*pi) + log|V| + e'V^-1 e)

log|V| = log|R| + log|W|
q = R^-1 e
b = U' q
e'V^-1 e = e' q - b' W^-1 b
```

All solves and log determinants SHALL use positive-definite Cholesky
factorization. Explicit matrix inversion, a singular density on `u`,
blockwise group likelihoods after marginalization, an omitted determinant,
a duplicated `u` prior, or independent group blocks in place of the full
negative cross-group covariance `P` SHALL reject. The production collapsed
target SHALL be implemented independently from the deterministic engine; it
SHALL NOT call the primary engine's conditional-Gaussian evaluator to make its
own target appear concordant.

For every original chain/draw index `j`, standardized Helmert coordinates
SHALL have the exact component distribution

```text
z_j | y,gamma_j,sigma_u_j,sigma_r_j,rho_j
  ~ Normal(W_j^-1 U_j'R_j^-1 e_j, W_j^-1)
u_j = B * (sigma_u_j*z_j)
```

For the existing latent-level contrast `ell`, define
`G_j=K_j+sigma_u_j^2 Z P Z'` and `V_j=G_j+D`. The movement component SHALL
be exactly

```text
movement_j | y,gamma_j,sigma_u_j,sigma_r_j,rho_j ~ Normal(
  ell'F gamma_j + ell'G_j V_j^-1 e_j,
  ell'(G_j - G_j V_j^-1 G_j)ell
)
```

Each `u[c]` and movement summary SHALL be the equal-weight direct
conditional-Normal mixture over the original unflattened chain-by-draw grid.
The implementation SHALL preserve the joint `u`-AR conditional covariance.
Adding separate marginal variances, treating conditional components as
independent observations, discretizing them, drawing pseudo-support, using
antithetic values, or substituting their means SHALL reject.

For a reconstructed quantity, each outer draw provides component CDF
`F_j`, density `f_j`, mean `m_j`, and variance `s_j^2`. The mixture
endpoint `q_p` SHALL solve `mean_j(F_j(q_p))=p` directly for
`p={.10,.90,.005,.995}`, and the full mixture posterior variance SHALL be
`mean_j(s_j^2+m_j^2)-mean_j(m_j)^2`. The chain-shaped endpoint influence
channel SHALL be

```text
psi[p,j] = (p - F_j(q_p)) / mean_j(f_j(q_p))
```

A nonfinite endpoint, nonfinite or nonpositive mixture density, nonpositive
mixture variance, malformed chain grid, or changed coordinate order SHALL
reject. The five diagnostic channels SHALL be the unflattened `m_j` array and
the four endpoint-influence arrays. Chain-aware mean MCSE SHALL be computed for
each channel and divided by the full mixture posterior SD. The worst R-hat and
minimum bulk/tail ESS across the same five channels SHALL be retained, not a
pseudo-draw diagnostic. Every ratio SHALL remain `<=0.10`, every R-hat
`<=1.01`, and every bulk/tail ESS `>=400`.

Sampled `alpha`, `beta`, `sigma_u`, `sigma_r`, and `rho` SHALL retain
the existing trace diagnostics and five separately named mean/80%-endpoint/
99%-endpoint MCSE ratios. All twelve fits SHALL independently require R-hat
`<=1.01`, bulk/tail ESS `>=400`, zero divergences, zero treedepth
saturation, BFMI `>=0.3`, and every MCSE/posterior-SD ratio `<=0.10`.
For the common quantities `alpha`, `beta`, `sigma_u`, `u[0..C-1]`,
`sigma_r`, `rho`, and `trajectory_movement`, deterministic-reference
mean differences SHALL remain `<=0.15` reference SD, every lower/upper 80%
and 99% endpoint difference `<=0.20` reference SD, and SD ratios within
`[0.85,1.15]`. No average, lane, case, or diagnostic family may rescue
another failure.

The diagnostic SHALL contain exactly four aggregate-`k=16` cases in this
order:

- ordinal `0`: effect `0`, six panel groups, generator seed
  `2_055_901_000`;
- ordinal `1`: effect `0`, twelve panel groups, generator seed
  `2_055_901_001`;
- ordinal `2`: effect `0.5`, six panel groups, generator seed
  `2_055_901_002`; and
- ordinal `3`: effect `0.5`, twelve panel groups, generator seed
  `2_055_901_003`.

For case ordinal `i`, canonical lane ordinal `d`, and chain index `c`, the
chain seed SHALL be `2_055_901_100+12*i+4*d+c`, producing exactly
`2_055_901_100..147`. The four generator and 48 chain seeds SHALL be a new
exclusive diagnostic namespace, rejected by generic smoke, every V1/V2/V3 and
geometry diagnostic, both precision canaries, concordance, study,
recomputation, and acceptance paths. No seed may be substituted, rotated, or
reused.

Execution order SHALL be case ordinal, then canonical lane ordinal. Every one
of the twelve fits SHALL use four chains, 20,000 retained draws, 5,000 tuning
draws, `target_accept=.999`, `max_treedepth=15`,
`jitter+adapt_full`, `cores=1`, and `blas_cores=1`. One deterministic
state-space reference and one fresh deterministic recomputation SHALL be
generated independently and bind each fit before classification. Their strict
canonical semantic summaries and reference hashes SHALL match exactly; any
mismatch SHALL be exclusively `INVALID_HOLD` before numerical
classification. PPC, acceptance concordance, canary state, and proof eligibility
SHALL be `NOT_RUN` or false, never passing. The complete record SHALL contain
exactly twelve fit records, 60 sampled trace-parameter rows, 120 reconstructed-
quantity rows each containing exactly five named channel-diagnostic records
(600 channel records total), and 180 common-quantity deterministic-reference
comparisons.

Before any future governed launch, repeatable sampler-free fixtures SHALL prove
for both `C=6` and `C=12`: exact prepared Helmert identity and
`B B'=P`; low-rank log-density and automatic gradient agreement with an
independently constructed dense `Normal(F gamma,V)`; conditional `u` and
movement moments against direct joint-Gaussian conditioning; exact mixture
moments, endpoints, and influence channels; chain-major shape; and zero-sum
reconstruction. Negative fixtures SHALL reject omitted determinants, duplicated
priors, changed design, known SE, contrast, covariance, or parameter set,
malformed dimensions/labels, conditional-mean substitution, and any call from
the candidate target into the primary target evaluator.

Diagnostic PPC SHALL remain `NOT_RUN`. A sampler-free future-PPC oracle MAY
use fixed supplied standard-Normal arrays only and SHALL apply them in this
order for each selected outer state: one `C-1` Helmert-coordinate conditional
draw, then by group ordinal one conditional AR-state draw and one new
known-SE observation-error draw. It SHALL preserve the joint conditional
distribution and SHALL NOT create a reconstruction seed or result. Any later
change to the accepted proof PPC requires its own docs/OpenSpec amendment and
must preserve the already frozen evidence seed formulas.

The no-extra-key classification SHALL validate exact identity, source/runtime/
plan bindings, all fixture hashes, complete case/lane matrix, exact row counts,
exact deterministic reference/recomputation equality, runner completion, and
persisted semantic readback before evaluating numerical results:

- `REJECT_GROUP_EFFECT_MARGINALIZATION_CANDIDATE` SHALL apply to every complete
  structurally valid result with any sampler, influence-channel, mixture, or
  deterministic-reference gate failure.
- `SUPPORTED_FOR_LATER_REFERENCE_CONTRACT_AMENDMENT` SHALL require every
  structural, target-equivalence, sampler, influence-channel, mixture, and
  deterministic-reference gate to pass in all twelve fits.
- Every missing, extra, duplicate, malformed, off-plan, hash-invalid,
  identity-invalid, runner-error, write/read-invalid, or otherwise unclassified
  state SHALL be exclusively `INVALID_HOLD`.

Every classification SHALL remain permanently
`HOLD(group_effect_marginalization_diagnostic_nonacceptance)`, have zero
evidence eligibility and acceptance-count effect, and be rejected by every
canary, freeze, concordance, study, artifact, bridge, and acceptance validator.
This internal diagnostic label SHALL NOT become a canonical product suppression
reason. A supported result MAY authorize only a later docs/OpenSpec amendment
that changes the reference design and reserves fresh precision-canary
identities. It SHALL NOT itself modify the current centered proof reference,
complete task `2.6`, create replacement `S/F`, or start concordance or
calibration.

Implementation SHALL require separate explicit human authorization after
exact-byte CODE, BUG, ADVERSARIAL, and statistical-methodology GO for this
amendment. A future launch SHALL additionally require clean implementation
`D`, exact-commit four-role GO, a separately reviewed sole-child manifest-only
authorization `A`, a separate exact human execution record, and one fixed
external permit and claim consumed before any candidate import, generation, or
sampling. Failure after consumption SHALL remain permanent HOLD. Retry,
resume, adaptive extension, seed substitution, result-conditioned change, and
reuse of any prior diagnostic state SHALL be forbidden. Until a supported
result and later amendment exist, the current centered-reference prohibition
against collapse and reconstruction SHALL remain in force for precision
canaries, concordance, and evidence.

The V1 launch SHALL remain consumed permanent `INVALID_HOLD` under
authorization commit `9e4010e2520f30f78ba40e0248e13dc546f2d346`, manifest
`bb50439dd69f0546a4e24a0bd16f351fb70d286df07024449c28a63a2053fbe1`,
execution authorization
`3ee0fd4305169f3533b86c56641508a33e064517e2fbf520ca038b9dfc71af4b`,
permit `d84faa9e55c5273fcf2690ebaa1739d6eb6cfc57c4eb8498c662ab9e1ecaa1a6`,
and claim `b4d9f84d38deb7059dab5e209e42db9671e60a6c7b9d292328e2b682c3ac7fc9`.
The child exited `1` with `ValueError`; no input binding, completion receipt,
output, record hash, or sampler call exists. The shared generator rejected the
V1 diagnostic plan before `_generate_base_paths`. V1 SHALL NOT be retried,
resumed, repaired in place, or reused.

A prospective `vbd_group_effect_marginalization_diagnostic_v2` SHALL preserve
the exact V1 model, priors, estimand, four cases, aggregate `k=16`, fit order,
deterministic references, reconstruction, sampler settings, thresholds, gates,
permanent HOLD, and proof exclusion. Its plan reference SHALL be
`plan:vbd-group-effect-marginalization-diagnostic-v2`, its seed namespace SHALL
be `group_effect_marginalization_diagnostic_v2_nonacceptance`, and its scenario
IDs SHALL be
`development_smoke_scenario_vbd_group_effect_marginalization_diagnostic_v2_case_i`.
It SHALL reserve generator seeds
`2_055_901_200..203` and chain seeds
`2_055_901_300+12*i+4*d+c`, exactly `2_055_901_300..347`. Its roots SHALL be
`/Users/james.kelley/.codex/evidence/vbd-group-effect-marginalization-diagnostic-v2-workspace`
and
`/Users/james.kelley/.codex/evidence/vbd-group-effect-marginalization-diagnostic-v2-lifecycle`.

Future V2 implementation SHALL explicitly admit only the exact V2 plan, case,
seed namespace, and runner token. A sampler-free production-wrapper fixture
SHALL reach `_generate_base_paths` and reject V1 and every off-plan identity.
Before permit creation, authorization preflight SHALL repeat the standalone
alternate-first-party-import-artifact scan.

#### Scenario: Consumed V1 identity is reused

- **GIVEN** any path presents a V1 root, seed, authorization, permit, claim,
  command, or workspace
- **WHEN** V2 admission runs
- **THEN** it SHALL reject before generation or sampling
- **AND** V1 SHALL remain permanent `INVALID_HOLD`

#### Scenario: V2 generator admission is not independently compiled

- **GIVEN** V2 lacks its exact admission branch or production-wrapper fixture
- **WHEN** implementation review runs
- **THEN** V2 SHALL remain unauthorized
- **AND** no permit, claim, root, generator, or sampler may run

#### Scenario: Marginal target drops zero-sum cross-group covariance

- **GIVEN** a candidate replaces `P=I-11'/C` with diagonal or independent
  group blocks, factors the likelihood by group, or omits a determinant
- **WHEN** sampler-free target validation runs
- **THEN** the candidate rejects before any governed launch
- **AND** self-consistent rehashing cannot make the changed posterior equivalent

#### Scenario: Reconstructed tails use pseudo-draws or conditional means

- **GIVEN** any `u[c]` or movement summary is formed from random pseudo-draws,
  discretized support, conditional means alone, or flattened component rows
- **WHEN** mixture or influence validation runs
- **THEN** the candidate rejects
- **AND** the unchanged tail-MCSE and reference gates still apply

#### Scenario: All marginalization diagnostic gates pass

- **GIVEN** the exact four-case, twelve-fit result is complete and every
  structural, target, sampler, influence, mixture, and reference gate passes
- **WHEN** classification runs
- **THEN** it is `SUPPORTED_FOR_LATER_REFERENCE_CONTRACT_AMENDMENT`
- **AND** it remains permanent HOLD and cannot change the proof reference

#### Scenario: One complete fit fails an unchanged gate

- **GIVEN** a structurally valid complete result with one failed sampled,
  reconstructed, mixture, or deterministic-reference gate
- **WHEN** classification runs
- **THEN** it is `REJECT_GROUP_EFFECT_MARGINALIZATION_CANDIDATE`
- **AND** no passing fit, average, extra draw, retry, or threshold change may
  rescue it

#### Scenario: Result matrix or persisted record is incomplete

- **GIVEN** any missing, extra, duplicate, off-plan, malformed, hash-invalid,
  runner-error, or persisted-validation failure
- **WHEN** classification runs
- **THEN** the result is exclusively `INVALID_HOLD`
- **AND** no numerical interpretation or later authorization is available

#### Scenario: Natural PyMC storage order reaches canonical projection

- **GIVEN** a full-shape sampler-free production-path fixture with the exact
  posterior variable set in PyMC's natural storage order
- **WHEN** the V2 identity and projection boundary validate it
- **THEN** variables are read by canonical name and rows are emitted in the
  frozen flattened parameter order
- **AND** storage order alone cannot cause rejection or alter row identity

#### Scenario: A posterior variable is missing or added

- **GIVEN** a rehashed posterior container with one required variable missing or
  one unrecognized variable added
- **WHEN** V2 projection validates the variable set
- **THEN** it rejects before diagnostic projection
- **AND** canonical name lookup cannot excuse an incomplete or expanded set

#### Scenario: The consumed V1 launch is offered as V2 authority

- **GIVEN** any V1 commit, authorization, claim, input binding, workspace, seed,
  checkpoint substitute, or output identity
- **WHEN** V2 implementation, authorization, launch, or result validation runs
- **THEN** it rejects before generation or sampling
- **AND** the V1 launch remains permanent uninterpretable HOLD

#### Scenario: A checkpoint is used to resume a consumed launch

- **GIVEN** any valid, partial, copied, repaired, or rehashed checkpoint chain
- **WHEN** a caller requests resume, retry, continuation, reconstruction, phase
  skipping, or seed reuse
- **THEN** the existing attempt claim rejects before generation or sampling
- **AND** checkpoints remain postmortem observations with no launch authority

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

The held lineage is permanently diagnostic-only HOLD: source
`e59181b56bcccde4872b84f6dc78370215c0197a`, freeze
`0287713dfba10bcaafc781f01218e931c70195e8`, manifest
`fea230dd1eca0192140b309c02b55574133ab0519d2293ec7245b200eb565d0f`,
workspace hash
`c82292eba08a350a289f0b19602b2b243456cb63805c636c201025a63aec1eba`,
and bundle-0 result hash
`ab640359fb1de8362e745c8bf3da08f588974b03c0d34c0e7da2707ed931817f`.
No repaired path may resume, relabel, rehash, reinterpret, copy, or combine any
old permit, launch, checkpoint, receipt, deterministic/NUTS sub-result, or
bundle result. The old bundle SHALL remain HOLD for MCSE, divergence, and
concordance failures under every later schema. Only a fresh reviewed `S`, new
sole-child `F`, fresh permits/workspace, and complete restart at bundle 0 MAY
contribute to the unchanged 30-bundle universe.

#### Scenario: Held pre-amendment evidence is offered to the repair

- **GIVEN** any identity or record from the held pre-amendment lineage
- **WHEN** a repaired development, concordance, or combination path validates
  its inputs
- **THEN** it rejects before sampling or combination
- **AND** self-consistent rehashing cannot rescue a passing old sub-result

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

The original pre-freeze concordance seed families rooted at
`2_056_000_000`, `2_056_020_000`, and `2_106_000_000` SHALL remain retired
after an interrupted mocked task-3 child test instantiated the first original
generator seed before candidate source commit `S` or freeze `F`. No fit, gate,
or numerical summary was produced or inspected. The replacement families
below SHALL be a one-time pre-freeze integrity rotation and SHALL NOT change
after reviewed candidate `S` and its manifest-only freeze child `F`.

The full proof SHALL first run PyMC NUTS concordance for five fixed seeds in
each cell of effects `{0, 0.2, 0.5}` pre-period SD by panel-group counts
`{6, 12}`. Cell order SHALL be lexicographic over those listed sets, with group
ordinal `6->0`, `12->1`, and
concordance seed SHALL equal
`2_056_500_000 + 10*cell_ordinal + seed_index` for `seed_index={0,...,4}`.
That bundle seed SHALL generate correlated data. For lane ordinals
`frequency=0`, `engagement=1`, `breadth=2`, explicit NUTS chain seed SHALL be
`2_056_520_000+1_000*cell_ordinal+100*seed_index+10*lane_ordinal+
chain_index` for chain indexes `0..3`; implicit or cross-bundle/lane/chain seed
reuse SHALL reject.
The repaired NUTS reference SHALL preserve the existing likelihood, priors,
named sampled parameters, centered zero-sum group-effect parameterization, and
all four existing chain-seed formulas. It SHALL use four chains, 20,000
retained draws and 5,000 tuning draws per chain, `target_accept=.999`,
`max_treedepth=15`, PyMC `jitter+adapt_full`, `cores=1`, and `blas_cores=1`
under the pinned runtime. It SHALL NOT use a collapsed target, noncentering,
post-hoc coefficient reconstruction, conditional-mean substitution,
antithetic draws, endpoint correction, lane-specific settings, retry,
extension, seed rotation, or result-conditioned parameterization.
Mean differences SHALL be `<=0.15` reference SD. The lower and upper endpoints
of both the 80% and 99% movement intervals SHALL be independently rederived,
and each endpoint difference SHALL be `<=0.20` reference SD. This SHALL include
the 99% lower endpoint used by the later null false-movement decision. SD ratios
SHALL remain within `[0.85,1.15]`. R-hat SHALL be
`<=1.01`, bulk/tail ESS `>=400`, divergences and treedepth saturation zero,
BFMI `>=0.3`, MCSE/SD `<=0.1`, and PPC p-values within `[0.05,0.95]`.
MCSE/SD SHALL be computed separately for the posterior mean, both 80%
endpoints, and both 99% endpoints. Every required parameter SHALL retain five
separately named MCSE values for mean, 80%-lower, 80%-upper, 99%-lower, and
99%-upper. A derived maximum SHALL NOT replace them. Every ArviZ diagnostic
array SHALL match the posterior parameter dimensions, coordinate labels, and
cardinality exactly before joining; positional truncation, reordered labels,
merged/duplicated/swapped endpoints, coordinate drift, or missing rows SHALL
HOLD. Each of the five MCSE/posterior-SD ratios SHALL independently remain
`<=0.1`.
Each hashed lane record SHALL name all four normalized endpoint differences,
and the compact diagnostic summary SHALL report separate worst-case 80% and
99% endpoint differences. Missing, merged, or ambiguously labeled endpoint
evidence SHALL HOLD.

#### Scenario: A geometry change alters the posterior target

- **GIVEN** a candidate collapses, noncenters, reconstructs, or substitutes any
  named sampled parameter or selects settings by lane/result
- **WHEN** the repaired reference manifest is validated
- **THEN** it rejects before sampling
- **AND** higher draw count cannot legitimize the changed target

#### Scenario: Endpoint MCSE evidence is incomplete

- **GIVEN** a parameter row merges, omits, duplicates, swaps, or reorders any
  of the five required mean/endpoint MCSE values
- **WHEN** diagnostics or combination validates the row
- **THEN** the lane HOLDS
- **AND** a derived maximum cannot replace endpoint-specific evidence

#### Scenario: An acceptance seed is changed by the repair

- **GIVEN** any generator, chain, or PPC seed differs from the frozen
  acceptance formulas
- **WHEN** the repaired plan or launch is validated
- **THEN** it rejects before generation or sampling
- **AND** disjoint precision-smoke seeds cannot be substituted into evidence

Every lane SHALL use the five exact `vbd_trajectory_ppc_v1` statistics defined
in the contract: pre/post mean movement, `ddof=1` between-group variance, mean
`ddof=1` within-group variance, maximum absolute global-mean deviation, and the
specified pooled lag-one centered ratio. All 80,000 retained draws SHALL feed
posterior summaries and diagnostics. PPC SHALL use exactly 4,000 fixed,
chain-balanced posterior states: for each chain, zero-based draw indexes SHALL
equal `20*j+10` for `j in {0,...,999}`, processed in stable chain-major and
increasing selected-draw order. Exactly one replicate per selected state SHALL
use
`ppc_seed=2_106_500_000+1_000*cell_ordinal+100*seed_index+
10*lane_ordinal`. Each one-sided upper-tail p-value SHALL
equal `count(T_rep>=T_observed)/4000`, ties included with no smoothing. Its
inclusive gate SHALL be `[.05,.95]`; formula, seed, order, or sidedness drift
SHALL HOLD.

Each replicate SHALL draw a fresh conditional smoothed AR(1) path followed by
new known-SE observation error under `Generator(PCG64DXSM(ppc_seed))`; it SHALL
NOT reuse a stored path or draw a new unconditional AR path. Predictive 80%
endpoints SHALL use `weighted_quantile_v1` with equal chain-major/draw-major
weights over the same selected states. The PPC generator SHALL initialize
exactly once. Missing, duplicated, off-grid, reordered, or unequally allocated
indexes; use of an unselected state; selected cardinality other than 4,000;
denominator drift; reseeding; or random-number-consumption drift SHALL HOLD.
The selector SHALL NOT be described or used as an autocorrelation correction.

The concordance universe SHALL be 30 bundle executions, each with three nested
primary deterministic, three nested NUTS, and three separately regenerated
fresh deterministic lane fits, for 90 primary deterministic, 90 NUTS, and 90
fresh deterministic records. Fresh deterministic processes SHALL refuse every
primary result/artifact/checkpoint, carry distinct attestations, and match
prepared-input and semantic-result hashes exactly. Bundle and nested-fit counts
SHALL remain distinct.
Every full generator and full-NUTS entry SHALL verify exact clean freeze `F`
before acceptance-seed admission or sampling. Combination SHALL independently
regenerate each compiled bundle and require exact ordered-panel,
lane-observation, and truth-receipt roots across its primary and all three fresh
deterministic processes. A child HOLD SHALL remain HOLD after combination, and
sampler and PPC failure counts SHALL remain disjoint.

#### Scenario: Replacement concordance is not a complete fresh universe

- **GIVEN** fewer than all 30 newly frozen bundle executions, any old-lineage
  record, or any missing fresh deterministic recomputation
- **WHEN** concordance combination evaluates completeness
- **THEN** the study HOLDS
- **AND** no old passing lane or sub-result can rescue the replacement universe

Every concordance and later validation child SHALL start under isolated Python
with site startup disabled, no repository `PYTHONPATH`, and no repository
working directory. Before any execution-module import, a standard-library-only
bootstrap SHALL verify the complete reviewed package source set received over
an inherited descriptor and SHALL install a deny-by-default in-memory loader.
The source bytes SHALL come from the candidate Git objects and match every
freeze-manifest file hash. The source bundle's manifest hash SHALL equal the
already-admitted launch receipt before any candidate blob is read. Missing
source, mutable-source fallback, package
startup before verification, or source-hash drift SHALL fail before execution.

While the external workspace lock is held, workspace JSON reads and
create-once writes SHALL traverse no-follow directory descriptors rooted at the
held workspace inode. Admitted intermediate directories SHALL remain
inode-bound and their device/inode identities SHALL be persisted in the
create-once workspace record. Root or subdirectory substitution SHALL fail and
SHALL NOT redirect evidence I/O or silently roll back completed work. Exact-
tree and evidence-snapshot enumeration SHALL use held descriptors rather than
mutable workspace pathname traversal. A later validation workspace SHALL persist the
canonical external concordance receipt path, path hash, device, and inode,
rerun full external concordance verification on every load, and require the
local receipt copy to equal that externally recomputed receipt. A local
shape-only verification token SHALL NOT admit replicated validation.

Workspace initialization SHALL preallocate one sibling expendable launch
permit for every exact canary, slot, bundle, and lane process and SHALL bind
each permit's phase/stem, hash, device, and inode in a create-once manifest
outside the deletable evidence workspace. Before a child launch, the runner
SHALL construct the complete launch receipt in memory, destroy and sync the
exact open permit inode, unlink it, sync its directory, require zero surviving
links, and only then persist the permit-bound claim. A crash after consumption
but before claim publication SHALL fail closed and SHALL NOT recreate the
permit. Only that same locked execution may publish the
claim-bound anchor and reach `Popen`, after immediately revalidating permit
consumption, claim, anchor, workspace launch, lock, and frozen source. Resume
MAY reconstruct a missing anchor and workspace launch from a valid claim, but
a recovered claim without a result/checkpoint SHALL become a durable runner
failure and SHALL NOT execute. A missing permit without its claim, a deleted
claim after permit consumption, a stale or hard-linked permit, a malformed or
off-plan record, or directory-entry disappearance SHALL fail closed. Permits,
claims, and anchors SHALL remain internal crash/replay state and SHALL NOT be
evidence artifacts or committed outputs.

The runner SHALL name
`trusted_frozen_host_crash_replay_and_workspace_tamper_detection_v1` as its
compiled threat model. The parent process and reviewed frozen host SHALL be
trusted prerequisites. This proof SHALL detect source/workspace drift, crash
replay, substitution, rollback, malformed rows, and incomplete evidence inside
that boundary, but SHALL NOT claim cryptographic attestation against an actor
that already controls the parent process and can coordinate arbitrary code
execution plus complete workspace forgery. Any external signing or hardware
attestation authority requires a separate governed change.

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

Deterministic trajectory interval gates SHALL use
`conditional_normal_mixture_quantile_v2`. Empirical NUTS parameter/movement
and PPC interval gates SHALL use `weighted_quantile_v1`: require finite values
and weights, unique stable support indices, nonnegative weights, and finite
strictly positive total weight; remove zero-weight supports and reject if none
remains; sort retained supports by value and stable support index; normalize
weights; place support `i` at midpoint CDF
`cumulative_weight_before_i+weight_i/2`; use endpoint values outside the
midpoint range and linear interpolation inside. NUTS draws use equal weights in
chain-major/draw-major order and PPC uses equal weights over its selected 4,000
states. Both methods use 80% probabilities `(.10,.90)` and 99% probabilities
`(.005,.995)`. Coverage SHALL include endpoints. On the direction-adjusted
scale, null false movement SHALL require 99% lower endpoint strictly greater
than zero.

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

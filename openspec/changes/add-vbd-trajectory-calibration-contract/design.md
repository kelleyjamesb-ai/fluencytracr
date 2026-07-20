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

Hash-bound synthetic and bootstrap-oracle evidence numerics use Python binary64
general formatting at 13 significant decimal digits (`.13g`), parsed back to
binary64 with negative-zero normalization. Producer and regeneration paths
apply the same compiled operation and reject noncanonical evidence. The
canonical transformed p50 and SE become the admitted preparation inputs; no
additional rounding occurs in preparation or model calculations. Raw DGP
intermediates remain bound separately by the private source root or by the
synthetic seed/generator/runtime/implementation. Prepared and fit hashes remain
exact-runtime bound rather than claiming cross-platform identity.

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
intervals retain the frozen 8,192-point outer integration but evaluate its
conditional-Normal mixture CDF directly. `conditional_normal_mixture_quantile_v2`
uses exact mixture moments, pinned `ndtr`/`ndtri`, outward-adjacent component-
quantile bounds, exactly 64 binary64 bisection iterations, and the final upper
bound. Exact binary64 standard-Normal and unequal-mixture oracles replace a
caller tolerance. The retired 16-point Gauss-Hermite expansion is not accurate
enough for the 99% concordance gate and cannot enter a repaired fit. The NUTS
reference samples the matching scalar conditional latent contrast at each
retained draw.

The unchanged outer integration generates all 8,192 Sobol nodes and preserves
their original zero-based ordinals. It evaluates all nodes, keeps each finite
binary64 log weight with its matching conditional moments, and computes the
finite-log-weight `scipy.special.logsumexp` in original ordinal order. It
computes candidates with `numpy.exp`, selects the represented positive
candidates without changing their relative order, then renormalizes through
exactly one `numpy.sum(...,dtype=numpy.float64)` reduction and binary64 vector
division. Binary64 normalization can map a mathematically positive tail weight
to positive zero. The engine applies the unchanged `>=4096` retained-count,
`ESS>=256`, and maximum-normalized-weight `<=.05` gates after retention. This
exact representability predicate is not a floor or tolerance. The engine
cannot clamp, round up, replace, merge, reorder, or otherwise rescue an
unrepresented weight.

Integration diagnostics and their existing semantic/hash bindings must include
the generated-point, finite-log-weight, and retained-weight counts; SHA-256
canonical-JSON commitments to the ascending retained and excluded original
ordinal lists; and one retention-record hash over the exact no-extra-key object
defined in the contract and normative spec. Retained-list length equals the
retained count; excluded-list length equals generated minus retained count; and
their union is exactly every generated ordinal. The lists and weights remain
private support and are not emitted. Fresh recomputation must rederive the same
fields. The generic conditional-mixture boundary still requires every caller-
supplied weight to be finite and strictly positive; the outer integrator must
filter its own binary64 zeros before calling it. Missing, forged, inconsistent,
duplicate, or off-range ordinal commitments HOLD.

The repaired reference keeps the same likelihood, priors, named parameters,
centered zero-sum parameterization, existing generator/chain/PPC seeds, four
chains, and `max_treedepth=15`, but uses 20,000 retained draws and 5,000 tuning
draws per chain, `target_accept=.999`, PyMC `jitter+adapt_full`, `cores=1`,
and `blas_cores=1`. All diagnostic thresholds remain unchanged. Mean,
80%-lower, 80%-upper, 99%-lower, and 99%-upper MCSE values remain separately
labeled for every required parameter. All 80,000 draws feed summaries and
diagnostics. PPC remains exactly 4,000 replicates through the fixed chain-
balanced draw selector in the normative spec. No collapsed target,
noncentering, post-hoc coefficient reconstruction, seed rotation, adaptive
extension, antithetic sampling, or endpoint correction is allowed.

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
gate, and always HOLDS. In addition to fast smoke, the repair runs two exact
full-setting non-admissible precision bundles at six and twelve groups with the
fixed smoke seeds in the normative spec. They must finish inside the compiled
primary bundle-child timeout and clear the otherwise applicable diagnostics
before candidate `S`, but they cannot enter evidence. A failure requires HOLD
or a new docs amendment, never tuning under the same contract.

Canary ordinal `0` subsequently returned a fully validated result whose only
otherwise-applicable failing category was `mcse`. That result is a permanent
HOLD and cannot be resumed, repeated, extended, or reconstructed from a new
run. Because the validated parent retained only the category and not the
parameter/endpoint coordinates, a prospective precision design cannot be
chosen from the observed failure magnitude.

The diagnostic amendment therefore reserves one different synthetic
six-group null case inside the existing smoke namespace. It uses the unchanged
generator, model target, parameterization, NUTS settings, and statistical
thresholds, but it does not run deterministic concordance or PPC. Its only
purpose is to retain a complete, sanitized diagnostic matrix for every lane
and required parameter at the first 25%, 50%, and 100% of retained draws.
Dimensionless MCSE/posterior-SD ratios, bulk/tail and endpoint-quantile ESS,
R-hat, lane sampler failure categories, and chain endpoint offsets normalized
by pooled posterior SD distinguish an isolated extreme-tail precision problem
from broad mixing failure without retaining posterior estimates or draws.

The diagnostic has its own identity, exclusively reserved seeds, immutable
workspace-independent attempt claim, strict validator, and create-once result.
The claim root and canonical workspace are fixed absolute identities in a
separately reviewed sole-child authorization manifest rather than caller
inputs, so another
checkout or empty directory cannot mint a second attempt. A hash-bound
standalone standard-library bootstrap starts under isolated Python and admits
only the reviewed source bundle and pinned site packages. The diagnostic is
permanently HOLD, cannot satisfy any
canary or acceptance condition, and is categorically rejected by freeze,
concordance, study, recomputation, artifact, and acceptance validators. A
crash, timeout, malformed record, or write failure consumes the one launch.
The result may inform only a later docs/OpenSpec methodology decision; it
cannot select, implement, or execute that design by itself.

The authorized V1 launch is now consumed. Exact implementation
`50636e6721bf6b8e8e9269106a218527a159a94e`, authorization
`7e4f5f00f6d826ccd771b2553350608bedb0f0e0`, human-authorization hash
`1c8d781a6835a338b7e69a0d8d4de7d8d61b57f28db7364adee6d475d9d17c64`,
claim hash `f9a512969703833b73e27f902bc79f78d5dfd50504f49ea1d431e335006a89fc`,
and input-binding hash
`3726b313662d6de51fe1252f9212664bda664e628343d0ac5d747f5763eb7a43`
remain a permanent uninterpretable HOLD. The frequency sampler completed, but
projection rejected before any sanitized row, staged workspace, or final
record because valid PyMC storage order differed from the projector's emitted-
row order. That launch contains no MCSE, ESS, R-hat, BFMI, mixing, or tail-
precision result and cannot be retried, resumed, reconstructed, or interpreted
statistically.

A replacement is a new diagnostic identity, not a V1 retry. It reserves
generator seed `2_055_900_600` and chain seed
`2_055_900_700+4*lane_ordinal+chain_index`, yielding exactly
`2_055_900_700..711`, all disjoint from every canary, consumed diagnostic,
concordance, and study formula.
The projector first requires exact order-insensitive equality between the
posterior variable names and
`{alpha,beta,trajectory_movement,sigma_u,u,sigma_r,rho}`. It rejects missing or
extra, non-string, coerced, or malformed variables, then reads each posterior
and ArviZ diagnostic variable by exact name and emits the unchanged canonical
flattened parameter order. PyMC storage order has no semantic role.
A sampler-free full-shape fixture must traverse the production PyMC model,
DataTree, ArviZ, and projection identity boundary with PyMC's natural storage
order `alpha,beta,trajectory_movement,sigma_u,u,sigma_r,rho`; a manually
reordered fake trace is insufficient. Its emitted rows and hashes must equal
those from identical values stored in canonical order.

The replacement writes postmortem observability checkpoints to a new fixed
external root bound by its authorization manifest. Checkpoints are create-once,
predecessor-hash-chained records over one exact phase/lane sequence. Their only
dynamic content is identity and input-binding hashes, ordinal, allowlisted
phase, allowlisted lane, predecessor hash, and creation timestamp. Exact
ordinal/phase/lane filenames and strict whole-root enumeration prevent unknown
or duplicate files from hiding beside the chain. Checkpoints contain no draws,
estimates, messages, exception text, tracebacks, paths, panel values, unsafe
data, or caller-supplied detail. The terminal ready-for-publication checkpoint
precedes atomic result publication. Execution never reads a checkpoint to skip,
resume, continue, retry, or reuse work. Missing, extra, malformed, duplicated,
or reordered checkpoints leave the consumed replacement uninterpretable HOLD;
they never restore launch authority or supply any statistical result field.

Future implementation requires a new clean reviewed commit `D2`. Its sole-child
manifest-only authorization commit `A2` binds separate V2 workspace, claim,
checkpoint, and result roots, the replacement seeds and identity, exact command,
runtime, lockfile, fixture, and four unique GO references. A separate human
record against exact `A2` is required before one new launch. No V1 commit,
manifest, authorization, claim, binding, workspace, seed, checkpoint, or output
can satisfy any V2 gate.

The authorized V2 launch is also consumed and permanent uninterpretable HOLD.
Exact implementation `051a919ffb7d581838e321a52676ba06bf233d71`, authorization
`3646e08b5b07d2b82aef510688133273a857d795`, human-authorization hash
`52752fe99da24c77991d10d403185d9a9bdaf0610722eb7a52cf4beac27dc789`,
claim hash `b1f3ed124be6a51328df5e4c38499a6742e585086f47613667c6be33e0a5d272`,
input-binding hash
`6036f595c5c0c48f440c8193a817ff871394d7d5f9402ef9bbf93105c6d60504`,
and persisted output SHA-256
`3bd984074aa43ea7fa8453766a974379e34b6418eb04782fdb00d0df86d860bf`
are tombstoned. All three samplers and in-memory projections completed and all
twelve checkpoints exist, but canonical `sort_keys` serialization changed the
nested MCSE-ratio object order while strict readback incorrectly treated object
insertion order as semantic. The parent checked canonical bytes but did not run
the full semantic validator after deserialization. The resulting bytes cannot
support any MCSE, ESS, R-hat, BFMI, divergence, mixing, or tail-precision
conclusion and cannot be retried, rewritten, reordered, or reinterpreted.

A prospective V3 is a new diagnostic identity, not a V2 repair or retry. It
reserves generator seed `2_055_900_800` and chain seed
`2_055_900_900+4*lane_ordinal+chain_index`, yielding exactly
`2_055_900_900..911`, with new fixed workspace, claim, checkpoint, human-
authorization, and output roots. V3 preserves the complete V2 model, priors,
estimand, data-generating process, three lanes, parameter coordinates,
20,000/5,000 draw settings, sampler geometry, timeout, `<=0.10` MCSE gate,
permanent HOLD state, and proof-path exclusion.

The fixed V3 roots are
`/Users/jameskelley/.codex/evidence/vbd-mcse-diagnostic-v3-workspace`,
`/Users/jameskelley/.codex/evidence/vbd-mcse-diagnostic-v3-claim`, and
`/Users/jameskelley/.codex/evidence/vbd-mcse-diagnostic-v3-checkpoints`; the
final output is exactly `diagnostic.json` inside the workspace. After lexical
normalization, the three top-level roots must be absolute, pairwise distinct,
pairwise non-ancestral, non-symlink directories, and unequal to or outside the
ancestry of every V1/V2 workspace, claim, or checkpoint root. The output must
be the direct workspace child and no root may resolve through a symlink or
alternate path identity to any consumed or V3 root.

JSON objects have no semantic member order. Every V3 mapping first requires
exact equality to its compiled string-key set after duplicate-key-rejecting
parse, then accesses values only through compiled canonical name sequences.
The five MCSE-ratio names and two endpoint-offset names are not inferred from
insertion order. Ordered lists remain order-sensitive, including lanes,
prefix/parameter rows, coordinates, chain-indexed values, failure categories,
and checkpoints. Canonical hashes continue to use sorted object keys.

Publication becomes a semantic protocol rather than a byte-format check. The
reviewed child must validate the in-memory record, write canonical create-once
staged bytes, strictly reread those bytes with duplicate-key rejection, rerun
the complete V3 record and checkpoint validators, and require exact semantic
and canonical-byte equality before it may exit successfully. The reviewed
bootstrap must independently validate the staged persisted record and complete
checkpoint root through manifest-bound V3 validation before linking it to the
final path; it must then reopen the final path, require byte identity with the
validated staged bytes, and rerun the same semantic/checkpoint validation
before returning zero or emitting a record. Any malformed, missing, extra,
duplicate, off-plan, hash-invalid, semantically invalid, changed, or unreadable
staged/final value leaves no successful publication and remains HOLD. A full-
record sampler-free fixture must exercise canonical serialization, alternate
valid mapping insertion orders, missing/extra/duplicate keys, persisted
mutation, and staged/final validation without generator or sampler execution.

These sampler-free full-record rehearsals are repeatable engineering checks,
not diagnostic launches. They use deterministic fixture values and temporary
roots only, create no external claim, retain no posterior result, and are
permanently ineligible for canary, proof, evidence, or acceptance use. They may
be rerun until the reviewed implementation is mechanically sound. The
one-shot/no-retry rule begins only after a future exact `A3`, separate human
authorization, and irreversible manifest-bound external claim; it continues to
apply unchanged to every acceptance-plan execution.

V3 inherits V2's exact twelve checkpoint ordinals, phase/lane sequence,
filenames, field set, predecessor hash chain, input-binding rules, create-once
writes, whole-root enumeration, regular-file/no-alias checks, terminal binding,
and absolute prohibition on checkpoint-based resume, retry, skip,
reconstruction, or launch authority. Only schema/diagnostic identity and the
bound `D3`/`A3`/human/claim/input/root hashes change to V3. A partial, extra,
duplicated, replaced, aliased, reordered, malformed, or V1/V2 checkpoint root
cannot satisfy staged or final validation.

Future implementation requires clean reviewed commit `D3`; a later sole-child
manifest-only `A3` binds the new identity, roots, seeds, runtime, lockfile,
bootstrap, validation entry points, exact command, and four unique GO
references. V1 and V2 commits, authorizations, reviews, claims, bindings, paths,
seeds, checkpoints, and outputs satisfy no V3 gate.

The valid V3 artifact is permanently non-evidentiary. All 180 retained-draw
full-prefix MCSE ratios pass `<=0.10`, while the centered reference records
divergences `21/2/0` across the three lanes, leaving target-faithful exploration
unestablished. The prospective decision is therefore to hold the current
centered geometry and test one mathematically equivalent reparameterization.
Exact V3 artifact
SHA-256 is
`e043fc2f03b5c9a993db351c37f4b4acb6f2a3cbfb09f5a0165c62b6dd4f0b6b`;
record hash is
`44f2080f78eed19c21611a4f3f832b79072caadbb222d6068435a6fe89240461`.
Neither value enters evidence or clears task `2.6`.

The completed `vbd_group_effect_geometry_diagnostic_v1` pairs the frozen
centered `u ~ ZeroSumNormal(0,sigma_u)` target with
`u_std ~ ZeroSumNormal(0,1); u=sigma_u*u_std`. Only the group-effect
parameterization changes. The induced prior, exact zero-sum constraint,
marginalized AR covariance, likelihood, all other priors, estimand, and common
posterior quantities remain identical.

Two fresh `k=16` cases are fixed: ordinal 0 is effect 0 with six groups and
generator seed `2_055_900_920`; ordinal 1 is effect 0.5 with twelve groups and
generator seed `2_055_900_921`. Centered chain seeds are
`2_055_900_930+12*i+4*d+c`; non-centered chain seeds are
`2_055_900_960+12*i+4*d+c`. The exact order is case, lane, then centered arm
before non-centered arm. All settings and hard thresholds remain frozen.

Each arm is compared to one freshly recomputed deterministic reference per
case/lane under the existing mean, 80%/99% endpoint, and SD-ratio gates. The
non-centered arm must also clear all existing hard sampler gates, including
zero divergences. A supported result additionally requires every centered
reference and non-divergence sampler gate to pass, at least one paired centered
divergence to become zero, and no non-centered pair to worsen. All-centered-
zero results are inconclusive only when both arms pass every gate. Complete
non-centered sampler/reference failures reject the candidate; malformed,
incomplete, identity-invalid, or otherwise unclassified output is invalid HOLD.

This diagnostic is a bounded hypothesis test, not permission to implement the
candidate. It retains only sanitized hashes, counts, normalized diagnostics,
and result classification; it emits no draws or panel values. Its result is
permanent non-evidence HOLD. Separate implementation, exact review,
manifest-only authorization, human execution authorization, and one-shot claim
gates apply. The manifest-bound external one-launch permit must first be
atomically consumed and durably synced; only then may the fixed external claim
be atomically created, durably synced, and revalidated before any child,
generator import, data generation, or sampler invocation. Failure after permit
consumption, including claim-establishment failure, leaves the launch consumed,
and every second invocation rejects before numerical work. A passing diagnostic
can support only a later contract amendment and new replacement-canary
identities.

The exact governed launch used implementation
`28521d0d30aa713f77484e3172c05df0838b08e6` and sole-child manifest-only
authorization `709dea164cc3e0c77e5b077a9b1d90a875c11948`. Its manifest hash is
`91f7a73a5cbfe98acb8bc708cf9547dd1f4f7b7fcb423b79dd411f22e7f1371c`;
execution-authorization hash is
`da919576c0b2749b9b6dbddee8f05f67d7bd51a1f1107bc64f79dda58bffbe0b`;
claim hash is
`433df470d10409a652d078c088309b3277105e6a6f347514ec9c25f4079b774b`;
input-binding hash is
`84209f80ee86632a0ad7300af81395f788a2e886e33deec9c2513c6831ef360a`;
and completion-receipt hash is
`a242903c742f026169054bdf6fddca2d1e14d274049628f9e60d14b62dca4c12`.
The strict persisted validator admitted exactly twelve ordered arms, 234
sampler rows, and 180 deterministic-reference comparisons. Artifact SHA-256
is `1fda8dab47c8563af77e85dc3a2095fde49fd87c09bc83afa24cbbb1a34d6339`;
record hash is
`a25e9141d5ae0372a4d92851f5e1ddf92265829fa3ae7033ab42a863cd50c1f8`.

The predeclared classification is `REJECT_NONCENTERED_CANDIDATE`. Every
non-centered arm had zero divergences, but case-0 Breadth `u_std[5]` had a
99% lower-endpoint MCSE ratio of `0.11256762551677787`, and case-1 Frequency
`u[2]` had a 99% upper-endpoint MCSE ratio of `0.24197029311231413` plus a
99% upper-endpoint deterministic-reference difference of
`0.23954276555797224`. These exceed the unchanged `0.10` MCSE and `0.20`
reference gates. The result remains permanent non-evidentiary HOLD, rejects
this candidate, cannot complete task `2.6`, and cannot be retried, resumed,
extended, or moved into concordance or calibration.

The next bounded candidate marginalizes only the zero-sum group-effect block.
It does not marginalize `alpha` or `beta`: those fixed effects remain named
NUTS variables with their existing Normal priors and ordinary trace
diagnostics. This is the smallest geometry change that removes the demonstrated
`sigma_u`-`u` funnel. Full collapse of the fixed effects is deferred unless a
later governed result demonstrates a separate fixed-effect geometry failure.

Let `B` be the exact prepared `C x (C-1)` Helmert basis, `P=B B'`, `Z` the
group-incidence matrix, `A=Z B`, `F=[1,tau]`, and
`gamma=(alpha,beta)`. Let `K` be the existing block-diagonal stationary AR(1)
covariance, `D=diag(known_se^2)`, `R=K+D`, and `e=y-F gamma`. For sampled
`sigma_u`, define `U=sigma_u A`, `W=I+U'R^-1 U`, and

```text
V = R + U U'
log p(y | gamma,sigma_u,sigma_r,rho) =
  -0.5 * (n*log(2*pi) + log|V| + e'V^-1 e)
```

The implementation may use the determinant lemma and Woodbury identity, but
must obtain all terms through Cholesky solves:

```text
log|V| = log|R| + log|W|
q = R^-1 e
b = U' q
e'V^-1 e = e' q - b' W^-1 b
```

It may not form an explicit inverse, omit either determinant, factor the
marginal likelihood by group, duplicate the integrated `u` prior, introduce a
singular density on `u`, or replace `P` with independent group blocks. The
negative cross-group covariance in `P=I-11'/C` is part of the frozen model.

For each retained outer draw, standardized Helmert coordinates have the exact
conditional distribution

```text
z | y,gamma,sigma_u,sigma_r,rho ~ Normal(W^-1 U'R^-1 e, W^-1)
u = B * (sigma_u*z)
```

Each `u[c]` is therefore one conditional Normal component. For terminal
movement, let `ell` be the existing latent-level contrast,
`G=K+sigma_u^2 Z P Z'`, and `V=G+D`. Its component is

```text
movement | y,gamma,sigma_u,sigma_r,rho ~ Normal(
  ell'F gamma + ell'G V^-1 e,
  ell'(G - G V^-1 G)ell
)
```

The implementation must derive this as one joint latent conditional. Adding
separate marginal variances, dropping the `u`-AR conditional covariance, or
substituting conditional means changes the target and is forbidden.

Equal-weight conditional components across the original chain-by-draw grid are
summarized by direct mixture-CDF inversion and the exact mixture variance. No
pseudo-draws, antithetic values, discretized conditional support, or
component-as-observation ESS is allowed. Mean Monte Carlo error uses the
unflattened conditional-mean array. For endpoint probability `p`, mixture
endpoint `q_p`, component CDF `F_j`, and mixture density `f_hat`, the
chain-shaped influence channel is

```text
psi[p,j] = (p - F_j(q_p)) / f_hat(q_p)
```

Chain-aware mean MCSE is applied to that channel. The five channels are the
conditional mean plus the 80%-lower, 80%-upper, 99%-lower, and 99%-upper
influences. Each MCSE divided by the full mixture posterior SD remains
`<=0.10`; the worst R-hat and minimum bulk/tail ESS across those five channels
must still satisfy `<=1.01` and `>=400`. Sampled `alpha`, `beta`, `sigma_u`,
`sigma_r`, and `rho` retain every existing trace, divergence, treedepth,
BFMI, and five-field MCSE gate unchanged.

The prospective `vbd_group_effect_marginalization_diagnostic_v1` has four
aggregate-`k=16` cases in exact order: `(effect=0,groups=6)`,
`(effect=0,groups=12)`, `(effect=0.5,groups=6)`, and
`(effect=0.5,groups=12)`. Generator seeds are `2_055_901_000+i`. For case
`i`, lane ordinal `d`, and chain `c`, chain seed is
`2_055_901_100+12*i+4*d+c`, yielding `2_055_901_100..147`. These 52 seeds
form a new diagnostic-only namespace and are rejected by generic smoke, every
prior diagnostic/canary, concordance, study, recomputation, and acceptance
path.

Each of the twelve case/lane fits uses four chains, 20,000 retained draws,
5,000 tuning draws, `target_accept=.999`, `max_treedepth=15`,
`jitter+adapt_full`, `cores=1`, and `blas_cores=1`. One deterministic
reference and one fresh deterministic recomputation are independently generated
and bound per fit. Their strict semantic summaries and canonical reference
hashes must match exactly; mismatch is `INVALID_HOLD` before numerical
classification. PPC and acceptance concordance are `NOT_RUN`. All common
quantities retain the existing mean, 80%/99% endpoint, and SD-ratio gates. Sampler-free fixtures must
cover both group counts, exact Helmert/covariance identity, collapsed log
density and gradient against an independently constructed dense Normal,
conditional `u` and movement moments against direct joint-Gaussian
conditioning, exact mixture summaries/influence channels, chain-major shape,
zero-sum reconstruction, and rejection of omitted determinants, duplicate
priors, changed design/SE/contrast, malformed variables, and conditional-mean
substitution. The complete result contains twelve fits, 60 sampled-parameter
rows, 120 reconstructed-quantity rows with exactly five named channel-
diagnostic records each (600 channel records total), and 180 reference
comparisons.

After structure and provenance validate, any failed sampler, influence, or
deterministic-reference gate is
`REJECT_GROUP_EFFECT_MARGINALIZATION_CANDIDATE`; all gates passing is
`SUPPORTED_FOR_LATER_REFERENCE_CONTRACT_AMENDMENT`; and any incomplete,
malformed, off-plan, identity-invalid, runner-error, or otherwise unclassified
state is exclusively `INVALID_HOLD`. Every result remains permanent
`HOLD(group_effect_marginalization_diagnostic_nonacceptance)`, contributes
zero proof count, and cannot change the current centered reference. Support can
authorize only a later docs/OpenSpec amendment and fresh precision-canary
identities after separate implementation, four-role review, manifest-only
authorization, human execution authorization, and one consumed launch.

Sampler MCSE is evaluated independently and stored separately for the
posterior mean and each lower and upper 80% and 99% interval endpoint.
Diagnostic outputs are joined only after exact parameter-dimension,
coordinate-label, and cardinality equality. The resumable
runner writes each admitted launch to a private sibling attempt-anchor before
execution; deletion of workspace launch/result suffixes can therefore restore
the admitted launch and fail durably without re-executing a seed.

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

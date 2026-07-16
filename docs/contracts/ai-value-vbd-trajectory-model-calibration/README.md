# VBD Trajectory-Model Calibration

Contract status: `SYNTHETIC_IMPLEMENTATION_COMPLETE_CONCORDANCE_PENDING`

Owning model-family component:
`bayesian_vbd_behavioral_trajectory_model`

Implementation approval:
`APPROVED_BY_JAMES_KELLEY_2026_07_15_FOR_SYNTHETIC_TASKS_2_2_THROUGH_2_5`

Parent OpenSpec task: `5.6` remains incomplete.

## Purpose

This contract defines the exact aggregate behavioral trajectories and
synthetic proof required before VBD evidence can become an admitted input to
the bounded longitudinal model path.

It resolves a current ambiguity: the shipped `velocity_index` includes
frequency, engagement, and breadth. Reusing that composite beside a separate
Breadth term would count Breadth twice. The legacy 0-100 VBD intake also lacks
admitted aggregate uncertainty. Neither representation is valid model input.

This contract now governs the verified bounded synthetic implementation for
tasks `2.2` through `2.5`. It does not authorize concordance or acceptance-plan
execution before the reviewed source/freeze sequence, and it does not authorize
real-data admission, customer output, or parent closeout. Concordance, full
evidence execution, independent acceptance, and parent closeout remain
separately gated.

## Current Decision

The selected measurement boundary is:

```text
Active primitive lanes = (frequency_trajectory, engagement_trajectory,
                          breadth_trajectory)
Canonical Velocity     = unchanged and not estimated by this proof
Depth                   = optional source-bound aggregate context only
```

There is no canonical Velocity trajectory and no overall VBD trajectory in this
proof. The three active primitives remain separate through source binding,
transformation, state-space fitting, diagnostics, calibration, and evidence
review. Existing canonical Velocity semantics remain unchanged.

## Exact Active Lanes

| Lane | Canonical source statistic | Exact transform | Required definition binding |
| --- | --- | --- | --- |
| `frequency` | `USER_FREQUENCY_OBSERVED.distribution.p50` in runs per active day | `log1p(p50)` | run, active-day, event/schema, unit, and window definitions |
| `engagement` | `USER_ENGAGEMENT_OBSERVED.distribution.p50` active days divided by eligible-day count | `asin(sqrt(p50 / eligible_day_count))` | active-day and eligible-day definitions plus exact denominator |
| `breadth` | `USER_BREADTH_OBSERVED.distribution.p50` distinct governed surfaces divided by eligible-surface count | `asin(sqrt(p50 / eligible_surface_count))` | surface taxonomy/version and exact eligible surface set/denominator |

Every future source-derived lane requires the complete ordered
p10/p50/p90/p99 distribution computed with the frozen Hyndman-Fan type-7
linear-interpolation quantile algorithm inside the source privacy boundary, a
finite positive aggregate
standard error for the transformed p50, and an immutable uncertainty-derivation
ref/hash. Frequency p50 must be finite and nonnegative. Although the event
schemas can represent boundary counts, this Gaussian trajectory likelihood
requires Engagement and Breadth p50 to satisfy
`0 < p50 < exact_denominator`, with a positive denominator. A zero or ceiling
p50 is a nonregular transformed-uncertainty boundary and HOLDS before fitting.
This first likelihood uses only the declared p50 statistic; the other
percentiles are bound distribution-shape context and cannot be swapped into the
fit. The separately labeled direct-aggregate synthetic DGP below exercises the
continuous likelihood approximation but does not satisfy or claim this future
source-derivation gate.

For every future source-derived distribution, all four frequency percentiles
must be finite and nonnegative; every Engagement percentile must be finite in
`[0,eligible_day_count]`; and every Breadth percentile must be finite in
`[0,eligible_surface_count]`. Source-local active-day and distinct-surface
members are integer counts, and frequency is derived as a positive integer run
count divided by a positive integer active-day count. Strict tests must mutate
each percentile independently below and above its canonical domain. These
source bounds precede ordering, transform, and likelihood checks; rehashing an
invalid percentile cannot admit it.

The source binds one immutable eligible-cohort manifest before the first
window, then derives one source-local active-member set per window. Canonical
frequency remains runs per active day and is defined only for members with at
least one active day; inactive eligible members are not assigned zero. The same
window-active member set must supply frequency, engagement, and Breadth for that
window. `k` is the active-member count and MUST equal the emitted
`cohort_size` for every lane in that window. Missing telemetry is not no
activity, and lane-specific active sets or post-period cohort repair are
inadmissible.

The direct-aggregate numerical DGP fixes the same opaque cohort commitment and
`k` across all 18 windows and does not instantiate member rows. The separate
bootstrap-conformance fixture fixes its own process-local synthetic member
slots. A later real-source admission decision must separately govern changing
active-member composition, eligible-to-active prevalence, discrete-lattice
behavior, and the claim cap; this proof evaluates a continuous Gaussian
aggregate approximation only and does not estimate adoption prevalence.

The future aggregate source package must derive uncertainty inside its privacy
boundary with `source_side_synchronized_type7_bootstrap_v1`:

1. exactly 2,000 with-replacement resamples of that window's fixed active-
   member slots;
2. one shared resample-index sequence for all three lanes;
3. type-7 p50 and the exact lane transform recomputed in each resample;
4. sample covariance with `ddof=1` over the 2,000 transformed three-lane
   vectors; and
5. per-lane standard error equal to the square root of the matching covariance
   diagonal.

Source-local active-member slots are ordered by HMAC-SHA256 of the internal
member key under a source-held window secret; keys, secret, and digests never
leave the source boundary. A private `prebootstrap_bundle_content_root` commits
to the ordered source-local values in fixed
`(frequency,engagement,breadth)` order plus cohort, active-set, window,
denominator, taxonomy, and definition hashes. It MUST exclude the bootstrap
seed, covariance, marginal standard errors, uncertainty root, final lane-child
roots, and final bundle root, and it MUST never leave the source boundary.

Bootstrap indices use
`numpy.random.Generator(PCG64DXSM(seed)).integers(0,k,size=(2000,k),
endpoint=False,dtype=uint64)` under the pinned NumPy runtime, where `seed` is
the nonnegative 52-bit integer encoded by the first 13 hex characters of
`sha256(prebootstrap_bundle_content_root|vbd-bootstrap-v1)`. The same bounded
index matrix is reused across all three lanes. A later
`source_derivation_receipt` is
`HMAC-SHA256(receipt_secret,
aggregate_output_hash|vbd-receipt-v1)` under a source-held tuple/window-
specific secret that is never reused. A source-private audit record may bind
that receipt to the private root, bootstrap seed, and aggregate output hash, but
that audit record and root never leave the boundary. The emitted
`joint_uncertainty_derivation_root` hashes that opaque receipt, algorithm
identity, pinned runtime, resample count, canonical
`covariance_lane_order=(frequency,engagement,breadth)`, covariance, and marginal
standard errors. Final lane-child roots then bind their distribution,
p50, denominator/definition identities, marginal standard error, and the joint
uncertainty root. Only after those children exist may the final
`bundle_source_content_root` bind the aggregate-derived opaque source receipt, three ordered final
lane-child roots, and `joint_uncertainty_derivation_root`. No emitted hash may
expose or include the private root, and no hash may depend on itself or a
descendant.

`aggregate_output_hash` is SHA-256 over canonical JSON containing the ordered
three aggregate distributions, denominators, definition hashes,
cohort/window/active-set commitments, observed/missing counts, algorithm and
pinned-runtime ids, canonical lane order, covariance, and marginal SEs. It
excludes the private root, receipt, and every descendant root.

Every hash-bound numeric emitted by the synthetic generator or source-
bootstrap conformance oracle uses the compiled
`python_binary64_format_13_significant_digits_v1` boundary: Python binary64
general formatting with `.13g`, parsed back to binary64, with negative zero
normalized to `0.0`. This applies before evidence hashing and preparation to
all four distribution percentiles,
transformed p50 values, transformed marginal standard errors, covariance
elements, and the bootstrap oracle covariance/standard errors. Generation and
regeneration apply the same operation, and an otherwise rehashed value with
more than 13 significant decimal digits rejects. The canonical transformed p50
and standard error are the admitted model inputs. Preparation and model
calculation apply no additional canonicalization. Prepared, fit, diagnostic,
and result hashes retain full binary64 calculation values and remain bound to
the exact platform/native runtime rather than claiming cross-platform numeric
identity.

Canonical evidence hashes commit the admitted values, not hidden raw floating-
point intermediates. Values inside one canonical representation bin therefore
have the same evidence hash by design. Raw source computation remains bound by
the source-private prebootstrap root and audit record; raw synthetic computation
remains bound by seed, generator, implementation, and runtime identities. The
precision is compiled and non-configurable. It is not a product threshold,
customer tolerance, or permission to repair invalid evidence.
Admitted canonical numerics must retain the native float representation; integer,
Boolean, float-subclass, and negative-zero alternatives reject even when their
numeric values compare equal and all dependent hashes are recomputed.

That derivation is source-owner-side and external to FluencyTracr. No future
FluencyTracr input, implementation, checkpoint, storage, artifact, or output may
receive a real or source-derived member key, digest, slot, or row; this contract authorizes no source
connector. Only the aggregate package below could be considered by a separate
future real-source admission decision.

Of the bootstrap-specific intermediates, only the aggregate 3x3 covariance,
standard errors, observed/missing counts, derivation id, opaque keyed source
receipt, final bundle-source-content root, and joint uncertainty derivation
root may leave the source boundary. They accompany the already required aggregate distributions,
p50s, denominators, definitions, and source refs/hashes. Resample vectors,
member slots, join keys, and rows must not be emitted. The covariance must be finite, symmetric, positive
semidefinite, in canonical lane order, and dimensionally consistent; missing or
permuted covariance, arbitrary source-supplied SE, diagonal mismatch, non-PSD
covariance, or derivation drift HOLDS. The numerical synthetic proof uses its
separately labeled frozen known-aggregate-uncertainty DGP and cannot claim
source-bootstrap or real-source clearance.

Covariance validation uses no caller tolerance. Validate raw generated
covariance before canonicalization, then revalidate the canonical covariance
and standard errors. Raw covariance must arrive as an exact native 3x3 NumPy
binary64 array; Boolean, integer, string, object, complex, float32, nonnative,
subclass, or otherwise coercible array representations reject before conversion.
Set
`s=max(max(abs(covariance)),max(abs(se^2)))` and require `s` to be finite and
positive. Require maximum symmetry error and maximum
`abs(diag(covariance)-se^2)`, each divided by `s`, to be `<=1e-12`. Require the
minimum eigenvalue from `numpy.linalg.eigvalsh(covariance/s)` to be `>=-1e-10`
under the pinned runtime. Each canonical standard error must also exactly equal the
compiled canonicalization of the square root of its matching canonical
covariance diagonal. Validate the supplied matrix before any symmetrization or
repair. These are compiled internal numerical tolerances, not product thresholds.

The following are forbidden model inputs:

- `velocity_index`;
- `frequency_index`, `engagement_index`, or `breadth_index` after clamping;
- a source-supplied scalar Velocity score;
- `overall_vbd_score`;
- `integration_score`;
- `vbd_quadrant`;
- any weighted, averaged, multiplied, latent, or post-result composite; and
- any value that includes Breadth inside both a Velocity and Breadth lane.

Those values may continue to exist in their separately governed product or
planning contexts. This contract does not change them; it makes them
inadmissible to this statistical model.

## Aggregate Panel Contract

Every window must carry exactly one observation for each active lane for one
canonical `(workflow_id, jbtd_id, persona_id)` tuple. The three observations
must agree on:

- cohort definition/hash and cohort size;
- window start/end and ordered window id;
- event/schema and source definition versions;
- approved plan and one shared ordered direction-vector root;
- source ref/hash and uncertainty derivation ref/hash;
- independent gate receipt;
- aggregate-only and synthetic-only posture;
- run and active-day definitions;
- eligible-day definition and count;
- surface taxonomy and eligible surface set; and
- no person-level, raw-row, customer, live, real, or production data.

The plan owns exactly one direction vector in canonical
`(frequency,engagement,breadth)` order. Every lane child binds the shared vector
root and its own matching component; lanes do not claim one equal scalar
direction. The primary vector is `(+1,+1,+1)`, while
`composition_rotation` is `(+1,-1,+1)`.

The fixed first proof uses 12 pre-period and 6 post-period windows, 6 or 12
panel groups, and `k=16` aggregate Measurement Cells. Here `k` is the number of
source members contributing to each synthetic aggregate lane/window cell and
equals every matching event's `cohort_size`. It is proof provenance, not a new
runtime model threshold. The inherited aggregate schema floor is `k>=5`; the
existing series/read-path evidence floor is `k>=10`. This contract does not
change either constant or authorize a display. All lanes must form one balanced
ordered panel. Missing, suppressed, stale, imputed, duplicate, off-plan,
definition-drifted, or cross-slice-rescued windows reject or HOLD before
fitting. Strict preparer tests must independently change each lane's
`cohort_size` to `k-1` and `k+1`; every mismatch rejects before fitting.

The synthetic schedule uses UTC half-open, non-overlapping 60-day windows from
the fixed epoch `2000-01-01T00:00:00Z`: window `w_t` is
`[epoch + 60*t days, epoch + 60*(t+1) days)` for `t={0,...,17}`. Its exact
eligible-day count is 60. Windows `w00..w11` are pre-period, `w12..w17` are
post-period, and `w15..w17` are the terminal evaluation windows. There is no
lag in this trajectory model. Every lane/window has one distinct source-content
hash and source cutoff equal to the half-open window end. Overlap, gaps, shifted
endpoints, unequal duration/cadence, duplicate content under different ids, a
covering-window substitution, or lag/future leakage HOLDS before fitting.

Panel groups must be disjoint under a hash-bound partition attestation. Nested,
overlapping, complementary, or composition-difference slices that could reveal
a held or small cohort are inadmissible. No broader group, neighboring window,
hierarchical partial pooling, subtraction, or differencing may reconstruct or
rescue a suppressed slice. Source-owner assertions and self-consistent hashes
are lineage evidence only; they are not real-source clearance or authenticity
proof.

Pre-period location and scale are computed independently for each active lane
from the pooled set of all exact panel-group cells in the twelve pre-period
windows, using the sample standard deviation with `ddof=1`. The transformed
aggregate standard error is divided by that same pre-period scale. Zero or
nonfinite pre-period scale HOLDS. Post-period or future-window information must
not affect transformation, priors, plan fields, lane selection, direction,
lag, or source binding.

## Depth Context Boundary

Depth is not an active trajectory in this first proof. It may appear only as a
non-numeric context binding with:

- definition/version ref;
- source ref/hash;
- aggregate review state;
- suppression posture; and
- required caveats.

No Depth value, component, band, candidate, coefficient, state, interaction,
prior, threshold, eligibility rule, fit statistic, or numerical artifact field
is permitted. Depth context is optional. Missing, suppressed, stale,
unreviewed, or hash-invalid Depth context is recorded only as unavailable
context and cannot alter trajectory acceptance, parent task completion, or a
primitive-lane fit. An attempt to inject Depth into any numerical or
eligibility path rejects before fitting.

## Planned Statistical Specification

For lane `d` in `{frequency, engagement, breadth}`, panel
group `c`, and window `t`:

```text
x_star[d,c,t] ~ Normal(mu[d,c,t], se_star[d,c,t]^2)
mu[d,c,t] = alpha[d] + u[d,c] + beta[d] * tau[t] + r[d,c,t]

u_raw[d,c] ~ Normal(0, sigma_u[d]^2)
u[d,c] = u_raw[d,c] - mean_c(u_raw[d,c])

r[d,c,0] ~ Normal(0, sigma_r[d]^2 / (1 - rho[d]^2))
r[d,c,t] = rho[d] * r[d,c,t-1] + eta[d,c,t]
eta[d,c,t] ~ Normal(0, sigma_r[d]^2)
```

`x_star` and `se_star` are the pre-period-standardized transformed observation
and standard error. Ordered time is `t in {0,...,17}`. `tau[t]` is computed by
subtracting the mean of `{0,...,11}` and dividing by the sample standard
deviation of those twelve unique values with `ddof=1`, then broadcasting that
single encoded vector to every panel group. Repeating time values once per
panel group before computing the standard deviation is prohibited. No
post-period time contributes to the encoding.

The exact priors are independent by lane:

```text
alpha[d] ~ Normal(0, 1)
beta[d] ~ Normal(0, 1)
sigma_u[d] ~ HalfNormal(1)
sigma_r[d] ~ HalfNormal(1)
rho[d] ~ Uniform(-0.95, 0.95)
```

Each lane is an independent univariate Gaussian state-space block. The planned
model uses:

- pre-period-only pooled standardization;
- known aggregate standard error exactly as likelihood standard deviation;
- no additional observation-noise term;
- zero-sum panel-group effects;
- stationary AR(1) initialization;
- compiled `abs(rho) < 0.95`;
- the exact priors above; and
- no shared coefficients, states, or scales across lanes.

The primary planned engine is deterministic Gaussian state-space integration.
The reference planned engine is PyMC NUTS under the same model and the accepted
four-chain sampler/diagnostic posture. James Kelley separately approved the
sequential synthetic implementation and proof stages on 2026-07-15. That
approval does not satisfy implementation, execution, evidence, review, human
acceptance, parent completion, real-data admission, or downstream integration.

## Internal Estimands

For each active lane, the only planned trajectory estimand is:

```text
direction-adjusted mean latent level in the final 3 evaluation windows
minus
mean latent level across all 12 pre-period windows
```

The result is expressed in that lane's pre-period standard deviation units.
Each plan freezes an ordered three-lane direction vector with every component
in `{+1,-1}` before synthetic truth or any post-period evidence is inspected.
With `C` panel groups, each lane's exact estimand is:

```text
movement[d] = direction_sign[d] * (
  sum(c=0..C-1, t=15..17, mu[d,c,t]) / (3*C)
  - sum(c=0..C-1, t=0..11, mu[d,c,t]) / (12*C)
)
```

Panel groups and windows receive equal weight. The posterior uses fixed-interval
smoothing conditional on exactly the frozen `w00..w17` panel. It uses no window
after `w17`, makes no forecast, and has no lag selector. Any downstream
exposure lag belongs to a separate predeclared outcome-integration plan.

The fixed-interval contrast is recovered analytically rather than relabeling a
fixed-coefficient contrast. For one lane and one outer hyperparameter support,
let `H` be the intercept, encoded-time, and zero-sum group design; let `K_c` be
the stationary AR(1) covariance; let `R_c=diag(se_c^2)`; let
`B_c=K_c+R_c`; and let `a_c` contain direction-adjusted weights
`-1/(12*C)` in pre windows, `+1/(3*C)` in `w15..w17`, and zero elsewhere.
After analytically conditioning the Gaussian coefficient/group vector
`theta | y,h ~ Normal(m_h,S_h)`, define:

```text
g_h = sum_c H_c' * (a_c - solve(B_c, K_c*a_c))
q_mean_h = sum_c a_c' * K_c * solve(B_c,y_c) + g_h' * m_h
q_var_h = sum_c a_c' * (K_c-K_c*solve(B_c,K_c)) * a_c
          + g_h' * S_h * g_h
```

Every solve uses the unmodified supplied known-SE covariance. Nonfinite or
nonpositive `q_var_h`, failed factorization, or an unbound contrast HOLDS. This
is the exact conditional Gaussian distribution of the latent-level contrast at
that hyperparameter support; no latent path is emitted.

The deterministic engine reuses the accepted outer integration constants:
8,192 unscrambled Sobol points, transformed through the same three-dimensional
Student-t proposal plus chi-square coordinate, with the existing finite-point,
effective-sample-size, and maximum-normalized-weight gates. Conditional
Gaussian contrast uncertainty is expanded with
`normal_quadrature_v1`: the 16 nodes and weights returned by
`numpy.polynomial.hermite.hermgauss(16)` under the pinned runtime, transformed
to standard-normal support as `z_j=sqrt(2)*node_j` and
`w_j=weight_j/sqrt(pi)`. For retained outer node ordinal `i`, movement support
is `q_mean_i + z_j*sqrt(q_var_i)`, combined weight is the normalized outer
weight times `w_j`, and stable support index is `16*i+j`; `i` is the original
Sobol ordinal, not a compacted finite-node index. Posterior mean/SD and every
80% or 99% endpoint are computed from this support with
`weighted_quantile_v1`. No mixture-CDF inversion, random draw, or caller-
selected quadrature is permitted.

The NUTS reference uses the same marginalized Gaussian likelihood. At each
retained draw it samples one scalar `trajectory_movement` from the exact
conditional Normal latent-contrast distribution above, conditional on that
draw's coefficients, zero-sum group effects, and hyperparameters. Those 4,000
chain-major/draw-major movement draws have equal weight and use
`weighted_quantile_v1`; they are not emitted in an artifact.

It is an internal observed-path smoothing contrast. It is not:

- raw KPI movement;
- a forecast;
- a historical counterfactual;
- an AI-attributed effect;
- a causal estimate;
- productivity or performance measurement;
- a score or ranking; or
- a customer confidence/probability output.

## Future Internal Interfaces And Hash Roots

The later implementation must define strict internal dataclasses and a matching
TypeScript validation boundary for these conceptual records. This contract does
not create a public schema.

| Record | Required role |
| --- | --- |
| `TrajectoryObservationBundle` | One tuple/window bundle owning all three primitive observations, fixed `covariance_lane_order=(frequency,engagement,breadth)`, synchronized 3x3 transformed-scale covariance, shared cohort/window/source identity, and one joint uncertainty hash. |
| `PrimitiveTrajectoryObservation` | One lane child with the canonical distribution, p50 statistic, denominator when required, transform, marginal transformed standard error, definition manifests, gate receipt, source refs/hashes, and synthetic-only pins. |
| `TrajectoryPreparedInput` | Canonically ordered arrays for exactly one lane plus pooled pre-period transform, time encoding, model manifest, shared panel root, and no truth sidecar. |
| `TrajectoryFitSummary` | One lane's terminal estimand, interval, diagnostics, prepared-input hash, and fit-summary hash without latent paths or posterior draws. |
| `OutcomeTrajectoryInput` | Future integration-only record for all three predeclared lagged lanes and their joint uncertainty/cross-lane covariance treatment; it is not authorized by this contract. |

Hashing must preserve separate roots rather than one opaque `vbd_source_hash`:

- one observation Merkle root per active lane;
- one opaque keyed source-derivation receipt and one final bundle-source-
  content root per tuple/window; the private pre-bootstrap root is not a
  FluencyTracr input or artifact field;
- one shared ordered-panel manifest root;
- one cohort-partition and non-overlap attestation root;
- one transform root per lane binding the raw transform plus that prepared
  lane's fitted pre-period mean, scale, and standard-error scaling;
- one joint uncertainty/covariance derivation root plus three bound marginal SE
  child roots;
- one model/prior/time-encoding manifest root;
- one optional non-numeric Depth-context root;
- one immutable study-plan, ordered direction-vector, and seed-manifest root;
- prepared-input and fit-summary roots per lane; and
- execution, checkpoint, recomputation, and artifact roots. A review root is
  created only later by the separate acceptance record; it is never a child of
  the generated artifact or any pre-execution root.

Every ordinary hash field is exact lowercase SHA-256 hex; the source receipt is
an exact HMAC-SHA256 hex token. Existing `workflow_id`, `jbtd_id`, and
`persona_id` use their canonical event-schema encodings, including permitted
case, and must also be exact entries in the frozen aggregate-slice manifest.
They are taxonomy keys, never person keys.

Every other ref must use one field-appropriate namespace from
`{source:,definition:,cohort:,plan:,gate:,review:,depth-context:,caveat:,
runtime:}` followed by `[a-z][a-z0-9._/-]{0,95}`, and must equal an entry in the
immutable `reference_manifest`. That manifest binds each exact ref to one field
role, aggregate-only posture, owner role, source definition, and blocked-use
set. Unknown, cross-role, caller-invented, encoded, or rehashed refs reject.
Depth context in this proof is limited to the exact allowlisted refs
`depth-context:a`, `depth-context:b`, and `depth-context:unavailable`; no
numeric, band, level, score, or encoded payload is permitted. Caveats use exact
allowlisted codes. Reviewer identity is only role plus an allowlisted review
ref.

No manifest value may contain whitespace, `@`, query/fragment text, a person/
customer/member/respondent identifier, a name or email, base64/hex-encoded
payload, raw content, prompt/output fragment, secret, or joinable source-local
digest. Strict tests mutate every field one at a time, including uppercase
canonical workflow ids. They must accept allowlisted canonical case while
rejecting unknown namespaces, encoded identity payloads, and numeric Depth
refs. Syntax is not privacy proof; exact manifest membership and
semantic review are mandatory, and self-consistent rehashing cannot legitimize
unsafe content.

These hashes detect drift and internal inconsistency. They do not prove source
authenticity, reviewer ownership, privacy clearance, or real-data admission.
Independent marginal fits also do not imply zero cross-lane covariance. Any
later outcome integration must use either one approved joint likelihood or a
hash-bound quadrature/draw propagation that preserves lane/window uncertainty
and cross-lane covariance. Posterior-mean plug-in, omitted covariance, error-
free exposure treatment, or stage-one/stage-two hash mismatch must HOLD. A
future integration test must prove that larger exposure uncertainty widens the
downstream result under otherwise identical synthetic inputs.

## Synthetic Proof Plan

### Stage 1: Implementation And Smoke

Future work must add the strict internal records above, a deterministic
synthetic generator, preparation, the primary engine, diagnostics, a summary-
only artifact, a strict TypeScript bridge, a fast smoke mode, the exact full
planner, resumable chunking/combiner, canary receipts, and isolated fresh-
recomputation machinery. The complete
plan, lane directions, scenario truths, source definitions, transforms, priors,
seed namespaces, slot keys, acceptance constants, and implementation/runtime
manifest must be frozen before any acceptance-plan truth, canary, or result is
generated or inspected.
Smoke, partial, malformed, duplicate, off-plan, mixed-provenance, hash-invalid,
runner-error, or hard-diagnostic evidence must HOLD.

Development smoke before the freeze is permitted only under the disjoint
`2_055_900_000..2_055_900_999` seed namespace, with no acceptance-plan slot key
or aggregate gate calculation. Every smoke artifact is permanently
`HOLD(smoke_mode_nonacceptance)` and cannot be combined, reviewed, or promoted
as evidence. Seeing a smoke result may repair mechanics but cannot change the
contract's model, DGP, priors, cells, thresholds, or acceptance seeds. Any pre-
freeze use of an acceptance slot/seed invalidates the later full study.

Before any acceptance canary reveals truth or a fit result, the future runner must create
an auditable two-commit freeze:

1. a clean source commit `S` contains the complete implementation candidate, contract,
   lockfile, compiled plan, seed manifest, and runtime-builder code, with no
   execution output;
2. CODE, BUG, ADVERSARIAL, and statistical-methodology reviewers return GO
   against exact commit `S`; any source change requires a new commit and new
   reviews;
3. a create-once freeze manifest binds `S`, its tree, every in-scope file hash,
   those implementation-review refs, the plan/seed/interface roots, and allowed
   commands without containing a result;
4. a freeze commit `F` has `S` as its sole parent and differs from `S` only by
   that sanitized manifest; and
5. every canary, primary, recomputation, concordance, floor, and control process
   runs from a clean checkout of exact commit `F` and binds `F` plus the freeze-
   manifest hash.

Each implementation-review reference must be unique and use
`review:<role>/go/<S>/<review-id>`, where `<role>` is exactly `code`, `bug`,
`adversarial`, or `statistical-methodology` and `<S>` is the reviewed candidate
commit. The manifest builder rejects duplicate, non-GO, malformed, or
different-commit references. Independent reviewers still verify the referenced
review evidence; the manifest cannot self-attest reviewer identity.

The later evidence commit must descend from `F`; reviewers must verify the
`S -> F` ancestry and allowed one-file diff. Amending, rebasing, replacing, or
changing any frozen identity after a canary or result exists invalidates the
entire run and requires a new `S`, new `F`, and full restart. A timestamp or
self-declared hash without this ancestry does not satisfy the freeze.
The pre-execution implementation reviews do not satisfy or replace the later
exact-byte evidence reviews.

Git source queries use the fixed system Git path with a strict environment
allowlist, an explicit work-tree binding, global/system configuration disabled,
and command-line disabling of hooks, filesystem monitors, and untracked-cache
helpers. Ambient `PATH`, `GIT_*`, `LD_*`, or `DYLD_*` values cannot redirect the
source-identity checks.

The runner accepts only a compiled slot key. It regenerates the complete
synthetic observation bundle internally from the bound generator, scenario,
seed, plan, and implementation, and requires exact equality again immediately
before fitting. Arbitrary observation packages, external dataset paths,
rehydrated inputs, fixture-oracle fields, and self-declared `synthetic_only`
objects cannot enter the proof. Truth remains in a separate generator-owned
sidecar and is never part of the prepared input.

### Frozen Primary Data-Generating Process

Primary synthetic cells generate all three active lanes with the same requested
terminal movement. On the generator working scale, the fixed base DGP is:

```text
alpha = 0
beta = 0.05
sigma_u = 0.18
rho = 0.45
sigma_r = 0.10
known_se(k) = 0.08 * sqrt(16 / k)
cross_lane_group_and_innovation_correlation = 0.35
cross_lane_observation_error_correlation = 0.25
```

Each cross-lane matrix is equicorrelated with diagonal one. Working-scale
observation covariance is `diag(known_se) * R_observation * diag(known_se)`.

Group effects are sampled then centered to exact zero sum. AR(1) states use the
stationary initial distribution. Generation order is fixed:

1. generate base latent paths and working-scale observation noise;
2. compute each lane's pooled pre-period mean and `ddof=1` scale from the noisy
   working-scale observations;
3. apply that same empirical transform to observations, latent paths, and
   the full observation covariance, yielding final prepared marginal SE and
   covariance;
4. add one constant sustained shift to all six post-period latent and observed
   levels so the realized latent terminal estimand equals exactly the cell
   effect `{0, 0.2, 0.5}` under direction `+1`; and
5. map the final prepared observations to raw source p50 values through the
   inverse transforms below, with raw transformed-scale SE equal to the lane
   scale times final prepared SE and raw covariance equal to
   `diag(lane_scale) * prepared_covariance * diag(lane_scale)`.

Because the final prepared pre-period observations have exact mean zero and
sample SD one, ordinary preparation recovers the same values and SE without a
second scale change. The truth sidecar contains the transformed latent path and
requested contrast but never enters the prepared model input.

Raw p50 values are obtained through exact inverse transforms from fixed
transformed-scale offsets/scales:

| Lane | Offset | Scale | Exact inverse |
| --- | ---: | ---: | --- |
| `frequency` | `2.5` | `0.25` | `expm1(offset + scale * x_star)` |
| `engagement` | `0.8` | `0.12` | `eligible_day_count * sin(offset + scale * x_star)^2` |
| `breadth` | `0.6` | `0.12` | `eligible_surface_count * sin(offset + scale * x_star)^2` |

The primary generator uses `eligible_day_count=60` under the half-open schedule
above and `eligible_surface_count=12` under one fixed synthetic taxonomy. It
emits direct aggregate synthetic packages under the distinct derivation id
`synthetic_known_aggregate_uncertainty_v1`; it does not fabricate canonical
member rows or claim to have run the source-side bootstrap. Context quantiles
use standardized offsets
`delta={p10:-0.20,p50:0,p90:+0.20,p99:+0.30}`. For lane `d`, cell `c,t`, and
quantile `q`, the complete formula is
`z_q[d,c,t]=offset[d]+scale[d]*(x_star[d,c,t]+delta[q])`, followed by the exact
lane inverse in the table above. Thus quantile deltas are multiplied by the
lane scale rather than added after it. All frequency values must remain
nonnegative and every Engagement/Breadth angle must remain strictly inside
`(0,pi/2)`; violation is a runner error, never clipping. The resulting ordered
quantiles, p50, transformed marginal SE, and covariance must reconcile exactly.

All numerical study generation uses exactly
`numpy.random.Generator(numpy.random.PCG64DXSM(seed))` and float64 arrays. No
random call may precede the fixed sequence: (1) standard normals of shape
`(C,3)` for group effects, (2) shape `(C,3)` for stationary initial states,
(3) shape `(C,17,3)` for innovations, and (4) shape `(C,18,3)` for observation
errors. Equicorrelation matrices use `numpy.linalg.cholesky` in canonical lane
order and row-vector multiplication by the lower factor transpose. Group
effects are centered independently by lane after correlation. Initial states
use `sigma_r/sqrt(1-rho^2)`; innovations and observation errors are applied in
panel-group, time, lane C-order. Targeted/drift mutations occur only after
these base draws unless their compiled scenario explicitly changes a
correlation matrix. Any bit generator, factor orientation, array order, call
order, or implicit substream change is implementation drift.

Source-bootstrap conformance is tested separately with one fixed process-local
synthetic `k=16` fixture in canonical member-slot order:

```text
engagement_active_days = [1,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30]
frequency_run_counts = [1,4,12,24,40,60,84,112,
                        144,180,220,264,312,364,420,480]
frequency_runs_per_active_day = [1,2,3,4,5,6,7,8,
                                 9,10,11,12,13,14,15,16]
breadth_distinct_surfaces = [1,1,1,1,2,2,3,3,4,4,5,6,7,8,10,12]
```

Engagement and Breadth fixture values are integers in their canonical units.
Frequency ratios are derived exactly from the paired integer arrays. The three
type-7 p50 values are `8.5`, `15`, and `3.5`; the fixed wrong nearest-index
mutation uses zero-based `floor((n-1)*p + 0.5)` without interpolation and yields
`9`, `16`, and `4` at p50.
`quantile_algorithm_drift` binds that wrong algorithm identity and its changed
fixture result, so every drift slot rejects before fit. Conformance fixture
rows remain process-local test inputs and never enter a numerical study slot,
prepared model input, checkpoint, artifact, or committed evidence.

The portable conformance oracle is versioned as
`vbd_source_bootstrap_conformance_oracle_v2` and frozen under the pinned NumPy
runtime. Its
fixture-private body is canonical JSON over the arrays above plus
`fixture_id=vbd_source_bootstrap_conformance_v1`, `cohort_size=16`, canonical
lane order, denominators `60` and `12`, window `w00`, the fixture active-set
commitment, and the three fixed definition hashes. Its
`prebootstrap_bundle_content_root` is
`fb43e8e9c7cdbb2faf943013fa1c9aca9004898539870cd2dc3d02bd84829967`,
which yields bootstrap seed `3765976209925714`. The exact transformed
covariance in canonical lane order is:

```text
[[0.04044726358396, 0.01440591242854, 0.01897453340341],
 [0.01440591242854, 0.005157809262658, 0.006849798111473],
 [0.01897453340341, 0.006849798111473, 0.00958500695148]]
```

The matching standard errors are
`[0.2011150506152,0.07181788957257,0.09790304873435]`.
The canonical oracle body containing the oracle version, complete numeric-
canonicalization policy, private root, seed, type-7 p50 vector, covariance, and
standard-error vector has SHA-256
`f32b94e2a15df01d6aa257995c2201dfef788fcd25a48ea64241a2fb78f14a5e`.
These fixture-only private values may appear in tests but never in a numerical
study input, checkpoint, generated artifact, or future real-source package.

### Stage 2: NUTS Concordance

The original pre-freeze concordance seed families rooted at
`2_056_000_000`, `2_056_020_000`, and `2_106_000_000` are retired. During
task-3 runner hardening on 2026-07-16, an interrupted mocked child test
instantiated the first original generator seed before candidate source commit
`S` or freeze `F` existed. The sampler and deterministic engines were mocked,
and no fit, gate, or numerical summary was produced or inspected. The
replacement families below are a one-time pre-freeze integrity rotation, not
post-result tuning. They are immutable in candidate `S`, require all four
exact-commit reviews, and cannot change after `F`.

Run five fixed NUTS concordance seeds in each of six cells:

```text
effect size in {0, 0.2, 0.5} pre-period SD
x
panel-group count in {6, 12}
```

Cells use lexicographic order over effects `(0, 0.2, 0.5)` and group counts
`(6, 12)`, with group ordinal `6 -> 0`, `12 -> 1`, yielding
`cell_ordinal in {0,...,5}`. Concordance seed index
`i in {0,...,4}` maps to:

```text
seed = 2_056_500_000 + 10 * cell_ordinal + i
```

The bundle seed generates the correlated three-lane synthetic package. With
lane ordinals `frequency=0`, `engagement=1`, and `breadth=2`, each NUTS lane
uses four explicit, injective chain seeds:

```text
nuts_chain_seed = 2_056_520_000
                + 1_000*cell_ordinal
                + 100*i
                + 10*lane_ordinal
                + chain_index
```

`chain_index={0,1,2,3}`. No engine may silently spawn or reuse another bundle,
lane, or chain seed stream.

The reference engine uses four chains, 1,000 retained draws per chain, 2,000
tuning draws per chain, `target_accept=0.99`, and `max_treedepth=15`. All three
active lanes are evaluated separately. Cross-engine mean differences
must be at most `0.15` reference posterior SD. The lower and upper endpoints of
both the 80% and 99% movement intervals are independently rederived and each
must differ by at most `0.20` reference posterior SD. SD ratios must remain
within `[0.85,1.15]`. The 99% endpoint gate is required because the later null
false-movement decision uses the direction-adjusted 99% lower endpoint.
Each hashed lane record names all four normalized endpoint differences, and the
compact diagnostic summary reports separate worst-case 80% and 99% endpoint
differences. Missing, merged, or ambiguously labeled endpoint evidence HOLDS.
Reference diagnostics require R-hat `<=1.01`, bulk/tail ESS `>=400`, zero
divergences, zero treedepth saturation, BFMI `>=0.3`, MCSE/posterior-SD ratio
`<=0.1` separately for the posterior mean, both 80% endpoints, and both 99%
endpoints, and every PPC p-value within `[0.05,0.95]`. ArviZ diagnostic arrays
must have identical parameter dimensions, coordinate labels, and cardinality
before values are joined; positional truncation or an unlabeled join HOLDS.
Any lane or hard failure
blocks replication.

Every lane uses the exact `vbd_trajectory_ppc_v1` manifest. For observed or
replicated lane values `y[c,t]`, it computes:

```text
pre_post_mean_movement = mean(y[:,12:18]) - mean(y[:,0:12])
between_panel_group_variance = Var_ddof1({mean_t(y[c,:]) for c})
within_panel_group_variance = mean_c(Var_ddof1(y[c,:]))
tail_or_extreme_aggregate_statistic = max(|y - mean(y)|)
z[c,t] = y[c,t] - mean_t(y[c,:])
lag_one_within_group_autocorrelation =
  sum_c sum_t=1..17 z[c,t]*z[c,t-1]
  / sum_c sum_t=0..16 z[c,t]^2
```

A nonpositive lag denominator returns zero. One posterior-predictive replicate
is generated per retained draw in stable chain-major/draw-major order with
`ppc_seed = 2_106_500_000 + 1_000*cell_ordinal + 100*i + 10*lane_ordinal`.
The PPC generator is `Generator(PCG64DXSM(ppc_seed))`. For each retained draw
and panel group in order, it first draws one length-18 standard-normal vector
for a fresh conditional smoothed AR(1) path from
`r_c | y_c,beta,u_c,sigma_r,rho`, then one length-18 standard-normal vector for
new known-SE observation error. The replicate is
`alpha+X_c*beta+u_c+r_c_rep+se_c*z_c`, where `alpha` is the retained draw's
intercept and `X_c*beta` is the encoded-time slope contribution only. It does
not reuse the stored smoothed path and does not draw a new unconditional/prior
AR path. Cholesky orientation and panel/time order match the numerical DGP.
For each statistic the one-sided
upper-tail p-value is exactly
`count(T_rep >= T_observed) / 4000`, with ties included and no smoothing
constant. Predictive 80% endpoints use `weighted_quantile_v1` with equal
weights. Missing statistics, a different formula/order/seed/sidedness, or any
p-value outside the inclusive `[0.05,0.95]` range HOLDS the lane.

The concordance universe is 30 bundle executions (`6 cells * 5 seeds`). Each
bundle contains three primary deterministic lane fits, three matched NUTS lane
fits, and three deterministic fits freshly regenerated in separate
recomputation processes that cannot read a primary checkpoint or result. The
artifact therefore binds 90 nested primary deterministic, 90 nested fresh-
deterministic-recomputation, and 90 nested NUTS fit records. Each fresh
deterministic result must have a distinct process/phase attestation and exact
prepared-input and semantic-result equality with its primary fit. Missing,
copied, or mismatched recomputation blocks replication. Bundle execution count
and nested lane-fit count must never be conflated.
The combiner independently regenerates each compiled bundle and requires exact
ordered-panel, lane-observation, and truth-receipt roots across the primary and
all three recomputation processes. Every child HOLD remains HOLD. Full generator
and full-NUTS entry points verify the exact clean manifest-only freeze before
any replacement acceptance seed or sampler can execute.

Every concordance and later validation child starts with isolated Python
(`-I -S`), no repository `PYTHONPATH`, and `/` as its working directory. The
parent reads the exact reviewed candidate blobs from trusted Git objects,
hash-checks every in-scope module against the freeze manifest, and transmits
the complete source set over an inherited one-way descriptor. A minimal
standard-library bootstrap verifies every source byte in memory before it
installs a deny-by-default package loader or imports an execution module.
The source bundle's manifest hash must equal the already-admitted launch
receipt before any candidate Git blob is read.
Missing, extra-fallback, mutable-working-tree, or pre-verification package code
cannot execute the child.

Once an external workspace lock is held, workspace JSON reads and create-once
publications use no-follow, descriptor-relative traversal. Existing
subdirectories are inode-bound when admitted and their device/inode identities
are persisted in the create-once workspace record; a root or intermediate-
directory rename/substitution cannot redirect an evidence read or write or
silently roll back completed work and instead fails closed. Exact-tree and
evidence-snapshot enumeration also runs from held descriptors, never mutable
workspace path traversal. The later full-study workspace additionally persists the
canonical external concordance receipt path, path hash, device, and inode. It
reruns complete external concordance workspace verification on every load and
requires its copied receipt to equal the independently recomputed external
receipt; an internally minted shape-only token is never sufficient.

Before a child starts, its create-once launch receipt is also written to a
private sibling attempt-anchor rooted outside the deletable evidence workspace
and bound by root path hash/device/inode, all four phase-directory inodes,
workspace hash, phase, and slot/bundle stem. Resume restores a missing
workspace launch from that anchor. A launch
whose result/checkpoint is also missing becomes a durable runner failure and
is never sampled or integrated again. Missing, replaced, malformed, or
off-plan anchors fail closed; directory-entry disappearance during a locked
scan is an error, never an empty-directory result. Attempt anchors are internal
crash/replay state and are not evidence artifacts or committed outputs.

The compiled runner threat model is
`trusted_frozen_host_crash_replay_and_workspace_tamper_detection_v1`. It
requires the operator and parent process to be trusted and the reviewed freeze
to be established before execution. Hashes, create-once records, process
capabilities, and descriptor bindings detect source/workspace drift, crash
replay, substitution, rollback, and malformed evidence inside that boundary;
they are not a cryptographic attestation against an actor that already controls
the parent process and can coordinate arbitrary code execution plus a complete
workspace forgery. Defending that stronger actor would require a separately
governed external signing or hardware-attestation authority and is not part of
this synthetic internal proof queue item.

### Stage 3: Replicated Calibration

After concordance passes and before any full-study chunk, run these four exact
full-setting canary slot keys in order:

1. `primary/effect=0/groups=6/replication=0`;
2. `primary/effect=0.5/groups=12/replication=199`;
3. `targeted/composition_rotation/groups=6/replication=0`; and
4. `targeted/correlated_null/groups=12/replication=29`.

Each canary must complete with its planned row-level state and no runner or hard
diagnostic failure. It computes no coverage, bias, or null-rate decision.
Unexpected failure stops execution; any fix requires a new source/freeze pair,
new concordance, and all four new canaries. Canary results have distinct
execution attestations, are never admitted to a study denominator, and cannot
substitute for the later original or recomputation of the same planned slot.
The final artifact binds four sanitized canary receipts without posterior
numbers or row content.

Run exactly 200 deterministic primary replications in each of the six cells at
`k=16`, for 1,200 primary slots. Replication index
`j in {0,...,199}` maps to:

```text
seed = 2_056_100_000 + 1_000 * cell_ordinal + j
```

The proof also runs six targeted scenarios in this fixed order:

1. `frequency_only`: truth vector `(+0.5, 0, 0)`;
2. `engagement_only`: truth vector `(0, +0.5, 0)`;
3. `breadth_only`: truth vector `(0, 0, +0.5)`;
4. `correlated_null`: truth vector `(0, 0, 0)` with group, innovation, and
   observation-error equicorrelation all set to `0.8`;
5. `composition_rotation`: truth vector `(+0.5, -0.5, 0)`; and
6. `temporary_pulse`: `+0.5` in all lanes for only the first three post
   windows, with terminal truth `(0, 0, 0)`.

Truth vectors above are raw terminal contrasts in lane order
`(frequency, engagement, breadth)`. Direction is `+1` for
positive and zero entries and `-1` for the negative engagement entry in
`composition_rotation`; direction-adjusted nonzero truth is therefore `+0.5`.
For every lane, the generator solves the scenario's additive post-window
pattern after empirical pre-period normalization so the realized latent
terminal contrast equals the declared truth exactly. This recentering applies
to zero-truth lanes and to the temporary pulse after the base trend, group
effects, and AR state are present; truth is never inferred approximately from
the requested amplitude.

Specifically, if the normalized base terminal contrast is `b[d]`, a sustained
target `q[d]` adds `q[d]-b[d]` to every post window. `temporary_pulse` first
adds `-b[d]` to all six post windows, then adds `+0.5` only to `w12..w14`.
Therefore `w15..w17` have terminal truth exactly zero while the first three
post windows contain the declared pulse.

Each targeted scenario runs at group counts `{6,12}` for 30 replications, for
360 targeted slots. With `scenario_ordinal in {0,...,5}`,
`group_ordinal in {0,1}`, and `j in {0,...,29}`, its seed is:

```text
seed = 2_056_200_000
     + 1_000 * scenario_ordinal
     + 100 * group_ordinal
     + j
```

The drift matrix has six scenarios in fixed order:

1. `quantile_algorithm_drift`: type-7 changes to nearest-index rounding;
2. `run_definition_drift`: the post-period run-definition hash changes;
3. `active_membership_commitment_drift`: the post-period opaque active-set
   commitment changes from `active-set-a` to `active-set-b` while `k` and
   `cohort_size` remain fixed; no member row or slot list is created;
4. `eligible_day_denominator_drift`: post-period count changes from 60 to 61;
5. `surface_taxonomy_drift`: the post-period taxonomy/count changes from 12 to
   13; and
6. `understated_uncertainty`: reported SE is one-half the true observation SE
   and reported covariance is one-quarter the true covariance.

Every drift slot otherwise uses `k=16`, the primary DGP, raw truth vector
`(+0.5,+0.5,+0.5)`, direction signs `(+1,+1,+1)`, and a sustained shift across
all six post windows. Its compiled slot key fixes the drift id, panel-group
count, replication, `k`, truth, directions, post pattern, and seed. No omitted
default or caller-supplied value is permitted. The quantile drift additionally
uses the fixed integer-valid conformance fixture above solely to bind the wrong
algorithm result.

Each drift scenario runs at group counts `{6,12}` for 30 replications, for 360
drift slots. With `drift_ordinal in {0,...,5}`, `group_ordinal in {0,1}`, and
`j in {0,...,29}`, its seed is:

```text
seed = 2_056_250_000
     + 1_000 * drift_ordinal
     + 100 * group_ordinal
     + j
```

The first five drift scenarios must reject before fit in all 60 slots per
scenario. The understated-uncertainty scenario must retain every planned result
row and produce a scenario HOLD because at least one lane/group 80% coverage rate falls below
`74%`; otherwise that control fails and the full study HOLDS. Invariant primary
movement must not be mislabeled as drift.

The primary, targeted, and drift plans therefore contain exactly 1,920 planned
slots, including structural drift rejections. A separately identified resumable phase
freshly recomputes all 1,920. Atomic combine admits only exact key-set equality,
canonical ordering, and byte-matched primary/recomputation results under one
clean source, runtime, native-library, single-thread environment, lockfile,
implementation, and plan identity. Missing, extra, duplicate, reordered,
off-plan, stale, symlinked, copied-across-phase, or runner-error entries remain
visible failures and HOLD the entire study.

Every original and recomputation case executes in a new process. The runner
records a process-local OS-entropy instance token, phase token, process id,
process start time, interpreter/native-library identity, and executable hash.
Primary and recomputation phase tokens, process tokens, checkpoint roots, and
create-once manifests must be disjoint. The recomputation process may read only
the immutable plan/runtime/generator inputs; it must refuse primary result,
artifact, or checkpoint deserialization and regenerate the case before
computation. Each signed-content attestation binds its own process/phase token,
prepared-input hash, semantic-result hash, executable/runtime roots, and freeze
commit. Atomic publication recomputes those hashes and requires distinct fresh-
execution attestations plus byte-equal semantic results. Tokens and byte
equality detect accidental copying but do not claim cryptographic remote
attestation.

All posterior interval gates use `weighted_quantile_v1`. Values and weights
must be finite, stable support indices must be unique, weights must be
nonnegative, and their finite total must be strictly positive. Remove every
zero-weight support before sorting; reject if none remains. Sort positive-weight
support by `(movement_value, stable_support_index)`, normalize weights to one,
and assign each retained support value midpoint probability
`m_i=cumulative_weight_before_i + weight_i/2`. `Q(p)` is the endpoint support
value outside `[m_0,m_last]` and linear interpolation between adjacent
`(m_i,value_i)` inside that range. Deterministic integration uses its normalized
support weights; NUTS draws use equal weights in stable chain-major/draw-major
order. The 80% equal-tail interval is `[Q(0.10),Q(0.90)]`; the 99% equal-tail
interval is `[Q(0.005),Q(0.995)]`.

Coverage includes endpoints: `lower <= truth <= upper`. Intervals and truth are
on the direction-adjusted movement scale. A null false-movement flag is true
only when the 99% lower endpoint is strictly greater than zero.

Every primary lane/cell observed 80% interval-coverage rate must remain within
the compiled `74-86%` band. Each of the 36 targeted
`(scenario,panel_group_count,lane)` cells has only `N=30`, so its point rate is
reported but is not forced into that band. Instead, use a two-sided exact
Clopper-Pearson interval with family alpha `0.05`, Bonferroni cell alpha
`alpha_cell=0.05/36`, and:

```text
lower = 0, if x=0; otherwise BetaPPF(alpha_cell/2, x, N-x+1)
upper = 1, if x=N; otherwise BetaPPF(1-alpha_cell/2, x+1, N-x)
targeted_gate = (lower <= 0.86) and (upper >= 0.74)
```

`BetaPPF` is `scipy.stats.beta.ppf` under the pinned runtime. Every targeted
cell interval must intersect `[0.74,0.86]`; cells cannot pool or rescue one
another. This is a predeclared simultaneous finite-sample compatibility gate,
not a relaxation of the 200-replication primary calibration gate. Structural-
rejection drift scenarios have no coverage gate, and the understated-
uncertainty control separately requires at least one lane/group point coverage
rate below `74%` and therefore HOLDS. In a
null replication, the familywise internal false-movement flag is true if any
lane in that scenario's frozen zero-truth set has a direction-adjusted 99%
internal lower endpoint strictly greater than zero. The worst null cell must
remain at or below `5%`. For every nonzero-truth lane in primary and targeted
scenarios,
the bias gate is computed separately for each exact
`(scenario, panel_group_count, lane)` cell:

```text
absolute_bias = abs(sum(replication posterior_mean - truth) / N)
```

`N=200` for a primary cell and `N=30` for a targeted cell. Absolute bias must
be at most `0.10` pre-period SD and the within-cell mean posterior estimate must
have the truth sign. No lane, scenario, or group cell may be pooled with another
for this gate. Each lane passes independently; a passing average cannot rescue
a failed lane. The null-
truth sets are `{all lanes}` for primary effect `0`, `{the two unmoved lanes}`
for each single-lane scenario, `{all lanes}` for `correlated_null`, `{breadth}`
for `composition_rotation`, and `{all lanes}` for the `temporary_pulse`
terminal estimand. Only those zero-truth sets enter each scenario's familywise
false-movement flag.

These are synthetic proof constants, not customer confidence, product
thresholds, runtime settings, or new suppression reasons.

### Floor, Drift, And Negative Controls

Floor checks are fixed at `k=4`, `k=5`, `k=8`, `k=10`, `k=12`, and `k=16`,
crossed with both panel-group counts for twelve exact slots. Every slot requires
`cohort_size == k`. Their seeds use:

```text
seed = 2_056_300_000 + 10 * k_ordinal + group_ordinal
```

The exact ordinal maps are `k={4:0,5:1,8:2,10:3,12:4,16:5}` and
`panel_group_count={6:0,12:1}`.

Every floor control uses the invariant primary DGP, raw truth vector
`(+0.5,+0.5,+0.5)`, direction signs `(+1,+1,+1)`, and no other mutation.

- `k=4` rejects under the existing aggregate minimum;
- `k=5` and `k=8` are valid internal-only floor controls after the source gate
  but remain ineligible below the existing `k>=10` series/read-path evidence
  floor; their expected state does not HOLD the full study;
- `k=10`, `k=12`, and `k=16` pass that inherited floor as numerical controls;
  and
- `k=16` remains primary-study provenance, not a runtime admission threshold.

No floor result changes the compiled `cohort_size >= 5` suppression gate,
creates another model threshold, or authorizes a real-data floor.

The additional negative-control manifest is exactly this ordered list:

| Ordinal | Control id | Fixed mutation / truth | Expected result |
| ---: | --- | --- | --- |
| 0 | `common_availability_shock` | sustained `(+0.5,+0.5,+0.5)` plus truth-sidecar `shock_kind=common_availability` | valid internal trajectory, all causal/output flags false |
| 1 | `depth_context_perturbation` | terminal truth `(0,0,0)` and optional Depth ref changes from `depth-context:a` to `depth-context:b` | identical prepared inputs/fits, no familywise false movement |
| 2 | `weak_history` | 11 pre windows | reject before fit |
| 3 | `zero_pre_period_variance` | constant pre values in all lanes | HOLD before fit |
| 4 | `engagement_ceiling` | after valid package generation, every pre-window Engagement distribution becomes `{p10:59,p50:60,p90:60,p99:60}` | reject at p50-domain gate before fit |
| 5 | `breadth_ceiling` | after valid package generation, every pre-window Breadth distribution becomes `{p10:11,p50:12,p90:12,p99:12}` | reject at p50-domain gate before fit |
| 6 | `missing_window` | remove `w10` | reject before fit |
| 7 | `suppressed_window` | mark exact key `frequency/w10` suppressed | reject before fit |
| 8 | `stale_window` | mark exact key `engagement/w10` stale | reject before fit |
| 9 | `imputed_window` | mark exact key `breadth/w10` imputed | reject before fit |
| 10 | `duplicate_window` | duplicate exact lane/window key `breadth/w10` | reject before fit |
| 11 | `off_plan_window` | add exact extra window id `w99` | reject before fit |
| 12 | `legacy_composite_input` | add `overall_vbd_score=50`, `integration_score=50`, `vbd_quadrant=low_integration` | reject before fit |
| 13 | `breadth_duplicated_in_velocity` | replace frequency statistic identity with `velocity_index` | reject before fit |
| 14 | `numeric_depth_dependency` | add exact numeric field `depth_value=0.5` | reject before fit |
| 15 | `post_period_standardization` | recompute transform over all 18 windows | reject before fit |
| 16 | `lookahead_window` | add `w18` to the fit input | reject before fit |
| 17 | `lane_window_misalignment` | shift every Breadth window id forward by one | reject before fit |
| 18 | `blueprint_target_contamination` | add `blueprint_target_value=0.5` | reject before fit |
| 19 | `outcome_contamination` | add `primary_outcome_value=0.5` | reject before fit |
| 20 | `fluency_contamination` | add `ai_fluency_value=0.5` | reject before fit |
| 21 | `semantic_hash_drift` | mutate one frequency definition child after root creation | full study HOLD |
| 22 | `copied_recompute` | recomputation attempts to deserialize one primary result, artifact, or checkpoint | runner refusal and full study HOLD |
| 23 | `direct_identifier` | add exact field `user_id=synthetic-user` | reject before fit |
| 24 | `raw_content` | add exact field `raw_rows=[{"value":1}]` | reject before fit |
| 25 | `real_data_flags` | set `real_data_present`, `customer_data_present`, `live_data_source_present`, `production_data_present` all true | reject before fit |
| 26 | `runner_error` | raise `SyntheticRunnerError` after planned slot registration | durable runner-error row and full study HOLD |
| 27 | `partial_study` | remove the final planned deterministic case before combine | full study HOLD |
| 28 | `self_completion` | generated artifact sets `independent_acceptance_complete`, `task_5_6_complete`, `promotion_complete` all true | reject artifact |
| 29 | `unsafe_output_flags` | generated artifact sets customer/confidence/probability/ROI/causality/productivity output authorization all true | reject artifact |
| 30 | `missing_joint_covariance` | remove the required 3x3 covariance while marginal SE remains | reject before fit |
| 31 | `permuted_covariance_lane_order` | set `covariance_lane_order=(breadth,engagement,frequency)` while lane children remain canonical | reject at lane-order gate before fit |
| 32 | `covariance_diagonal_mismatch` | set frequency SE to `1.1*sqrt(C[0,0])` while keeping base covariance `C` unchanged | reject at diagonal-consistency gate before fit |
| 33 | `non_psd_covariance` | set `C_bad=D @ [[1,.9,.9],[.9,1,-.9],[.9,-.9,1]] @ D`, where `D=diag(base_SE)`, preserving order and diagonal | reject at PSD gate before fit |

Control 3 is generated as a canonical bound scenario whose pre-period
frequency, Engagement, and Breadth observations are constant across every
group/window. It reaches normal production lane preparation and HOLDS when
that path computes zero pre-period scale. Control 22 additionally rewraps a
successful original checkpoint with coherent recomputation outer metadata;
the unchanged original execution attestation rejects before the copied result
can enter recomputation.

Controls 4, 5, and 30-33 mutate a fully valid generated aggregate bundle only
after generation. They do not rerun inverse transforms or context-quantile
generation. They recompute every changed semantic child and ancestor hash so a
stale hash cannot mask the intended gate; the missing-covariance control removes
the required field and reaches structural validation. Validator order for these
controls is p50 domain, required covariance presence, covariance lane order,
diagonal consistency, then PSD. A different failure stage or runner error fails
the control and HOLDS the study.

Every control runs once at each panel-group count for 68 exact slots. With
`control_ordinal={0,...,33}` and the global group ordinal, its seed is:

```text
seed = 2_056_400_000 + 10 * control_ordinal + group_ordinal
```

Every expected pass, HOLD, or rejection is conjunctive and must occur in both
group-count slots. The twelve floor controls and 68 negative controls are
freshly rerun in new processes under the recomputation identity. Together with
the 1,920 primary/targeted/drift slots, the complete non-NUTS evidence set is
therefore exactly 2,000 original cases plus 2,000 fresh recomputations. Missing,
extra, reordered, or wrong-verdict controls HOLD the full study.

## Downstream Integration Blocker

The accepted longitudinal outcome proof currently expects one scalar
`velocity_exposure` and one scalar `breadth_exposure`. This contract defines
three active lanes. A passing VBD proof therefore cannot be fed into the
outcome model by alias, arbitrary averaging, post-result component selection,
or a hidden composite.

The default future integration path is three separately predeclared lagged
terms followed by renewed affected-model concordance, calibration, null, lag,
shock, and negative-control validation. A different scalar compression would
need its own approved derivation and synthetic proof. Neither integration path
is authorized by this contract.

The existing outcome smoke boundary also treats missing Depth exposure context
as a HOLD even though Depth is outside its likelihood. The integration change
must reconcile that legacy rule: omitted, suppressed, or changed non-numeric
Depth context must leave numerical inputs, fit, diagnostics, and eligibility
identical, while any numerical Depth dependency still rejects. This
reconciliation must not promote Depth or weaken suppression.

## Evidence And Completion Gate

A future full artifact must be aggregate-only, synthetic-only, summary-only,
internal, noncausal, and nonauthorizing. It must bind the separate hash roots,
exact plan, implementation, runtime/native-library identity, lockfile, input,
preparation, fit, diagnostics, primary/targeted/drift slots, recomputations,
controls, freeze ancestry/receipt, and artifact bytes. It cannot bind or predict
later review decisions. It must not commit raw draws, latent
paths, input arrays, respondent rows, person-level fields, raw event rows, or
unsafe source detail.

Evidence acceptance must occur in this order:

1. commit the full summary artifact and its byte-derived compact summary;
2. obtain CODE, BUG, ADVERSARIAL, and statistical-methodology GO decisions
   against those exact committed bytes;
3. create and commit a separate self-hashed acceptance record that binds the
   artifact hash, compact-summary hash, and completed review decisions without
   modifying either reviewed evidence file; and
4. obtain explicit human acceptance of that exact committed acceptance record.

The generated artifact cannot certify itself, and the acceptance record cannot
rewrite the reviewed evidence. Parent task `5.6` may be checked only after all
of the following are separately verified:

1. implementation approval and completion;
2. accepted NUTS concordance;
3. four passing predeclared canary receipts;
4. complete 2,000-case replicated/floor/control evidence set and 2,000 fresh
   recomputations;
5. every null, floor, drift, and negative control passing;
6. exact-byte CODE, BUG, ADVERSARIAL, and statistical-methodology GO decisions;
   and
7. an explicit human acceptance decision limited to the bounded internal
   synthetic trajectory proof.

The exact accepted evidence universe is 30 concordance bundle executions
containing 90 nested NUTS, 90 nested primary deterministic, and 90 nested fresh-
deterministic-recomputation lane fits, plus 2,000 original deterministic cases
and 2,000 fresh deterministic recomputations, for 4,030 top-level bundle/case
records plus four canary records and 270 nested concordance fit records: 4,034
top-level records in total. Process attestations are bound children, not
additional study slots. The reviewed evidence commit contains one full summary artifact and
one byte-derived compact summary. A later acceptance commit contains one
separate self-hashed acceptance record. No other execution or document may be
silently included or substituted.

Checking task `5.6` would complete only this trajectory-calibration
prerequisite. The downstream three-lane outcome-model integration and renewed
affected proof remain a separate blocking task before dogfood execution.

## HOLD Behavior

The trajectory prerequisite remains HOLD for any missing, incomplete, unsafe,
suppressed, stale, imputed, duplicate, off-plan, definition-drifted,
denominator-drifted, taxonomy-drifted, hash-invalid, runner-error,
hard-diagnostic, partial, mixed-provenance, real-data, person-level, composite,
Depth-promoting, look-ahead, contamination, self-authorizing, or output-
authorizing input or result.

One passing lane, panel group, effect cell, floor, control, engine, or review
cannot rescue another failure. Suppressed slices cannot be pooled into a larger
slice for model admission.

## Non-Authorization

This contract does not authorize:

- implementation or execution outside the exact sequential queue items and
  freeze/review gates approved on 2026-07-15;
- real, customer, production, live, or respondent-level data;
- customer-facing or broad internal output;
- confidence or probability output;
- causal, AI-impact, ROI, finance, productivity, prediction, ranking, HR, or
  economic claims;
- routes, UI, persistence, schemas, connectors, exports, migrations, or
  readouts;
- new canonical events, suppression reasons, tunable product thresholds, or
  admin overrides;
- DiD work; or
- a promotion decision.

## Allowed Next Step

Complete task `3.1` verification and commit the exact candidate source as `S`.
Obtain CODE, BUG, ADVERSARIAL, and statistical-methodology GO against those
exact bytes, then create the manifest-only sole-child freeze `F` before running
concordance or any acceptance canary. Parent task `5.6`, full evidence,
real-data admission, runtime monitoring, readout language, pilot manifest,
downstream three-lane outcome integration, persistence, and UI remain
incomplete.

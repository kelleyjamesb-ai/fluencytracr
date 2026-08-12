# VBD Joint Replicated Synthetic Validation Protocol

Protocol status: `FROZEN_PREIMPLEMENTATION`

Protocol ID: `FT_VBD_JOINT_REPLICATED_VALIDATION_V4`

Decision date: `2026-08-11`

Authority effect: `NONE`

## Purpose

This protocol defines the first replicated test of whether the synthetic VBD
joint model can recover known aggregate capability and behavior associations,
represent their uncertainty, avoid inventing a behavior pathway under a null,
and improve held-out prediction when the pathway is present.

It is synthetic, aggregate-only, internal, and noncausal. Passing this protocol
cannot authorize real data, customer output, product integration, confidence or
probability output, causal impact, productivity, ROI, ranking, or economic
claims.

The earlier V1, V2, and V3 smoke hashes remain permanently nonqualifying. They
are not members of this study and cannot enter any denominator.

## Why A New Frozen Revision Is Required

The V3 generator and preparation path admit only one primary dataset and one
behavior-pathway-null dataset. Those two datasets can test execution and
convergence, but they cannot establish recovery, calibration, sensitivity, or
predictive superiority.

This protocol therefore requires a validation-only identity revision before
any new sampler execution:

| Identity | Frozen value |
| --- | --- |
| Input schema | `FT_VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_V4` |
| Likelihood equations and priors | V3 `0.3.0`, byte-identical |
| Validation implementation version | `0.3.1` |
| Generator version | `v0_4_0` |
| Study protocol | `FT_VBD_JOINT_REPLICATED_VALIDATION_V4` |
| Ensemble artifact | `FT_VBD_JOINT_REPLICATED_VALIDATION_SUMMARY_V4` |
| Replicates per cell | `100` |
| Qualifying sampler | 4 chains, 1,000 tune, 1,000 retained, target accept `0.95`, maximum tree depth `12` |
| Central interval | 80 percent |

Version `0.3.1` may change only validation-case admission, data-seed and
sampler-seed binding, runner identity, and ensemble aggregation. Any likelihood,
prior, fitted control, state recursion, or predictive-calculation change
requires model version `0.4.0` and another reviewed protocol before execution.

## Exact Validation Universe

The qualifying universe contains exactly 400 datasets and 600 fits.

| Cell | Replicates | Data-generating process | Required fits |
| --- | ---: | --- | ---: |
| `primary` | 100 | Current seven nonzero truths, capability SE `0.15` | Full and restricted, 200 fits |
| `behavior_pathway_null` | 100 | Six pathway coefficients set to zero; direct outcome-capability remains `0.25` | Full and restricted, 200 fits |
| `omitted_confounder_stress` | 100 | Primary plus the frozen unmeasured common cause below | Full only, 100 fits |
| `high_capability_error` | 100 | Primary with generated and recorded capability SE `0.30` | Full only, 100 fits |

Every planned dataset and fit remains in its denominator. A missing, duplicate,
reordered, off-plan, nonfinite, failed, timed-out, or diagnostically held fit
causes the relevant cell and complete study to HOLD. No fit may be dropped,
reseeded, or replaced.

## Truth And Coefficient Families

The seven co-primary recovery coefficients are:

1. `capability_retention`;
2. `capability_embedding`;
3. `capability_active_nonembedded`;
4. `outcome_embedded`;
5. `outcome_active_nonembedded`;
6. `outcome_capability`; and
7. `outcome_capability_by_embedded`.

The behavior-pathway-null cell sets all of those to zero except
`outcome_capability`, which remains `0.25` and must still recover.

The high-capability-error cell evaluates these five capability-linked
coefficients:

- `capability_retention`;
- `capability_embedding`;
- `capability_active_nonembedded`;
- `outcome_capability`; and
- `outcome_capability_by_embedded`.

The omitted-confounder robustness check applies to:

- `outcome_embedded`;
- `outcome_active_nonembedded`; and
- `outcome_capability_by_embedded`.

## Component-Keyed Randomness

Master dataset seeds are the closed integer range `202610000..202610099`.
Each seed is jointly bound to its replicate index and scenario ID. The generator
must use independent component-keyed random streams for capability latent
innovation, capability observation error, demand, initial embedding, retention,
new embedding, active nonembedded use, outcome error, and the omitted common
cause.

The same replicate index uses common random numbers across cells for all
components shared by those cells. Adding a component must not shift any existing
component stream. The generator must reproduce every dataset byte-for-byte from
the scenario ID and master seed.

## Omitted-Confounder Stress

For panel `c`, the generator creates one unobserved stationary AR(1) process:

```text
U[c,0] ~ Normal(0, 1)
U[c,t] = 0.50 * U[c,t-1] + sqrt(0.75) * epsilon[c,t]
epsilon[c,t] ~ Normal(0, 1)
```

The innovation standard deviation is
`0.8660254037844386`, and the stationary standard deviation is `1.00`.
Panels are mutually independent. `U` is independent of capability innovations,
outcome residuals, controls, and every existing generator stream.

The generator adds:

- `0.50 * U[c,t]` to the retention logit;
- `0.50 * U[c,t]` to the new-embedding logit;
- `0.50 * U[c,t]` to the active-nonembedded logit; and
- `0.20 * U[c,max(0,t-1)]` to the outcome mean.

`U` is generator-only. It must not be emitted, admitted as a control, or added
to the fitted model.

## Collision-Free Sampler Seeds

For replicate index `r` in `0..99`, four chain seeds are the applicable base
plus `10 * r + chain_index`, where `chain_index` is `0..3`.

| Fit | Base |
| --- | ---: |
| Primary full | `302610000` |
| Primary restricted | `312610000` |
| Null full | `322610000` |
| Null restricted | `332610000` |
| Confounding full | `342610000` |
| High-error full | `352610000` |

The runner must prove that every dataset and chain seed is unique in its
namespace and that no reserved seed position overlaps another fit.

## Nonqualifying Preflight

Before the qualifying universe, the runner executes exactly six reduced smoke
fits on replicate `0`, one for every cell and variant used in the study. Their
sampler bases are:

| Fit | Base |
| --- | ---: |
| Primary full | `402610000` |
| Primary restricted | `412610000` |
| Null full | `422610000` |
| Null restricted | `432610000` |
| Confounding full | `442610000` |
| High-error full | `452610000` |

These fits use the frozen smoke sampler and are permanently nonqualifying. They
may verify execution, bindings, case regeneration, and artifact sanitization
only. Any failure stops execution and requires a reviewed revision.

A separate runtime canary uses a disjoint primary-form dataset with seed
`202619999`. It runs one full and one restricted fit at full settings with
sampler bases `362619990` and `372619990`. Canary results are excluded from all
study denominators. Only completion state, wall time, runtime identity, and
hashes may be retained. Coefficient and predictive results must not be inspected
or reported.

## Runtime And Execution Limits

The reviewed execution environment is frozen to:

- Python `3.13.14`;
- macOS arm64;
- `inference/requirements.lock` SHA-256
  `2a7ef1c0266a89ba1c4bbb9d2b40ecfa804325e2f5705bcb3b7d976ca7e92801`;
- PyMC `6.0.1`;
- ArviZ `1.2.0`;
- PyTensor `3.0.7`;
- NumPy `2.4.6`; and
- SciPy `1.18.0`.

Execution requires one exact reviewed commit and a machine-readable runtime
manifest. A commit, lockfile, platform, Python, or package mismatch stops before
sampling.

The manifest must be built from observations of the executing process and
repository, not from copied protocol constants. The observer hashes the actual
lockfile bytes, verifies every installed distribution in that exact lockfile,
reads the interpreter and platform from the running process, reads Git `HEAD`,
and requires a clean source tree. Claim creation, ledger append, namespace
combination, artifact emission, and artifact validation all reconcile against
the same observed manifest and source commit. A self-consistent claim or
artifact from another manifest remains invalid.

The qualifying plan has 100 canonical chunks, one replicate index per chunk.
Each chunk contains the six fits in the table order above. At most four workers
may run concurrently, and every worker must have disjoint PyTensor, Numba, and
temporary cache roots outside the repository.

The per-fit timeout is 2 hours. The complete study wall-time limit is 14 days.
A timeout becomes a durable runner-error result and HOLDS the study. There are
no automatic or manual retries. Interrupted or ambiguous claims also become
durable HOLD results.

Each V4 case enters preparation through an exact outer-envelope and slot
bridge. Prepared provenance retains the V4 cell, replicate, canonical scenario,
dataset seed, generator version, and case hash, and regenerates that exact V4
case before model construction. Full and restricted fits therefore share the
same prepared input. A separate fit specification binds its exact slot hash,
model variant, ordered chain seeds, and sampler settings. The `0.30` capability
standard error is admissible only for the exact high-capability-error cell. The
V3 preparation contract remains unchanged.

The fitting bridge passes the slot's ordered chain-seed tuple and exact sampler
settings verbatim. It must not derive V4 seeds from the dataset seed or fall
back to V3 seed rules. This bridge preserves the frozen V3 likelihood and
priors; it creates no execution authority.

The last sampler boundary separately requires the exact observed runtime
manifest, deterministic execution packet, immutable claim, and an independently
authenticated GitHub approval receipt for the exact source commit. A
caller-provided hash or self-issued `GO` value is not review authority. Those
bindings must agree with the prepared case and frozen slot before sampler
initialization.

## Immutable Claims And Attempt Ledger

The runner uses three closed namespaces with independent ordered manifests and
roots:

- `preflight` for the six reduced smoke fits;
- `runtime_canary` for the paired full-setting timing fits; and
- `qualifying` for the exact 600 study fits.

Before sampling, the runner must atomically create one immutable claim that
binds namespace, slot ID, scenario ID, replicate index or null, dataset seed,
ordered chain seeds, model variant, plan hash, exact source commit, runtime
manifest hash, start timestamp, deadline timestamp, and claim hash. An existing,
ambiguous, missing, replaced, or mismatched claim stops before sampling.
The reviewed claim is atomically consumed into a create-once launch receipt
before model construction. A consumed, missing, replaced, or mismatched launch
receipt stops every later sampler initialization; retries are prohibited.

Every claim receives exactly one append-only disposition. Claims and
dispositions cannot be deleted, overwritten, compacted away, or replaced by a
later success. The final attempt root binds every claim and disposition from
all three namespaces, including failures and timeouts.

Disposition state is one of `COMPLETE` or `HOLD`. Failure code is one of:

- `NONE`;
- `CLAIM_COLLISION`;
- `IDENTITY_MISMATCH`;
- `RUNTIME_MISMATCH`;
- `DATASET_REGENERATION_FAILURE`;
- `PREPARATION_HOLD`;
- `SAMPLER_TIMEOUT`;
- `SAMPLER_ERROR`;
- `DIAGNOSTIC_HOLD`;
- `SUMMARY_NONFINITE`;
- `ARTIFACT_REJECTED`; or
- `INTERRUPTED_OR_AMBIGUOUS`.

Checkpoints and artifacts may contain only those codes. Raw exception text,
tracebacks, paths, arbitrary strings, and substituted codes are prohibited.
The sampler runs inside the claim deadline. Deadline expiry persists one
append-only `SAMPLER_TIMEOUT` HOLD checkpoint. A `COMPLETE` checkpoint must
carry a sanitized fit receipt binding the claim, launch, prepared input,
dataset, variant, fit summary, diagnostic summary, finite passing diagnostic
values, and sub-deadline wall time; a bare or caller-selected result hash is
not admissible.

The qualifying combiner admits only the exact ordered `qualifying` manifest and
its root. It must reject every preflight or canary slot, hash, claim, or
disposition offered to the qualifying root. Preflight and canary outcomes are
reported through their separate nonqualifying roots only.

## Numerical And Structural Gates

Every qualifying fit must independently satisfy:

- R-hat at most `1.01` for every monitored parameter;
- bulk ESS at least `400` for every monitored parameter;
- tail ESS at least `400` for every monitored parameter;
- zero divergent transitions;
- zero maximum-tree-depth hits; and
- finite coefficient, interval, diagnostic, and predictive summaries.

All 400 datasets must regenerate byte-identically. Every existing source-drift,
cohort-alignment, wrong-lag, algebraic-duplication, immutability,
unavailable-state, binding, and artifact-forgery control must reach its intended
fail-closed validator.

## Recovery And Calibration Gates

For coefficient `j` and replicate `r`, let `m[j,r]` be posterior mean,
`s[j,r]` posterior standard deviation, `[L[j,r], H[j,r]]` the central 80 percent
interval, and `theta[j]` the frozen truth. Let `mean_m[j]` be the mean posterior
mean over 100 replicates and `S[j]` the sample standard deviation of the 100
posterior means.

Every applicable coefficient must satisfy all three gates:

```text
abs(mean_m[j] - theta[j]) / S[j] <= 0.25
70 <= count(L[j,r] <= theta[j] <= H[j,r]) <= 90
0.80 <= mean(s[j,r]) / S[j] <= 1.25
```

A nonfinite or nonpositive denominator fails closed. Interval width and RMSE are
reported but are not separate recovery selection gates.

## Predictive Gate

The sole primary predictive endpoint is the per-evaluation-observation
posterior predictive log-score difference:

```text
d[r] = full_log_score[r] - restricted_log_score[r]
```

The primary cell must have `mean(d) > 0` and at least 60 of 100 replicates with
`d[r] > 0`.

The null cell must have `mean(d) <= 0` and at most 60 of 100 replicates with
`d[r] > 0`. Exact ties are not wins. RMSE and Bayesian R-squared differences
remain descriptive corroboration only.

## High-Error And Confounding Gates

For each of the five high-error coefficients, mean central-80-percent interval
width under capability SE `0.30` divided by its paired mean width under SE
`0.15` must be at least `1.00`. The high-error cell must also pass the recovery
and calibration gates above.

For each of the three confounding coefficients, the absolute mean paired shift
between confounded and primary posterior means, divided by the primary sample
standard deviation of posterior means, must be at most `0.25`. Confounded-cell
coverage must also be between 70 and 90 of 100.

Failure sets `confounding_robustness: false` and blocks any real-data admission
review. It does not erase nominal primary-cell results.

## Multiplicity And Decision Rule

All coefficient families are co-primary. Every required gate uses an
all-must-pass intersection rule. There is no coefficient selection, p-value
promotion, optional stopping, seed replacement, or post-result threshold
change. The predictive log score is the only primary predictive endpoint.

Any required gate failure, incomplete manifest, execution mismatch, unsafe
artifact, or review failure leaves the result on HOLD. Passing permits only a
docs-only decision about a later synthetic or bounded aggregate-admission
proposal. It does not itself grant that authority.

## Artifact And Review Boundary

Slot and chunk checkpoints live only in a task-owned external workspace and
contain no draws, latent paths, family identities, member rows, raw synthetic
rows, or per-panel estimates. Publication is create-once and atomic.

The repository may retain only the final sanitized ensemble summary:

- plan, runtime, manifest, slot-result-root, and study hashes;
- separate preflight, runtime-canary, qualifying, and complete-attempt roots;
- exact expected and observed counts;
- aggregate recovery, coverage, uncertainty-ratio, null, predictive,
  high-error, and confounding summaries;
- aggregate diagnostic and runner-failure counts;
- categorical PASS or HOLD states and complete failing-check codes; and
- every authorization flag fixed to false.

Independent statistical, technical, and fail-closed review of the exact plan,
implementation commit, runtime manifest, and final ensemble summary is
mandatory. No sampler may run before pre-execution review returns GO.

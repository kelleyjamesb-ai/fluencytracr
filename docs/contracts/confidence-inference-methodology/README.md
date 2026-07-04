# Confidence Inference Methodology

Approved by the OpenSpec change `add-bayesian-inference-proof-harness`, this
contract is the normative inference methodology for the internal confidence
engine: the estimand, the Python/TypeScript boundary, the seven diagnostics
as computed values with hard numeric gates, the comparison-cohort rule, the
milestone peeking control, the prior policy, the aggregate floors, and the
claim-language mapping. It is slice 1 of the change — documents only. The
proof harness (slice 2, separate PR) implements exactly this methodology on
synthetic data; nothing here authorizes real observations, persistence, or
any customer-facing output. The confidence-engine spine, its schema versions,
hashes, golden chain, and hold-by-default semantics are untouched: the
placeholder Normal-Normal runtime stays byte-stable in its held state
(`INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW`) as a
governed decision record.

- Spec: `openspec/changes/add-bayesian-inference-proof-harness/specs/confidence-inference-methodology/spec.md`
- Contract module: `packages/confidence-engine/src/confidenceModel.ts`
  (`FT_AI_VALUE_CONFIDENCE_MODEL_CONTRACT_2026_07`)
- Anchoring contracts:
  `docs/contracts/confidence-engine-workspace/README.md`,
  `docs/contracts/ai-value-confidence-engine-series-read-path-decision/README.md`,
  `docs/contracts/ai-value-contribution-alignment-bayesian-model-specification/README.md`

## Estimand

The estimand is the aggregate selected-metric movement under a hierarchical
Bayesian difference-in-differences model with partial pooling by workflow,
function, and cohort, operating on aggregate Measurement Cell windows — never
persons. The governing specification is the existing
`bayesian_model_specification` schema family
(`FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_BAYESIAN_MODEL_SPECIFICATION_2026_06`,
specification version `bayesian_hierarchical_did_spec_2026_06`), which
already names the model family
(`bayesian_hierarchical_difference_in_differences_candidate`) and the pooling
structure; this contract binds the methodology to that specification rather
than restating it. Partial pooling stabilizes small-cohort estimates without
discarding them, matching the aggregate-only posture. Flat per-cohort models
and synthetic-control methods were considered and rejected/deferred in the
change's design record.

### Implementation-grade model equation

For aggregate Measurement Cell window `i`, the proof harness uses:

```text
y_i ~ likelihood_family(mu_i, phi_i)

g_i(mu_i) =
    alpha
  + beta_post * post_i
  + beta_treated * treated_i
  + delta * post_i * treated_i
  + u_expectation_path[expectation_path_i]
  + u_workflow[workflow_i]
  + u_function[function_i]
  + u_cohort[cohort_i]
  + u_organization[organization_i]
  + optional approved offset_or_exposure_i
```

The estimand is `delta`: aggregate selected-metric movement for the approved
expectation path under a governed comparison condition. It is not a causal
claim, ROI claim, productivity claim, customer-facing confidence score, or
probability output. Random effects are mean-zero partially pooled effects with
hierarchical scale priors; the harness reports pooling factors so reviewers
can see when pooling is driving the result rather than the synthetic evidence.

Slice 2 proves the normal continuous aggregate path first, with all other
families held unless the same PR implements their samplers, diagnostics, and
synthetic recovery tests. The model binding still names the supported family
vocabulary so artifacts cannot invent shapes later:

| Metric family | Likelihood / link | Cohort-size handling |
| --- | --- | --- |
| Continuous aggregate metric | Normal with identity link | Aggregate standard error is weighted by cohort size; overdispersion is estimated only if declared in the artifact. |
| Rate / proportion | Binomial with logit link, or beta-binomial when overdispersion is declared | `n_i` is the aggregate denominator; no person rows enter the model. |
| Count metric | Poisson with log link, or negative-binomial when overdispersion is declared | Exposure/offset is explicit and approved; missing exposure HOLDS. |

Lag windows must be declared before fitting and bound into the artifact.
Suppressed, stale, or missing windows HOLD; the harness must not impute them
into eligibility. Treatment effects may be pooled globally, by workflow, by
function, or by cohort only when the artifact declares that pooling level and
the synthetic calibration suite covers it.

## Python/TypeScript boundary

Python owns all statistical computation; TypeScript owns all governance and
validation. Specifically:

- **Python** — the pinned `inference/` package (PyMC for model specification
  and NUTS sampling, ArviZ for diagnostics; NumPyro is noted as an acceptable
  fallback backend for the same model family) computes every posterior,
  diagnostic, and calibration quantity, with its own lockfile and no
  dependency additions to the root `pyproject`.
- **TypeScript** — the existing confidence-engine gates perform admission,
  validation, hold semantics, and blocked-use enforcement, unchanged.
- **The boundary** — artifacts cross only as JSON that must parse against
  the `ConfidenceModel` Zod schemas, including the internal-only
  `InferenceProofArtifactSchema`, `PosteriorWithCredibleIntervalsSchema`,
  and `EvidenceAdmissionSchema`, and clear the confidence-engine gates.
  Unknown fields are rejected; rejected artifacts receive no governance
  processing.

Computing any posterior, diagnostic, or other statistical quantity in Node
is a contract violation, not a convenience: statistical values are read from
the validated Python-emitted artifact or they do not exist.

Numeric posterior and diagnostic values are allowed only inside the internal
synthetic proof artifact as validation inputs. They are not readout outputs.
`PosteriorWithCredibleIntervalsSchema` remains numeric-values-withheld, and
every proof artifact pins `internal_only: true`,
`customer_output_authorized: false`, `probability_output_authorized: false`,
`confidence_output_authorized: false`, and `promotion_decision_ref: null`.

## Diagnostics: computed values with numeric gates

Every required diagnostic is a computed number checked against an explicit
numeric gate — never a boolean flag. A confidence-bearing artifact is
structurally un-emittable unless all gates pass.

| Diagnostic | Gate |
| --- | --- |
| R-hat and sampler convergence | R-hat <= 1.01 for every sampled parameter; post-warmup divergent transitions = 0; rank and energy plots recorded in the internal report artifact. |
| Effective sample size and Monte Carlo error | Bulk ESS >= 400 chain-total per parameter; tail ESS >= 400 chain-total per parameter; MCSE for posterior mean and interval endpoints <= 0.1 posterior SD. |
| Posterior predictive checks | Every designated PPC statistic below carries statistic name, observed value, posterior predictive 80% interval summary, p-value, and pass/fail; p-values must be within [0.05, 0.95]. |
| Prior sensitivity | posterior-mean shift < 0.5 posterior SD across the declared prior family |
| Pre-period trend check | pre-window pseudo-effect 80% credible interval must include 0 |
| Calibration coverage | 80% credible interval covers the injected effect in 74–86% of >= 200 seeded synthetic replications per effect-size/cohort-size/scenario cell; binomial uncertainty around observed coverage is reported. |
| Known-effect recovery (null case) | null-effect false-eligibility <= 5% of replications |

Any gate failure — or any diagnostic absent or not computed as a real
value — emits the artifact only in HOLD state, with every failing or missing
diagnostic named in the artifact.

Designated posterior predictive check statistics are fixed for Slice 2:

| Statistic | Purpose |
| --- | --- |
| `pre_post_mean_movement` | Checks central tendency recovery across pre/post windows. |
| `between_cohort_variance` | Checks whether partial pooling is masking between-cohort heterogeneity. |
| `within_cohort_variance` | Checks aggregate noise within cohort windows. |
| `tail_or_extreme_cell_statistic` | Checks outliers, heavy tails, or boundary cells for the selected likelihood family. |
| `difference_in_differences_contrast` | Checks fit at the estimand level. |

Max-treedepth saturation and BFMI are recorded when exposed by the active
PyMC/ArviZ backend. If either backend emits a warning, the artifact HOLDS
unless the warning is explicitly represented as a failing diagnostic in the
internal proof artifact. A clean eligible artifact may not silently carry
sampler warnings.

Calibration is reported per scenario cell, not pooled across unlike
conditions. The clean simulator must cover every combination of injected
effect size `{0, 0.2, 0.5}` SD and floor-eligible cohort size `{12, 16}`,
with at least 200 seeded replications per cell. The artifact reports the
observed coverage rate and binomial standard error for each cell. Negative
controls may use a smaller declared replication count only when they are
separately labeled as negative controls and never pooled into the clean
calibration coverage claim.

## Comparison-cohort rule

No credible comparison cohort, no comparison-supported contribution
estimate — evidence-tier label only.

Difference-in-differences without a defensible comparison is a before/after
story, and before/after stories are precisely the overclaims the Glean Value
Playbook discounts. Attempts to force a comparison-supported contribution
estimate without a credible comparison cohort are rejected; the artifact
carries only its evidence-tier label. Causal language remains separately
gated by the claim ladder (approved comparison evidence design at the
validated rung); this contract's outputs are contribution estimates, never
causal claims.

## Milestone peeking control

Evaluation occurs at the milestone cadence Day 0 / 30 / 60 / 90 / 180 / 365
(`CONFIDENCE_OBSERVATION_MILESTONE_DAYS`, matching the series read-path
decision contract). Six scheduled looks at accumulating evidence is repeated
testing.

Slice 2 uses the conservative executable rule: artifacts are fixed-horizon,
one-look only unless the implementation proves a named always-valid
sequential procedure in synthetic null simulations across the full look,
metric, and cohort family. The artifact must record look index, total planned
looks, milestones included, metrics included, cohorts included, procedure
name, whether repeated evaluation occurred, and the false-eligibility bound.
A fixed-horizon artifact must have exactly one look and exactly one milestone.
Naive repeated evaluation across milestones, metrics, or cohorts marks the
artifact ineligible/HOLD. The internal "Playbook: A/B testing @ Glean"
(Confluence, Engineering space) is cited as provenance and alignment for this
rule, not as its normative source.

## Prior policy

Priors are weakly informative and empirically justified from historical and
dogfood aggregates. Prior-sensitivity analysis is always run and reported as
one of the diagnostics above; an artifact whose conclusion is prior-driven
(posterior-mean shift at or above 0.5 posterior SD across the declared prior
family) holds, naming prior sensitivity as the cause. Priors lacking
documented empirical justification also hold. The spine's `N(0,1)`
placeholder (state `weakly_regularizing_internal_placeholder_not_calibrated`)
is retired only inside the harness; the spine itself stays byte-stable as a
governed decision record.

## Aggregate floors

Two floors bind, and the harness must demonstrate both (synthetic cohorts
are generated at and around the floors so floor enforcement is itself
tested):

- **k >= 5 schema floor** — `CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR = 5` in
  the `ConfidenceModel` contract, with stated-floor cross-validation:
  `cohort_size` must also meet the artifact's own declared
  `minimum_cohort_floor`, so an artifact declaring a floor of 10 with a
  cohort of 7 is rejected even though 7 >= 5.
- **k >= 10 series display floor** — `minimum_cohort_size: 10` per the
  confidence-engine series read-path decision contract applies to anything
  sourced through that path. Series-sourced evidence admission is bound to
  this read-path floor of 10 at the schema level
  (`CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR` in the `ConfidenceModel`
  contract: `EvidenceAdmittedSchema` rejects any declared
  `minimum_cohort_floor` below 10), while the k >= 5 floor remains the
  general aggregate convention.

## Claim language

Claim language follows the Glean Value Playbook's anti-overclaim standard:
telemetry-first (telemetry over self-report), with recapture assumptions
always separated from time-saved measurement — a measured time-saved number
is never silently multiplied into an ROI claim. Claim statuses map to the
evidence-tier ladder (`shared/src/aiValueEngine/valueHypothesisReadiness.ts`):

| Evidence tier | Claim status | Permitted language |
| --- | --- | --- |
| `NONE` | withheld | No claim. |
| `DIRECTIONAL_ALIGNMENT` | internal-only | Directional language only; no numbers. |
| `PRE_POST_SUPPORTED` | internal-only | Pre/post movement described; no comparison-supported contribution estimate (comparison-cohort rule). |
| `MATCHED_COMPARISON_READY` | caveated | Contribution-estimate-eligible with design caveats stated, all diagnostic gates passing. |
| `CONTROLLED_TEST_READY` | customer-safe | Measured effect with the test design named. |
| `CALIBRATED_ATTRIBUTION_READY` | customer-safe | Calibrated attribution claims. |

The status column states the ceiling each tier could reach. Until a separate
recorded human promotion decision exists, the effective status of every tier
is capped at internal-only: `customer_facing_output`, `confidence_output`,
and `probability_output` remain in `CONFIDENCE_MODEL_BLOCKED_USES`.

## Expert review record

Per task 1.2 of the change, each review outcome (approve /
approve-with-changes / reject) is recorded here with reviewer and date.
Review roles are assigned by the decision owner (James Kelley); the
individuals originally identified during planning research are no longer
part of the project, so each role remains unassigned until the decision
owner names a reviewer or explicitly waives the role.

| Review role | Scope | Assigned reviewer | Outcome | Date |
| --- | --- | --- | --- | --- |
| Statistical methodology reviewer | Estimand, diagnostics gates, prior policy, calibration criteria | UNASSIGNED | PENDING | — |
| Value governance reviewer | Claim language, evidence tiers, non-authorizations | UNASSIGNED | PENDING | — |
| Downstream tooling interface reviewer | Consumption of evidence-tier outputs by downstream value tooling | UNASSIGNED | PENDING | — |

## What this contract does not change or authorize

- No customer-facing output of any kind. No confidence percentages, no
  probability language exposure, no ROI computation, no causality claims.
- No routes, no UI, no customer/readout emitted-artifact schemas, no
  persistence, no exports, no rendered readouts, no live
  BigQuery/Sigma/Glean/customer connector execution. The internal
  `InferenceProofArtifactSchema` is a validation-only proof boundary, not a
  customer-facing emitted artifact.
- No real customer or production data enters the proof harness; harness
  inputs come from synthetic generators only, and real-data input is
  rejected.
- Threshold-probability and expected-loss representations are internal-only
  with `customer_output_authorized` pinned false; promotion of any
  probability output to customer-facing language requires a separate
  recorded human decision.
- The spine's schema versions, hashes, golden chain, state tokens, and
  hold-by-default semantics are unchanged; all held states stay held.

## Change history

- OpenSpec change: `add-bayesian-inference-proof-harness`
  (`openspec/changes/add-bayesian-inference-proof-harness/`). Decision
  owner: James Kelley; approval recorded 2026-07-03. Slice 1 (this
  contract) precedes slice 2 (the `inference/` proof harness, separate PR);
  expert review outcomes are recorded in the table above as they land.

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
  the `ConfidenceModel` Zod schemas (`PosteriorWithCredibleIntervalsSchema`,
  `EvidenceAdmissionSchema`) and clear the confidence-engine gates. Unknown
  fields are rejected; rejected artifacts receive no governance processing.

Computing any posterior, diagnostic, or other statistical quantity in Node
is a contract violation, not a convenience: statistical values are read from
the validated Python-emitted artifact or they do not exist.

## Diagnostics: computed values with numeric gates

Every required diagnostic is a computed number checked against an explicit
numeric gate — never a boolean flag. A confidence-bearing artifact is
structurally un-emittable unless all gates pass.

| Diagnostic | Gate |
| --- | --- |
| R-hat (all parameters) | <= 1.01 target; hard fail at > 1.05 |
| Bulk effective sample size | >= 400 chain-total per parameter |
| Posterior predictive checks | p-values within [0.05, 0.95] for the designated test statistics |
| Prior sensitivity | posterior-mean shift < 0.5 posterior SD across the declared prior family |
| Pre-period trend check | pre-window pseudo-effect 80% credible interval must include 0 |
| Calibration coverage | 80% credible interval covers the injected effect in 74–86% of >= 200 seeded synthetic replications |
| Known-effect recovery (null case) | null-effect false-eligibility <= 5% of replications |

Any gate failure — or any diagnostic absent or not computed as a real
value — emits the artifact only in HOLD state, with every failing or missing
diagnostic named in the artifact.

## Comparison-cohort rule

No credible comparison cohort, no causal number — evidence-tier label only.

Difference-in-differences without a defensible comparison is a before/after
story, and before/after stories are precisely the overclaims the Glean Value
Playbook discounts. Attempts to force a causal number without a credible
comparison cohort are rejected; the artifact carries only its evidence-tier
label.

## Milestone peeking control

Evaluation occurs at the milestone cadence Day 0 / 30 / 60 / 90 / 180 / 365
(`CONFIDENCE_OBSERVATION_MILESTONE_DAYS`, matching the series read-path
decision contract). Six scheduled looks at accumulating evidence is repeated
testing: any repeated evaluation across milestones or across multiple metrics
MUST use always-valid / sequential-correction methods, aligned with the
internal "Playbook: A/B testing @ Glean" (Confluence, Engineering space)
rather than a parallel standard invented here. Naive repeated evaluation
marks the artifact ineligible.

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
  sourced through that path.

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
| `PRE_POST_SUPPORTED` | internal-only | Pre/post movement described; no causal number (comparison-cohort rule). |
| `MATCHED_COMPARISON_READY` | caveated | Causal-number-eligible with design caveats stated, all diagnostic gates passing. |
| `CONTROLLED_TEST_READY` | customer-safe | Measured effect with the test design named. |
| `CALIBRATED_ATTRIBUTION_READY` | customer-safe | Calibrated attribution claims. |

The status column states the ceiling each tier could reach. Until a separate
recorded human promotion decision exists, the effective status of every tier
is capped at internal-only: `customer_facing_output`, `confidence_output`,
and `probability_output` remain in `CONFIDENCE_MODEL_BLOCKED_USES`.

## Expert review record

Per task 1.2 of the change, each review outcome (approve /
approve-with-changes / reject) is recorded here with reviewer and date.

| Reviewer | Scope | Outcome | Date |
| --- | --- | --- | --- |
| Paul Li | Methodology | PENDING | — |
| Karthik Rajkumar | Methodology | PENDING | — |
| Onder Polat | Methodology | PENDING | — |
| Value Realization Pod | Value governance | PENDING | — |
| Justin Swadling | ROIbot interface | PENDING | — |

## What this contract does not change or authorize

- No customer-facing output of any kind. No confidence percentages, no
  probability language exposure, no ROI computation, no causality claims.
- No routes, no UI, no new emitted-artifact schemas, no persistence, no
  exports, no rendered readouts, no live BigQuery/Sigma/Glean/customer
  connector execution.
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

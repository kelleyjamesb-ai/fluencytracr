# Design: VBD Human-Behavior Outcome Synthetic Proof

## Context

The implementation target is a synthetic research proof for the approved joint
methodology. It must demonstrate that aggregate stated capability, observed
family-state behavior, and one continuous-normal customer-owned outcome can be
modeled together without collapsing evidence roles or weakening governance.

## Goals

- Prove strict aggregate preparation and single-slice privacy behavior.
- Recover a known synthetic capability-to-behavior association.
- Recover known synthetic behavior-to-outcome associations and capability
  moderation with propagated uncertainty.
- Compare one frozen full model against one frozen no-behavior companion model.
- Exercise null, misalignment, source-drift, algebraic-duplication, lag,
  confounding, and negative-control cases.
- End with a docs-only integration decision.

## Non-Goals

- Real-data admission or customer evidence.
- Product APIs, persistence, UI, deployment, or readouts.
- Per-slice, function, team, manager, or individual model output.
- Causal, mediation, productivity, ROI, ranking, or economic claims.
- New outcome likelihood families.
- Reuse, completion, or promotion of the legacy VBD trajectory proof.

## Synthetic Analysis Unit

Each synthetic panel is one exact canonical slice with:

```text
one workflow_id
one jbtd_id
one persona_id
one aggregate cohort hash
one disjoint family-registry root
one fixed Eligible count
one ordered checkpoint schedule
one stated-capability factor
one continuous-normal outcome
one safe aggregate control set
```

Panel identities may be partially pooled only after every panel independently
clears structural, suppression, alignment, and freeze validation. Prepared and
output artifacts contain no family identities or person-level fields.

## Internal Module Boundary

The isolated implementation should use modules named for the new methodology,
for example:

```text
vbd_joint_types.py
vbd_joint_preparation.py
vbd_joint_synthetic.py
vbd_joint_model.py
vbd_joint_artifact.py
vbd_joint_validation.py
```

It must not modify or alias `vbd_trajectory_*` inputs, model code, evidence, or
task state.

## Model Geometry

The initial V1 diagnostic profile froze the following values before its bounded
smoke run. The V2 repair retains these numerical values. They are research
constants, not product thresholds, and are not operator-configurable.

| Setting | Frozen value |
| --- | --- |
| Synthetic panel count | 6 |
| Windows per panel | 18, with 12 pre and 6 post |
| Eligible families per panel | 48 |
| Capability-to-behavior lag | 1 window |
| Behavior-to-outcome lag | 1 window |
| Capability-to-outcome lag | 1 window |
| Safe controls | `seasonality_index`, `customer_demand_index` |
| Primary synthetic seed | `202608110` |
| Null synthetic seed | `202608111` |
| Capability observation standard error | `0.15` |
| Outcome observation standard error | `0.12` |
| Fixed-effect prior | Normal with mean `0` and standard deviation `1` |
| Intercept prior | Normal with mean `0` and standard deviation `1.5` |
| Group-scale prior | Half-normal with standard deviation `0.75` |
| Outcome residual-scale prior | Half-normal with standard deviation `0.5` |
| AR(1) coefficient prior | Uniform on `[-0.8, 0.8]` |
| Smoke sampler | 2 chains, 300 tune, 300 retained, target accept `0.90`, max tree depth `10` |
| Full sampler | 4 chains, 1,000 tune, 1,000 retained, target accept `0.95`, max tree depth `12` |
| Internal interval | central 80 percent |
| Full-run R-hat gate | at most `1.01` |
| Full-run bulk and tail ESS gates | at least `400` |

Smoke fits are permanently nonqualifying. A full run is still insufficient
without the complete validation universe and independent review.

## Frozen V2 Repair Revision

Independent technical, adversarial, and statistical review of the V1 smoke
implementation returned `HOLD`. The V1 artifacts remain nonqualifying
diagnostic evidence under `HOLD_FOR_MODEL_REPAIR`. They cannot be promoted,
replaced, or presented as accepted evidence.

The V2 repair is frozen before any replacement sampler run with these exact
identity changes:

| Identity | Frozen V2 value |
| --- | --- |
| Input schema | `FT_VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_V2` |
| Model version | `0.2.0` |
| Generator version | `v0_2_0` |
| Artifact schema | `FT_VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_SUMMARY_V2` |
| Null scenario | `behavior_pathway_null` |
| Evaluation horizon | final three windows in each panel |

The V2 repair makes these frozen methodological changes:

1. Capability, behavior-transition, and outcome likelihoods use training
   windows only. No capability observation, behavior count, or outcome from an
   evaluation window may enter fitting.
2. Capability uses panel, time, and post components. Retention, embedding, and
   active-nonembedded behavior processes each use their own time and post
   components in both the generator and fitted model.
3. Evaluation-window behavior states are forecast recursively from the final
   training state and posterior transition parameters. Observed future
   behavior is not used as a model input.
4. Future outcomes are scored from the conditional AR(1) predictive
   distribution. The reported log score is posterior predictive log density,
   computed with log-mean-exp across posterior draws.
5. Sampler diagnostics cover every free parameter family, including
   capability, all behavior processes, outcome terms, panel effects, residual
   scale, and AR(1) structure.
6. Qualification requires the full sampler profile plus all frozen structural,
   recovery, behavior-pathway-null, calibration, sensitivity, predictive,
   artifact, and independent-review gates. A fit or artifact cannot qualify by
   sampler settings alone.
7. The analysis plan binds the canonical-slice, cohort, family-registry, and
   source-universe manifests plus a pre-outcome-access receipt. Preparation
   admits only the exact frozen deterministic generator output.
8. Process-local synthetic allocation commitments prove registry disjointness.
   Registry identities and allocations never enter model or artifact output.
9. Checkpoint, capability, outcome, and control observations must be final,
   unsuppressed, current, and unimputed. Any unavailable state holds before
   fitting.
10. Artifact validation checks both keys and string values, requires exact
    nested shapes and coefficient names, and rejects any unsafe or unbound
    content.

Any further change to these identities, model geometry, prediction method,
diagnostic universe, or admission bindings requires another documented frozen
revision before sampler execution.

## Frozen V4 Replicated Validation Revision

The bounded V3 smoke and its reviews established execution behavior only. They
did not establish recovery, calibration, sensitivity, null behavior, or
predictive superiority. James Kelley directed the project to test the model on
2026-08-11. The exact replicated protocol is frozen before implementation or
sampler execution in:

`docs/contracts/ai-value-vbd-human-behavior-outcome-joint-methodology/REPLICATED_VALIDATION_PROTOCOL.md`

This revision preserves the V3 likelihood equations and priors byte-for-byte.
It requires validation implementation `0.3.1`, generator `v0_4_0`, input schema
`FT_VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_V4`, and ensemble artifact
`FT_VBD_JOINT_REPLICATED_VALIDATION_SUMMARY_V4` to bind replicated scenarios,
component-keyed randomness, collision-free data and sampler seeds, exact
manifests, and aggregate study gates.

The qualifying universe contains 100 replicates in each of four cells:
primary, behavior-pathway null, omitted-confounder stress, and high capability
error. It contains exactly 400 datasets and 600 full-setting fits. The protocol
freezes recovery, 80-percent coverage, uncertainty-ratio, null, predictive,
high-error, confounding, diagnostics, runtime, artifact, and independent-review
gates. Every required gate uses an all-must-pass rule.

The six-fit smoke preflight and paired full-setting runtime canary are
permanently nonqualifying and excluded from study denominators. No sampler may
run until the exact implementation commit and runtime manifest receive fresh
statistical, technical, and fail-closed pre-execution review.

The V4 execution boundary observes the actual clean Git source, Python
micro-version, macOS arm64 platform, lockfile bytes, and installed lockfile
distributions. One observed manifest binds every claim, ledger append,
namespace combination, and ensemble artifact. V4 preparation remains a
separate exact-envelope admission path that retains cell, replicate, and case
provenance while reusing the unchanged V3 projection and likelihood. Full and
restricted fits share that prepared input; a separate fit specification binds
the slot, variant, ordered chain seeds, and sampler settings. High capability
error is admitted only through exact V4 regeneration.

## Frozen V3 Repair Revision

Fresh technical, adversarial, and statistical review of V2 returned `HOLD`.
The V2 smoke hashes remain permanently nonqualifying diagnostic evidence. The
following V3 revision is frozen before another sampler run.

| Identity | Frozen V3 value |
| --- | --- |
| Input schema | `FT_VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_V3` |
| Model version | `0.3.0` |
| Generator version | `v0_3_0` |
| Artifact schema | `FT_VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_SUMMARY_V3` |
| Primary seed | `202608110` |
| Behavior-pathway-null seed | `202608111` |
| Capability innovation DGP standard deviation | `0.30` |
| Capability innovation scale prior | Half-normal with standard deviation `0.50` |

V3 makes these additional frozen repairs:

1. Prepared arrays use immutable byte-backed storage. Model construction
   regenerates the exact frozen scenario and revalidates every prepared field,
   array, hash, scenario, and seed before building a likelihood. Reopening a
   write flag or replacing a prepared field must fail before fitting.
2. Prepared data retains the frozen synthetic scenario and seed. Full and
   restricted fits must use that exact seed. Artifacts bind the scenario, seed,
   exact deterministic dataset hash, and both fit seeds.
3. Artifact diagnostics independently recompute their expected failure set from
   sampler mode, R-hat, bulk and tail ESS, divergences, and maximum tree depth.
   A caller-supplied PASS state cannot override those values.
4. Capability includes zero-mean panel-by-window innovations with a frozen
   hierarchical scale. The synthetic generator uses independent innovations
   with standard deviation `0.30`. This creates capability variation that is
   not algebraically spanned by panel, time, and post terms in the behavior
   equations.
5. The generator and fitted model both use expected transition states for the
   behavior-to-outcome pathway. Training expected states start from the prior
   observed aggregate state. Evaluation states recurse from the final modeled
   training state. The first evaluation outcome and first forecast transition
   therefore use the same anchor.
6. Structural controls for algebraic duplication and wrong lag recompute the
   outcome-access receipt before admission so they must reach and prove their
   intended validators.

The numerical sampler profile, panel geometry, lags, priors not listed above,
evaluation horizon, safe controls, blocked outputs, and noncausal claim ceiling
remain unchanged from V2. Any further geometry or admission change requires a
new documented frozen revision before sampler execution.

The joint model contains:

1. binomial retention, new-embedding, and active-nonembedded likelihoods;
2. a normal measurement-error likelihood for the stated-capability factor;
3. predeclared lagged capability terms in the transition logits;
4. a continuous-normal aggregate outcome likelihood with known measurement
   standard error;
5. lagged embedded and active-nonembedded outcome terms;
6. a predeclared capability-by-embedded interaction;
7. approved aggregate controls and residual time structure; and
8. one frozen restricted outcome model that removes all behavior terms while
   preserving the same rows, likelihood, controls, time structure, and shared
   priors.

The model remains noncausal. Capability and behavior may be post-intervention
variables, so no total-effect or mediation estimand is authorized.

## Output Boundary

Allowed internal summary fields are limited to:

- immutable input, preparation, model, and comparison hashes;
- categorical fit and validation states;
- aggregate coefficient means and interval endpoints;
- aggregate truth-recovery error for synthetic cases;
- sampler and posterior-predictive diagnostics;
- full-versus-restricted Bayesian R-squared difference;
- future-window predictive-fit difference;
- explicit caveats and noncausal claim cap; and
- boolean blocked-output fields fixed to false.

Posterior draws, latent paths, family-level values, per-slice coefficients, raw
observations, and synthetic member rows are prohibited in committed artifacts.

## Validation Sequence

After queue admission, work proceeds in four bounded phases:

1. strict types, preparation, fixtures, and structural HOLD tests;
2. model implementation and small sampler-free or reduced smoke checks;
3. frozen synthetic recovery, null, sensitivity, and predictive validation;
4. independent review and a docs-only integration decision.

Any model-geometry or numerical repair requires a new frozen design revision
before rerunning evidence. A failed evidence run cannot be silently tuned.

## Integration Decision States

Step 8 may record exactly one docs-only state:

- `HOLD_FOR_MODEL_REPAIR`;
- `HOLD_FOR_MORE_SYNTHETIC_VALIDATION`;
- `PROMOTE_NEXT_SYNTHETIC_SCOPE`; or
- `PROPOSE_BOUNDED_REAL_AGGREGATE_ADMISSION_REVIEW`.

No state directly authorizes real data, runtime services, APIs, persistence,
UI, customer output, or stronger claims.

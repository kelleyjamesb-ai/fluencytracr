# Design: AI Fluency Longitudinal SEM Calibration Proof

## Context

The beta instrument writes respondent answers to Google Sheets. Respondent
rows must remain inside that source boundary. The existing aggregate readiness
export emits dimension means, which are useful context but are not sufficient
for an ordinal measurement model or longitudinal invariance review.

The target measurement structure is:

```text
24 ordered items
-> 8 first-order constructs (3 items each)
-> 5 core constructs load on second-order AI Fluency

AI Attitude, Behavioral Intent, and Perceived AI Impact remain separate.
Structural paths are out of scope for this calibration slice.
```

## Goals And Non-Goals

Goals:

- prove a source-independent aggregate evidence representation;
- prove recovery of the frozen ordinal measurement structure on synthetic
  data;
- measure reliability and configural/loading/threshold stability across two
  same-form waves; and
- fail closed on missing, sparse, incompatible, unsafe, or incomplete inputs.

Non-goals:

- real-data calibration or customer execution;
- individual latent scores or respondent matching across waves;
- structural path estimation, causal interpretation, or business-outcome
  attribution;
- 14-item equating;
- using behavior questions inside Fluency; and
- routes, UI, persistence, customer output, or promotion.

## Decisions

### Frozen Long Form

`inference/config/ai_fluency_long_v1_manifest.json` is the immutable model
manifest. Item identity is `ai-fluency-q01` through `ai-fluency-q24`, in source
order. Every item uses the ordered categories 1 through 5 and none is reverse
coded. The conceptual `AI Fluency Flywheel v2.3` label is recorded separately
from the technical form id.

Baseline and formal follow-up use this same 24-item form. Three-month and
six-month collections are distinct waves, not interchangeable labels. The
14-item form is a pulse instrument only and cannot enter change calibration
without a later equating proposal.

### Aggregate Evidence Boundary

One evidence package carries exactly two independent repeated-cross-sectional
waves for the same approved aggregate cohort. Each wave contains:

- all 24 five-category marginal count vectors;
- all 276 uniquely ordered item-pair 5x5 count tables;
- per-item and per-pair observed/missing counts;
- form, manifest, cohort, wave, window, source-ref, source-hash, owner-review,
  privacy, and synthetic-only bindings; and
- immutable evidence and package hashes.

The source adapter may use respondent ids only inside the workbook to assemble
pair tables. No identifier, raw row, answer, title, profile, behavior field,
or free text is emitted. The fixed source cohort, item, and pair observed-count
floor is 20. No person or function subdivisions are permitted. A wave or pair
below that floor emits HOLD metadata without the incomplete table.

Pairwise margins alone cannot prove global 24-item joint consistency. Synthetic
model admission therefore regenerates the complete aggregate package from the
bound generator, scenario, seed, and compiled sample size and compares exact
bytes before fitting. The source-side adapter is not trusted real-data
admission; a later proposal must define that attestation boundary.

### Statistical Proof

The proof consumes aggregate counts only. It uses an ordinal-probit composite
measurement model with fixed weak regularization, cumulative Beta threshold
posteriors, and deterministic numerical integration. Pairwise tables identify
polychoric association; three indicators identify each first-order construct;
and the five core construct associations identify the second-order Fluency
structure. The two-wave threshold comparison frees one follow-up latent mean
per construct before testing practical threshold equivalence, so genuine
construct movement is not mislabeled as item drift. No respondent score or
latent state is reconstructed or emitted.

The first bounded proof checks:

- exact configural structure;
- positive, finite item loadings and ordinal reliability for all eight
  constructs;
- second-order support for the five core dimensions;
- cross-wave loading stability; and
- cross-wave threshold stability after construct-mean alignment.

All acceptance constants are compiled into the harness. They are validation
constants, not product settings, suppression reasons, or customer thresholds.
The minimum worthwhile outcome change never enters this model.

### Synthetic Study

The runner has two modes:

- `smoke`: a small deterministic seed set for development; and
- `full`: exactly 200 replications in each of invariant,
  invariant-with-latent-shift, loading-drift, and threshold-drift scenarios
  (800 primary slots), followed by fresh slot recomputation during artifact
  emission.

Smoke, partial, duplicate, malformed, off-plan, or hash-invalid studies emit
HOLD. Parent OpenSpec task `5.5` remains unchecked until the full study is
executed, its artifact is committed without raw draws/rows, and CODE, BUG, and
ADVERSARIAL reviewers accept the exact evidence bytes.

### Behavior Evidence

The six usage-behavior questions are separate aggregate pathway/corroboration
evidence. They do not load on AI Fluency, alter measurement eligibility,
change outcome estimates, or rescue a HOLD result.

## Risks And Mitigations

- **Sparse-table disclosure:** fixed source and cell floors; sparse groups emit
  no tables.
- **Approximation overclaim:** artifact names the aggregate composite engine
  and never claims full-information NUTS or production calibration.
- **Same-form drift:** immutable manifest and source hashes; incompatible
  forms HOLD.
- **Pulse/long-form mixing:** the short form is explicitly pulse-only and
  rejected by the calibration validator.
- **Behavior contamination:** behavior keys are forbidden from measurement
  evidence and pinned as external context only.

## Rollback

This is additive, internal, and synthetic-only. Reverting the new manifest,
adapter, inference modules, tests, and docs removes the capability without
changing existing runtime behavior.

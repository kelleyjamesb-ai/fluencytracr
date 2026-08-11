# VBD Human-Behavior Outcome Synthetic Decision

Decision date: `2026-08-11`

Decision: `HOLD_FOR_MODEL_REPAIR`

Authority effect: `NONE`

## Decision

The initial aggregate VBD joint methodology was implemented as an isolated,
synthetic-only Python research path and exercised in one bounded V1 smoke run.
Independent technical, adversarial, and statistical review unanimously
returned `HOLD`. The run does not qualify the model, validate the comparison,
or support a real aggregate data admission proposal.

The project is on `HOLD_FOR_MODEL_REPAIR` because the V1 implementation:

- allowed evaluation-window capability and behavior evidence to inform the
  fitted model;
- did not compute a posterior predictive log density;
- used different behavior-time structures in the generator and fitted model;
- allowed qualification logic to omit required recovery, null, predictive,
  calibration, and review gates;
- omitted free parameter families from diagnostics;
- did not make registry and plan bindings robust to coordinated replacement;
- did not reject unsafe string values in artifacts; and
- did not represent nonfinal, suppressed, stale, and imputed observation
  states.

The V1 model settings, priors, thresholds, and scenarios were not silently
tuned. Its hashes remain visible below as nonqualifying diagnostic evidence.
The replacement V2 repair was frozen in the implementation design before its
sampler execution. V2 review later returned HOLD, and the V3 repair was frozen
before its sampler execution.

## Implemented Synthetic Boundary

The isolated implementation includes:

- immutable aggregate plan, checkpoint, transition, capability, outcome,
  control, alignment, and freeze records;
- deterministic preparation with hierarchical hash bindings;
- six panels, each bound to one canonical slice and one disjoint private
  synthetic family registry;
- 18 checkpoints per panel, with 12 pre and 6 post windows;
- aggregate retention, new-embedding, and active-nonembedded likelihoods;
- stated-capability measurement error;
- lagged capability-to-behavior terms;
- lagged behavior, capability, capability-by-Embedded, approved control, and
  residual time terms in the continuous-normal outcome model;
- one no-behavior restricted outcome companion using the same rows,
  likelihood, controls, time structure, and shared priors; and
- sanitized model-level summaries only.

The implementation emits no family identities, member rows, per-slice model
results, posterior draws, latent paths, raw observations, customer data, or
customer-facing output.

## Nonqualifying V1 Diagnostic Evidence

Initial structural checks reported deterministic recomputation, disjoint
private registry allocation, stable observable source coverage, exact cohort
alignment, required capability uncertainty, frozen lags, pre-outcome freeze,
and rejection of algebraically duplicated behavior terms. Independent review
showed that those checks were incomplete, so none of the following results is
accepted evidence.

The bounded PyMC smoke matrix ran four fits:

1. primary full model;
2. primary restricted model;
3. null full model; and
4. null restricted model.

Both summary artifacts correctly returned `HOLD_SMOKE_NONQUALIFYING`.

| Internal comparison | Primary smoke | Null smoke |
| --- | ---: | ---: |
| Bayesian R-squared, full minus restricted | `0.002354` | `0.002804` |
| Future-window RMSE improvement, restricted minus full | `-0.003836` | `0.008743` |
| Future-window log-score difference, full minus restricted | `-0.120916` | `0.030642` |

Negative RMSE improvement and log-score difference mean the primary full model
was slightly worse than the restricted model in this short, nonqualifying run.
These values are internal predictive diagnostics. They are not causal variance,
percent impact, confidence, productivity, ROI, or customer output.

Sanitized validation bindings:

- structural report hash:
  `b44eec59d00de833e9f79e933e76dec67c5ddd878d1ce8102280181d9fb2ad31`;
- primary artifact hash:
  `ac1ba5c51fc43839552b3bcc1731bf1931864ea8457ed92ff788524454055ed3`;
- null artifact hash:
  `90a0806acfc81e943e64c81e89ee4283503df9c6665f07592f474d89a9cdc311`;
  and
- sanitized validation hash:
  `ea0cde2c4a3ddad3c114b3604a956e109394d6c18da3e608217acbdc792ab545`.

The summary hashes record one bounded local execution. No posterior artifact or
draw file was written or committed.

## V2 Repair Smoke Run

The V2 repair identity was frozen in the implementation design before sampler
execution. A first local attempt stopped before drawing because the sandbox
blocked PyTensor's default cache directory. That attempt produced no model
result or evidence. The unchanged profile was rerun with task-owned temporary
cache roots and completed all four smoke fits:

1. primary full model;
2. primary restricted model;
3. behavior-pathway-null full model; and
4. behavior-pathway-null restricted model.

Every artifact returned `HOLD_SMOKE_NONQUALIFYING`. The fitted validation
returned `qualifying_evidence: false` and decision
`HOLD_FOR_MODEL_REPAIR`. Sanitized V2 bindings are:

- structural report hash:
  `d03707017c4e925d2e713236f3e37f368f0409484c9146b5428332a15a0c9a11`;
- primary artifact hash:
  `69f80c0bf880ac85de436e467a8972f17058b6cfba3e2121810fed278d8098da`;
- behavior-pathway-null artifact hash:
  `ae47f913d8b5ee8a0361a01096038d3be7ee164139439263aa14dcb75f1f8c84`;
  and
- sanitized validation hash:
  `addc7eed70b908ea25028607d5f36c0665201e9093177d5c3b7079dff69d7186`.

These hashes are nonqualifying V2 smoke evidence. They do not replace the V1
diagnostic record, clear the current HOLD, or demonstrate recovery,
calibration, sensitivity, predictive superiority, or review acceptance.

## V2 Review Result And V3 Repair

Fresh technical, adversarial, and statistical review returned `HOLD` for V2.
The remaining blockers were mutable prepared arrays, incomplete scenario and
seed provenance, forgeable diagnostic PASS states, capability-to-behavior
nonidentifiability, and a mismatch between realized behavior in the generator
and expected behavior in the fitted outcome pathway.

The V3 identity and repair were frozen in the implementation design before any
new sampler run. The local V3 candidate uses immutable byte-backed prepared
arrays with exact deterministic regeneration before model construction, binds
scenario and seed through fits and artifacts, independently recomputes
diagnostic failures, adds capability innovations not spanned by panel/time/post
terms, and aligns generator and fitted outcome pathways on the same expected
behavior state and forecast anchor.

Pre-sampler technical review found one additional artifact-boundary gap: an
immutable prepared array could be replaced while stale valid provenance stayed
attached to the fit. Artifact emission now independently regenerates and
validates both the full and restricted prepared projections before constructing
any summary. The regression test covers that exact replacement path.

Sampler-free V3 verification passes 25 focused tests and 16 structural controls.
The full assurance harness passes 879 tests with 3 skipped and 156 deselected.
Fresh technical, adversarial fail-closed, and statistical review returned GO to
run the unchanged bounded smoke profile only.

## Nonqualifying V3 Smoke Record

The unchanged V3 smoke profile completed four fits in task-owned temporary
cache roots:

1. primary full model;
2. primary restricted model;
3. behavior-pathway-null full model; and
4. behavior-pathway-null restricted model.

Both artifacts returned `HOLD_SMOKE_NONQUALIFYING`. The fitted validation
returned `qualifying_evidence: false`, decision `HOLD_FOR_MODEL_REPAIR`, and
false real-data, product-integration, and customer-output authorization flags.
The two-chain, 300-tune, 300-retained smoke fits produced expected R-hat and
effective-sample-size warnings. Those warnings cannot promote the result and
confirm why smoke evidence remains nonqualifying.

Sanitized V3 bindings are:

- structural report hash:
  `56efd83833c3b0aa0a43486b255928d8879d263328bf74223ddc56ed7954a327`;
- primary artifact hash:
  `27b79cf363370e7cd8343f14b387fadbd641e6343788d2a017fa0a3bb3857abd`;
- behavior-pathway-null artifact hash:
  `ca445adef50d694f4140f1593a1fe3bc3a711c2b316515b5885d97550e8bff26`;
  and
- sanitized validation hash:
  `2770a81392f03e03abba258b2f42f78a86a280230d869f663b203f0796d69a42`.

Post-smoke technical, statistical, and fail-closed governance review returned
GO to record these hashes as nonqualifying internal diagnostic evidence only.
No posterior artifact or draw file was written or committed. This smoke record
does not establish recovery, calibration, sensitivity, predictive superiority,
model qualification, real-data admission, or customer claims. The decision
therefore remains `HOLD_FOR_MODEL_REPAIR`.

## Frozen Replicated Validation Protocol

James Kelley directed the project to test the model on 2026-08-11. Independent
statistical, technical, and fail-closed design review confirmed that one full
run on the two V3 datasets would not establish recovery or calibration. The
replicated protocol is now frozen at:

`docs/contracts/ai-value-vbd-human-behavior-outcome-joint-methodology/REPLICATED_VALIDATION_PROTOCOL.md`

The protocol defines 100 replicates in each of four cells: primary,
behavior-pathway null, omitted-confounder stress, and high capability error.
The complete qualifying universe contains 400 datasets and 600 full-setting
fits. It freezes component-keyed randomness, disjoint data and sampler seeds,
recovery and calibration gates, the sole primary predictive endpoint,
sensitivity gates, all-must-pass decision logic, nonretry behavior, runtime
limits, sanitized output, and independent review.

The V4 component-keyed generator and sampler-free claims, checkpoint, combiner,
and sanitized-artifact scaffolding now exist. No protocol sampler or external
execution has run. The protocol and implementation scaffolding have authority
effect `NONE` and do not clear the current HOLD.

The current local repair candidate adds observed runtime provenance,
one-manifest claim/combiner/artifact reconciliation, exact V4 preparation,
high-error uncertainty admission, and slot-bound ordered chain seeds. These are
model-path repairs only. They do not change the likelihood, do not qualify the
model, and do not clear `HOLD_FOR_MODEL_REPAIR` until the exact committed
candidate passes fresh technical, adversarial, and statistical pre-execution
review.

## What Must Happen Next

The pre-sampler review, structural checks, bounded V3 smoke, post-smoke review,
docs-first replicated protocol, and sampler-free V4 implementation scaffolding
are complete. The exact implementation commit and runtime manifest must now
pass fresh technical, adversarial, and statistical pre-execution review before
the nonqualifying preflights or qualifying universe may run.

The V1 diagnostic result must remain visible and cannot be replaced by tuning
or a V2 rerun.

## Non-Authorization

This decision does not authorize real or customer data, a public schema,
service, API, persistence, connector, UI, export, deployment, customer output,
confidence or probability output, causal impact, productivity, ROI, ranking,
economic output, a new canonical event, a new suppression reason, Depth in the
likelihood, or relabeling of the legacy VBD trajectory model.

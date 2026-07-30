# VBD Collapsed-Target Methodology Reconciliation Decision

## Purpose

This document reconciles the sampler-free collapsed-target implementation
merged by PR #434 with the VBD trajectory calibration contract and its
OpenSpec task lineage.

Decision:

`REPAIR_DIAGNOSTIC_LINEAGE_ONLY`

This decision does not admit the collapsed target as the VBD reference
sampler, reject its narrow Gaussian algebra, or authorize any execution. It
classifies the merged implementation as a held, sampler-free diagnostic oracle
only and restores an explicit current-main methodology and task boundary.

## Inputs Reviewed

The decision reviewed:

- PR #434, `Restore clean implementation-only VBD diagnostics`;
- reviewed PR head
  `029093da19cb24d7358bbb368ef9851fc5f7981a`;
- merge commit
  `a0b56323cf942536bedd0f21fb5b8c1d631f8f64`;
- the current VBD trajectory calibration contract and OpenSpec proposal,
  design, specification, and tasks;
- the sampler-free dense-Gaussian target, reconstruction, projection, and
  fixture tests merged by PR #434;
- the failed precision canary and MCSE diagnostic lineage already recorded as
  permanent HOLD; and
- the earlier branch-local methodology and task commits that are not ancestors
  of current `main`.

The earlier branch-local commits include methodology task labels such as
`1.12`, `1.13`, `2.16`, `2.17`, and `2.20`. Because those governing docs and
task bytes never merged, those labels are historical tombstones, not active
OpenSpec authority.

## Reconciliation Finding

PR #434 merged implementation and sampler-free algebraic tests, but it did not
merge the methodology predeclaration or task lineage that originally described
that work. Current normative VBD docs still require the centered reference and
explicitly prohibit a collapsed target in precision canaries, concordance, and
evidence.

The merged implementation is fail-closed:

- its model builder exposes a sampler-free candidate graph, not an execution
  runner;
- its result classifier returns `INVALID_HOLD`;
- its V2 constants declare `HOLD` and a diagnostic-only seed namespace;
- its tests compare the narrow low-rank target and conditional reconstruction
  with independently constructed dense-Gaussian oracles; and
- PR #434 explicitly denied authorization, evidence eligibility, customer
  output, and model promotion.

These facts establish enough support to retain the algebra as a diagnostic
oracle. They do not establish the governed statistical result required to
replace the centered reference.

## Decision Matrix

| Option | Decision | Reason |
| --- | --- | --- |
| `ADMIT` | Rejected | No merged predeclaration, valid governed diagnostic result, task `2.6` completion, passing precision canaries, concordance, or evidence exists. |
| `REPAIR` | Selected | The narrow algebra is test-supported and fail-closed, but its methodology and task authority were missing from `main`. |
| `REJECT` | Rejected | Removing or declaring the algebra invalid would overstate the evidence: the sampler-free dense-Gaussian equivalence tests support its diagnostic use. |

## Allowed Interpretation

The merged PR #434 collapsed-target implementation may be interpreted only as:

```text
held_sampler_free_group_effect_marginalization_diagnostic_oracle
```

The allowed diagnostic statement is narrow:

- only the Helmert zero-sum group-effect block is analytically marginalized;
- `alpha`, `beta`, `sigma_u`, `sigma_r`, and `rho` retain the frozen priors and
  target definitions;
- `u` and terminal movement are reconstructed from the corresponding exact
  conditional Gaussian distribution;
- the frozen three-lane model and estimand remain unchanged; and
- the already-checked-in sampler-free dense-Gaussian tests support the narrow
  algebraic classification.

This is an algebraic and structural classification, not a sampler-quality,
precision, calibration, evidence, or product claim.
It is retrospective only and does not authorize constructing, executing, or
rerunning the target, reconstruction, generator, sampler, or tests.

## Preserved Reference Method

The current centered reference remains normative for every precision canary,
candidate source/freeze pair, concordance fit, calibration slot, evidence
artifact, and acceptance decision.

The prohibition against collapsed targets in those paths remains unchanged.
PR #434 cannot satisfy, replace, or partially count toward:

- task `2.6`;
- either full-setting precision canary;
- replacement candidate `S` or freeze `F`;
- NUTS concordance;
- the 2,000-case original or recomputation universes;
- evidence review or acceptance;
- parent task `5.6`; or
- downstream three-lane integration.

## Task-Lineage Repair

Current OpenSpec task `1.10` records this reconciliation decision.

Historical branch-local task labels `1.12`, `1.13`, `2.16`, `2.17`, and
`2.20` are not imported, renumbered, or marked complete. References to
`2.16` or `2.17` inside the already-merged PR #434 source are historical
implementation annotations only. They create no active task, authorization, or
execution path.

The stale pending queue item
`vbd-numerical-precision-implementation-canaries` is closed NO-GO. Its bound
predated the ordinal-`0` permanent MCSE HOLD and directed completion of task
`2.6` plus both canaries. That direction is superseded and must never execute:
ordinal `0` cannot be retried or cleared, ordinal `1` cannot run under that
lineage, and task `2.6`, `S/F`, concordance, and evidence remain blocked.

Any future proposal to promote, execute, or use the collapsed target must begin
with a new human-authored queue item from current `main`, new explicit
OpenSpec tasks, and the then-applicable review and execution gates. This
decision does not create that work.

## Frozen Safety Boundary

This decision preserves:

- the existing model and priors;
- the existing terminal movement estimand;
- every existing generator, chain, PPC, smoke, canary, concordance, and study
  seed;
- the `<=0.10` MCSE-to-posterior-SD threshold;
- all R-hat, ESS, divergence, treedepth, BFMI, PPC, deterministic-reference,
  and evidence gates;
- failed canaries and consumed diagnostic attempts as permanent HOLD;
- default fail-closed behavior; and
- all nine repository invariants.

It adds no canonical event, suppression reason, tunable threshold, override,
individual field, cross-slice aggregation, model execution, schema, endpoint,
route, persistence, migration, deployment, public surface, or UI behavior.

## Explicit Non-Authorization

This decision does not authorize:

- implementation changes;
- sampler or generator execution;
- retry, resume, extension, or seed rotation;
- canary ordinal `1`;
- task `2.6` completion;
- replacement `S` or `F`;
- concordance, calibration, or evidence generation;
- real, customer, production, or live data;
- customer or public output;
- promotion;
- Sections 7.5 through 7.7; or
- UI/UX wiring.

## Final Decision

Decision:

`REPAIR_DIAGNOSTIC_LINEAGE_ONLY`

PR #434 remains merged as a held diagnostic implementation. Its narrow
sampler-free algebra is recognized as a non-evidentiary oracle, while the
centered reference, failed-canary posture, task `2.6` block, and every later
gate remain unchanged.

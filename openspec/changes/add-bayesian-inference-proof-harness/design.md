# Design — Bayesian inference proof harness (methodology first)

## Context

The confidence-engine workspace (PR #391) is a validated lock around a
statistical capability that does not exist. `packages/confidence-engine/src/
confidenceModel.ts` pins the governance surface — schema version
`FT_AI_VALUE_CONFIDENCE_MODEL_CONTRACT_2026_07`, the
`internal_confidence_engine_only` consumer token, milestone days
`[0, 30, 60, 90, 180, 365]`, the `CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR = 5`
aggregate floor, and fifteen blocked uses — but the runtime it binds is held
(`INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW`) and its
prior is a stated placeholder
(`weakly_regularizing_internal_placeholder_not_calibrated`). The
`ai-value-contribution-alignment-bayesian-model-specification` contract
already names the model family and the seven diagnostics; none is computed
anywhere. This change designs the methodology and its synthetic proof. All
decisions below are made; this document records them, their rationale, and
the alternatives considered.

## Goals / Non-Goals

- Goals:
  - Record the inference methodology as a reviewable contract (slice 1) and
    prove it on synthetic data with computed diagnostics (slice 2).
  - Keep every artifact inside the existing TypeScript governance perimeter:
    JSON validated by the confidence-engine gates and `ConfidenceModel` Zod
    schemas, all blocked uses intact.
  - Position the work as a contribution to Applied Science's FY27Q2 objective
    of reusable causal-inference capability.
- Non-Goals:
  - No real observations, no Series persistence, no output promotion — each
    is a separate later change behind its own gate.
  - No change to the spine's schema versions, hashes, golden chain, or
    hold-by-default semantics. The placeholder Normal-Normal runtime stays
    byte-stable as a decision record.
  - No customer-facing confidence, probability, ROI, or causality language.

## Decisions

### 1. Language boundary: Python owns statistics, TypeScript owns governance

Statistical computation (model fitting, sampling, diagnostics) lives in
Python; admission, validation, hold semantics, and blocked-use enforcement
stay in the existing TypeScript confidence-engine gates. Artifacts cross the
boundary only as JSON that must parse against the `ConfidenceModel` Zod
schemas (`PosteriorWithCredibleIntervalsSchema`, `EvidenceAdmissionSchema`)
and clear the sixteen governed gates. Rationale: the boundary already exists
and is tested; reusing it means the harness inherits fail-closed behavior for
free. Alternative rejected: hand-rolling inference in Node. There is no
credible Node PPL ecosystem, and a hand-rolled sampler would repeat exactly
the placeholder mistake this change exists to retire.

### 2. Stack: PyMC + ArviZ in a dedicated `inference/` package

PyMC (model specification, NUTS sampling) plus ArviZ (R-hat, ESS, PPC,
LOO/calibration tooling), version-pinned in a new top-level `inference/`
Python package with its own lockfile. It is NOT added to the root
`pyproject` — the root has identity drift being fixed in a separate change,
and coupling to it would block this work on that cleanup. Alternatives:
NumPyro is an acceptable fallback (same model family, JAX backend, faster
sampling) and is noted as such if PyMC pinning proves painful; Stan was
rejected as a heavier toolchain (C++ compilation step, separate DSL) for no
methodological gain at this scale.

### 3. Synthetic-first proof

The harness must prove itself on synthetic data before any real observation
is considered: inject known effects, verify the model recovers them within
stated tolerance, and verify credible-interval calibration coverage across
repeated simulated datasets. Real observations, Measurement Cell Series
persistence, and output promotion are explicitly separate later changes.
Rationale: a method that cannot recover effects it is known to contain has no
business near customer data; this is also the cheapest point to catch
specification errors. Alternative rejected: proving on dogfood data first —
it conflates method validation with data problems and would require read
authorizations this change deliberately does not request.

### 4. Model family: hierarchical Bayesian difference-in-differences

Per the existing `bayesian_model_specification` contract: hierarchical DiD
with partial pooling by workflow, function, and cohort; aggregate Measurement
Cell windows (not persons) as the unit of analysis. Rationale: partial
pooling stabilizes small-cohort estimates without discarding them, matching
the aggregate-only posture; DiD is the estimand the contract already names.
Alternatives considered: flat per-cohort models (unstable at contract-minimum
cohort sizes), synthetic-control methods (deferred — viable later, but the
contract binds DiD now and the comparison-cohort rule in Decision 6 covers
the failure mode synthetic control addresses).

### 5. Diagnostics are computed values with numeric gates

The seven required diagnostics — R-hat, effective sample size, posterior
predictive checks, prior sensitivity, pre-period trend check, calibration
coverage, and known-effect recovery — are computed numbers checked against
explicit numeric gates, not boolean flags. A confidence-bearing artifact must
be structurally un-emittable unless all gates pass: the emit path requires
the diagnostics block, and the TypeScript gates reject artifacts whose gate
values fail or are absent. Rationale: the current spine records all seven as
`false` flags, which the 2026-07-03 methodology review flagged as the core
gap; flags attest nothing. Alternative rejected: advisory diagnostics with
human sign-off only — that reintroduces the drift the fail-closed culture of
this repo exists to prevent.

### 6. Comparison-cohort rule

No credible comparison cohort → no comparison-supported contribution
estimate; the artifact carries an evidence-tier label only. Adopted from the
methodology review. Causal language remains separately gated by the claim
ladder (approved comparison evidence design at the validated rung); this
rule's outputs are contribution estimates, never causal claims. Rationale:
DiD without a defensible comparison is a before/after story, and
before/after stories are precisely the overclaims the Value Playbook
discounts. No alternative was seriously entertained.

### 7. Peeking control at milestone cadence

Milestone-cadence evaluation (Day 0/30/60/90/180/365, matching
`CONFIDENCE_OBSERVATION_MILESTONE_DAYS`) is repeated testing. The enforceable
rule is stated normatively in the slice-1 contract so it is implementable
without Confluence access: any repeated evaluation across the six
milestones, or across multiple metrics or cohorts, must use an always-valid
sequential procedure — e.g. mSPRT-style always-valid p-values/e-values, or
an equivalently valid sequential credible-interval procedure — such that
the overall false-eligibility rate across all looks stays within the
declared <= 5% null false-eligibility bound. A one-look, fixed-horizon
evaluation needs no correction; naive repeated evaluation marks the artifact
ineligible. The internal "Playbook: A/B testing @ Glean" (Confluence,
Engineering space) is cited as provenance and alignment for this rule, not
as its normative source. Rationale: six scheduled looks at accumulating
evidence is repeated testing; uncorrected milestone reads would fail the
org's own experimentation standard. Alternative rejected: single
fixed-horizon analysis at Day 365 — it forfeits the early-signal value the
milestone contract was created for.

### 8. Priors: weakly informative, empirically justified

Priors are weakly informative and empirically calibrated from historical and
dogfood aggregates, with prior-sensitivity analysis always run and reported
as one of the seven diagnostics. The spine's N(0,1) placeholder (the
`weakly_regularizing_internal_placeholder_not_calibrated` state) is retired
only inside the harness; the spine itself stays byte-stable as a governed
decision record. Rationale: an arbitrary prior is indefensible in front of
the methodology reviewers; sensitivity reporting makes the prior's influence
auditable rather than asserted. Alternatives: flat priors (pathological in
hierarchical models), fully informative priors (invite the overclaim
critique from the other direction).

### 9. Probability representations stay internal

P(effect > minimum worthwhile threshold) and expected loss are internal
diagnostic representations only: additive types + Zod in `ConfidenceModel`,
`customer_output_authorized` pinned `false`, and `probability_output` /
`confidence_output` remain in `CONFIDENCE_MODEL_BLOCKED_USES`. Promotion to
any customer-facing language requires a separate explicit human decision.
Rationale: these quantities are what reviewers need to judge the method, and
exactly what must not leak into claims before the evidence-tier governance
exists. Alternative rejected: omitting them entirely — reviewers would then
be judging summaries of summaries.

### 10. Aggregate-only floors respected

The harness enforces the `ConfidenceModel` k>=5 schema floor with
stated-floor cross-validation, and the k>=10 series display floor
(`minimum_cohort_size: 10`) from the series read-path decision applies to
anything sourced through that path. Synthetic cohorts are generated at and
around the floors so floor enforcement is itself tested. Rationale: floors
already bind the contracts; the harness must demonstrate them, not merely
inherit them.

## Enterprise context (plan-prep findings, 2026-07-03)

- **Time-saved methodology** (Paul Li, Jun 2026): telemetry-based with ~87%
  session coverage; value = base_rate × quality_multiplier × dedup. Silent
  sessions — ~64% of chat runs — receive a 30% credit heuristic, the single
  largest uncertainty in current claims. Agentic workflows (~8%) are
  excluded. ROI translation assumes 25% recapture of saved time; a 2025
  St. Louis Fed study suggests ~20%. The harness's uncertainty
  quantification targets exactly this soft spot.
- **Anti-overclaim standard** (Glean Value Playbook, Varun Tilva, Jun 2026):
  telemetry over self-report; cites the METR RCT's 40-percentage-point
  perception gap (+20% perceived vs −19% measured); survey-only claims take
  a 0.5–0.7x discount. Decisions 5, 6, and 9 operationalize this standard.
- **Documented skepticism**: the Wiz pilot was down-scoped on "ROI/Adoption
  Measurement Failure"; Ibex required operational-pain anchoring; ~20% churn
  is majority-attributed to weak perceived ROI (FY27 Prism strategy). Weak
  evidence is a live commercial risk, not a hypothetical.
- **Internal standards**: an authoritative A/B testing playbook exists
  (sequential testing, holdouts, peeking rules; Confluence, Feb–May 2026),
  and live-experiment tooling uses frequentist cluster-bootstrap CIs. Code
  search confirms no PyMC/Stan/NumPyro anywhere in internal code: this is
  greenfield with no conflicting standard, but also no precedent to lean on
  (see Risks).
- **Applied Science FY27Q2 roadmap** (Paul Li, Jul 2026): causal inference
  must become "a reusable team asset, not a bottlenecked skill." This
  harness is positioned as a contribution to that objective.
- **Stakeholders**: the planning research identified individual reviewers
  and a governance pod, but the decision owner confirmed on 2026-07-03 that
  those individuals are no longer part of the project. Review is therefore
  organized by role (statistical methodology, value governance, downstream
  tooling interface), with reviewers assigned or waived by the decision
  owner; the contract's review record tracks assignment. The downstream
  need the research surfaced remains valid: value tooling that consumes
  claim-defensibility outputs (ROI modeling, agent-impact reporting) sits
  beneath this methodology as its consumer. CSG customer pilot approved
  (James/Logan 1:1, Jun 29).
- **Claim-status framing**: James's May 2026 value-measurement picture
  already uses customer-safe / caveated / internal-only / withheld; the
  evidence-tier ladder in Decision 6 maps onto it directly.

## Risks / Trade-offs

- Risk: first Bayesian PPL in the org — no internal precedent to review
  against. → Mitigation: expert review of the slice-1 methodology contract
  before any slice-2 implementation begins, via the role-based review
  record (statistical methodology reviewer assigned or explicitly waived
  by the decision owner).
- Risk: MCMC nondeterminism collides with the repo's byte-determinism
  culture. → Mitigation: seeded runs, tolerance-banded assertions, and
  numeric diagnostics gates for the Python side rather than byte-golden
  outputs; byte-determinism continues to apply unchanged on the TypeScript
  side, where the JSON artifacts are validated.
- Risk: scope creep from "methodology" into engine rebuild, persistence, or
  output promotion. → Mitigation: two bounded slices in separate PRs, each
  with an explicit non-goals list; anything beyond them requires a new
  OpenSpec change.

## Migration / Rollback

Slice 1 adds documents only; rollback is deleting the change directory.
Slice 2 adds the `inference/` package, additive-only `ConfidenceModel` types,
and statistical correctness tests; nothing else depends on `inference/`, so
rollback is deleting the package and reverting the additive types. The spine
and its golden chain are untouched in both slices.

## Open Questions

- Exact numeric gate values (R-hat threshold, minimum ESS, coverage
  tolerance) are proposed in the slice-1 methodology contract and settled in
  expert review, not here.
- Whether the NumPyro fallback is exercised in CI or documented only.

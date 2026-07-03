## 1. Approval and review

- [x] 1.1 Record explicit human approval from the decision owner (James Kelley) in the change record before any implementation work begins; no slice-1 or slice-2 task starts without it. — Approved by James Kelley on 2026-07-03 ("go" directive in the working session, following the proposal review and the adopted two-slice split).
- [ ] 1.2 Circulate the inference methodology contract for expert review across three roles — statistical methodology, value governance, and downstream tooling interface — with reviewers assigned (or explicitly waived) by the decision owner, and record each review outcome (approve / approve-with-changes / reject, with date and reviewer) in the contract doc's review record. (The individuals named in the original planning research are no longer part of the project; roles are unassigned until the decision owner names reviewers.)

## 2. Inference methodology contract (slice 1 — this PR)

- [x] 2.1 Write `docs/contracts/confidence-inference-methodology/README.md` covering, as normative sections: the estimand definition (hierarchical Bayesian difference-in-differences with partial pooling by workflow/function/cohort, operating on aggregate Measurement Cell windows); the Python/TypeScript boundary (Python owns statistics, TypeScript owns governance, artifacts cross as JSON validated by the existing confidence-engine gates); the diagnostics table with the exact numeric gates from 3.4; the comparison-cohort rule ("no credible comparison cohort, no causal number — evidence-tier label only"); the milestone peeking control aligned to the internal A/B testing playbook; the prior policy (weakly-informative, empirically justified, sensitivity reporting mandatory); the aggregate floors (k>=5 schema floor, k>=10 series display floor); and the claim-language table aligned to the Glean Value Playbook (telemetry-first, recapture assumptions separated from time-saved measurement, and customer-safe / caveated / internal-only / withheld statuses mapped to evidence tiers).
- [x] 2.2 Extend `packages/confidence-engine/src/confidenceModel.ts` (additive, types + Zod only): add internal-only `ThresholdProbabilityRepresentation` and `ExpectedLossRepresentation` schemas each carrying `internal_only: z.literal(true)`, `customer_output_authorized: z.literal(false)`, and a required `promotion_decision_ref: z.null()` (null until a separate later human promotion decision); extend the existing tests to cover both schemas; no existing schema, hash, or version changes.
- [x] 2.3 `npx openspec validate add-bayesian-inference-proof-harness --strict` passes, and the docs contract sweep, V1 governance gates, and semantic drift guard all pass.

## 3. Python proof harness (slice 2 — SEPARATE PR, starts only after all 1.x and 2.x tasks are complete)

- [ ] 3.1 Create a new `inference/` Python package with its own pinned environment (PyMC + ArviZ + numpy/scipy, versions pinned by lockfile); no dependency additions to the root pyproject; add a CI job that runs the harness suite.
- [ ] 3.2 Implement the hierarchical Bayesian DiD model exactly as specified in the slice-1 contract, with seeded, reproducible sampling (fixed seeds produce identical draws across runs).
- [ ] 3.3 Synthetic known-effect recovery: across >= 200 seeded synthetic replications spanning injected effect sizes {0, 0.2, 0.5} SD and cohort counts {4, 8, 16}, the posterior 80% credible interval covers the injected effect in 74–86% of replications (calibration band), and the null case (injected effect 0) produces a causal-number-eligible artifact in <= 5% of replications.
- [ ] 3.4 Compute all diagnostics as real values with hard numeric gates: R-hat <= 1.01 for all parameters (hard fail at > 1.05); bulk-ESS >= 400 chain-total per parameter; posterior predictive p-values within [0.05, 0.95] for the designated test statistics; prior sensitivity: posterior mean shift < 0.5 posterior SD across the declared prior family; pre-period trend check: the pre-window pseudo-effect 80% credible interval must include 0. Any gate failure emits the artifact only in HOLD state with every failing diagnostic named in the artifact.
- [ ] 3.5 Artifact bridge: harness output validates against the ConfidenceModel Zod schemas and is accepted by the existing confidence-engine TypeScript gates in HOLD and eligible states as appropriate; a Node test proves the Python-to-TypeScript round trip.
- [ ] 3.6 No real data: harness inputs come from synthetic generators only; a test asserts the `inference/` package contains no network, BigQuery, or connector imports.

## 4. Verification (per slice)

- [x] 4.1 Slice 1: OpenSpec strict validation, docs contract sweep, V1 governance gates, and semantic drift guard all pass; the full confidence-engine workspace suite passes at 250/250 (the 238/238 baseline plus the 12 new ConfidenceModel representation tests from task 2.2; zero regressions).
- [ ] 4.2 Slice 2: harness suite green including the 3.3 calibration thresholds and 3.4 diagnostic gates; full workspace suite green; golden chain regeneration remains a byte-identical no-op (spine untouched).

## 5. Governance and docs

- [ ] 5.1 Add a README capability-ledger bullet and a `.project/PROGRESS.md` entry for each slice.
- [x] 5.2 Record the explicit NON-authorizations in the contract and change record: no customer-facing output, no probability-language exposure, no ROI or causality claims, no persistence, no live connector execution; promotion of any probability output requires a separate later human decision. — Recorded in the contract's "What this contract does not change or authorize" section and the proposal's "What Does Not Change" section (2026-07-03).

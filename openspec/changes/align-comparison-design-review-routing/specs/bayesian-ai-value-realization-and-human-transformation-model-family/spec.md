## ADDED Requirements

### Requirement: Natural-Language Comparison Requests Point To Existing Review Prerequisites

The model-family documentation SHALL treat a natural-language request to compare cohorts, review pre/post structure, assess matching, or evaluate DiD fit as documentation-level review intent only. The documentation SHALL point to the existing reviewer-owned comparison-design source-package collection and comparison-design adequacy evidence-review contracts as the governed prerequisites for any later review. The natural-language request SHALL NOT set `evidence_design`, select a model, count as reviewer-owned source-package information, satisfy a required source ref, hash, review decision, or boundary check, or invoke either existing runner. The documentation pointer SHALL NOT create a new token, selector, parser, normalization rule, runtime trigger, schema, route, UI, persistence path, export, model execution path, or customer output.

The existing collection contract remains the sole owner of its preparation prerequisite, selectors, states, recovery transitions, and review decision. The existing adequacy-review contract remains the sole owner of its review class, states, and allowed next step. Any `HOLD_FOR_*` value referenced by this documentation is a review/workflow state only and SHALL NOT become a canonical FluencyTracr suppression reason.

A separately executed and valid `COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEWED_FOR_GOVERNED_SOURCE_BINDING` result remains one reviewed diagnostics dimension only. It MAY be supporting context in a later, separate human prioritization decision. It SHALL NOT execute, modify, calibrate, promote, or complete DiD; satisfy the full Governed Diagnostics Sufficiency Evidence Source; authorize real/customer/live data; or change the incomplete status of the Bayesian DiD proof. Every separate DiD gate remains required, including a true two-group design, comparison-cohort adequacy, complete windows, aggregate floors, sampler diagnostics, posterior predictive checks, prior sensitivity, replicated calibration and null evidence, peeking control, synthetic-only proof boundaries, source binding, and TypeScript artifact validation.

#### Scenario: Natural-language request receives a documentation pointer only

- **GIVEN** a human expresses a comparison-design request in natural language
- **WHEN** the request is interpreted for documentation-level guidance
- **THEN** the response points to the existing reviewer-owned collection and adequacy-review contracts as prerequisites
- **AND** it does not set `evidence_design`, select a model, invoke a selector or runner, or create reviewed evidence
- **AND** the existing contracts remain the sole owners of all preparation, collection, held-state, recovery, and adequacy-review behavior

#### Scenario: Existing review chain retains sole ownership

- **GIVEN** collection reaches `REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTED_FOR_REVIEW_ONLY`
- **AND** `review_decision=COLLECTED_FOR_REVIEW_ONLY`
- **AND** `allowed_next_step=run_comparison_design_adequacy_evidence_review_only`
- **WHEN** the existing collection contract independently authorizes its next review-only step
- **THEN** only that existing contract may identify `run_comparison_design_adequacy_evidence_review_only`
- **AND** the adequacy review yields only `COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEWED_FOR_GOVERNED_SOURCE_BINDING`, `HOLD_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE`, or `REJECTED_FOR_BOUNDARY_LEAKAGE`

#### Scenario: Qualifying review informs a later human decision only

- **GIVEN** a separately executed adequacy review reaches `COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEWED_FOR_GOVERNED_SOURCE_BINDING`
- **WHEN** a human later considers reprioritizing unfinished DiD proof work
- **THEN** the one-dimension review may be used as supporting context for that separate human decision
- **AND** it does not execute, modify, calibrate, promote, or complete DiD
- **AND** the Bayesian DiD proof remains incomplete
- **AND** every comparison, window, floor, sampler, predictive, sensitivity, calibration, null, peeking, synthetic-only, source-binding, and artifact-validation gate remains required

#### Scenario: Documentation mapping creates no runtime or output authority

- **GIVEN** the natural-language comparison-request mapping is documented
- **WHEN** the change is inspected
- **THEN** it adds no schemas, tokens, selectors, suppression reasons, code, runtime triggers, customer output, real/customer/live data authorization, routes, UI, persistence, exports, migrations, or connector behavior
- **AND** the request itself cannot satisfy reviewer-owned source-package fields, refs, hashes, review decisions, or boundary checks and cannot invoke either existing runner
- **AND** referenced `HOLD_FOR_*` values remain review/workflow states and never canonical suppression reasons
- **AND** it grants no promotion, posterior interpretation, confidence, probability, ROI, finance, causality, productivity, or economic-output authority

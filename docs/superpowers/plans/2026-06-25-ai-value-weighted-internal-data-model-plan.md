# AI Value Weighted Internal Data Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move from the current compact internal research math data model to a world-class internal weighted data model without authorizing customer-facing output, ROI, causality, probability, or Bayesian execution.

**Architecture:** The pipeline advances through four exact-scope gates: feature stability review, internal numeric weight decision, versioned weight object, and weighted internal model frame. Each gate consumes the previous source-bound object, emits compact refs and governance posture only, and keeps unsafe outputs false unless the exact scope explicitly permits the internal-only next object.

**Tech Stack:** Node.js ESM runner scripts, `node:test`, existing FluencyTracr contract docs under `docs/contracts/`, package scripts in `package.json`, progress notes in `.project/PROGRESS.md`.

---

## What Excellent Looks Like

The implementation is excellent only when all of these are true:

- Every step has a narrow contract, schema version, runner, validator, README, package script, and progress entry.
- Every object is source-bound to the prior object by id/hash and recomputed validation.
- Feature inputs are named, versioned, partitioned, and stable before weights exist.
- Numeric weights, once authorized, are versioned and internal-only, with explicit rationale and no hidden score/probability/customer output.
- Weighted internal output is a model frame only: it may show internal weighted feature composition, but not confidence, probability, ROI, finance, causality, productivity, or customer-facing output.
- Tests reject forged source refs, unsafe payload smuggling, ungoverned fields, raw rows, identifiers, SQL/query text, routes/UI/exports, live connectors, Bayesian execution, score-like output, and customer-facing output.
- Local CODE / BUG / ADVERSARIAL review passes find no unresolved blocker before each commit.

## Task 1: Feature Stability Review

**Purpose:** Decide whether the existing internal research math data model inputs are stable enough to consider a later internal numeric weight decision.

**Files:**
- Create: `scripts/run_ai_value_contribution_alignment_feature_stability_review.mjs`
- Create: `scripts/validate_ai_value_contribution_alignment_feature_stability_review.test.mjs`
- Create: `docs/contracts/ai-value-contribution-alignment-feature-stability-review/README.md`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/architecture/AI_VALUE_PHYSICAL_DATA_MODEL.md`
- Modify: `.project/PROGRESS.md`

- [ ] **Step 1: Write failing tests**

Run:

```bash
node --test scripts/validate_ai_value_contribution_alignment_feature_stability_review.test.mjs
```

Expected:

```text
ERR_MODULE_NOT_FOUND
```

- [ ] **Step 2: Implement runner**

Create a runner exporting:

```js
buildContributionAlignmentFeatureStabilityReviewFromObject(sourceDataModel, options)
validateContributionAlignmentFeatureStabilityReview(review, options)
contributionAlignmentFeatureStabilityReviewHash(review)
```

Required ready state:

```text
FEATURE_STABILITY_REVIEW_PASSED_FOR_INTERNAL_WEIGHT_DECISION
```

Required held state:

```text
HOLD_FOR_STABLE_INTERNAL_RESEARCH_MATH_DATA_MODEL
```

Required rejected state:

```text
REJECTED_FOR_BOUNDARY_LEAKAGE
```

Required allowed next step:

```text
internal_numeric_weight_decision_only
```

- [ ] **Step 3: Verify Task 1**

Run:

```bash
npm run test:ai-value-contribution-alignment-feature-stability-review
npm run test:ai-value-contribution-alignment-internal-research-math-data-model
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
git diff --check
```

Expected: all pass.

- [ ] **Step 4: Commit Task 1**

```bash
git add .project/PROGRESS.md README.md docs/architecture/AI_VALUE_PHYSICAL_DATA_MODEL.md docs/contracts/ai-value-contribution-alignment-feature-stability-review/README.md package.json scripts/run_ai_value_contribution_alignment_feature_stability_review.mjs scripts/validate_ai_value_contribution_alignment_feature_stability_review.test.mjs
git commit -m "Add contribution alignment feature stability review"
```

## Task 2: Internal Numeric Weight Decision

**Purpose:** Authorize a later versioned internal weight object only if Task 1 passes.

**Files:**
- Create: `scripts/run_ai_value_contribution_alignment_internal_numeric_weight_decision.mjs`
- Create: `scripts/validate_ai_value_contribution_alignment_internal_numeric_weight_decision.test.mjs`
- Create: `docs/contracts/ai-value-contribution-alignment-internal-numeric-weight-decision/README.md`
- Modify: `package.json`, `README.md`, `docs/architecture/AI_VALUE_PHYSICAL_DATA_MODEL.md`, `.project/PROGRESS.md`

Required ready state:

```text
PROMOTE_INTERNAL_NUMERIC_WEIGHT_OBJECT
```

Required allowed next step:

```text
versioned_internal_weight_object_only
```

Required non-authorization:

```text
model_output=false
confidence_output=false
probability_output=false
bayesian_execution=false
finance_output=false
customer_facing_output=false
```

## Task 3: Versioned Weight Object

**Purpose:** Implement the internal-only versioned weight set after Task 2 passes.

**Files:**
- Create: `scripts/run_ai_value_contribution_alignment_versioned_weight_object.mjs`
- Create: `scripts/validate_ai_value_contribution_alignment_versioned_weight_object.test.mjs`
- Create: `docs/contracts/ai-value-contribution-alignment-versioned-weight-object/README.md`
- Modify: `package.json`, `README.md`, `docs/architecture/AI_VALUE_PHYSICAL_DATA_MODEL.md`, `.project/PROGRESS.md`

Required ready state:

```text
VERSIONED_INTERNAL_WEIGHT_OBJECT_READY
```

Required standard:

```text
weights_sum_to_one=true
all_weighted_components_source_bound=true
calibration_state=initial_internal_structural_weights_not_empirical_confidence
```

## Task 4: Weighted Internal Model Frame

**Purpose:** Attach the versioned weights to the internal feature/input data model as an internal model frame only.

**Files:**
- Create: `scripts/run_ai_value_contribution_alignment_weighted_internal_model_frame.mjs`
- Create: `scripts/validate_ai_value_contribution_alignment_weighted_internal_model_frame.test.mjs`
- Create: `docs/contracts/ai-value-contribution-alignment-weighted-internal-model-frame/README.md`
- Modify: `package.json`, `README.md`, `docs/architecture/AI_VALUE_PHYSICAL_DATA_MODEL.md`, `.project/PROGRESS.md`

Required ready state:

```text
WEIGHTED_INTERNAL_MODEL_FRAME_READY
```

Required non-authorization:

```text
aggregate_score_output=false
confidence_output=false
probability_output=false
bayesian_execution=false
finance_output=false
roi_output=false
causality_output=false
customer_facing_output=false
```

## Reviewer Gate

Do not start Task 2 unless Task 1 passes. Do not start Task 3 unless Task 2 passes. Do not start Task 4 unless Task 3 passes. If any task fails source binding, stability, forbidden-output, or review quality, enhance that task before moving forward.

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTriangulatedEvidenceAlignmentReview,
  triangulatedEvidenceAlignmentSourceHash,
  validateTriangulatedEvidenceAlignmentReview
} from "./run_ai_value_triangulated_evidence_alignment_review.mjs";
import {
  contributionAlignmentComparisonDesignAdequacyEvidenceReviewHash
} from "./run_ai_value_contribution_alignment_comparison_design_adequacy_evidence_review.mjs";

const READY_COMPARISON_REVIEW_STATE =
  "COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEWED_FOR_GOVERNED_SOURCE_BINDING";
const HOLD_STATE = "HOLD_FOR_GOVERNED_EVIDENCE";
const ALIGNED_STATE = "ALIGNED_FOR_REVIEW";
const DIVERGENT_STATE = "DIVERGENT_FOR_REVIEW";
const PARTIAL_STATE = "PARTIAL_ALIGNMENT_FOR_REVIEW";
const BLUEPRINT_REF = "blueprint_hypothesis.customer_support.case_resolution.2026_06";
const WINDOW_REF = "observation_window.customer_support.case_resolution.t90";
const COHORT_REF = "cohort.eligible_support_cases_aggregate";
const WORKFLOW_REF = "workflow_function.customer_support_case_resolution";
const USE_CASE_REF = "prioritized_use_case.case_resolution_ai_assist";
const METRIC_REF = "metric.support_median_resolution_hours";

function comparisonDesignAdequacyReview(overrides = {}) {
  const review = {
    review_state: READY_COMPARISON_REVIEW_STATE,
    review_hash: null,
    evidence_satisfaction: {
      evidence_dimension: "comparison_design_adequacy",
      evidence_satisfied: true,
      reviewed_source_evidence_hash: "a".repeat(64),
      source_evidence_hash: "b".repeat(64)
    },
    promotion_boundary: {
      promotion_authorized: false,
      posterior_interpretation_authorized: false,
      confidence_probability_authorized: false,
      customer_economic_output_authorized: false,
      internal_bayesian_execution_artifact_v1_authorized: false
    },
    feeds: {
      governed_diagnostics_sufficiency_evidence_source: false,
      diagnostics_evidence_packet: false,
      bayesian_promotion_decision_gate: false
    },
    ...overrides
  };
  review.review_hash = contributionAlignmentComparisonDesignAdequacyEvidenceReviewHash(review);
  return review;
}

function sourceFields(overrides = {}) {
  const fields = {
    reviewer_owned_triangulated_evidence_alignment_ref:
      "reviewer_owned_triangulated_evidence_alignment.customer_support.case_resolution.2026_06",
    source_blueprint_hypothesis_ref: BLUEPRINT_REF,
    source_comparison_design_adequacy_review_hash: "0".repeat(64),
    source_sed_aggregate_evidence_ref:
      "reviewed_sed_aggregate_evidence.customer_support.case_resolution.t90",
    source_sed_aggregate_evidence_hash: "1".repeat(64),
    source_vbd_aggregate_evidence_ref:
      "reviewed_vbd_aggregate_evidence.customer_support.case_resolution.t90",
    source_vbd_aggregate_evidence_hash: "2".repeat(64),
    source_outcome_metric_aggregate_evidence_ref:
      "reviewed_outcome_metric_aggregate_evidence.customer_support.case_resolution.t90",
    source_outcome_metric_aggregate_evidence_hash: "3".repeat(64),
    observation_window_ref: WINDOW_REF,
    cohort_ref: COHORT_REF,
    workflow_function_ref: WORKFLOW_REF,
    prioritized_use_case_ref: USE_CASE_REF,
    metric_ref: METRIC_REF,
    source_sed_blueprint_hypothesis_ref: BLUEPRINT_REF,
    source_sed_observation_window_ref: WINDOW_REF,
    source_sed_cohort_ref: COHORT_REF,
    source_sed_workflow_function_ref: WORKFLOW_REF,
    source_sed_prioritized_use_case_ref: USE_CASE_REF,
    source_sed_metric_ref: METRIC_REF,
    source_vbd_blueprint_hypothesis_ref: BLUEPRINT_REF,
    source_vbd_observation_window_ref: WINDOW_REF,
    source_vbd_cohort_ref: COHORT_REF,
    source_vbd_workflow_function_ref: WORKFLOW_REF,
    source_vbd_prioritized_use_case_ref: USE_CASE_REF,
    source_vbd_metric_ref: METRIC_REF,
    source_outcome_blueprint_hypothesis_ref: BLUEPRINT_REF,
    source_outcome_observation_window_ref: WINDOW_REF,
    source_outcome_cohort_ref: COHORT_REF,
    source_outcome_workflow_function_ref: WORKFLOW_REF,
    source_outcome_prioritized_use_case_ref: USE_CASE_REF,
    source_outcome_metric_ref: METRIC_REF,
    source_sed_evidence_status: "CLEAR",
    source_vbd_evidence_status: "CLEAR",
    source_outcome_evidence_status: "CLEAR",
    reviewer_role_ref: "role.value_data_governance_reviewer",
    alignment_review_decision: ALIGNED_STATE,
    alignment_review_notes:
      "Reviewer-owned aggregate stream refs align directionally for internal review only.",
    boundary_checks_clear: "CLEAR",
    reviewer_attestations_complete: "YES",
    aggregate_only_scope: "YES",
    placeholder_evidence: "NO",
    generated_fixture_evidence: "NO"
  };
  Object.assign(fields, overrides);
  if (!Object.prototype.hasOwnProperty.call(overrides, "reviewer_owned_triangulated_evidence_alignment_hash")) {
    fields.reviewer_owned_triangulated_evidence_alignment_hash =
      triangulatedEvidenceAlignmentSourceHash(fields);
  }
  return fields;
}

function validReviewContext(overrides = {}, comparisonOverrides = {}) {
  const sourceComparisonDesignAdequacyReview =
    comparisonDesignAdequacyReview(comparisonOverrides);
  const reviewerOwnedTriangulatedEvidenceAlignment = sourceFields({
    source_comparison_design_adequacy_review_hash:
      sourceComparisonDesignAdequacyReview.review_hash,
    ...overrides
  });
  const review = buildTriangulatedEvidenceAlignmentReview({
    reviewerOwnedTriangulatedEvidenceAlignment,
    sourceComparisonDesignAdequacyReview
  });
  return {
    review,
    reviewerOwnedTriangulatedEvidenceAlignment,
    sourceComparisonDesignAdequacyReview
  };
}

function validReview(overrides = {}, comparisonOverrides = {}) {
  return validReviewContext(overrides, comparisonOverrides).review;
}

test("default held review validates as fail-closed output without source evidence", () => {
  const review = buildTriangulatedEvidenceAlignmentReview();
  const validation = validateTriangulatedEvidenceAlignmentReview(review);

  assert.equal(review.triangulated_evidence_alignment_review_state, HOLD_STATE);
  assert.equal(review.alignment_review_hash, null);
  assert.equal(review.reviewed_source_evidence_hash, null);
  assert.equal(review.source_evidence_hash, null);
  assert.equal(review.convergence_diagnostics_satisfied, false);
  assert.equal(review.diagnostics_sufficiency_satisfied, false);
  assert.equal(review.bayesian_readiness_authorized, false);
  assert.equal(review.promotion_authorized, false);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
});

test("happy path aligned evidence stream review stays review-only", () => {
  const context = validReviewContext();
  const validation = validateTriangulatedEvidenceAlignmentReview(context.review, context);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(context.review.triangulated_evidence_alignment_review_state, ALIGNED_STATE);
  assert.match(context.review.alignment_review_hash, /^[0-9a-f]{64}$/);
  assert.equal(context.review.reviewed_source_evidence_hash, null);
  assert.equal(context.review.source_evidence_hash, null);
  assert.equal(context.review.source_sed_aggregate_evidence_hash, "1".repeat(64));
  assert.equal(context.review.source_vbd_aggregate_evidence_hash, "2".repeat(64));
  assert.equal(context.review.source_outcome_metric_aggregate_evidence_hash, "3".repeat(64));
  assert.equal(context.review.convergence_diagnostics_satisfied, false);
  assert.equal(context.review.diagnostics_sufficiency_satisfied, false);
  assert.equal(Object.prototype.hasOwnProperty.call(context.review, "evidence_satisfied"), false);
  assert.equal(context.review.promotion_authorized, false);
  assert.equal(context.review.bayesian_readiness_authorized, false);
  assert.equal(context.review.allowed_next_step, "complete_governed_diagnostics_sufficiency_evidence_source");
  for (const value of Object.values(context.review.blocked_outputs)) assert.equal(value, false);
  for (const value of Object.values(context.review.feeds)) assert.equal(value, false);
});

test("happy path divergent evidence stream review stays review-only", () => {
  const context = validReviewContext({ alignment_review_decision: DIVERGENT_STATE });
  const validation = validateTriangulatedEvidenceAlignmentReview(context.review, context);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(context.review.triangulated_evidence_alignment_review_state, DIVERGENT_STATE);
  assert.match(context.review.alignment_review_hash, /^[0-9a-f]{64}$/);
  assert.equal(context.review.reviewed_source_evidence_hash, null);
  assert.equal(context.review.source_evidence_hash, null);
  assert.equal(context.review.convergence_diagnostics_satisfied, false);
  assert.equal(context.review.diagnostics_sufficiency_satisfied, false);
});

test("partial alignment review stays review-only", () => {
  const context = validReviewContext({ alignment_review_decision: PARTIAL_STATE });
  const validation = validateTriangulatedEvidenceAlignmentReview(context.review, context);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(context.review.triangulated_evidence_alignment_review_state, PARTIAL_STATE);
  assert.match(context.review.alignment_review_hash, /^[0-9a-f]{64}$/);
  assert.equal(context.review.reviewed_source_evidence_hash, null);
  assert.equal(context.review.source_evidence_hash, null);
  assert.equal(context.review.promotion_authorized, false);
});

test("ready report requires source-bound validation options", () => {
  const review = validReview();
  const validation = validateTriangulatedEvidenceAlignmentReview(review);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "reviewerOwnedTriangulatedEvidenceAlignment source is required for ready validation"
    )
  );
  assert.ok(
    validation.gaps.includes(
      "sourceComparisonDesignAdequacyReview source is required for ready validation"
    )
  );
});

test("missing required evidence refs or hashes hold with no alignment hash", () => {
  for (const field of [
    "source_sed_aggregate_evidence_ref",
    "source_sed_aggregate_evidence_hash",
    "source_vbd_aggregate_evidence_ref",
    "source_vbd_aggregate_evidence_hash",
    "source_outcome_metric_aggregate_evidence_ref",
    "source_outcome_metric_aggregate_evidence_hash",
    "source_comparison_design_adequacy_review_hash"
  ]) {
    const review = validReview({ [field]: "" });

    assert.equal(review.triangulated_evidence_alignment_review_state, HOLD_STATE, field);
    assert.equal(review.alignment_review_hash, null, field);
    assert.equal(review.reviewed_source_evidence_hash, null, field);
    assert.equal(review.source_evidence_hash, null, field);
    assert.equal(review.convergence_diagnostics_satisfied, false, field);
    assert.equal(review.diagnostics_sufficiency_satisfied, false, field);
    assert.ok(review.gap_list.some((gap) => gap.includes(field)), field);
  }
});

test("missing comparison design adequacy source review holds even with a hash", () => {
  const reviewerOwnedTriangulatedEvidenceAlignment = sourceFields();
  const review = buildTriangulatedEvidenceAlignmentReview({
    reviewerOwnedTriangulatedEvidenceAlignment
  });

  assert.equal(review.triangulated_evidence_alignment_review_state, HOLD_STATE);
  assert.equal(review.alignment_review_hash, null);
  assert.ok(review.gap_list.includes("source_comparison_design_adequacy_review is required"));
});

test("stale unsafe suppressed held or generated source evidence holds", () => {
  const unsafeCases = [
    { source_sed_aggregate_evidence_ref: "stale_reviewed_sed_aggregate_evidence.t90" },
    { source_vbd_aggregate_evidence_ref: "suppressed_reviewed_vbd_aggregate_evidence.t90" },
    { source_outcome_metric_aggregate_evidence_ref: "held_reviewed_outcome_evidence.t90" },
    { source_sed_aggregate_evidence_ref: "fixture_reviewed_sed_aggregate_evidence.t90" },
    { source_vbd_aggregate_evidence_ref: "template_reviewed_vbd_aggregate_evidence.t90" },
    { source_outcome_metric_aggregate_evidence_ref: "runtime_generated_outcome_evidence.t90" },
    { source_sed_evidence_status: "SUPPRESSED" },
    { source_vbd_evidence_status: "HELD" },
    { source_outcome_evidence_status: "MISSING" }
  ];

  for (const overrides of unsafeCases) {
    const review = validReview(overrides);

    assert.equal(review.triangulated_evidence_alignment_review_state, HOLD_STATE);
    assert.equal(review.alignment_review_hash, null);
    assert.equal(review.promotion_authorized, false);
  }
});

test("mismatched observation window cohort workflow blueprint use case or metric holds", () => {
  const mismatchCases = [
    { source_sed_observation_window_ref: "observation_window.other.t90" },
    { source_vbd_cohort_ref: "cohort.other_aggregate" },
    { source_outcome_workflow_function_ref: "workflow_function.other" },
    { source_sed_blueprint_hypothesis_ref: "blueprint_hypothesis.other.2026_06" },
    { source_vbd_prioritized_use_case_ref: "prioritized_use_case.other" },
    { source_outcome_metric_ref: "metric.other" }
  ];

  for (const overrides of mismatchCases) {
    const review = validReview(overrides);

    assert.equal(review.triangulated_evidence_alignment_review_state, HOLD_STATE);
    assert.equal(review.alignment_review_hash, null);
    assert.ok(
      review.gap_list.some((gap) => /context_mismatch|must match/.test(gap)),
      review.gap_list.join("; ")
    );
  }
});

test("nested source ref object and array source refs hold", () => {
  for (const overrides of [
    { source_sed_aggregate_evidence_ref: { ref: "reviewed_sed" } },
    { source_vbd_aggregate_evidence_ref: ["reviewed_vbd"] },
    { source_outcome_metric_aggregate_evidence_hash: ["3".repeat(64)] },
    { source_sed_evidence_status: { state: "CLEAR", promotion_authorized: true } },
    { boundary_checks_clear: ["CLEAR"] },
    { alignment_review_notes: { note: "nested notes are not allowed" } }
  ]) {
    const review = validReview(overrides);

    assert.equal(review.triangulated_evidence_alignment_review_state, HOLD_STATE);
    assert.equal(review.alignment_review_hash, null);
    assert.ok(review.gap_list.some((gap) => /non_scalar/.test(gap)));
  }
});

test("hash-only ref-only non-hex reused hash and wrong stream family inputs hold", () => {
  for (const overrides of [
    {
      source_sed_aggregate_evidence_ref: "",
      source_sed_aggregate_evidence_hash: "1".repeat(64)
    },
    {
      source_vbd_aggregate_evidence_ref: "reviewed_vbd_aggregate_evidence.t90",
      source_vbd_aggregate_evidence_hash: ""
    },
    {
      source_outcome_metric_aggregate_evidence_hash: "not-a-hex-hash"
    },
    {
      source_vbd_aggregate_evidence_ref:
        "reviewed_sed_aggregate_evidence.customer_support.case_resolution.t90"
    },
    {
      source_vbd_aggregate_evidence_hash: "1".repeat(64)
    }
  ]) {
    const review = validReview(overrides);

    assert.equal(review.triangulated_evidence_alignment_review_state, HOLD_STATE);
    assert.equal(review.alignment_review_hash, null);
    assert.equal(review.reviewed_source_evidence_hash, null);
    assert.equal(review.source_evidence_hash, null);
    assert.equal(review.convergence_diagnostics_satisfied, false);
    assert.equal(review.diagnostics_sufficiency_satisfied, false);
  }
});

test("blocked claim side doors hold and do not echo unsafe supplied values", () => {
  const reviewerOwnedTriangulatedEvidenceAlignment = sourceFields({
    source_comparison_design_adequacy_review_hash: comparisonDesignAdequacyReview().review_hash,
    promotion_authorized: true,
    bayesian_readiness_authorized: true,
    confidence_probability_output: "high confidence probability",
    raw_rows: [{ email: "person@example.com", query_text: "select * from raw_rows" }],
    alignment_review_notes: "Reviewer notes remain internal only."
  });
  const sourceComparisonDesignAdequacyReview = comparisonDesignAdequacyReview();
  reviewerOwnedTriangulatedEvidenceAlignment.source_comparison_design_adequacy_review_hash =
    sourceComparisonDesignAdequacyReview.review_hash;
  reviewerOwnedTriangulatedEvidenceAlignment.reviewer_owned_triangulated_evidence_alignment_hash =
    triangulatedEvidenceAlignmentSourceHash(reviewerOwnedTriangulatedEvidenceAlignment);

  const review = buildTriangulatedEvidenceAlignmentReview({
    reviewerOwnedTriangulatedEvidenceAlignment,
    sourceComparisonDesignAdequacyReview
  });
  const serialized = JSON.stringify(review);

  assert.equal(review.triangulated_evidence_alignment_review_state, HOLD_STATE);
  assert.equal(review.alignment_review_hash, null);
  assert.equal(review.promotion_authorized, false);
  assert.equal(review.bayesian_readiness_authorized, false);
  for (const unsafe of ["person@example.com", "select *", "high confidence"]) {
    assert.equal(serialized.includes(unsafe), false, unsafe);
  }
});

test("invalid source comparison design adequacy hash holds", () => {
  const review = validReview({ source_comparison_design_adequacy_review_hash: "f".repeat(64) });

  assert.equal(review.triangulated_evidence_alignment_review_state, HOLD_STATE);
  assert.equal(review.alignment_review_hash, null);
  assert.ok(review.gap_list.includes("source_comparison_design_adequacy_review_hash mismatch"));
});

test("source comparison design positive boundary flags hold", () => {
  const review = validReview({}, {
    promotion_boundary: {
      promotion_authorized: false,
      posterior_interpretation_authorized: false,
      confidence_probability_authorized: true,
      customer_economic_output_authorized: false,
      internal_bayesian_execution_artifact_v1_authorized: false
    }
  });

  assert.equal(review.triangulated_evidence_alignment_review_state, HOLD_STATE);
  assert.equal(review.alignment_review_hash, null);
  assert.ok(
    review.gap_list.includes(
      "source_comparison_design_adequacy_review confidence_probability_authorized must be false"
    )
  );
});

test("mutated output cannot claim convergence diagnostics diagnostics sufficiency or promotion", () => {
  const review = validReview();
  review.convergence_diagnostics_satisfied = true;
  review.diagnostics_sufficiency_satisfied = true;
  review.promotion_authorized = true;
  review.blocked_outputs.confidence_output = true;
  review.feeds.bayesian_promotion_decision_gate = true;

  const validation = validateTriangulatedEvidenceAlignmentReview(review);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("convergence_diagnostics_satisfied must be false"));
  assert.ok(validation.gaps.includes("diagnostics_sufficiency_satisfied must be false"));
  assert.ok(validation.gaps.includes("promotion_authorized must be false"));
  assert.ok(validation.gaps.includes("blocked_outputs.confidence_output must be false"));
  assert.ok(validation.gaps.includes("feeds.bayesian_promotion_decision_gate must be false"));
});

test("global evidence satisfaction field is rejected", () => {
  const review = validReview();
  review.evidence_satisfied = true;

  const validation = validateTriangulatedEvidenceAlignmentReview(review);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("evidence_satisfied must not be emitted"));
});

test("broader diagnostics readiness and representation side doors are rejected", () => {
  const review = validReview();
  review.bayesian_readiness_authorized = true;
  review.diagnostics_evidence_satisfied = true;
  review.all_required_evidence_satisfied = true;
  review.eligible_for_satisfied_representation = true;
  review.model_adequacy_authorized = true;

  const validation = validateTriangulatedEvidenceAlignmentReview(review);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("bayesian_readiness_authorized must be false"));
  for (const field of [
    "diagnostics_evidence_satisfied",
    "all_required_evidence_satisfied",
    "eligible_for_satisfied_representation",
    "model_adequacy_authorized"
  ]) {
    assert.ok(validation.gaps.includes(`unexpected field:${field}`), field);
  }
});
